@echo off
REM ===========================================================================
REM Rukoborec Desktop - build (C# .NET 8 + WebView2), Windows
REM Requirements: .NET 8 SDK (or newer), Node.js LTS (or bun).
REM Visual Studio, Rust and C++ are NOT required.
REM ===========================================================================
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "APP_DIR=%SCRIPT_DIR%Rukoborec"
set "OUT_DIR=%SCRIPT_DIR%release\Rukoborec"
set "REL_DIR=%SCRIPT_DIR%release"
set "APP_VER="
set /p APP_VER=<"%SCRIPT_DIR%version.txt"
for /f "tokens=* delims= " %%v in ("!APP_VER!") do set "APP_VER=%%v"
if not defined APP_VER set "APP_VER=1.0.0"

echo.
echo ============================================
echo   Rukoborec Desktop !APP_VER! - build (C# / .NET 8)
echo ============================================
echo.

echo [0/5] Checking installed tools...
where dotnet >nul 2>nul
if errorlevel 1 goto no_dotnet
dotnet --list-sdks | findstr /b "8. 9. 10." >nul
if errorlevel 1 goto no_dotnet
echo   OK: .NET SDK

set "PM="
where bun >nul 2>nul && set "PM=bun"
if not defined PM (
  where npm >nul 2>nul && set "PM=npm"
)
if not defined PM goto no_node
echo   OK: !PM!

echo.
echo [1/5] Installing interface dependencies...
cd /d "%ROOT_DIR%"
if "!PM!"=="bun" (
  echo   Note: "Unknown lockfile version" from an older bun is only a warning - run "bun upgrade" to hide it.
  call bun install --no-save
) else (
  call npm install --no-audit --no-fund --legacy-peer-deps
)
if errorlevel 1 goto build_error

echo.
echo [2/5] Building interface...
call !PM! run build:desktop
if errorlevel 1 goto build_error
echo   OK: dist-desktop
if "!PM!"=="bun" (
  call bun "%SCRIPT_DIR%hash-web.mjs"
) else (
  call node "%SCRIPT_DIR%hash-web.mjs"
)
if errorlevel 1 goto build_error

echo.
echo [3/5] Building C# program...
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
dotnet publish "%APP_DIR%\Rukoborec.csproj" -c Release -p:Version=!APP_VER! -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "%OUT_DIR%"
if errorlevel 1 goto build_error

echo.
echo [4/5] Building installer (Inno Setup)...
set "ISCC="
for %%p in ("%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" "%ProgramFiles%\Inno Setup 6\ISCC.exe" "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe") do (
  if not defined ISCC if exist %%p set "ISCC=%%~p"
)
if not defined ISCC (
  where iscc >nul 2>nul && set "ISCC=iscc"
)
set "SETUP_EXE="
if defined ISCC (
  if exist "%REL_DIR%\Rukoborec-Setup-!APP_VER!.exe" del /q "%REL_DIR%\Rukoborec-Setup-!APP_VER!.exe"
  "!ISCC!" /Q "/DAppVersion=!APP_VER!" "%SCRIPT_DIR%installer\Rukoborec.iss"
  if errorlevel 1 goto build_error
  set "SETUP_EXE=%REL_DIR%\Rukoborec-Setup-!APP_VER!.exe"
  echo   OK: !SETUP_EXE!
) else (
  echo   Inno Setup 6 not found - installer skipped.
  echo   Install it from https://jrsoftware.org/isdl.php and run build.bat again.
)

echo.
echo [5/5] Done! Version !APP_VER!
echo   Program: %OUT_DIR%\Rukoborec.exe
if defined SETUP_EXE echo   Installer: !SETUP_EXE!
echo   The interface is embedded into Rukoborec.exe and verified on every start.
echo   The Rukoborec folder can be copied to any Windows 10/11 PC (no .NET needed).
echo.
echo ============================================
start "" "%REL_DIR%"
pause
exit /b 0

:no_dotnet
echo.
echo   .NET 8 SDK NOT FOUND.
echo   1. Install .NET 8 SDK (x64): https://dotnet.microsoft.com/download/dotnet/8.0
echo   2. Close this window and run build.bat again.
start "" "https://dotnet.microsoft.com/download/dotnet/8.0"
pause
exit /b 1

:no_node
echo.
echo   Node.js NOT FOUND.
echo   1. Install Node.js LTS: https://nodejs.org
echo   2. Close this window and run build.bat again.
start "" "https://nodejs.org/en/download"
pause
exit /b 1

:build_error
echo.
echo   BUILD ERROR. See the messages above.
pause
exit /b 1
