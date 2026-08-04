@echo off
setlocal
title Project AI.ri - Centro de herramientas
cd /d "%~dp0"

set "EDITOR_URL=http://localhost:8011/"
set "TOOLS_URL=http://localhost:8011/tools"
set "ROOT_ID="
for /f "usebackq delims=" %%I in (`python -c "import hashlib,os; p=os.path.realpath(os.getcwd()); p=p.lower() if os.name=='nt' else p; print(hashlib.sha256(p.encode('utf-8')).hexdigest()[:16])"`) do set "ROOT_ID=%%I"

if not defined ROOT_ID (
    echo No se pudo calcular la identidad del proyecto. Comprueba que Python esta instalado.
    pause
    exit /b 1
)

powershell.exe -NoProfile -Command "try { $response = Invoke-RestMethod -TimeoutSec 2 '%EDITOR_URL%api/health'; if ($response.service -eq 'project-airi-eye-tools' -and $response.protocolVersion -eq 1 -and $response.rootId -eq '%ROOT_ID%') { exit 0 } } catch {}; exit 1" >nul 2>&1
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

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$deadline = (Get-Date).AddSeconds(15); while ((Get-Date) -lt $deadline) { try { $response = Invoke-RestMethod -TimeoutSec 1 '%EDITOR_URL%api/health'; if ($response.service -eq 'project-airi-eye-tools' -and $response.protocolVersion -eq 1 -and $response.rootId -eq '%ROOT_ID%') { Start-Process '%TOOLS_URL%'; exit 0 } } catch {}; Start-Sleep -Milliseconds 200 }; exit 1"
python scripts\build_character_eye_layers.py --serve --port 8011

if errorlevel 1 (
    echo.
    echo  No se pudo iniciar el centro de herramientas.
    echo  Comprueba que Python esta instalado y que el puerto 8011 esta libre.
    echo.
    pause
)

endlocal
