@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js LTS em https://nodejs.org
 pause
 exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
 echo Este modo alternativo precisa de FFmpeg instalado.
 echo Prefira ABRIR-LIVRO.cmd e o botao Exportar MP4 no navegador.
 pause
 exit /b 1
)
if not exist node_modules\puppeteer-core\package.json (
 call npm ci --no-fund --no-audit
 if errorlevel 1 (
  pause
  exit /b 1
 )
)
node scripts/render.mjs
pause
