@echo off
chcp 65001 >nul
REM =============================================================================
REM Армспорт Desktop — сборка на C# (.NET 8 + WebView2), Windows
REM =============================================================================
REM Требования:
REM   - .NET 8 SDK      https://dotnet.microsoft.com/download/dotnet/8.0
REM   - Node.js LTS     https://nodejs.org   (или bun)
REM Visual Studio, Rust и C++ НЕ нужны.
REM Проект можно открыть и в Visual Studio: desktop\Armsport\Armsport.csproj
REM =============================================================================
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "APP_DIR=%SCRIPT_DIR%Armsport"
set "OUT_DIR=%SCRIPT_DIR%release\Armsport"

echo.
echo ============================================
echo   Армспорт Desktop — сборка (C# / .NET 8)
echo ============================================
echo.

REM ── Шаг 0: Проверка программ ────────────────────────────────────────────────
echo [0/4] Проверка установленных программ...

where dotnet >nul 2>nul
if errorlevel 1 goto :no_dotnet
dotnet --list-sdks | findstr /b "8. 9. 10." >nul
if errorlevel 1 goto :no_dotnet
echo   OK: .NET SDK

set "PM="
where bun >nul 2>nul && set "PM=bun"
if not defined PM (
  where npm >nul 2>nul && set "PM=npm"
)
if not defined PM goto :no_node
echo   OK: !PM!

REM ── Шаг 1: Зависимости интерфейса ───────────────────────────────────────────
echo.
echo [1/4] Установка зависимостей интерфейса...
cd /d "%ROOT_DIR%"
if "!PM!"=="bun" (
  call bun install
) else (
  call npm install --no-audit --no-fund --legacy-peer-deps
)
if errorlevel 1 goto :error

REM ── Шаг 2: Сборка интерфейса ────────────────────────────────────────────────
echo.
echo [2/4] Сборка интерфейса...
call !PM! run build:desktop
if errorlevel 1 goto :error
echo   OK: dist-desktop\

REM ── Шаг 3: Сборка программы C# ──────────────────────────────────────────────
echo.
echo [3/4] Сборка программы C#...
if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
dotnet publish "%APP_DIR%\Armsport.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "%OUT_DIR%"
if errorlevel 1 goto :error

REM ── Шаг 4: Итог ──────────────────────────────────────────────────────────────
echo.
echo [4/4] Готово!
echo   Программа: %OUT_DIR%\Armsport.exe
echo   Папку Armsport можно скопировать на любой компьютер с Windows 10/11
echo   (установка .NET на нём не нужна).
echo.
echo ============================================
start "" "%OUT_DIR%"
pause
exit /b 0

:no_dotnet
echo.
echo   НЕ НАЙДЕН .NET 8 SDK.
echo   1. Установите .NET 8 SDK (x64): https://dotnet.microsoft.com/download/dotnet/8.0
echo   2. Закройте это окно и запустите build.bat заново.
start "" "https://dotnet.microsoft.com/download/dotnet/8.0"
pause
exit /b 1

:no_node
echo.
echo   НЕ НАЙДЕН Node.js.
echo   1. Установите Node.js LTS: https://nodejs.org
echo   2. Закройте это окно и запустите build.bat заново.
start "" "https://nodejs.org/ru/download"
pause
exit /b 1

:error
echo.
echo   ОШИБКА сборки. Смотрите сообщения выше.
pause
exit /b 1
