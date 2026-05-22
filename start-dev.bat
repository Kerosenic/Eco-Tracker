@echo off
REM Eco-Tracker dev server — double-click to start the website
REM Then open http://localhost:3000 in your browser
REM Press Ctrl+C in this window to stop

cd /d "%~dp0web"
node ./node_modules/next/dist/bin/next dev
pause
