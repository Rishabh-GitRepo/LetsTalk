#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

git pull --ff-only

docker compose -f deploy/docker-compose.prod.yml up -d --build

docker compose -f deploy/docker-compose.prod.yml exec auth-service pnpm prisma migrate deploy

printf "Deployment complete.\n"
