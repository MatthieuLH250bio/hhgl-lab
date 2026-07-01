# build.ps1 — Compile l'installateur HHGL complet
# Usage : .\build\build.ps1
# Prérequis : Rust, Node, Python 3.10+, PyInstaller, NSIS

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    OK : $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "    ERREUR : $msg" -ForegroundColor Red; exit 1 }

# ── 0. Fermer les processus qui verrouillent les fichiers Rust ────────────────
Step "Fermeture des processus tauri dev en cours"
Get-Process -Name "hhgl-lab","tauri","cargo" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "    Arrêt de $($_.Name) (PID $($_.Id))" -ForegroundColor Yellow
    $_ | Stop-Process -Force
}
Start-Sleep -Seconds 2
Ok "Processus libérés"

# ── 1. Client Tauri ───────────────────────────────────────────────────────────
Step "Build client Tauri"
Set-Location "$Root\client"
npm run tauri build
if ($LASTEXITCODE -ne 0) { Fail "Tauri build échoué" }
$clientExe = Get-ChildItem "$Root\client\src-tauri\target\release\bundle\nsis\*setup*.exe" |
             Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $clientExe) { Fail "Installateur Tauri introuvable" }
Ok $clientExe.Name

# ── 2. Launcher serveur (PyInstaller) ─────────────────────────────────────────
Step "Build launcher serveur (PyInstaller)"
Set-Location "$Root\server"

# Installe psutil si absent
.\.venv\Scripts\python.exe -m pip install pyinstaller psutil --quiet
if ($LASTEXITCODE -ne 0) { Fail "pip install échoué" }

.\.venv\Scripts\pyinstaller.exe launcher\launcher.spec --distpath launcher\dist --workpath launcher\build_tmp --noconfirm
if ($LASTEXITCODE -ne 0) { Fail "PyInstaller échoué" }
Ok "HHGL Serveur.exe généré"

# ── 3. Mettre à jour la référence dans le .nsi si le nom du setup a changé ───
Step "Mise à jour du nom du setup dans installer.nsi"
$nsiPath = "$Root\build\installer.nsi"
$nsiContent = Get-Content $nsiPath -Raw
$newName = $clientExe.Name
$newSetupPath = "..\client\src-tauri\target\release\bundle\nsis\$newName"
$nsiContent = $nsiContent -replace '(?<=!define CLIENT_SETUP\s+")[^"]+(?=")', $newSetupPath
[System.IO.File]::WriteAllText($nsiPath, $nsiContent, [System.Text.UTF8Encoding]::new($false))
Ok "installer.nsi mis à jour"

# ── 4. NSIS ───────────────────────────────────────────────────────────────────
Step "Build installateur NSIS"
Set-Location "$Root\build"

$makensis = Get-Command makensis -ErrorAction SilentlyContinue
if (-not $makensis) {
    # Cherche dans les emplacements courants
    $candidates = @(
        "C:\Program Files (x86)\NSIS\makensis.exe",
        "C:\Program Files\NSIS\makensis.exe"
    )
    $makensis = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $makensis) { Fail "makensis introuvable. Installez NSIS : https://nsis.sourceforge.io/" }
}

& $makensis installer.nsi
if ($LASTEXITCODE -ne 0) { Fail "NSIS échoué" }
Ok "HHGL-Setup.exe généré dans build\"

# ── Résumé ────────────────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Installateur prêt : build\HHGL-Setup.exe" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
