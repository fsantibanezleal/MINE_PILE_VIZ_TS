param(
  [string]$PythonBin,
  [switch]$SkipNodeInstall,
  [switch]$SkipPythonInstall,
  [switch]$SkipToolchainBootstrap,
  [switch]$IncludePlaywrightBrowsers,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'common.ps1')

$repoRoot = (Resolve-Path (Join-Path $scriptDirectory '..\..')).Path
$defaultAppDataRoot = Resolve-AbsolutePath -PathValue '.local\app-data\v1' -BaseDirectory $repoRoot
$defaultRawDataRoot = Resolve-AbsolutePath -PathValue 'data' -BaseDirectory $repoRoot
$machineBootstrapScript = Join-Path $scriptDirectory '01-install-machine-prerequisites.ps1'

function Install-MissingNodeToolchain {
  param(
    [string]$Constraint,
    [switch]$DryRun
  )

  Write-Host ''
  Write-Host 'Node.js is missing or outside the supported range.'
  Write-Host 'Attempting a user-scope install through winget...'
  Install-WingetPackage -PackageId 'OpenJS.NodeJS.LTS' -Scope 'user' -DryRun:$DryRun

  $nodeVersionInfo = Resolve-NodeCommand -Constraint $Constraint
  if ($nodeVersionInfo) {
    return $nodeVersionInfo
  }

  throw (
    "Node.js still could not be resolved after the user-scope install attempt. " +
    "Run '$machineBootstrapScript' as Administrator, reopen PowerShell, and rerun this script."
  )
}

function Install-MissingPythonToolchain {
  param(
    [string]$RepoRoot,
    [string]$PythonOverride,
    [switch]$DryRun
  )

  Write-Host ''
  Write-Host 'Python 3 is missing.'
  Write-Host 'Attempting a user-scope install through winget...'
  Install-WingetPackage -PackageId 'Python.Python.3.12' -Scope 'user' -DryRun:$DryRun

  $pythonCommand = Get-PythonCommand -RepoRoot $RepoRoot -PythonOverride $PythonOverride
  if ($pythonCommand) {
    return $pythonCommand
  }

  throw (
    "Python still could not be resolved after the user-scope install attempt. " +
    "Run '$machineBootstrapScript' as Administrator, reopen PowerShell, and rerun this script."
  )
}

Push-Location $repoRoot
try {
  $packageJson = Get-Content -Raw 'package.json' | ConvertFrom-Json
  $nodeConstraint = [string]$packageJson.engines.node

  $nodeVersionInfo = Resolve-NodeCommand -Constraint $nodeConstraint
  if (-not $nodeVersionInfo) {
    if ($SkipToolchainBootstrap) {
      throw "Node.js is missing or unsupported. Install a version that satisfies $nodeConstraint before running this script."
    }

    $nodeVersionInfo = Install-MissingNodeToolchain -Constraint $nodeConstraint -DryRun:$DryRun
  }

  Assert-NodeVersion -NodeVersionInfo $nodeVersionInfo -Constraint $nodeConstraint
  $pnpmCommand = Get-PnpmCommand -NodeExe $nodeVersionInfo.Exe

  $basePythonCommand = $null
  $repoManagedPython = $null

  if (-not $SkipPythonInstall) {
    $basePythonCommand = Get-PythonCommand -RepoRoot $repoRoot -PythonOverride $PythonBin
    if (-not $basePythonCommand) {
      if ($SkipToolchainBootstrap) {
        throw 'Python 3 is missing. Install it before running this script, or rerun without -SkipToolchainBootstrap.'
      }

      $basePythonCommand = Install-MissingPythonToolchain -RepoRoot $repoRoot -PythonOverride $PythonBin -DryRun:$DryRun
    }

    $repoManagedPython = Initialize-RepoManagedPythonEnvironment `
      -RepoRoot $repoRoot `
      -PythonCommand $basePythonCommand `
      -InstallRequirements `
      -DryRun:$DryRun

    $env:PYTHON_BIN = $repoManagedPython.Exe
  }

  Write-Host "Repo root: $repoRoot"
  Write-Host "Node.js: $($nodeVersionInfo.Raw)"
  Write-Host "Node engine: $nodeConstraint"
  Write-Host "pnpm launcher: $(Format-CommandLine -Exe $pnpmCommand.Exe -Arguments $pnpmCommand.Prefix)"
  if ($basePythonCommand) {
    $pythonVersionInfo = Get-PythonVersionInfo -PythonCommand $basePythonCommand
    Write-Host "Python base launcher: $(Format-CommandLine -Exe $basePythonCommand.Exe -Arguments $basePythonCommand.Prefix)"
    Write-Host "Python base version: $($pythonVersionInfo.Raw)"
  }
  if ($repoManagedPython) {
    Write-Host "Repo-managed PYTHON_BIN: $($repoManagedPython.Exe)"
  }

  if (-not $SkipNodeInstall) {
    Write-Host ''
    Write-Host 'Installing Node.js dependencies from package.json and pnpm-lock.yaml...'
    Invoke-Pnpm `
      -PnpmCommand $pnpmCommand `
      -Arguments @('install', '--frozen-lockfile') `
      -WorkingDirectory $repoRoot `
      -DryRun:$DryRun
  }

  if ($IncludePlaywrightBrowsers) {
    Write-Host ''
    Write-Host 'Installing the Chromium browser used by the tracked end-to-end suite...'
    Invoke-Pnpm `
      -PnpmCommand $pnpmCommand `
      -Arguments @('exec', 'playwright', 'install', 'chromium') `
      -WorkingDirectory $repoRoot `
      -DryRun:$DryRun
  }

  Write-Host ''
  Write-Host 'Local next steps:'
  if (Test-Path -LiteralPath $defaultRawDataRoot) {
    Write-Host '  1. Rebuild the local app-ready cache from the raw data folder:'
    Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/03-rebuild-local-app-data.ps1'
  } elseif (-not (Test-Path -LiteralPath $defaultAppDataRoot)) {
    Write-Host '  1. Provide a raw dataset under data\ or point the rebuild script at another raw root.'
    Write-Host '     A clean clone does not include data\ or .local\ because both are gitignored.'
  }

  if (Test-Path -LiteralPath $defaultAppDataRoot) {
  Write-Host '  2. Start the local application with the managed dev-server wrapper:'
  } else {
    Write-Host '  2. Start the local application after a cache has been created or APP_DATA_ROOT points to one:'
  }
  Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1'

  if (-not $IncludePlaywrightBrowsers) {
    Write-Host ''
    Write-Host 'Optional:'
    Write-Host '  Install browser binaries later with:'
    Write-Host '     powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1 -IncludePlaywrightBrowsers'
  }
}
finally {
  Pop-Location
}
