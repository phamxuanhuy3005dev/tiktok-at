@echo off
chcp 65001 >nul
title Dong goi TikTok Automation Tool
color 0B

echo =======================================================
echo    DONG GOI BAN CAI DAT CHO NGUOI DUNG KHAC (ZIP)      
echo =======================================================
echo.

cd /d "%~dp0"

:: 1. Build frontend
echo [1/3] Dang build Frontend moi nhat...
call npm run build --prefix frontend
if %errorlevel% neq 0 goto :build_failed

:: 2. Xoa file zip cu neu co trong project
set "OUTPUT_ZIP=%~dp0TikTok-Automation.zip"
if exist "%OUTPUT_ZIP%" del /f /q "%OUTPUT_ZIP%"

:: 3. Tao file ZIP sach se
echo [2/3] Dang nen file sach se (loai tru node_modules, profiles, cache)...
tar -a -c -f "%OUTPUT_ZIP%" --exclude=".git*" --exclude="*node_modules*" --exclude="profiles/*" --exclude="trash/*" --exclude="uploads/*" --exclude="data/tiktok.db*" --exclude="*.DS_Store*" --exclude="backend/*.log*" --exclude="backend/*.png*" --exclude="*.zip" *
if %errorlevel% neq 0 goto :zip_failed

echo.
echo =======================================================
echo [3/3] HOAN TAT! File zip da duoc tao trong thu muc project:
echo    Duong dan: %OUTPUT_ZIP%
echo =======================================================
echo Ban chi viec gui file TikTok-Automation.zip nay cho nguoi khac!
echo.

explorer.exe /select,"%OUTPUT_ZIP%"
pause
exit /b 0

:build_failed
color 0C
echo.
echo [LOI] Build frontend that bai. Vui long kiem tra lai.
pause
exit /b 1

:zip_failed
color 0C
echo.
echo [LOI] Dong goi zip that bai.
pause
exit /b 1
