!ifndef BUILD_UNINSTALLER
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

Var ScolarisDatabaseDialog
Var ScolarisDatabaseViewport
Var ScolarisDatabaseContent
Var ScolarisDatabaseHostControl
Var ScolarisDatabasePortControl
Var ScolarisDatabaseNameControl
Var ScolarisDatabaseUserControl
Var ScolarisDatabasePasswordControl
Var ScolarisDatabaseModeControl
Var ScolarisDatabaseKeepControl
Var ScolarisDatabaseScrollControl
Var ScolarisDatabaseRect
Var ScolarisDatabaseViewportHeight
Var ScolarisDatabaseScrollMaximum
Var ScolarisDatabaseScrollOffset
Var ScolarisDatabaseLastFocus
Var ScolarisDatabaseInitialized
Var ScolarisDatabaseHost
Var ScolarisDatabasePort
Var ScolarisDatabaseName
Var ScolarisDatabaseUser
Var ScolarisDatabasePassword
Var ScolarisUseSqlite
Var ScolarisKeepDatabaseConfig

!macro customPageAfterChangeDir
  Page custom ScolarisDatabasePageCreate ScolarisDatabasePageLeave
!macroend

; Move a single content window inside a clipping viewport. Fields cannot cover
; the scroll control, and scrolling never moves the installer page buttons.
!macro ScolarisDatabaseAttach Control
  System::Call 'user32::SetParent(p ${Control}, p $ScolarisDatabaseContent)p.r0'
!macroend

