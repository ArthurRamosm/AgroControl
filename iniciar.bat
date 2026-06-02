@echo off
title AgroControl - Servidor
color 0A
echo.
echo  ================================
echo   AgroControl - Iniciando...
echo  ================================
echo.
echo [1/2] Iniciando Backend...
start "AgroControl API" cmd /k "cd /d C:\Users\arthu\AgroControl\AgroControl.API && dotnet run"
echo Aguardando backend iniciar...
timeout /t 5 /nobreak > nul
echo [2/2] Iniciando Ngrok...
start "AgroControl Ngrok" cmd /k "ngrok http --domain=unenvied-snowfall-undrafted.ngrok-free.dev 5249"
echo.
echo  ================================
echo   Tudo iniciado! URL fixa:
echo   https://unenvied-snowfall-undrafted.ngrok-free.dev
echo  ================================
pause
