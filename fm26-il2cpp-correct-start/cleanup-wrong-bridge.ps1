param(
    [string]$ProjectRoot = "C:\dev\fm-player-sorter",
    [string]$FmRoot = "D:\steam\steamapps\common\Football Manager 26"
)

$ErrorActionPreference = "Stop"

function Backup-File {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    $backup = "$Path.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -Force $Path $backup
    Write-Host "Kopia: $backup"
}

function Remove-LinesMatching {
    param(
        [string]$Path,
        [string[]]$Patterns
    )

    if (-not (Test-Path $Path)) {
        return
    }

    Backup-File $Path

    $lines = Get-Content $Path
    $filtered = foreach ($line in $lines) {
        $remove = $false

        foreach ($pattern in $Patterns) {
            if ($line -match $pattern) {
                $remove = $true
                break
            }
        }

        if (-not $remove) {
            $line
        }
    }

    $filtered | Set-Content -Path $Path -Encoding UTF8
    Write-Host "Oczyszczono: $Path"
}

Write-Host ""
Write-Host "=== USUWANIE BŁĘDNEJ ŚCIEŻKI BepInEx bridge ==="

$pathsToRemove = @(
    (Join-Path $ProjectRoot "bridge-step1"),
    (Join-Path $ProjectRoot "fm-bridge"),
    (Join-Path $ProjectRoot "src-tauri\src\fm_bridge.rs"),
    (Join-Path $ProjectRoot "src\services\fmDatabaseBridge.ts"),
    (Join-Path $ProjectRoot "src\components\FmConnection\FmDatabaseBridgePanel.tsx"),
    (Join-Path $ProjectRoot "src\components\FmConnection\FmDatabaseBridgePanel.css"),
    (Join-Path $ProjectRoot "src-tauri\src\fm_date_scan.rs"),
    (Join-Path $ProjectRoot "src-tauri\src\fm_date_diff.rs"),
    (Join-Path $ProjectRoot "src\components\FmConnection\FmDateCalibrationPanel.tsx"),
    (Join-Path $ProjectRoot "src\components\FmConnection\FmDateDifferencePanel.tsx"),
    (Join-Path $FmRoot "BepInEx\plugins\FMPlayerSorterBridge")
)

foreach ($path in $pathsToRemove) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Usunięto: $path"
    }
}

$libRs = Join-Path $ProjectRoot "src-tauri\src\lib.rs"

Remove-LinesMatching -Path $libRs -Patterns @(
    '^\s*mod\s+fm_bridge\s*;\s*$',
    '^\s*fm_bridge::get_fm_bridge_status\s*,?\s*$',
    '^\s*fm_bridge::get_fm_bridge_result\s*,?\s*$',
    '^\s*fm_bridge::get_fm_bridge_paths\s*,?\s*$',
    '^\s*fm_bridge::request_fm_database_load\s*,?\s*$',
    '^\s*mod\s+fm_date_scan\s*;\s*$',
    '^\s*mod\s+fm_date_diff\s*;\s*$',
    '^\s*fm_date_scan::.*$',
    '^\s*fm_date_diff::.*$'
)

$connectionPanel = Join-Path $ProjectRoot "src\components\FmConnection\FmConnectionPanel.tsx"

Remove-LinesMatching -Path $connectionPanel -Patterns @(
    'FmDatabaseBridgePanel',
    '<FmDatabaseBridgePanel\s*/>',
    'FmDateCalibrationPanel',
    'FmDateDifferencePanel',
    '<FmDateCalibrationPanel\s*/>',
    '<FmDateDifferencePanel\s*/>'
)

# Nie usuwamy:
# - FM26PlayerExport
# - BepInEx
# - interop/cache
# - fm_process.rs, fm_memory.rs, fm_build.rs, fm_modules.rs
# - sha2
# Są nadal przydatne jako dane diagnostyczne lub profile wersji.


$archiveSourceNames = @(
    "bepinex-diagnostic.txt",
    "fm-api-report.json",
    "fm-api-summary.txt",
    "inspect-fm-api.ps1"
)

$archiveItems = @(
    $archiveSourceNames |
        ForEach-Object { Join-Path $ProjectRoot $_ } |
        Where-Object { Test-Path $_ }
)

if ($archiveItems.Count -gt 0) {
    $archiveDir = Join-Path $ProjectRoot (
        "tools\archive\bepinex-research-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    )

    New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

    foreach ($item in $archiveItems) {
        Move-Item -Force $item $archiveDir
        Write-Host "Przeniesiono do archiwum: $item"
    }

    Write-Host "Archiwum diagnostyki: $archiveDir"
}

Write-Host ""
Write-Host "=== KONTROLA ==="

$checkPatterns = @(
    "fm_bridge",
    "FmDatabaseBridgePanel",
    "fmDatabaseBridge",
    "fm_date_scan",
    "fm_date_diff",
    "FmDateCalibrationPanel",
    "FmDateDifferencePanel"
)

foreach ($pattern in $checkPatterns) {
    $matches = Get-ChildItem $ProjectRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notmatch '\\node_modules\\' -and
            $_.FullName -notmatch '\\target\\' -and
            $_.FullName -notmatch '\.bak-\d'
        } |
        Select-String -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue

    if ($matches) {
        Write-Warning "Nadal znaleziono '$pattern':"
        $matches | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
    }
}

Write-Host ""
Write-Host "Sprzątanie zakończone."
Write-Host "Nie usunięto istniejącego FM26PlayerExport ani BepInEx."