Function ScolarisDatabasePageCreate
  !insertmacro MUI_HEADER_TEXT "Base de données Scolaris" "Choisissez la base intégrée ou configurez votre serveur MySQL."
  ${NSD_InitCommonControlsEx} 0x4

  ${If} $ScolarisDatabaseInitialized != 1
    StrCpy $ScolarisDatabaseHost "127.0.0.1"
    StrCpy $ScolarisDatabasePort "3306"
    StrCpy $ScolarisDatabaseName "Gestion_ecole"
    StrCpy $ScolarisDatabaseUser "root"
    StrCpy $ScolarisDatabasePassword ""
    StrCpy $ScolarisUseSqlite 1
    StrCpy $ScolarisKeepDatabaseConfig 0
    IfFileExists "$APPDATA\scolaris\backend\.env" 0 +2
      StrCpy $ScolarisKeepDatabaseConfig 1
    StrCpy $ScolarisDatabaseInitialized 1
  ${EndIf}

  nsDialogs::Create 1018
  Pop $ScolarisDatabaseDialog
  ${If} $ScolarisDatabaseDialog == error
    Abort
  ${EndIf}

  System::Alloc 16
  Pop $ScolarisDatabaseRect
  ${If} $ScolarisDatabaseRect == 0
    MessageBox MB_ICONSTOP|MB_OK "Impossible de préparer le défilement de la page MySQL."
    Abort
  ${EndIf}

  nsDialogs::CreateControl STATIC ${DEFAULT_STYLES}|${WS_CLIPCHILDREN} ${WS_EX_CONTROLPARENT} 0 0 278u 100% ""
  Pop $ScolarisDatabaseViewport
  nsDialogs::CreateControl STATIC ${DEFAULT_STYLES}|${WS_CLIPCHILDREN} ${WS_EX_CONTROLPARENT} 0 0 278u 265u ""
  Pop $ScolarisDatabaseContent
  System::Call 'user32::SetParent(p $ScolarisDatabaseContent, p $ScolarisDatabaseViewport)p.r0'
  System::Call 'user32::GetClientRect(p $ScolarisDatabaseViewport, p $ScolarisDatabaseRect)i.r0'
  System::Call '*$ScolarisDatabaseRect(i, i, i, i .r1)'
  StrCpy $ScolarisDatabaseViewportHeight $1
  System::Call 'user32::GetClientRect(p $ScolarisDatabaseContent, p $ScolarisDatabaseRect)i.r0'
  System::Call '*$ScolarisDatabaseRect(i, i, i, i .r2)'
  IntOp $ScolarisDatabaseScrollMaximum $2 - $1
  ${If} $ScolarisDatabaseScrollMaximum < 0
    StrCpy $ScolarisDatabaseScrollMaximum 0
  ${EndIf}
  StrCpy $ScolarisDatabaseScrollOffset 0
  StrCpy $ScolarisDatabaseLastFocus 0

  ${NSD_CreateCheckbox} 0 0 278u 18u "Conserver la configuration actuelle (mise à jour)"
  Pop $ScolarisDatabaseKeepControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabaseKeepControl
  ${If} $ScolarisKeepDatabaseConfig == 1
    ${NSD_Check} $ScolarisDatabaseKeepControl
  ${EndIf}
  IfFileExists "$APPDATA\scolaris\backend\.env" +2 0
    EnableWindow $ScolarisDatabaseKeepControl 0

  ${NSD_CreateCheckbox} 0 22u 278u 18u "Base intégrée SQLite (sans serveur MySQL)"
  Pop $ScolarisDatabaseModeControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabaseModeControl
  ${If} $ScolarisUseSqlite == 1
    ${NSD_Check} $ScolarisDatabaseModeControl
  ${EndIf}

  ${NSD_CreateLabel} 0 44u 278u 28u "Pour MySQL, décochez SQLite, puis renseignez les champs ci-dessous. Utilisez le curseur à droite ou la touche Tab pour défiler."
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0

  ${NSD_CreateLabel} 0 77u 278u 12u "Adresse du serveur"
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0
  ${NSD_CreateText} 0 90u 278u 14u $ScolarisDatabaseHost
  Pop $ScolarisDatabaseHostControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabaseHostControl

  ${NSD_CreateLabel} 0 108u 278u 12u "Port"
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0
  ${NSD_CreateNumber} 0 121u 278u 14u $ScolarisDatabasePort
  Pop $ScolarisDatabasePortControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabasePortControl
  ${NSD_Edit_SetTextLimit} $ScolarisDatabasePortControl 5

  ${NSD_CreateLabel} 0 139u 278u 12u "Nom de la base de données"
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0
  ${NSD_CreateText} 0 152u 278u 14u $ScolarisDatabaseName
  Pop $ScolarisDatabaseNameControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabaseNameControl

  ${NSD_CreateLabel} 0 170u 278u 12u "Utilisateur MySQL"
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0
  ${NSD_CreateText} 0 183u 278u 14u $ScolarisDatabaseUser
  Pop $ScolarisDatabaseUserControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabaseUserControl

  ${NSD_CreateLabel} 0 201u 278u 12u "Mot de passe MySQL (vide si le compte n'en a pas)"
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0
  ${NSD_CreatePassword} 0 214u 278u 14u $ScolarisDatabasePassword
  Pop $ScolarisDatabasePasswordControl
  !insertmacro ScolarisDatabaseAttach $ScolarisDatabasePasswordControl

  ${NSD_CreateLabel} 0 234u 278u 28u "Les données seront enregistrées dans votre profil Windows. Pour MySQL, la base et le compte doivent déjà exister."
  Pop $0
  !insertmacro ScolarisDatabaseAttach $0

  nsDialogs::CreateControl msctls_trackbar32 ${__NSD_VTrackBar_STYLE}|${WS_TABSTOP} ${__NSD_VTrackBar_EXSTYLE} 282u 0 18u 100% ""
  Pop $ScolarisDatabaseScrollControl
  ${NSD_TrackBar_SetRangeMin} $ScolarisDatabaseScrollControl 0
  ${NSD_TrackBar_SetRangeMax} $ScolarisDatabaseScrollControl $ScolarisDatabaseScrollMaximum
  ${NSD_TrackBar_SetPos} $ScolarisDatabaseScrollControl 0
  ${NSD_TrackBar_SetLineSize} $ScolarisDatabaseScrollControl 16
  ${NSD_TrackBar_SetPageSize} $ScolarisDatabaseScrollControl $ScolarisDatabaseViewportHeight
  ${NSD_TrackBar_ClearTics} $ScolarisDatabaseScrollControl
  ${NSD_OnBack} ScolarisDatabaseRemember
  ${NSD_CreateTimer} ScolarisDatabaseScroll 30

  nsDialogs::Show

  ; Abort during validation keeps this page open and must keep scrolling alive.
  ${NSD_KillTimer} ScolarisDatabaseScroll
  System::Free $ScolarisDatabaseRect
  StrCpy $ScolarisDatabaseRect 0
FunctionEnd

Function ScolarisDatabaseScroll
  Push $0
  Push $1
  Push $2
  Push $3
  ${NSD_TrackBar_GetPos} $ScolarisDatabaseScrollControl $0

  ; Reveal fields reached with Tab/Shift+Tab without undoing manual scrolling.
  System::Call 'user32::GetFocus()p.r1'
  ${If} $1 != $ScolarisDatabaseLastFocus
    StrCpy $ScolarisDatabaseLastFocus $1
    System::Call 'user32::IsChild(p $ScolarisDatabaseContent, p r1)i.r2'
    ${If} $2 != 0
      System::Call 'user32::GetWindowRect(p r1, p $ScolarisDatabaseRect)i.r2'
      System::Call 'user32::MapWindowPoints(p 0, p $ScolarisDatabaseViewport, p $ScolarisDatabaseRect, i 2)i.r2'
      System::Call '*$ScolarisDatabaseRect(i, i .r2, i, i .r3)'
      ${If} $2 < 0
        IntOp $0 $ScolarisDatabaseScrollOffset + $2
      ${ElseIf} $3 > $ScolarisDatabaseViewportHeight
        IntOp $0 $ScolarisDatabaseScrollOffset + $3
        IntOp $0 $0 - $ScolarisDatabaseViewportHeight
      ${EndIf}
    ${EndIf}
  ${EndIf}
  ${If} $0 < 0
    StrCpy $0 0
  ${ElseIf} $0 > $ScolarisDatabaseScrollMaximum
    StrCpy $0 $ScolarisDatabaseScrollMaximum
  ${EndIf}
  ${If} $0 != $ScolarisDatabaseScrollOffset
    StrCpy $ScolarisDatabaseScrollOffset $0
    ${NSD_TrackBar_SetPos} $ScolarisDatabaseScrollControl $0
    IntOp $1 0 - $0
    System::Call 'user32::SetWindowPos(p $ScolarisDatabaseContent, p 0, i 0, i r1, i 0, i 0, i 0x15)i.r2'
  ${EndIf}
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd

