# Controlled SQLite migration. No existing database is overwritten.
# Stop running gallery processes before migrating!
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$env:NODE_ENV = 'local'
$env:ART_GALLERY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'ArtGallery'
New-Item -ItemType Directory -Force -Path $env:ART_GALLERY_DATA_DIR | Out-Null
Push-Location (Join-Path $root 'backend')
try {
    node migrations/runner.js --plan
    if ($LASTEXITCODE -ne 0) { throw 'Sema incelemesi basarisiz' }
    $answer = Read-Host 'Veritabani uygulamasi kapali mi? Yedek alarak migration uygulansin mi? (EVET)'
    if ($answer -cne 'EVET') { throw 'Kullanici onayi olmadigindan migration iptal edildi' }
    node migrations/runner.js --apply
    if ($LASTEXITCODE -ne 0) { throw 'Migration basarisiz: loglari ve olusturulan yedegi kontrol edin' }
    Write-Host 'Migration tamamlandi; verileri kontrol ederek uygulamayi baslatin.'
} finally { Pop-Location }
