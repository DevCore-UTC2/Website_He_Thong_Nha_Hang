@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Vi Nha Minh - Web Nha Hang

echo ==========================================================
echo        VI NHA MINH - KHOI DONG HE THONG NHA HANG
echo ==========================================================
echo.

node -v >nul 2>nul
if errorlevel 1 goto no_node

if not exist node_modules\express goto do_install
goto check_db

:do_install
echo [1/2] Dang cai dat thu vien...
call npm install
if errorlevel 1 goto install_err

:check_db
if not exist server\restaurant.sqlite (
    echo [2/2] Khoi tao co so du lieu...
    call npm run reset-db
)

echo [OK] He thong da san sang!
echo Dang mo trinh duyet va khoi chay tai http://localhost:5000 ...
echo.
echo ----------------------------------------------------------
echo Tai khoan dang nhap:
echo   - Admin:     admin@vinhaminh.vn / Admin@1234
echo   - Nhan vien: staff@vinhaminh.vn / Staff@1234
echo   - Khach:     khach@vinhaminh.vn / Khach@1234
echo.
echo Nhan Ctrl + C de tat server.
echo ----------------------------------------------------------
echo.

start "" http://localhost:5000

node server/app.js

pause
exit /b 0

:no_node
echo [LOI] May tinh cua ban chua cai Node.js!
echo Vui long tai va cai dat Node.js tu: https://nodejs.org/
pause
exit /b 1

:install_err
echo [LOI] Khong the cai dat thu vien npm.
pause
exit /b 1