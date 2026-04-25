param(
  [string]$PythonBin,
  [switch]$SkipNodeInstall,
  [switch]$SkipPythonInstall,
  [switch]$IncludePlaywrightBrowsers,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Get-PnpmCommand {
  if (Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'pnpm.cmd'
      Prefix = @()
    }
  }

  if (Get-Command 'pnpm' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'pnpm'
      Prefix = @()
    }
  }

  if (Get-Command 'corepack' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'corepack'
      Prefix = @('pnpm')
    }
  }

  throw 'Could not find pnpm, pnpm.cmd, or corepack in PATH.'
}

function Get-PythonCommand {
  param(
    [string]$PythonOverride
  )

  $configuredPython = if ($PythonOverride) {
    $PythonOverride.Trim()
  } elseif ($env:PYTHON_BIN) {
    $env:PYTHON_BIN.Trim()
  } else {
    ''
  }

  if ($configuredPython) {
    return @{
      Exe = $configuredPython
      Prefix = @()
    }
  }

  if (Get-Command 'python' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'python'
      Prefix = @()
    }
  }

  if (Get-Command 'py' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'py'
      Prefix = @('-3')
    }
  }

  if (Get-Command 'python3' -ErrorAction SilentlyContinue) {
    return @{
      Exe = 'python3'
      Prefix = @()
    }
  }

  throw 'Could not find python, py, or python3 in PATH. Install Python 3 or pass -PythonBin.'
}

function Get-NodeVersionInfo {
  if (-not (Get-Command 'node' -ErrorAction SilentlyContinue)) {
    throw 'Could not find Node.js in PATH. Install a supported Node.js version before running this script.'
  }

  $rawVersion = (& node --version).Trim()
  if ($rawVersion -notmatch '^v?(?<major>\d+)(\.\d+){0,2}.*$') {
    throw "Could not parse Node.js version '$rawVersion'."
  }

  return @{
    Raw = $rawVersion
    Major = [int]$Matches['major']
  }
}

function Assert-NodeVersion {
  param(
    [hashtable]$NodeVersionInfo,
    [string]$Constraint
  )

  if ($Constraint -notmatch '>=\s*(?<min>\d+)\s*<\s*(?<max>\d+)') {
    return
  }

  $minMajor = [int]$Matches['min']
  $maxMajor = [int]$Matches['max']

  if ($NodeVersionInfo.Major -lt $minMajor -or $NodeVersionInfo.Major -ge $maxMajor) {
    throw "Unsupported Node.js version $($NodeVersionInfo.Raw). This repo expects $Constraint."
  }
}

function Format-CommandLine {
  param(
    [string]$Exe,
    [string[]]$Arguments
  )

  return @($Exe) + $Arguments -join ' '
}

function Invoke-ExternalCommand {
  param(
    [string]$Exe,
    [string[]]$Arguments,
    [switch]$DryRun
  )

  Write-Host "> $(Format-CommandLine -Exe $Exe -Arguments $Arguments)"
  if (-not $DryRun) {
    & $Exe @Arguments
  }
}

function Invoke-Pnpm {
  param(
    [hashtable]$PnpmCommand,
    [string[]]$Arguments,
    [switch]$DryRun
  )

  Invoke-ExternalCommand `
    -Exe $PnpmCommand.Exe `
    -Arguments @($PnpmCommand.Prefix + $Arguments) `
    -DryRun:$DryRun
}

function Invoke-Python {
  param(
    [hashtable]$PythonCommand,
    [string[]]$Arguments,
    [switch]$DryRun
  )

  Invoke-ExternalCommand `
    -Exe $PythonCommand.Exe `
    -Arguments @($PythonCommand.Prefix + $Arguments) `
    -DryRun:$DryRun
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDirectory '..\..')).Path
$defaultAppDataRoot = Resolve-AbsolutePath -PathValue '.local\app-data\v1' -BaseDirectory $repoRoot
$defaultRawDataRoot = Resolve-AbsolutePath -PathValue 'data' -BaseDirectory $repoRoot

Push-Location $repoRoot
try {
  $packageJson = Get-Content -Raw 'package.json' | ConvertFrom-Json
  $nodeVersionInfo = Get-NodeVersionInfo
  Assert-NodeVersion -NodeVersionInfo $nodeVersionInfo -Constraint $packageJson.engines.node

  $pnpmCommand = Get-PnpmCommand
  $pythonCommand = $null
  if (-not $SkipPythonInstall) {
    $pythonCommand = Get-PythonCommand -PythonOverride $PythonBin
  }

  Write-Host "Repo root: $repoRoot"
  Write-Host "Node.js: $($nodeVersionInfo.Raw)"
  Write-Host "Node engine: $($packageJson.engines.node)"
  Write-Host "pnpm launcher: $(Format-CommandLine -Exe $pnpmCommand.Exe -Arguments $pnpmCommand.Prefix)"
  if ($pythonCommand) {
    Write-Host "Python launcher: $(Format-CommandLine -Exe $pythonCommand.Exe -Arguments $pythonCommand.Prefix)"
  }

  if (-not $SkipNodeInstall) {
    Write-Host ''
    Write-Host 'Installing Node.js dependencies from package.json and pnpm-lock.yaml...'
    Invoke-Pnpm -PnpmCommand $pnpmCommand -Arguments @('install') -DryRun:$DryRun
  }

  if (-not $SkipPythonInstall) {
    Write-Host ''
    Write-Host 'Installing Python dependencies for the tracked raw-data exporter...'
    Invoke-Python `
      -PythonCommand $pythonCommand `
      -Arguments @('-m', 'pip', 'install', '-r', 'scripts/generate_actual_cache.requirements.txt') `
      -DryRun:$DryRun
  }

  if ($IncludePlaywrightBrowsers) {
    Write-Host ''
    Write-Host 'Installing Playwright browsers for end-to-end validation...'
    Invoke-Pnpm -PnpmCommand $pnpmCommand -Arguments @('exec', 'playwright', 'install') -DryRun:$DryRun
  }

  Write-Host ''
  Write-Host 'Local next steps:'
  if (Test-Path -LiteralPath $defaultRawDataRoot) {
    Write-Host '  1. Rebuild the local app-ready cache from the raw data folder:'
    Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/rebuild-local-app-data.ps1'
  } elseif (-not (Test-Path -LiteralPath $defaultAppDataRoot)) {
    Write-Host '  1. Provide a raw dataset under data\ or point the rebuild script at another raw root.'
    Write-Host '     A clean clone does not include data\ or .local\ because both are gitignored.'
  }

  if (Test-Path -LiteralPath $defaultAppDataRoot) {
    Write-Host '  2. Start the local application with the managed dev-server wrapper:'
  } else {
    Write-Host '  2. Start the local application after a cache has been created or APP_DATA_ROOT points to one:'
  }
  Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/start-local-app.ps1'

  if (-not $IncludePlaywrightBrowsers) {
    Write-Host ''
    Write-Host 'Optional:'
    Write-Host '  Install browser binaries later with:'
    Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/install-local-requirements.ps1 -IncludePlaywrightBrowsers'
  }
}
finally {
  Pop-Location
}
