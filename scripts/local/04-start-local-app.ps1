param(
  [string]$AppDataRoot,
  [switch]$Install,
  [switch]$SkipCacheCheck,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'common.ps1')

$repoRoot = (Resolve-Path (Join-Path $scriptDirectory '..\..')).Path

Push-Location $repoRoot
try {
  $packageJson = Get-Content -Raw 'package.json' | ConvertFrom-Json
  $nodeVersionInfo = Resolve-NodeCommand -Constraint ([string]$packageJson.engines.node)
  if (-not $nodeVersionInfo) {
    throw 'Node.js is missing or unsupported. Run scripts/local/02-install-local-requirements.ps1 first.'
  }

  $pnpmCommand = Get-PnpmCommand -NodeExe $nodeVersionInfo.Exe

  if ($AppDataRoot) {
    $resolvedAppDataRoot = Resolve-Path $AppDataRoot
    $env:APP_DATA_ROOT = $resolvedAppDataRoot.Path
  }
  else {
    $defaultAppDataRoot = Join-Path $repoRoot '.local\app-data\v1'
    if (Test-Path $defaultAppDataRoot) {
      $env:APP_DATA_ROOT = (Resolve-Path $defaultAppDataRoot).Path
    }
  }

  if ($SkipCacheCheck) {
    $env:SKIP_APP_CACHE_CHECK = '1'
  }

  Write-Host "Repo root: $repoRoot"
  if ($env:APP_DATA_ROOT) {
    Write-Host "APP_DATA_ROOT: $env:APP_DATA_ROOT"
  }
  else {
    Write-Host 'APP_DATA_ROOT: <default runtime resolution>'
  }

  if ($SkipCacheCheck) {
    Write-Host 'SKIP_APP_CACHE_CHECK: 1'
  }

  if ($Install) {
    Write-Host ''
    Write-Host 'Running dependency install...'
    Invoke-Pnpm `
      -PnpmCommand $pnpmCommand `
      -Arguments @('install') `
      -WorkingDirectory $repoRoot `
      -DryRun:$DryRun
  }

  Write-Host ''
  Write-Host 'Local routes:'
  Write-Host '  http://127.0.0.1:3000/circuit'
  Write-Host '  http://127.0.0.1:3000/live'
  Write-Host '  http://127.0.0.1:3000/profiler'
  Write-Host '  http://127.0.0.1:3000/simulator'
  Write-Host ''
  Write-Host "Starting app with: $(Format-CommandLine -Exe $pnpmCommand.Exe -Arguments ($pnpmCommand.Prefix + @('dev')))"

  if ($DryRun) {
    return
  }

  Invoke-Pnpm `
    -PnpmCommand $pnpmCommand `
    -Arguments @('dev') `
    -WorkingDirectory $repoRoot
}
finally {
  Pop-Location
}
