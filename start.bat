@echo off
setlocal
title Project AI.ri - Juego y herramientas
cd /d "%~dp0"

echo.
echo  Project AI.ri - Desarrollo local
echo  ==================================
echo.
echo  Se iniciaran juntos:
echo    Juego: http://127.0.0.1:8000/
echo    Tools: http://127.0.0.1:8011/tools
echo.
echo  Pulsa Ctrl+C para cerrar los servicios iniciados aqui.
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  No se encontro Node.js. Instalalo para usar el arranque supervisado.
    echo  Es necesario para comprobar que Juego y Tools pertenecen a esta copia.
    echo.
    pause
    exit /b 1
)

node scripts\start_local_development.js --open-browser

if errorlevel 1 (
    echo.
    echo  El arranque local ha terminado con un error.
    echo.
    pause
)

endlocal
