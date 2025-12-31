@echo off
cd /d "D:\install\web sait tol\project"
timeout /t 5
start cmd /k "cd /d D:\install\web sait tol\project\server && node index.js"
timeout /t 5
start cmd /k "cd /d D:\install\web sait tol\project && npm run dev"
timeout /t 20
start http://localhost:5173