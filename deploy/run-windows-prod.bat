@echo off
REM Production-style local run on Windows (waitress WSGI server).
REM Set SECRET_KEY and ADMIN_PASSWORD in ricepest-app\.env first.
setlocal
cd /d "%~dp0..\backend"

echo Running database migrations...
python -m flask --app wsgi db upgrade || goto :error

echo Seeding database (admin + catalog)...
python -m flask --app wsgi seed || goto :error

echo Starting production server on http://0.0.0.0:8000 ...
python -m waitress --listen=0.0.0.0:8000 --threads=8 wsgi:app || goto :error
goto :eof

:error
echo.
echo FAILED (exit code %errorlevel%). Check .env is configured (SECRET_KEY, ADMIN_PASSWORD).
exit /b %errorlevel%
