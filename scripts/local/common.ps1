Set-StrictMode -Version Latest

function Test-IsWindowsHost {
  return $env:OS -eq 'Windows_NT'
}

function Resolve-AbsolutePath {
  param(
    [string]$PathValue,
    [string]$BaseDirectory
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    throw 'Path value cannot be empty.'
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BaseDirectory $PathValue))
}

function Format-CommandLine {
  param(
    [string]$Exe,
    [string[]]$Arguments
  )

  $parts = @($Exe) + $Arguments
  return ($parts | ForEach-Object {
      if ($_ -match '\s') {
        '"{0}"' -f $_
      } else {
        $_
      }
    }) -join ' '
}

function Invoke-ExternalCommand {
  param(
    [string]$Exe,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [switch]$DryRun
  )

  $commandLine = Format-CommandLine -Exe $Exe -Arguments $Arguments
  Write-Host "> $commandLine"

  if ($DryRun) {
    return
  }

  $exitCode = 0
  try {
    if ($WorkingDirectory) {
      Push-Location $WorkingDirectory
    }

    & $Exe @Arguments | Out-Host
    $exitCode = if ($null -ne $LASTEXITCODE) {
      [int]$LASTEXITCODE
    } else {
      0
    }
  }
  finally {
    if ($WorkingDirectory) {
      Pop-Location
    }
  }

  if ($exitCode -ne 0) {
    throw "Command failed with exit code ${exitCode}: $commandLine"
  }

  return
}

function Get-ExternalCommandOutput {
  param(
    [string]$Exe,
    [string[]]$Arguments
  )

  $output = & $Exe @Arguments 2>&1 | ForEach-Object { $_.ToString() }
  $exitCode = if ($null -ne $LASTEXITCODE) {
    [int]$LASTEXITCODE
  } else {
    0
  }

  return @{
    ExitCode = $exitCode
    Output = (($output -join [Environment]::NewLine).Trim())
  }
}

function Add-UniqueExistingPath {
  param(
    [System.Collections.Generic.List[string]]$Items,
    [string]$CandidatePath
  )

  if ([string]::IsNullOrWhiteSpace($CandidatePath)) {
    return
  }

  if (-not (Test-Path -LiteralPath $CandidatePath)) {
    return
  }

  $resolvedPath = (Resolve-Path -LiteralPath $CandidatePath).Path
  if (-not $Items.Contains($resolvedPath)) {
    $Items.Add($resolvedPath) | Out-Null
  }
}

function Add-UniqueCommandSpec {
  param(
    [System.Collections.Generic.List[hashtable]]$Items,
    [string]$Exe,
    [string[]]$Prefix
  )

  if ([string]::IsNullOrWhiteSpace($Exe)) {
    return
  }

  $normalizedPrefix = @($Prefix)
  $key = '{0}|{1}' -f $Exe.Trim(), ($normalizedPrefix -join ' ')
  foreach ($item in $Items) {
    if ($item.Key -eq $key) {
      return
    }
  }

  $Items.Add(@{
      Key = $key
      Exe = $Exe.Trim()
      Prefix = $normalizedPrefix
    }) | Out-Null
}

function Get-CommandPaths {
  param(
    [string]$Name
  )

  $items = [System.Collections.Generic.List[string]]::new()

  foreach ($command in @(Get-Command $Name -ErrorAction SilentlyContinue)) {
    foreach ($candidate in @($command.Path, $command.Source)) {
      Add-UniqueExistingPath -Items $items -CandidatePath $candidate
    }
  }

  foreach ($candidate in @(Get-WhereCommandOutput -Name $Name)) {
    Add-UniqueExistingPath -Items $items -CandidatePath $candidate
  }

  return $items.ToArray()
}

