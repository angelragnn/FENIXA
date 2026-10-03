@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 24 o superior instalado.
  pause
  exit /b 1
)
echo Tu amigo debe estar conectado a la misma red Wi-Fi.
echo Deja esta ventana abierta durante la demostracion.
node scripts\abrir.mjs --share
pause
