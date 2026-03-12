#!/bin/sh
set -e

cd /app/backend

echo "Applying Prisma migrations..."
until npx prisma migrate deploy; do
  echo "Database not ready yet. Retrying in 5 seconds..."
  sleep 5
done

echo "Seeding initial data..."
node scripts/seed.js

echo "Starting Skip the Hold..."
exec node src/server.js
