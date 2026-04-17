#!/usr/bin/env bash
# EIAAW one-shot setup: install → env check → migrate → seed → dev.
# Works on macOS, Linux, and Git Bash on Windows.

set -euo pipefail

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$here/.."

echo "▶ Installing npm dependencies…"
npm install --no-audit --no-fund

if [[ ! -f .env ]]; then
  echo "▶ Creating .env from .env.example…"
  cp .env.example .env
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|generate-with-openssl-rand-base64-32|$secret|" .env
  else
    sed -i "s|generate-with-openssl-rand-base64-32|$secret|" .env
  fi
  echo
  echo "⚠  .env created. Fill DATABASE_URL + DIRECT_URL before continuing."
  echo "   Railway → Postgres plugin → Connect → copy the connection URL."
  echo
  exit 0
fi

if ! grep -q '^DATABASE_URL=postgres' .env; then
  echo "❌ DATABASE_URL not set in .env. Aborting."
  exit 1
fi

echo "▶ Generating Prisma client…"
npx prisma generate

echo "▶ Pushing schema to database…"
npx prisma db push --skip-generate

echo "▶ Seeding demo data…"
npx prisma db seed || npm run db:seed

echo "▶ Starting dev server…"
npm run dev
