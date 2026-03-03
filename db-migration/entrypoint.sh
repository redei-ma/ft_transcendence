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

echo "Database is ready! Shutting down db-migration."
