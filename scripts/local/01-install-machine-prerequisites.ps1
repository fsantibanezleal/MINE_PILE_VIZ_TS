param(
  [switch]$SkipNode,
  [switch]$SkipPython,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'common.ps1')

if (-not (Test-IsWindowsHost)) {
  throw 'This machine-level bootstrap script currently supports Windows only.'
}

if (-not (Test-IsAdministrator) -and -not $DryRun) {
  throw 'Run this script from an elevated PowerShell session (Run as Administrator).'
}

Write-Host 'Machine prerequisite bootstrap'
Write-Host 'This script installs toolchain dependencies at machine scope.'
Write-Host ''

if (-not $SkipNode) {
  Write-Host 'Installing Node.js LTS for all users...'
  Install-WingetPackage -PackageId 'OpenJS.NodeJS.LTS' -Scope 'machine' -DryRun:$DryRun
  Write-Host ''
}

if (-not $SkipPython) {
  Write-Host 'Installing Python 3.12 for all users...'
  Install-WingetPackage -PackageId 'Python.Python.3.12' -Scope 'machine' -DryRun:$DryRun
  Write-Host ''
}

Write-Host 'Next step:'
Write-Host '  Open a new PowerShell session and run:'
Write-Host '  powershell -ExecutionPolicy Bypass -File scripts/local/02-install-local-requirements.ps1'
