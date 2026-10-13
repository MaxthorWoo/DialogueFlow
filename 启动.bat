@echo off
title NarrativeFlow Launcher
where node >nul 2>nul
if errorlevel 1 goto NO_NODE
where cargo >nul 2>nul
if errorlevel 1 goto NO_RUST
if not exist node_modules call npm install
echo Starting NarrativeFlow (first Rust build takes a few minutes)...
call npm run tauri dev
goto END
:NO_NODE
echo [X] Node.js not found. Install it first:  winget install OpenJS.NodeJS.LTS
pause
goto END
:NO_RUST
echo [!] Rust toolchain not found. Downloading rustup-init...
curl -o "C:WindowsTEMPustup-init.exe" https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe
"C:WindowsTEMPustup-init.exe" -y --default-toolchain stable-x86_64-pc-windows-msvc --profile minimal
if errorlevel 1 goto RUST_FAIL
set "PATH=C:UsersAdministrator.cargoin;D:CodeBuddy CNesourcesappextensionsgenieoutendorshimsafe-bin;C:Windowssystem32;C:Windows;C:WindowsSystem32Wbem;C:WindowsSystem32WindowsPowerShell1.0;C:WindowsSystem32OpenSSH;D:Nodejs;C:UsersAdministratorAppDataLocalMicrosoftWindowsApps;C:UsersAdministratorAppDataRoamingProgramsZero Install;C:UsersAdministratorAppDataLocalPythonin;C:UsersAdministratorAppDataRoaming
pm;D:Microsoft VS Codein;C:UsersAdministratorAppDataLocalPythonpythoncore-3.14-64Scripts;C:UsersAdministratorAppDataLocaleflexunin;C:UsersAdministratorAppDataLocalGitHubDesktopin;C:WindowsSystem32;D:CodeBuddy CNin;"
echo Starting NarrativeFlow (first Rust build takes a few minutes)...
call npm run tauri dev
goto END
:RUST_FAIL
echo [X] Rust install failed. Install manually from https://rustup.cc
pause
goto END
:END
pause
