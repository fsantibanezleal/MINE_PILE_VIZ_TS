param(
  [string]$RawDataRoot = 'data',
  [string]$AppDataRoot = '.local\app-data\v1',
  [string]$ReferenceRoot,
  [string]$PythonBin,
  [switch]$InstallPythonDependencies,
  [switch]$SkipValidation,
  [switch]$DeepValidation,
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

function Assert-ExistingPath {
  param(
    [string]$TargetPath,
    [string]$Label
  )

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    throw "$Label does not exist: $TargetPath"
  }
}

function Assert-RawDatasetShape {
  param(
    [string]$RawRoot
  )

  $requiredPaths = @(
    (Join-Path $RawRoot 'conf\qualities.yml'),
    (Join-Path $RawRoot 'conf\mto_objects.yml'),
    (Join-Path $RawRoot '05_model_input\sequence.json'),
    (Join-Path $RawRoot '06_models\mt_state.joblib'),
    (Join-Path $RawRoot '08_reporting')
  )

  $missingPaths = @($requiredPaths | Where-Object { -not (Test-Path -LiteralPath $_) })
  if ($missingPaths.Count -gt 0) {
    throw (
      "The raw dataset is missing required files or folders:`n- " +
      ($missingPaths -join "`n- ")
    )
  }
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDirectory '..\..')).Path
$defaultAppDataRoot = Resolve-AbsolutePath -PathValue '.local\app-data\v1' -BaseDirectory $repoRoot
$resolvedRawDataRoot = Resolve-AbsolutePath -PathValue $RawDataRoot -BaseDirectory $repoRoot
$resolvedAppDataRoot = Resolve-AbsolutePath -PathValue $AppDataRoot -BaseDirectory $repoRoot
$resolvedReferenceRoot = $null

if ($ReferenceRoot) {
  $resolvedReferenceRoot = Resolve-AbsolutePath -PathValue $ReferenceRoot -BaseDirectory $repoRoot
}

Push-Location $repoRoot
try {
  Assert-ExistingPath -TargetPath $resolvedRawDataRoot -Label 'Raw data root'
  Assert-RawDatasetShape -RawRoot $resolvedRawDataRoot

  if ($resolvedReferenceRoot) {
    Assert-ExistingPath -TargetPath $resolvedReferenceRoot -Label 'Reference root'
  }

  $pnpmCommand = Get-PnpmCommand
  $pythonCommand = $null
  if ($InstallPythonDependencies) {
    $pythonCommand = Get-PythonCommand -PythonOverride $PythonBin
  }

  if ($PythonBin) {
    $env:PYTHON_BIN = $PythonBin.Trim()
  }

  if ($resolvedReferenceRoot) {
    $env:REFERENCE_ROOT = $resolvedReferenceRoot
  }

  Write-Host "Repo root: $repoRoot"
  Write-Host "RAW_DATA_ROOT: $resolvedRawDataRoot"
  Write-Host "APP_CACHE_ROOT: $resolvedAppDataRoot"
  Write-Host "pnpm launcher: $(Format-CommandLine -Exe $pnpmCommand.Exe -Arguments $pnpmCommand.Prefix)"
  if ($env:PYTHON_BIN) {
    Write-Host "PYTHON_BIN: $env:PYTHON_BIN"
  }
  if ($resolvedReferenceRoot) {
    Write-Host "REFERENCE_ROOT: $resolvedReferenceRoot"
  }

  if ($InstallPythonDependencies) {
    Write-Host ''
    Write-Host 'Installing Python dependencies for the exporter before rebuilding the cache...'
    Invoke-Python `
      -PythonCommand $pythonCommand `
      -Arguments @('-m', 'pip', 'install', '-r', 'scripts/generate_actual_cache.requirements.txt') `
      -DryRun:$DryRun
  }

  Write-Host ''
  Write-Host 'Rebuilding the tracked app-ready cache from the raw data tree...'
  Invoke-Pnpm `
    -PnpmCommand $pnpmCommand `
    -Arguments @(
      'cache:rebuild',
      '--raw-root',
      $resolvedRawDataRoot,
      '--root',
      $resolvedAppDataRoot
    ) `
    -DryRun:$DryRun

  if (-not $SkipValidation) {
    Write-Host ''
    Write-Host 'Validating the regenerated cache...'
    $validationCommand = if ($DeepValidation) {
      @('cache:check:deep')
    } else {
      @('cache:check')
    }

    Invoke-Pnpm -PnpmCommand $pnpmCommand -Arguments $validationCommand -DryRun:$DryRun
  }

  Write-Host ''
  if ($resolvedAppDataRoot -eq $defaultAppDataRoot) {
    Write-Host 'The default local cache root is ready.'
    Write-Host 'Start the app with:'
    Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local/start-local-app.ps1'
  } else {
    Write-Host 'The cache was rebuilt into a non-default root.'
    Write-Host 'Start the app with:'
    Write-Host "  `$env:APP_DATA_ROOT = '$resolvedAppDataRoot'"
    Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local/start-local-app.ps1'
  }
}
finally {
  Pop-Location
}
