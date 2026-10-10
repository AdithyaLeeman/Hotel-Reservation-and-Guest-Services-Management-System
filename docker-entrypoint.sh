#!/bin/sh
set -e

# Ensure .env.local exists to prevent Node --env-file from throwing ENOENT
[ -f .env.local ] || touch .env.local 2>/dev/null || true

echo "=========================================================="
echo " SkyNest HRGSMS - Container Startup"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "[startup] Checking database connectivity..."
  
  MAX_RETRIES=30
  RETRY_COUNT=0
  
  until node -e '
    const { Client } = require("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    client.connect()
      .then(() => { client.end(); process.exit(0); })
      .catch((err) => { process.exit(1); });
  ' > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "[startup] ERROR: Database connection failed after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "[startup] Database is unavailable - waiting ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
  done

  echo "[startup] Database connection established successfully!"

  # Run migrations unless explicitly disabled
  if [ "$AUTO_MIGRATE" != "false" ]; then
    echo "[startup] Running schema migrations..."
    tsx lib/db/migrate.ts

    echo "[startup] Applying database routines, views, triggers, and indexes..."
    tsx lib/db/apply-routines.ts
  fi

  # Run seeds if requested (default to true in demo/dev mode)
  if [ "$SEED_DB" = "true" ]; then
    echo "[startup] Seeding demo database records..."
    tsx lib/db/seed.ts
  fi
else
  echo "[startup] Warning: DATABASE_URL is not set. Skipping DB migration and seed."
fi

echo "[startup] Starting Next.js application server..."
exec "$@"