function Get-WhereCommandOutput {
  param(
    [string]$Name
  )

  if (-not (Get-Command 'where.exe' -ErrorAction SilentlyContinue)) {
    return @()
  }

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = 'where.exe'
  $startInfo.Arguments = $Name
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($startInfo)
  $stdout = $process.StandardOutput.ReadToEnd()
  $process.StandardError.ReadToEnd() | Out-Null
  $process.WaitForExit()

  if ($process.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($stdout)) {
    return @()
  }

  return @($stdout -split "\r?\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Get-RepoManagedPythonEnvironmentRoot {
  param(
    [string]$RepoRoot
  )

  return Join-Path $RepoRoot '.local\python-tools\cache-rebuild'
}

function Get-RepoManagedPythonExecutable {
  param(
    [string]$RepoRoot
  )

  $environmentRoot = Get-RepoManagedPythonEnvironmentRoot -RepoRoot $RepoRoot
  if (Test-IsWindowsHost) {
    return Join-Path $environmentRoot 'Scripts\python.exe'
  }

  return Join-Path $environmentRoot 'bin/python'
}

function Get-NodeVersionInfo {
  param(
    [string]$NodeExe
  )

  $result = Get-ExternalCommandOutput -Exe $NodeExe -Arguments @('--version')
  if ($result.ExitCode -ne 0) {
    throw "Could not query Node.js version using '$NodeExe'."
  }

  $rawVersion = $result.Output.Trim()
  if ($rawVersion -notmatch '^v?(?<major>\d+)(\.\d+){0,2}.*$') {
    throw "Could not parse Node.js version '$rawVersion'."
  }

  return @{
    Exe = $NodeExe
    Directory = Split-Path -Parent $NodeExe
    Raw = $rawVersion
    Major = [int]$Matches['major']
  }
}

function Test-NodeVersionConstraint {
  param(
    [hashtable]$NodeVersionInfo,
    [string]$Constraint
  )

  if ([string]::IsNullOrWhiteSpace($Constraint)) {
    return $true
  }

  if ($Constraint -notmatch '>=\s*(?<min>\d+)\s*<\s*(?<max>\d+)') {
    return $true
  }

  $minMajor = [int]$Matches['min']
  $maxMajor = [int]$Matches['max']

  return $NodeVersionInfo.Major -ge $minMajor -and $NodeVersionInfo.Major -lt $maxMajor
}

function Assert-NodeVersion {
  param(
    [hashtable]$NodeVersionInfo,
    [string]$Constraint
  )

  if (-not (Test-NodeVersionConstraint -NodeVersionInfo $NodeVersionInfo -Constraint $Constraint)) {
    throw "Unsupported Node.js version $($NodeVersionInfo.Raw). This repo expects $Constraint."
  }
}

function Get-StandardNodeCandidatePaths {
  $items = [System.Collections.Generic.List[string]]::new()
  $paths = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe'),
    (Join-Path $env:ProgramFiles 'nodejs\node.exe')
  )

  if (${env:ProgramFiles(x86)}) {
    $paths += Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe'
  }

  foreach ($candidate in $paths) {
    Add-UniqueExistingPath -Items $items -CandidatePath $candidate
  }

  return $items.ToArray()
}

function Resolve-NodeCommand {
  param(
    [string]$Constraint
  )

  $candidates = [System.Collections.Generic.List[string]]::new()
  foreach ($candidate in @(Get-CommandPaths -Name 'node')) {
    Add-UniqueExistingPath -Items $candidates -CandidatePath $candidate
  }
  foreach ($candidate in @(Get-StandardNodeCandidatePaths)) {
    Add-UniqueExistingPath -Items $candidates -CandidatePath $candidate
  }

  foreach ($candidate in $candidates) {
    try {
      $nodeVersionInfo = Get-NodeVersionInfo -NodeExe $candidate
      if (Test-NodeVersionConstraint -NodeVersionInfo $nodeVersionInfo -Constraint $Constraint) {
        return $nodeVersionInfo
      }
    }
    catch {
      continue
    }
  }

  return $null
}

function Resolve-CorepackCommand {
  param(
    [string]$NodeExe
  )

  $candidates = [System.Collections.Generic.List[string]]::new()
  foreach ($candidate in @(Get-CommandPaths -Name 'corepack')) {
    Add-UniqueExistingPath -Items $candidates -CandidatePath $candidate
  }
  foreach ($candidate in @(Get-CommandPaths -Name 'corepack.cmd')) {
    Add-UniqueExistingPath -Items $candidates -CandidatePath $candidate
  }

  if ($NodeExe) {
    $nodeDirectory = Split-Path -Parent $NodeExe
    foreach ($candidate in @(
        (Join-Path $nodeDirectory 'corepack.cmd'),
        (Join-Path $nodeDirectory 'corepack.exe')
      )) {
      Add-UniqueExistingPath -Items $candidates -CandidatePath $candidate
    }
  }

  foreach ($candidate in $candidates) {
    try {
      $result = Get-ExternalCommandOutput -Exe $candidate -Arguments @('--version')
      if ($result.ExitCode -eq 0) {
        return $candidate
      }
    }
    catch {
      continue
    }
  }

  return $null
}

