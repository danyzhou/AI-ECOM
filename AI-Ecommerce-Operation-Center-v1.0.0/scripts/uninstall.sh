#!/usr/bin/env bash

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run as root (sudo bash scripts/uninstall.sh)${NC}"
  exit 1
fi

echo -e "${RED}Uninstalling AI Ecommerce Operation Center...${NC}"
systemctl stop ai-ecommerce || true
systemctl disable ai-ecommerce || true
rm -f /etc/systemd/system/ai-ecommerce.service
systemctl daemon-reload

docker compose -f docker/docker-compose.yml down -v || true

rm -f /etc/nginx/sites-available/ai-ecommerce.conf
rm -f /etc/nginx/sites-enabled/ai-ecommerce.conf
nginx -t && systemctl reload nginx || true

echo -e "${GREEN}Uninstallation Complete!${NC}"
