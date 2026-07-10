@echo off
cd /d "%~dp0"

echo Startuje gotowa wersje fm-player-sorter...
echo.
echo Wejdz w przegladarce na:
echo http://localhost:5173
echo.
echo Zeby zamknac aplikacje, zamknij to okno albo nacisnij CTRL + C.
echo.

npm run preview -- --host localhost --port 5173

pause