@echo off
echo ========================================
echo BACKEND + FRONTEND + BROWSER АСААЖ БАЙНА...
echo ========================================
start cmd /k "D:\install\web sait tol\project\start-backend.bat"
timeout /t 3
start cmd /k "D:\install\web sait tol\project\start-frontend.bat"
start cmd /k "D:\install\web sait tol\project\open-browser.bat"
echo ========================================
echo БҮГД АСЧ БАЙНА!
echo ========================================