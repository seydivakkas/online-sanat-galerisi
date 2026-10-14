# One-time dependency installation and React build. Requires Node.js / npm.
# Subsequent local starts do not require internet or paid APIs.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = (node --version)
if ($LASTEXITCODE -ne 0) { throw 'Node.js bulunamadi. Node.js 22+ kurun.' }
Write-Host "Node.js: $node"
Push-Location (Join-Path $root 'backend')
try {
    npm ci --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Backend npm ci basarisiz' }
} finally { Pop-Location }
Push-Location (Join-Path $root 'frontend')
try {
    npm ci --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend npm ci basarisiz' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'React uretim build basarisiz' }
} finally { Pop-Location }
Write-Host 'Kurulum tamamlandi. Artik deployment/Start-Local.ps1 ile yerel calistirin.'
