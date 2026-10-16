# Windows-first / Offline-first local application launcher.
# The app uses only a local SQLite database and serves built React + API
# through http://127.0.0.1:3001. No paid service or API key is required.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA 'ArtGallery'
$env:NODE_ENV = 'local'
$env:ART_GALLERY_DATA_DIR = $dataRoot
$env:PORT = '3001'
$env:HOST = '127.0.0.1'  # Local-only: do not expose gallery to the LAN.

New-Item -Force -ItemType Directory -Path $dataRoot | Out-Null
$secretFile = Join-Path $dataRoot 'jwt-secret.txt'
if (-not (Test-Path -LiteralPath $secretFile)) {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $secret = [Convert]::ToBase64String($bytes)
    [System.IO.File]::WriteAllText($secretFile, $secret, [System.Text.Encoding]::ASCII)
    Write-Host 'Yeni yerel JWT anahtari olusturuldu.'
}
$env:JWT_SECRET = [System.IO.File]::ReadAllText($secretFile).Trim()
if ($env:JWT_SECRET.Length -lt 32) { throw 'Yerel JWT anahtari gecersiz' }

$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
if (-not (Test-Path (Join-Path $backend 'node_modules')) -or
    -not (Test-Path (Join-Path $frontend 'dist/index.html'))) {
    throw 'Kurulum/build eksik. Once deployment/Install-Windows.ps1 calistirin.'
}
# The FileStream stays open while Node runs and is released automatically after
# a normal exit or crash. No PID file and no removal of a potentially live lock.
# This protects only instances started with the supported Windows launcher.
$lockPath = Join-Path $dataRoot 'gallery-instance.lock'
$lockStream = $null
try {
    $lockStream = [System.IO.File]::Open(
        $lockPath, [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch [System.IO.IOException] {
    throw 'Galeri zaten bu veri klasorunden calisiyor. Ikinci bir ornek acilamaz.'
}

Push-Location $backend
try {
    $dbFile = Join-Path $dataRoot 'art-gallery.sqlite'
    if (-not (Test-Path -LiteralPath $dbFile)) {
        node migrations/runner.js --apply --init-empty
        if ($LASTEXITCODE -ne 0) { throw 'Yeni veritabani olusturulamadi' }
    } else {
        # NEVER migrate existing user data silently.
        node migrations/runner.js --plan
        if ($LASTEXITCODE -ne 0) { throw 'Veritabani incelemesi basarisiz' }
        Write-Host 'Mevcut veritabani eski semadaysa once Migrate-Database.ps1 calistirin.'
    }
    Write-Host 'Adres: http://127.0.0.1:3001'
    node server.js
    if ($LASTEXITCODE -ne 0) { throw 'Sunucu baslatilamadi' }
} finally {
    Pop-Location
    if ($null -ne $lockStream) { $lockStream.Dispose() }
}
