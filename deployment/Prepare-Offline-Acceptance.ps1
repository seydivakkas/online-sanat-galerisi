# Authorized local Windows SQLite snapshot. No network/upload or source writes.
# Example parameters: -SourceFile C:\...\art-gallery.sqlite -BackupDirectory D:\PrivateGalleryBackups
param(
    [Parameter(Mandatory = $true)][string]$SourceFile,
    [Parameter(Mandatory = $true)][string]$BackupDirectory
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA 'ArtGallery'
$lockPath = Join-Path $dataRoot 'gallery-instance.lock'
$lockStream = $null

if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) {
    throw 'Kaynak SQLite dosyasi bulunamadi.'
}
if (-not (Test-Path -LiteralPath $BackupDirectory -PathType Container)) {
    throw 'Ozel yedek klasoru onceden olusturulmali; Git klasoru secmeyin.'
}
if (-not (Test-Path (Join-Path $root 'backend\node_modules'))) {
    throw 'Ilk once deployment/Install-Windows.ps1 komutunu calistirin.'
}

# A successful lock check cannot prove that unrelated SQLite writers stopped.
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
try {
    $lockStream = [System.IO.File]::Open(
        $lockPath, [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch [System.IO.IOException] {
    throw 'Galeri calisiyor: yedekleme icin once uygulamayi kapatin.'
}
try {
    Write-Host 'Diger tum programlarin da ayni SQLite dosyasini kapattigini kontrol edin.'
    $answer = Read-Host 'Kaynak kapali, yedek yetkili ve klasor ozel mi? EVET yazin'
    if ($answer -cne 'EVET') { throw 'Operator onayi olmadigi icin islem iptal edildi.' }

    Push-Location (Join-Path $root 'backend')
    try {
        $nodeArgs = @(
            '.\acceptance\prepareOfflineSnapshot.js',
            '--source', [System.IO.Path]::GetFullPath($SourceFile),
            '--output-dir', [System.IO.Path]::GetFullPath($BackupDirectory)
        )
        & node @nodeArgs
        # Exit code 2 = backup successful but requires human reconciliation.
        if ($LASTEXITCODE -eq 2) {
            Write-Warning 'Tutarsizlik var; local-report.json sadece yerel inceleme icindir.'
        } elseif ($LASTEXITCODE -ne 0) {
            throw 'Snapshot basarisiz. Orijinal SQLite veritabanini degistirmeyin.'
        }
    } finally {
        Pop-Location
    }
} finally {
    if ($null -ne $lockStream) { $lockStream.Dispose() }
}
