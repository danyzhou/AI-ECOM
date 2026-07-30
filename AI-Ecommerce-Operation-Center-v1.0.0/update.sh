#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - System Updater Script
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}        AI Ecommerce Operation Center - System Upgrade         ${NC}"
echo -e "${CYAN}======================================================================${NC}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

# 1. Pull Latest Source Code
if [ -d ".git" ]; then
  echo -e "${BLUE}[1/5] Pulling latest repository updates...${NC}"
  git pull origin $(git rev-parse --abbrev-ref HEAD) || echo -e "${BLUE}Git pull skipped or clean.${NC}"
else
  echo -e "${BLUE}[1/5] No Git repository detected. Proceeding with local update...${NC}"
fi

# 2. Install NPM Dependencies
echo -e "${BLUE}[2/5] Updating NPM dependencies...${NC}"
npm install

# 3. Build Production Bundle
echo -e "${BLUE}[3/5] Building production assets and server bundle...${NC}"
npm run build

# 4. Apply Database Migrations
if [ -f "database/migration.sql" ] && [ -f ".env" ]; then
  echo -e "${BLUE}[4/5] Executing database schema migration...${NC}"
  export $(grep -v '^#' .env | xargs)
  
  if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f database/migration.sql || echo -e "${RED}[WARNING] Database migration encountered non-fatal notice.${NC}"
  else
    echo -e "${BLUE}Skipping SQL migration (DATABASE_URL not set).${NC}"
  fi
fi

# 5. Restart System Service
echo -e "${BLUE}[5/5] Restarting application service...${NC}"
if systemctl is-active --quiet ai-ecommerce.service; then
  sudo systemctl restart ai-ecommerce.service
  echo -e "${GREEN}systemd service 'ai-ecommerce' restarted successfully!${NC}"
elif command -v docker >/dev/null 2>&1 && docker ps | grep -q ai_ecommerce; then
  docker compose restart app
  echo -e "${GREEN}Docker container 'ai_ecommerce_app' restarted successfully!${NC}"
else
  echo -e "${GREEN}Build succeeded! Run 'npm run start' or 'systemctl restart ai-ecommerce' to launch.${NC}"
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}       System Update Completed Successfully!                          ${NC}"
echo -e "${GREEN}======================================================================${NC}"