function Get-DirectPnpmCandidates {
  param(
    [string]$NodeExe
  )

  $items = [System.Collections.Generic.List[string]]::new()
  foreach ($candidate in @(Get-CommandPaths -Name 'pnpm')) {
    Add-UniqueExistingPath -Items $items -CandidatePath $candidate
  }
  foreach ($candidate in @(Get-CommandPaths -Name 'pnpm.cmd')) {
    Add-UniqueExistingPath -Items $items -CandidatePath $candidate
  }

  if ($env:APPDATA) {
    Add-UniqueExistingPath -Items $items -CandidatePath (Join-Path $env:APPDATA 'npm\pnpm.cmd')
  }

  if ($NodeExe) {
    $nodeDirectory = Split-Path -Parent $NodeExe
    foreach ($candidate in @(
        (Join-Path $nodeDirectory 'pnpm.cmd'),
        (Join-Path $nodeDirectory 'pnpm.exe')
      )) {
      Add-UniqueExistingPath -Items $items -CandidatePath $candidate
    }
  }

  return $items.ToArray()
}

function Get-PnpmCommand {
  param(
    [string]$NodeExe
  )

  $corepackExe = Resolve-CorepackCommand -NodeExe $NodeExe
  if ($corepackExe) {
    try {
      $result = Get-ExternalCommandOutput -Exe $corepackExe -Arguments @('pnpm', '--version')
      if ($result.ExitCode -eq 0) {
        return @{
          Exe = $corepackExe
          Prefix = @('pnpm')
        }
      }
    }
    catch {
    }
  }

  foreach ($candidate in @(Get-DirectPnpmCandidates -NodeExe $NodeExe)) {
    try {
      $result = Get-ExternalCommandOutput -Exe $candidate -Arguments @('--version')
      if ($result.ExitCode -eq 0) {
        return @{
          Exe = $candidate
          Prefix = @()
        }
      }
    }
    catch {
      continue
    }
  }

  throw 'Could not find a working pnpm launcher. Install Node.js with corepack support or run the machine prerequisite script first.'
}

function Invoke-Pnpm {
  param(
    [hashtable]$PnpmCommand,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [switch]$DryRun
  )

  Invoke-ExternalCommand `
    -Exe $PnpmCommand.Exe `
    -Arguments @($PnpmCommand.Prefix + $Arguments) `
    -WorkingDirectory $WorkingDirectory `
    -DryRun:$DryRun
}

function Get-PythonVersionInfo {
  param(
    [hashtable]$PythonCommand
  )

  $result = Get-ExternalCommandOutput -Exe $PythonCommand.Exe -Arguments @($PythonCommand.Prefix + @('--version'))
  if ($result.ExitCode -ne 0) {
    throw "Could not query Python version using '$($PythonCommand.Exe)'."
  }

  $rawVersion = $result.Output.Trim()
  if ($rawVersion -notmatch 'Python\s+(?<major>\d+)\.(?<minor>\d+)') {
    throw "Could not parse Python version '$rawVersion'."
  }

  return @{
    Exe = $PythonCommand.Exe
    Prefix = @($PythonCommand.Prefix)
    Raw = $rawVersion
    Major = [int]$Matches['major']
    Minor = [int]$Matches['minor']
  }
}

function Get-StandardPythonCandidatePaths {
  $items = [System.Collections.Generic.List[string]]::new()
  $roots = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Python')
  )

  if ($env:ProgramFiles) {
    $roots += Join-Path $env:ProgramFiles 'Python'
  }

  if (${env:ProgramFiles(x86)}) {
    $roots += Join-Path ${env:ProgramFiles(x86)} 'Python'
  }

  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) {
      continue
    }

    foreach ($directory in @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending)) {
      Add-UniqueExistingPath -Items $items -CandidatePath (Join-Path $directory.FullName 'python.exe')
    }
  }

  return $items.ToArray()
}

