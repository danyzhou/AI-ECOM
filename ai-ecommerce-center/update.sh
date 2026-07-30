#!/usr/bin/env bash

###############################################################################
# AI Ecommerce Operation Center - Auto Update Script
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run as root (e.g., sudo bash update.sh)${NC}"
  exit 1
fi

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}  AI Ecommerce Operation Center - Update Manager    ${NC}"
echo -e "${CYAN}=====================================================${NC}"

echo -e "\n${YELLOW}[1/3] Pulling Latest Updates from Repository...${NC}"
if [ -d ".git" ]; then
  git pull origin main || git pull
else
  echo -e "No git repository found. Re-building local application container..."
fi

echo -e "\n${YELLOW}[2/3] Rebuilding Docker Containers...${NC}"
docker compose build --no-cache app
docker compose up -d

echo -e "\n${YELLOW}[3/3] Verifying Container Health...${NC}"
sleep 3
docker compose ps

echo -e "\n${GREEN}Update Completed Successfully!${NC}"
