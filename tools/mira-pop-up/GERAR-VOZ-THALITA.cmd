@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js LTS em https://nodejs.org
 pause
 exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
 set "POPUP_PYTHON=py"
) else (
 where python >nul 2>nul
 if errorlevel 1 (
  echo Instale Python 3 em https://www.python.org/downloads/ e marque Add Python to PATH.
  pause
  exit /b 1
 )
 set "POPUP_PYTHON=python"
)
node scripts/narrate.mjs
if errorlevel 1 (
 echo A voz ainda nao foi gerada. Veja a mensagem acima.
) else (
 echo Agora abra o livro, clique em Ouvir narracao e depois Exportar MP4.
)
pause
