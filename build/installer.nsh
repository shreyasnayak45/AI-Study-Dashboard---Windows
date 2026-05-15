; ──────────────────────────────────────────────────────────────────────────
; Install-page strings
; ──────────────────────────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Install StudyFlow"
!define MUI_WELCOMEPAGE_TEXT "StudyFlow will be installed for your Windows user account.$\r$\n$\r$\nYou can choose the installation location before setup begins."
!define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where StudyFlow should be installed. Setup will use this location for the desktop app and future updates."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Install StudyFlow to:"
!define MUI_FINISHPAGE_TITLE "StudyFlow is ready"
!define MUI_FINISHPAGE_TEXT "StudyFlow has been installed successfully."
!define MUI_FINISHPAGE_RUN_TEXT "Launch StudyFlow"
!define MUI_INSTFILESPAGE_COLORS "F8FAFC 09090F"
!define MUI_INSTFILESPAGE_PROGRESSBAR "colored smooth"

; ──────────────────────────────────────────────────────────────────────────
; Uninstall-page strings — MUI2 falls back to install-page strings for the
; uninstaller unless we define MUI_UN* variants, so without these the
; uninstaller's Welcome page reads "Install StudyFlow / StudyFlow will be
; installed for your Windows user account" instead of uninstall wording.
; ──────────────────────────────────────────────────────────────────────────
!define MUI_UNWELCOMEPAGE_TITLE "Uninstall StudyFlow"
!define MUI_UNWELCOMEPAGE_TEXT "Setup will remove StudyFlow from your Windows user account.$\r$\n$\r$\nClose StudyFlow before continuing if it is running."
!define MUI_UNCONFIRMPAGE_TEXT_TOP "StudyFlow will be removed from the location below. Click Uninstall to continue."
!define MUI_UNCONFIRMPAGE_TEXT_LOCATION "Uninstalling StudyFlow from:"
!define MUI_UNFINISHPAGE_TITLE "StudyFlow was removed"
!define MUI_UNFINISHPAGE_TEXT "StudyFlow has been uninstalled successfully."

