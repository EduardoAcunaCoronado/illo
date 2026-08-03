@echo off
setlocal
title Project AI.ri - Centro de herramientas
cd /d "%~dp0"

set "EDITOR_URL=http://localhost:8011/"
set "TOOLS_URL=http://localhost:8011/tools"

powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%EDITOR_URL%api/jobs'; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
    start "" "%TOOLS_URL%"
    exit /b 0
)

echo.
echo  Project AI.ri - Centro de herramientas
echo  ========================================
echo.
echo  Abriendo %TOOLS_URL%
echo  Para cerrar el editor, pulsa Ctrl+C en esta ventana.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 800; Start-Process '%TOOLS_URL%'"
python scripts\build_character_eye_layers.py --serve --port 8011

if errorlevel 1 (
    echo.
    echo  No se pudo iniciar el centro de herramientas.
    echo  Comprueba que Python esta instalado y que el puerto 8011 esta libre.
    echo.
    pause
)

endlocal
