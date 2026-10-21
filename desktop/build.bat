@echo off
chcp 65001 >nul
REM =============================================================================
REM Армспорт Desktop — скрипт сборки (Windows)
REM =============================================================================
REM Требования:
REM   - Node.js LTS    (https://nodejs.org)  или  bun (https://bun.sh)
REM   - Rust + cargo   (https://rustup.rs)
REM   - tauri-cli:     cargo install tauri-cli --version "^2" --locked
REM   - Visual Studio Build Tools, компонент "Desktop development with C++"
REM Python-сервер не нужен: программа работает полностью офлайн,
REM данные турнира хранятся локально на компьютере.
REM =============================================================================
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "TAURI_DIR=%SCRIPT_DIR%tauri"

echo.
echo ============================================
echo   Армспорт Desktop — сборка (Windows)
echo ============================================
echo.

REM ── Шаг 0: Проверка инструментов ────────────────────────────────────────────
echo [0/4] Проверка установленных программ...

set "PM="
where bun >nul 2>nul && set "PM=bun"
if not defined PM (
  where npm >nul 2>nul && set "PM=npm"
)
if not defined PM goto :no_node
echo   OK: менеджер пакетов — !PM!

where cargo >nul 2>nul
if errorlevel 1 goto :no_rust
echo   OK: Rust / cargo

cargo tauri --version >nul 2>nul
if errorlevel 1 (
  echo   tauri-cli не найден — устанавливаю, это займёт 5-15 минут...
  cargo install tauri-cli --version "^2" --locked
  if errorlevel 1 goto :error
)
echo   OK: tauri-cli

REM ── Шаг 1: Зависимости ───────────────────────────────────────────────────────
echo.
echo [1/4] Установка зависимостей...
cd /d "%ROOT_DIR%"
if "!PM!"=="bun" (
  call bun install
) else (
  call npm install --no-audit --no-fund --legacy-peer-deps
)
if errorlevel 1 goto :error

REM ── Шаг 2: Фронтенд ─────────────────────────────────────────────────────────
echo.
echo [2/4] Сборка интерфейса...
call !PM! run build:desktop
if errorlevel 1 goto :error
echo   OK: dist-desktop\

REM ── Шаг 3: Tauri ─────────────────────────────────────────────────────────────
echo.
echo [3/4] Сборка Tauri...
cd /d "%TAURI_DIR%"
cargo tauri build
if errorlevel 1 goto :error
echo   OK: Tauri сборка завершена

REM ── Шаг 4: Итог ──────────────────────────────────────────────────────────────
echo.
echo [4/4] Готово!
echo   Установщик: %TAURI_DIR%\target\release\bundle\nsis\
echo   MSI:        %TAURI_DIR%\target\release\bundle\msi\
echo.
echo ============================================
start "" "%TAURI_DIR%\target\release\bundle\nsis"
pause
exit /b 0

:no_node
echo.
echo   НЕ НАЙДЕН Node.js.
echo   1. Скачайте и установите Node.js LTS: https://nodejs.org
echo   2. Закройте это окно и запустите build.bat заново.
start "" "https://nodejs.org/ru/download"
pause
exit /b 1

:no_rust
echo.
echo   НЕ НАЙДЕН Rust (cargo).
echo   1. Установите Visual Studio Build Tools с компонентом
echo      "Desktop development with C++":
echo      https://visualstudio.microsoft.com/visual-cpp-build-tools/
echo   2. Установите Rust: https://rustup.rs  (файл rustup-init.exe, вариант 1 по умолчанию)
echo   3. Закройте это окно и запустите build.bat заново.
start "" "https://rustup.rs"
pause
exit /b 1

:error
echo.
echo   ОШИБКА сборки. Смотрите сообщения выше.
pause
exit /b 1