; ──────────────────────────────────────────────────────────────────────────
; Bring the wizard window to the foreground when the first page renders.
; UAC.nsh already claims .onGUIInit so we hook the install-side Welcome
; page PRE function instead. Installer-only (uninstaller doesn't reference
; this function, and !ifndef BUILD_UNINSTALLER keeps the symbol out of the
; uninstall build so makensis doesn't flag it as unreferenced).
; ──────────────────────────────────────────────────────────────────────────
!ifndef BUILD_UNINSTALLER
  Function studyflowBringToFront
    BringToFront
  FunctionEnd
!endif

!macro customWelcomePage
  !define MUI_PAGE_CUSTOMFUNCTION_PRE studyflowBringToFront
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Force per-user install (skip the all-users/current-user mode page).
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; Drop any locally-bundled .env.local on install/uninstall — it must
; never be shipped, and a stale copy must not survive an upgrade.
!macro customInstall
  Delete "$INSTDIR\resources\.env.local"
!macroend

!macro customUnInstall
  Delete "$INSTDIR\resources\.env.local"
!macroend

; During an update/install-over-existing, electron-builder first runs the
; previous uninstaller silently with --updated. Its default atomic rename path
; can return a non-zero exit code for leftover files and then the parent
; installer shows the misleading "StudyFlow cannot be closed" dialog. For
; update mode, remove what can be removed and let the parent installer extract
; the new app files into $INSTDIR. Manual uninstall still treats removal errors
; as uninstall failures, but without reusing close-app wording unless the exact
; installed StudyFlow.exe is actually running.
!macro customRemoveFiles
  SetOutPath "$TEMP"

  ${if} ${isUpdated}
    RMDir /r "$INSTDIR"
    ClearErrors
  ${else}
    RMDir /r "$INSTDIR"
    ${if} ${Errors}
      !insertmacro studyflowFindRunningExact $R0
      ${if} $R0 == 0
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY +2
        Quit
        !insertmacro studyflowKillRunningExact
        Sleep 1000
      ${else}
        Abort "StudyFlow could not be fully removed. Please try uninstalling again."
      ${endIf}
    ${endIf}
  ${endIf}
!macroend

; ──────────────────────────────────────────────────────────────────────────
; Process detection / kill — scoped strictly to the installed StudyFlow.exe
; ──────────────────────────────────────────────────────────────────────────
; Filters on `Name = 'StudyFlow.exe'` AND an exact ExecutablePath match
; against $INSTDIR\StudyFlow.exe, so it never picks up:
;   - the installer itself        (StudyFlow-Setup-*.exe)
;   - the uninstaller             (Uninstall StudyFlow.exe)
;   - the old-uninstaller copy    (old-uninstaller.exe in $PLUGINSDIR)
;   - any other StudyFlow.exe living outside the install directory.
; Only the real installed main process and its same-exe Electron helpers
; (renderer / GPU / network) can match.
!macro studyflowFindRunningExact _RETURN
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -C "$$target = [IO.Path]::GetFullPath((Join-Path '$INSTDIR' '${APP_EXECUTABLE_FILENAME}')); $$running = @(Get-CimInstance -ClassName Win32_Process -Filter \"Name = '${APP_EXECUTABLE_FILENAME}'\" | ? { $$_.ExecutablePath -and ([IO.Path]::GetFullPath($$_.ExecutablePath) -ieq $$target) }); if ($$running.Count -gt 0) { exit 0 } else { exit 1 }"`
  Pop ${_RETURN}
!macroend

!macro studyflowKillRunningExact
  nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -C "$$target = [IO.Path]::GetFullPath((Join-Path '$INSTDIR' '${APP_EXECUTABLE_FILENAME}')); Get-CimInstance -ClassName Win32_Process -Filter \"Name = '${APP_EXECUTABLE_FILENAME}'\" | ? { $$_.ExecutablePath -and ([IO.Path]::GetFullPath($$_.ExecutablePath) -ieq $$target) } | % { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
  Pop $0
!macroend

!macro studyflowRetireExistingInstallDir
  ${if} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    SetOutPath "$TEMP"
    RMDir /r "$PLUGINSDIR\previous-studyflow-install"
    Rename "$INSTDIR" "$PLUGINSDIR\previous-studyflow-install"

    ${if} ${Errors}
      ClearErrors
      RMDir /r "$INSTDIR"
    ${else}
      DeleteRegKey SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}"
      DeleteRegKey SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}"
    ${endIf}

    ClearErrors
  ${endIf}
!macroend

!macro customCheckAppRunning
  !insertmacro studyflowFindRunningExact $R0

  ${if} $R0 == 0
    ${if} ${isUpdated}
      Sleep 1000
    ${endIf}

    DetailPrint "$(appClosing)"
    !insertmacro studyflowKillRunningExact
    Sleep 1000

    !insertmacro studyflowFindRunningExact $R0
    ${if} $R0 == 0
      !insertmacro studyflowKillRunningExact
      Sleep 1000
      !insertmacro studyflowFindRunningExact $R0
    ${endIf}

    ${if} $R0 == 0
      ${if} ${Silent}
        DetailPrint "StudyFlow is still running after close attempts. Continuing without showing a close-app dialog."
      ${else}
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY +2
        Quit
        !insertmacro studyflowKillRunningExact
        Sleep 1000
      ${endIf}
    ${endIf}
  ${endIf}

  !insertmacro studyflowFindRunningExact $R0
  ${if} $R0 != 0
    !insertmacro studyflowRetireExistingInstallDir
  ${endIf}
!macroend

!macro customUnInstallCheck
  ${if} $R0 != 0
    !insertmacro studyflowFindRunningExact $R1

    ${if} $R1 == 0
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY +2
      Quit
      !insertmacro studyflowKillRunningExact
      Sleep 1000
    ${else}
      DetailPrint "Previous StudyFlow uninstaller returned $R0, but no StudyFlow process is running. Continuing installation."
      ClearErrors
      StrCpy $R0 0
    ${endIf}
  ${else}
    ClearErrors
  ${endIf}
!macroend