function Get-PythonCommand {
  param(
    [string]$RepoRoot,
    [string]$PythonOverride
  )

  $candidates = [System.Collections.Generic.List[hashtable]]::new()

  $configuredPython = if ($PythonOverride) {
    $PythonOverride.Trim()
  } elseif ($env:PYTHON_BIN) {
    $env:PYTHON_BIN.Trim()
  } else {
    ''
  }

  if ($configuredPython) {
    Add-UniqueCommandSpec -Items $candidates -Exe $configuredPython -Prefix @()
  }

  if ($RepoRoot) {
    $repoManagedPython = Get-RepoManagedPythonExecutable -RepoRoot $RepoRoot
    if (Test-Path -LiteralPath $repoManagedPython) {
      Add-UniqueCommandSpec -Items $candidates -Exe $repoManagedPython -Prefix @()
    }
  }

  foreach ($commandPath in @(Get-CommandPaths -Name 'python')) {
    Add-UniqueCommandSpec -Items $candidates -Exe $commandPath -Prefix @()
  }
  foreach ($commandPath in @(Get-CommandPaths -Name 'py')) {
    Add-UniqueCommandSpec -Items $candidates -Exe $commandPath -Prefix @('-3')
  }
  foreach ($commandPath in @(Get-CommandPaths -Name 'python3')) {
    Add-UniqueCommandSpec -Items $candidates -Exe $commandPath -Prefix @()
  }
  foreach ($commandPath in @(Get-StandardPythonCandidatePaths)) {
    Add-UniqueCommandSpec -Items $candidates -Exe $commandPath -Prefix @()
  }

  foreach ($candidate in $candidates) {
    try {
      $versionInfo = Get-PythonVersionInfo -PythonCommand $candidate
      if ($versionInfo.Major -eq 3) {
        return @{
          Exe = $candidate.Exe
          Prefix = @($candidate.Prefix)
        }
      }
    }
    catch {
      continue
    }
  }

  return $null
}

function Invoke-Python {
  param(
    [hashtable]$PythonCommand,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [switch]$DryRun
  )

  Invoke-ExternalCommand `
    -Exe $PythonCommand.Exe `
    -Arguments @($PythonCommand.Prefix + $Arguments) `
    -WorkingDirectory $WorkingDirectory `
    -DryRun:$DryRun
}

function Initialize-RepoManagedPythonEnvironment {
  param(
    [string]$RepoRoot,
    [hashtable]$PythonCommand,
    [switch]$InstallRequirements,
    [switch]$DryRun
  )

  $environmentRoot = Get-RepoManagedPythonEnvironmentRoot -RepoRoot $RepoRoot
  $environmentPython = Get-RepoManagedPythonExecutable -RepoRoot $RepoRoot

  if (-not (Test-Path -LiteralPath $environmentPython)) {
    $environmentParent = Split-Path -Parent $environmentRoot
    if (-not (Test-Path -LiteralPath $environmentParent)) {
      New-Item -ItemType Directory -Path $environmentParent -Force | Out-Null
    }

    Write-Host ''
    Write-Host 'Creating the repo-managed Python environment for the raw-data exporter...'
    Invoke-Python `
      -PythonCommand $PythonCommand `
      -Arguments @('-m', 'venv', $environmentRoot) `
      -WorkingDirectory $RepoRoot `
      -DryRun:$DryRun
  }

  $repoManagedPython = @{
    Exe = $environmentPython
    Prefix = @()
  }

  if ($InstallRequirements) {
    Write-Host ''
    Write-Host 'Refreshing Python packages inside the repo-managed exporter environment...'
    Invoke-Python `
      -PythonCommand $repoManagedPython `
      -Arguments @('-m', 'pip', 'install', '--upgrade', 'pip') `
      -WorkingDirectory $RepoRoot `
      -DryRun:$DryRun
    Invoke-Python `
      -PythonCommand $repoManagedPython `
      -Arguments @('-m', 'pip', 'install', '-r', 'scripts/generate_actual_cache.requirements.txt') `
      -WorkingDirectory $RepoRoot `
      -DryRun:$DryRun
  }

  return $repoManagedPython
}

function Get-WingetCommand {
  foreach ($name in @('winget.exe', 'winget')) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  return $null
}

function Install-WingetPackage {
  param(
    [string]$PackageId,
    [ValidateSet('user', 'machine')]
    [string]$Scope = 'user',
    [switch]$DryRun
  )

  if (-not (Test-IsWindowsHost)) {
    throw 'Automatic toolchain installation is only implemented for Windows hosts in this script.'
  }

  $wingetExe = Get-WingetCommand
  if (-not $wingetExe) {
    throw 'Could not find winget. Run the machine prerequisite script as Administrator or install App Installer first.'
  }

  Invoke-ExternalCommand `
    -Exe $wingetExe `
    -Arguments @(
      'install',
      '--id',
      $PackageId,
      '--exact',
      '--silent',
      '--disable-interactivity',
      '--accept-package-agreements',
      '--accept-source-agreements',
      '--scope',
      $Scope
    ) `
    -DryRun:$DryRun
}

function Test-IsAdministrator {
  if (-not (Test-IsWindowsHost)) {
    return $false
  }

  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
