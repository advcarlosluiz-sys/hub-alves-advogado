@echo off
title ScanContracts - Servidor Local
color 0B
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   ScanContracts - Servidor Local      ║
echo  ║   Iniciando em http://localhost:3333  ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% == 0 (
    echo [INFO] Node.js encontrado. Iniciando com npx serve...
    echo [INFO] Acesse: http://localhost:3333
    echo.
    npx -y serve . --listen 3333
) else (
    where python >nul 2>&1
    if %errorlevel% == 0 (
        echo [INFO] Python encontrado. Iniciando com http.server...
        echo [INFO] Acesse: http://localhost:3333
        echo.
        python -m http.server 3333
    ) else (
        echo [ERRO] Nem Node.js nem Python foram encontrados.
        echo Instale um deles e tente novamente.
        pause
    )
)

pause
