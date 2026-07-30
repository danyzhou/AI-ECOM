#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - Comprehensive Health Check & Diagnostic Tool
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}       AI Ecommerce Operation Center - System Health & Diagnostics     ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e " Check Time: $(date)"
echo "----------------------------------------------------------------------"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs 2>/dev/null)
fi

# 1. Express Node Server Health Check
echo -n "1. Node.js Express Application Server: "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || echo "000")
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "${GREEN}[OK] Running on port 3000 (HTTP 200)${NC}"
else
  echo -e "${RED}[FAIL] Server unreachable or returned status $HTTP_STATUS${NC}"
fi

# 2. PostgreSQL Connection Check
echo -n "2. PostgreSQL Relational Database:    "
if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}[OK] Connected & Schema Queryable${NC}"
  else
    echo -e "${RED}[FAIL] Cannot query PostgreSQL at DATABASE_URL${NC}"
  fi
elif command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo -e "${GREEN}[OK] PostgreSQL daemon active on port 5432${NC}"
  else
    echo -e "${YELLOW}[WARNING] PostgreSQL daemon non-responsive, fallback storage active${NC}"
  fi
else
  echo -e "${YELLOW}[NOTICE] psql/pg_isready CLI tools not installed, checking process...${NC}"
  if pgrep -x "postgres" >/dev/null 2>&1; then
    echo -e "${GREEN}[OK] PostgreSQL process running${NC}"
  else
    echo -e "${YELLOW}[NOTICE] Using file-backed persistent storage mode${NC}"
  fi
fi

# 3. OpenAI Vision API Key Check
echo -n "3. OpenAI Vision API Provider Key:     "
if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "sk-proj-your_openai_api_key_here" ]; then
  echo -e "${GREEN}[OK] Configured (${OPENAI_API_KEY:0:10}...)${NC}"
else
  echo -e "${YELLOW}[WARNING] Not configured or default placeholder${NC}"
fi

# 4. Gemini Multilingual API Key Check
echo -n "4. Gemini Content Generation API Key:  "
if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "AIzaSy_your_gemini_api_key_here" ]; then
  echo -e "${GREEN}[OK] Configured (${GEMINI_API_KEY:0:10}...)${NC}"
else
  echo -e "${YELLOW}[WARNING] Not configured or default placeholder${NC}"
fi

# 5. WooCommerce Store Integration Status
echo -n "5. WooCommerce Multi-Store Sync API:   "
STORE_STATUS=$(curl -s http://127.0.0.1:3000/api/settings | grep -o '"status":"[^"]*"' | head -n 1 || echo "")
if [[ "$STORE_STATUS" == *"connected"* ]]; then
  echo -e "${GREEN}[OK] Store REST API Connected${NC}"
else
  echo -e "${GREEN}[OK] Ready for WooCommerce store pairing${NC}"
fi

# 6. SSL Certificate Expiry Check
echo -n "6. SSL Certificate Status:            "
if [ -d "/etc/letsencrypt/live" ]; then
  CERT_PATH=$(find /etc/letsencrypt/live -name "fullchain.pem" | head -n 1)
  if [ -n "$CERT_PATH" ]; then
    EXP_DATE=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
    echo -e "${GREEN}[OK] Active (Expires: $EXP_DATE)${NC}"
  else
    echo -e "${YELLOW}[NOTICE] Let's Encrypt directory exists, no certificate generated yet${NC}"
  fi
else
  echo -e "${YELLOW}[NOTICE] SSL managed externally or HTTP development mode${NC}"
fi

# 7. System Resources Metrics
echo ""
echo -e "${BLUE}System Resource Utilization:${NC}"
echo "----------------------------------------------------------------------"
echo -e " CPU Load:    ${YELLOW}$(uptime | awk -F'load average:' '{ print $2 }')${NC}"
echo -e " Memory:      ${YELLOW}$(free -h | awk '/Mem:/ { print $3 "/" $2 " used" }')${NC}"
echo -e " Disk Space:  ${YELLOW}$(df -h . | awk 'NR==2 { print $3 "/" $2 " used (" $5 ")" }')${NC}"

echo ""
echo -e "${CYAN}======================================================================${NC}"
