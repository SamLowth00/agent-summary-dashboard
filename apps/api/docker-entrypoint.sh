#!/bin/sh
set -e

# Seed the SQLite database into its (usually volume-mounted) location on first
# boot only. The app has no sequelize.sync(), so it needs a pre-populated db;
# afterwards the volume persists it and we leave it untouched.
DB_PATH="${DATABASE_STORAGE:-/app/db/database.db}"
DB_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] seeding database -> $DB_PATH"
  cp /app/seed/database.db "$DB_PATH"
fi

exec "$@"
