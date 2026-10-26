@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale o Node.js LTS em https://nodejs.org e abra este arquivo novamente.
 pause
 exit /b 1
)
node scripts/package.mjs
if errorlevel 1 (
 echo Nao foi possivel gerar o ZIP. Consulte a mensagem acima.
) else (
 echo ZIP salvo na pasta dist. Seus arquivos originais foram preservados.
)
pause
