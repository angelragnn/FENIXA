@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js 24 o superior instalado para abrir el proyecto.
  echo Despues de instalarlo, vuelve a abrir INICIAR.cmd.
  pause
  exit /b 1
)
echo Abriendo FENIXA Universidad...
echo Deja esta ventana abierta mientras uses la pagina.
node scripts\abrir.mjs
pause
