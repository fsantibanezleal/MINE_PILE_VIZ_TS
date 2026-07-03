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

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'common.ps1')

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

  $packageJson = Get-Content -Raw 'package.json' | ConvertFrom-Json
  $nodeVersionInfo = Resolve-NodeCommand -Constraint ([string]$packageJson.engines.node)
  if (-not $nodeVersionInfo) {
    throw 'Node.js is missing or unsupported. Run scripts/local/02-install-local-requirements.ps1 first.'
  }

  $pnpmCommand = Get-PnpmCommand -NodeExe $nodeVersionInfo.Exe
  $pythonCommand = Get-PythonCommand -RepoRoot $repoRoot -PythonOverride $PythonBin

  if ($InstallPythonDependencies) {
    if (-not $pythonCommand) {
      throw 'Python 3 is missing. Run scripts/local/02-install-local-requirements.ps1 first or pass -PythonBin.'
    }

    $pythonCommand = Initialize-RepoManagedPythonEnvironment `
      -RepoRoot $repoRoot `
      -PythonCommand $pythonCommand `
      -InstallRequirements `
      -DryRun:$DryRun
  }

  if ($pythonCommand) {
    $env:PYTHON_BIN = $pythonCommand.Exe
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
    -WorkingDirectory $repoRoot `
    -DryRun:$DryRun

  if (-not $SkipValidation) {
    Write-Host ''
    Write-Host 'Validating the regenerated cache...'
    $validationCommand = if ($DeepValidation) {
      @('cache:check:deep')
    } else {
      @('cache:check')
    }

    Invoke-Pnpm `
      -PnpmCommand $pnpmCommand `
      -Arguments $validationCommand `
      -WorkingDirectory $repoRoot `
      -DryRun:$DryRun
  }

  Write-Host ''
  if ($resolvedAppDataRoot -eq $defaultAppDataRoot) {
    Write-Host 'The default local cache root is ready.'
    Write-Host 'Start the app with:'
    Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1'
  } else {
    Write-Host 'The cache was rebuilt into a non-default root.'
    Write-Host 'Start the app with:'
    Write-Host "  `$env:APP_DATA_ROOT = '$resolvedAppDataRoot'"
    Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local/04-start-local-app.ps1'
  }
}
finally {
  Pop-Location
}
