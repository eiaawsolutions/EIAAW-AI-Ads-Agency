@echo off
REM EIAAW one-shot setup for Windows cmd.exe.
setlocal
cd /d "%~dp0.."

echo Installing npm dependencies...
call npm install --no-audit --no-fund || exit /b 1

if not exist .env (
  copy .env.example .env >nul
  for /f %%s in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do set SECRET=%%s
  powershell -Command "(Get-Content .env) -replace 'generate-with-openssl-rand-base64-32', '%SECRET%' | Set-Content .env"
  echo.
  echo .env created. Fill DATABASE_URL + DIRECT_URL before continuing.
  echo Railway ^> Postgres plugin ^> Connect ^> copy the connection URL.
  echo.
  exit /b 0
)

echo Generating Prisma client...
call npx prisma generate || exit /b 1

echo Pushing schema to database...
call npx prisma db push --skip-generate || exit /b 1

echo Seeding demo data...
call npx prisma db seed

echo Starting dev server...
call npm run dev
