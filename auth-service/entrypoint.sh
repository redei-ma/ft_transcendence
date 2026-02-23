#!/bin/sh
set -e

echo "Applying Prisma schema to DB..."
npx prisma db push

#safer than prisma db push
#echo "Running Prisma migrations..."
#npx prisma migrate deploy

echo "Starting auth-service..."
npm run start:prod
