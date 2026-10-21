@echo off
chcp 65001 >nul
REM =============================================================================
REM Армспорт Desktop — скрипт сборки (Windows)
REM =============================================================================
REM Требования:
REM   - Node.js / bun  (https://bun.sh)
REM   - Rust + cargo   (https://rustup.rs)
REM   - tauri-cli:     cargo install tauri-cli --version "^2"
REM   - Visual Studio Build Tools (для Rust)
REM Python-сервер не нужен: программа работает полностью офлайн,
REM данные турнира хранятся локально на компьютере.
REM =============================================================================
setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set TAURI_DIR=%SCRIPT_DIR%tauri

echo.
echo ============================================
echo   Армспорт Desktop — сборка (Windows)
echo ============================================
echo.

REM ── Шаг 1: Зависимости ───────────────────────────────────────────────────────
echo [1/4] Установка зависимостей...
cd /d "%ROOT_DIR%"
call bun install
if errorlevel 1 goto :error

REM ── Шаг 2: Фронтенд ─────────────────────────────────────────────────────────
echo.
echo [2/4] Сборка интерфейса...
call bun run build:desktop
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
pause
exit /b 0

:error
echo.
echo   ОШИБКА сборки. Смотрите сообщения выше.
pause
exit /b 1
