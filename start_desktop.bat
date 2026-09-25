@echo off
title ETK Kablo TDS Studio Desktop
color 0B

echo ================================================================
echo          ETK KABLO - TDS STUDIO PRO v3.0 (DESKTOP)
echo ================================================================
echo.
echo [*] Masaustu uygulamasi baslatiliyor...

cd frontend
if not exist "dist" (
    echo [*] Ilk kurulum derlemesi yapiliyor...
    call npm run build
)
start "" npx electron .
exit
