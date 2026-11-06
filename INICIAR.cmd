@echo off
cd /d "%~dp0"
echo Comprueba que tu servicio MySQL este iniciado y .env configurado.
echo Al iniciar, abre http://127.0.0.1:3002 en el navegador.
call npm.cmd start
pause
