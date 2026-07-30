#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "[ERROR] Please run as root (sudo bash scripts/update.sh)"
  exit 1
fi

echo -e "${CYAN}Updating AI Ecommerce Operation Center...${NC}"
git pull origin main || git pull || true

docker compose -f docker/docker-compose.yml build --no-cache app
docker compose -f docker/docker-compose.yml up -d

echo -e "${GREEN}Update Completed Successfully!${NC}"
