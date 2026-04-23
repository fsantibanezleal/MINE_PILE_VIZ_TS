param(
  [string]$AppDataRoot,
  [switch]$Install,
  [switch]$SkipCacheCheck,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Invoke-Pnpm {
  param(
    [hashtable]$PnpmCommand,
    [string[]]$Arguments
  )

  & $PnpmCommand.Exe @($PnpmCommand.Prefix + $Arguments)
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDirectory '..\..')).Path
$pnpmCommand = Get-PnpmCommand

Push-Location $repoRoot
try {
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
    Write-Host 'Running dependency install...'
    if ($DryRun) {
      Write-Host "> $($pnpmCommand.Exe) $($pnpmCommand.Prefix + @('install') -join ' ')"
    }
    else {
      Invoke-Pnpm -PnpmCommand $pnpmCommand -Arguments @('install')
    }
  }

  Write-Host ''
  Write-Host 'Local routes:'
  Write-Host '  http://127.0.0.1:3000/circuit'
  Write-Host '  http://127.0.0.1:3000/live'
  Write-Host '  http://127.0.0.1:3000/profiler'
  Write-Host '  http://127.0.0.1:3000/simulator'
  Write-Host ''
  Write-Host "Starting app with: $($pnpmCommand.Exe) $($pnpmCommand.Prefix + @('dev') -join ' ')"

  if ($DryRun) {
    return
  }

  Invoke-Pnpm -PnpmCommand $pnpmCommand -Arguments @('dev')
}
finally {
  Pop-Location
}
