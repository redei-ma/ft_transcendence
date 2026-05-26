#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DB-MIGRATION - Database Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Migrations (Incremental, do not delete anything)
echo "Applying migrations..."
prisma migrate deploy
echo "Migrations complete."

# Seeding 
echo "Running seed..."
prisma db seed
echo "Seeding complete."

# Reset all users to offline on every startup (cleans up stale sessions after crashes)
echo "Resetting all users to offline..."
psql "$DATABASE_URL" -c 'UPDATE "User" SET status = '"'"'OFFLINE'"'"';'
echo "Users reset to offline."

echo "Database is ready! Shutting down db-migration."
