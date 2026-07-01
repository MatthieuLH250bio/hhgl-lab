; HHGL Lab — Installateur combiné
; Prérequis : NSIS 3.x + makensis dans le PATH
; Génère : HHGL-Setup.exe

Unicode True

!define APP_NAME      "HHGL Lab"
!define APP_VERSION   "0.1.0"
!define PUBLISHER     "HHGL"
!define INSTALL_DIR   "$PROGRAMFILES64\HHGL"
!define ICON          "..\client\src-tauri\icons\icon.ico"

; Fichiers construits avant d'appeler makensis
!define CLIENT_SETUP  "..\client\src-tauri\target\release\bundle\nsis\hhgl-lab_0.1.0_x64-setup.exe"
!define SERVER_EXE    "..\server\launcher\dist\HHGL Serveur.exe"
!define SERVER_DIR    "..\server"

Name          "${APP_NAME} ${APP_VERSION}"
OutFile       "HHGL-Setup.exe"
InstallDir    "${INSTALL_DIR}"
RequestExecutionLevel admin

Icon          "${ICON}"
!define MUI_ICON "${ICON}"

; Pages
!include "MUI2.nsh"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "French"

; ── Installation ──────────────────────────────────────────────────────────────
Section "HHGL Lab" SEC_MAIN
  SectionIn RO
  SetOutPath "${INSTALL_DIR}"

  ; 1. Client Tauri (installeur silencieux)
  DetailPrint "Installation du client HHGL…"
  File "${CLIENT_SETUP}"
  ExecWait '"${INSTALL_DIR}\hhgl-lab_0.1.0_x64-setup.exe" /S'
  Delete "${INSTALL_DIR}\hhgl-lab_0.1.0_x64-setup.exe"

  ; 2. Launcher serveur
  DetailPrint "Copie du serveur HHGL…"
  File "${SERVER_EXE}"

  ; 3. Dossier serveur (sans .venv — recréé au 1er lancement)
  SetOutPath "${INSTALL_DIR}\server"
  File /r /x ".venv" /x "__pycache__" /x "*.pyc" /x "launcher" "${SERVER_DIR}\*"

  ; 4. Raccourcis Bureau
  CreateShortcut "$DESKTOP\HHGL Client.lnk" \
    "$PROGRAMFILES64\hhgl-lab\hhgl-lab.exe" "" "$PROGRAMFILES64\hhgl-lab\hhgl-lab.exe" 0
  CreateShortcut "$DESKTOP\HHGL Serveur.lnk" \
    "${INSTALL_DIR}\HHGL Serveur.exe" "" "${INSTALL_DIR}\HHGL Serveur.exe" 0

  ; 6. Raccourcis Menu Démarrer
  CreateDirectory "$SMPROGRAMS\HHGL Lab"
  CreateShortcut "$SMPROGRAMS\HHGL Lab\Client.lnk" \
    "$PROGRAMFILES64\hhgl-lab\hhgl-lab.exe" "" "$PROGRAMFILES64\hhgl-lab\hhgl-lab.exe" 0
  CreateShortcut "$SMPROGRAMS\HHGL Lab\Serveur.lnk" \
    "${INSTALL_DIR}\HHGL Serveur.exe" "" "${INSTALL_DIR}\HHGL Serveur.exe" 0
  CreateShortcut "$SMPROGRAMS\HHGL Lab\Désinstaller.lnk" \
    "${INSTALL_DIR}\Uninstall.exe"

  ; 7. WebView2 loopback (permet au client de contacter localhost)
  ExecWait 'CheckNetIsolation LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"'

  ; 8. Désinstalleur
  WriteUninstaller "${INSTALL_DIR}\Uninstall.exe"

  ; 8. Entrée Ajout/Suppression de programmes
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab" \
    "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab" \
    "UninstallString" "${INSTALL_DIR}\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab" \
    "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab" \
    "Publisher" "${PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab" \
    "DisplayIcon" "${ICON}"
SectionEnd

; ── Désinstallation ───────────────────────────────────────────────────────────
Section "Uninstall"
  ; Désinstaller le client Tauri
  ExecWait '"$PROGRAMFILES64\hhgl-lab\Uninstall.exe" /S'

  ; Supprimer les fichiers HHGL
  RMDir /r "${INSTALL_DIR}\server"
  Delete "${INSTALL_DIR}\HHGL Serveur.exe"
  Delete "${INSTALL_DIR}\Uninstall.exe"
  RMDir  "${INSTALL_DIR}"

  ; Raccourcis
  Delete "$DESKTOP\HHGL Client.lnk"
  Delete "$DESKTOP\HHGL Serveur.lnk"
  RMDir /r "$SMPROGRAMS\HHGL Lab"

  ; Registre
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\HHGLLab"
SectionEnd
