@echo off
echo Iniciando servidor local...
echo.
echo Abre tu navegador en: http://localhost:8000
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Intenta usar Python si está disponible
python -m http.server 8000

REM Si no funciona Python, intenta con Node.js
REM npx http-server -p 8000

REM Alternativa: simplemente abre el archivo
REM start index.html
