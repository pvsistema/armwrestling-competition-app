@echo off
REM ===========================================================================
REM Armsport Desktop - build (C# .NET 8 + WebView2), Windows
REM Requirements: .NET 8 SDK (or newer), Node.js LTS (or bun).
REM Visual Studio, Rust and C++ are NOT required.
REM ===========================================================================
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "APP_DIR=%SCRIPT_DIR%Armsport"
set "OUT_DIR=%SCRIPT_DIR%release\Armsport"

echo.
echo ============================================
echo   Armsport Desktop - build (C# / .NET 8)
echo ============================================
echo.

echo [0/4] Checking installed tools...
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
echo [1/4] Installing interface dependencies...
cd /d "%ROOT_DIR%"
if "!PM!"=="bun" (
  echo   Note: "Unknown lockfile version" from an older bun is only a warning - run "bun upgrade" to hide it.
  call bun install --no-save
) else (
  call npm install --no-audit --no-fund --legacy-peer-deps
)
if errorlevel 1 goto build_error

echo.
echo [2/4] Building interface...
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
echo [3/4] Building C# program...
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
dotnet publish "%APP_DIR%\Armsport.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "%OUT_DIR%"
if errorlevel 1 goto build_error

echo.
echo [4/4] Done!
echo   Program: %OUT_DIR%\Armsport.exe
echo   The interface is embedded into Armsport.exe and verified on every start.
echo   The Armsport folder can be copied to any Windows 10/11 PC (no .NET needed).
echo.
echo ============================================
start "" "%OUT_DIR%"
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