Function ScolarisDatabaseRemember
  ${NSD_GetState} $ScolarisDatabaseKeepControl $ScolarisKeepDatabaseConfig
  ${NSD_GetState} $ScolarisDatabaseModeControl $ScolarisUseSqlite
  ${NSD_GetText} $ScolarisDatabaseHostControl $ScolarisDatabaseHost
  ${NSD_GetText} $ScolarisDatabasePortControl $ScolarisDatabasePort
  ${NSD_GetText} $ScolarisDatabaseNameControl $ScolarisDatabaseName
  ${NSD_GetText} $ScolarisDatabaseUserControl $ScolarisDatabaseUser
  ${NSD_GetText} $ScolarisDatabasePasswordControl $ScolarisDatabasePassword
FunctionEnd

Function ScolarisDatabasePageLeave
  Call ScolarisDatabaseRemember

  ${If} $ScolarisKeepDatabaseConfig == 1
    Delete "$APPDATA\scolaris\backend\installer-db.ini"
    Return
  ${EndIf}

  ${If} $ScolarisUseSqlite == 1
    CreateDirectory "$APPDATA\scolaris\backend"
    ClearErrors
    FileOpen $0 "$APPDATA\scolaris\backend\installer-db.ini" w
    IfErrors databaseSettingsWriteError
    FileWriteUTF16LE /BOM $0 "DB_CONNECTION=sqlite$\r$\n"
    FileClose $0
    IfErrors databaseSettingsWriteError
    Return
  ${EndIf}

  ${If} $ScolarisDatabaseHost == ""
  ${OrIf} $ScolarisDatabaseName == ""
  ${OrIf} $ScolarisDatabaseUser == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "Renseignez l'adresse MySQL, le nom de la base et l'utilisateur."
    Abort
  ${EndIf}

  ; ES_NUMBER restricts typing; validate pasted values as well.
  StrLen $0 $ScolarisDatabasePort
  ${If} $0 == 0
    Goto portInvalid
  ${EndIf}
  StrCpy $1 0
  portDigit:
    StrCpy $2 $ScolarisDatabasePort 1 $1
    ${If} $2 S< "0"
    ${OrIf} $2 S> "9"
      Goto portInvalid
    ${EndIf}
    IntOp $1 $1 + 1
    IntCmp $1 $0 portRange portDigit portInvalid
  portRange:
    IntCmp $ScolarisDatabasePort 1 portValid portInvalid portValid
  portInvalid:
    MessageBox MB_ICONEXCLAMATION|MB_OK "Le port MySQL doit être un nombre compris entre 1 et 65535."
    System::Call 'user32::SetFocus(p $ScolarisDatabasePortControl)p.r0'
    Abort
  portValid:
  IntCmp $ScolarisDatabasePort 65535 saveDatabaseSettings saveDatabaseSettings portInvalid

  saveDatabaseSettings:
  CreateDirectory "$APPDATA\scolaris\backend"
  ClearErrors
  FileOpen $0 "$APPDATA\scolaris\backend\installer-db.ini" w
  IfErrors databaseSettingsWriteError
  FileWriteUTF16LE /BOM $0 "DB_CONNECTION=mysql$\r$\n"
  FileWriteUTF16LE $0 "DB_HOST=$ScolarisDatabaseHost$\r$\n"
  FileWriteUTF16LE $0 "DB_PORT=$ScolarisDatabasePort$\r$\n"
  FileWriteUTF16LE $0 "DB_DATABASE=$ScolarisDatabaseName$\r$\n"
  FileWriteUTF16LE $0 "DB_USERNAME=$ScolarisDatabaseUser$\r$\n"
  FileWriteUTF16LE $0 "DB_PASSWORD=$ScolarisDatabasePassword$\r$\n"
  FileClose $0
  IfErrors databaseSettingsWriteError
  Goto databaseSettingsWritten

  databaseSettingsWriteError:
  MessageBox MB_ICONSTOP|MB_OK "Impossible d'enregistrer la configuration MySQL dans votre profil Windows."
  Abort

  databaseSettingsWritten:
FunctionEnd
!endif
