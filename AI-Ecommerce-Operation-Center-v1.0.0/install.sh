#!/usr/bin/env bash
# ==============================================================================
# AI Ecommerce Operation Center - One-Click Production Automated Installer
# Target OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
# ==============================================================================

set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "======================================================================"
echo "    AI Ecommerce Operation Center - Automated Production Installer   "
echo "======================================================================"
echo -e "${NC}"

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] This installer must be executed as root or using sudo.${NC}"
  exit 1
fi

# 1. Detect OS & Ubuntu Version
echo -e "${BLUE}[1/8] Detecting Operating System compatibility...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_VERSION=$VERSION_ID
else
  echo -e "${RED}[ERROR] Cannot detect OS version from /etc/os-release.${NC}"
  exit 1
fi

echo -e "Detected OS: ${GREEN}${OS_NAME} ${OS_VERSION}${NC}"

if [[ "$ID" != "ubuntu" ]]; then
  echo -e "${YELLOW}[WARNING] This installer is tailored for Ubuntu 22.04 / 24.04 LTS. Proceeding on ${OS_NAME}...${NC}"
fi

# 2. Interactive Input Prompts
echo ""
echo -e "${BLUE}[2/8] Configuring Deployment Parameters...${NC}"
echo "----------------------------------------------------------------------"

read -p "Enter Domain Name (e.g. shop.example.com) [localhost]: " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-localhost}

read -p "Enter Administrator Email [admin@ecom-ai.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@ecom-ai.com}

read -p "Enter Administrator Password [admin123]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}

read -p "Enter PostgreSQL Database User Password [ecom_pg_pass_2026]: " DB_PASS
DB_PASS=${DB_PASS:-ecom_pg_pass_2026}

read -p "Enter OpenAI API Key (Optional, press Enter to skip): " OPENAI_KEY
OPENAI_KEY=${OPENAI_KEY:-""}

read -p "Enter Gemini API Key (Optional, press Enter to skip): " GEMINI_KEY
GEMINI_KEY=${GEMINI_KEY:-""}

echo ""
echo -e "${GREEN}Configuration captured! Initializing setup...${NC}"

# 3. Install System Dependencies & Node.js 22 LTS
echo ""
echo -e "${BLUE}[3/8] Installing core system packages & Node.js 22 LTS...${NC}"
apt-get update -y
apt-get install -y curl git unzip build-essential ca-certificates gnupg software-properties-common postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Install Node.js 22 LTS via NodeSource
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1)" != "v22" ]; then
  echo -e "${CYAN}Setting up NodeSource Node.js 22 LTS repository...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo -e "Node.js version: ${GREEN}$(node -v)${NC}"
echo -e "NPM version:     ${GREEN}$(npm -v)${NC}"

# 4. Configure PostgreSQL Database
echo ""
echo -e "${BLUE}[4/8] Initializing PostgreSQL database & user permissions...${NC}"
systemctl start postgresql
systemctl enable postgresql

DB_NAME="ai_ecommerce"
DB_USER="ai_admin"

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || \
sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Import initial SQL schema & seeds
APP_DIR=$(pwd)
if [ -f "${APP_DIR}/database/init.sql" ]; then
  echo -e "${CYAN}Importing database schema from database/init.sql...${NC}"
  PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f "${APP_DIR}/database/init.sql" || true
fi

if [ -f "${APP_DIR}/database/seed.sql" ]; then
  echo -e "${CYAN}Importing seed data from database/seed.sql...${NC}"
  PGPASSWORD=${DB_PASS} psql -h localhost -U ${DB_USER} -d ${DB_NAME} -f "${APP_DIR}/database/seed.sql" || true
fi

# 5. Application Build & Environment Setup
echo ""
echo -e "${BLUE}[5/8] Building application source code...${NC}"

# Create .env
cat <<EOF > .env
PORT=3000
NODE_ENV=production
APP_URL=http://${DOMAIN_NAME}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "jwt_secret_ecom_$(date +%s)")
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "session_secret_ecom_$(date +%s)")
OPENAI_API_KEY=${OPENAI_KEY}
GEMINI_API_KEY=${GEMINI_KEY}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}
EOF

# Install npm packages and build
npm ci || npm install
npm run build

# 6. Configure Nginx Reverse Proxy
echo ""
echo -e "${BLUE}[6/8] Configuring Nginx reverse proxy...${NC}"

NGINX_CONF="/etc/nginx/sites-available/ai-ecommerce.conf"

cat <<EOF > ${NGINX_CONF}
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 25M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/ai-ecommerce.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 7. Configure SSL with Certbot
if [ "$DOMAIN_NAME" != "localhost" ] && [ "$DOMAIN_NAME" != "127.0.0.1" ]; then
  echo ""
  echo -e "${BLUE}[7/8] Requesting SSL Certificate via Let's Encrypt Certbot...${NC}"
  certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${ADMIN_EMAIL} || echo -e "${YELLOW}[WARNING] Certbot SSL generation failed or domain DNS not pointing yet. You can run certbot manually later.${NC}"
fi

# 8. Create & Enable Systemd Service
echo ""
echo -e "${BLUE}[8/8] Creating Systemd Service (ai-ecommerce.service)...${NC}"

SERVICE_FILE="/etc/systemd/system/ai-ecommerce.service"

cat <<EOF > ${SERVICE_FILE}
[Unit]
Description=AI Ecommerce Operation Center Node.js Server
After=network.target postgresql.service nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node ${APP_DIR}/dist/server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ai-ecommerce.service
systemctl restart ai-ecommerce.service

# Completion Summary
echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}      AI Ecommerce Operation Center Installed Successfully!           ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e " Website URL:     ${CYAN}http://${DOMAIN_NAME}${NC}"
echo -e " Admin Console:   ${CYAN}http://${DOMAIN_NAME}/login${NC}"
echo -e " Admin Account:   ${YELLOW}${ADMIN_EMAIL}${NC}"
echo -e " Admin Password:  ${YELLOW}${ADMIN_PASS}${NC}"
echo -e " Service Status:  ${CYAN}systemctl status ai-ecommerce${NC}"
echo -e " View Logs:       ${CYAN}journalctl -u ai-ecommerce -f${NC}"
echo "======================================================================"
