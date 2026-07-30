#!/usr/bin/env bash

###############################################################################
# AI Ecommerce Operation Center - One-Click Installer for Ubuntu 22.04/24.04
###############################################################################

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}=====================================================${NC}"
echo -e "${CYAN}   AI Ecommerce Operation Center Installer v1.0.0     ${NC}"
echo -e "${CYAN}=====================================================${NC}"

# Check root privilege
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root (e.g., sudo bash install.sh)${NC}"
  exit 1
fi

# 1. OS Verification
echo -e "\n${YELLOW}[1/8] Checking System Environment...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_VERSION=$VERSION_ID
else
  echo -e "${RED}[ERROR] Unable to detect OS distribution.${NC}"
  exit 1
fi

echo -e "Detected OS: ${GREEN}$OS_NAME $OS_VERSION${NC}"
if [[ "$ID" != "ubuntu" ]] || [[ "$OS_VERSION" != "22.04" && "$OS_VERSION" != "24.04" ]]; then
  echo -e "${YELLOW}[WARNING] This script is optimized for Ubuntu 22.04 and 24.04 LTS.${NC}"
fi

# 2. Hardware Resource Checks
CPU_CORES=$(nproc)
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
FREE_DISK=$(df -m / | awk 'NR==2 {print $4}')

echo -e "CPU Cores: ${GREEN}${CPU_CORES}${NC}"
echo -e "Total RAM: ${GREEN}${TOTAL_RAM} MB${NC}"
echo -e "Free Disk Space: ${GREEN}${FREE_DISK} MB${NC}"

if [ "$TOTAL_RAM" -lt 1800 ]; then
  echo -e "${YELLOW}[NOTICE] Recommended RAM is at least 2GB. You have ${TOTAL_RAM}MB.${NC}"
fi

# 3. System Dependencies Installation
echo -e "\n${YELLOW}[2/8] Installing System Dependencies (Docker, Nginx, Certbot)...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw nginx certbot python3-certbot-nginx ca-certificates gnupg lsbm-release

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo -e "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable docker --now

# Configure Firewall
echo -e "\n${YELLOW}[3/8] Configuring Firewall (UFW)...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable || true

# 4. User Configuration Prompts
echo -e "\n${YELLOW}[4/8] Application Setup & User Configuration${NC}"

read -p "Enter Domain Name (e.g. ai.yourdomain.com): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
  echo -e "${RED}Domain name cannot be empty!${NC}"
  read -p "Enter Domain Name (e.g. ai.yourdomain.com): " DOMAIN_NAME
done

read -p "Enter Admin Username [default: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "Enter Admin Email (for SSL & Notifications): " ADMIN_EMAIL
while [ -z "$ADMIN_EMAIL" ]; do
  echo -e "${RED}Admin email cannot be empty!${NC}"
  read -p "Enter Admin Email: " ADMIN_EMAIL
done

AUTO_GEN_PASS=$(tr -dc 'A-Za-z0-9!@#$' < /dev/urandom | head -c 16)
read -p "Enter Admin Password [Leave blank to auto-generate]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-$AUTO_GEN_PASS}

DB_PASSWORD=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 24)
JWT_SECRET=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)

# 5. Generate .env File
echo -e "\n${YELLOW}[5/8] Generating Secret Credentials & .env File...${NC}"
cat <<EOF > .env
DOMAIN_NAME=${DOMAIN_NAME}
PORT=3000
NODE_ENV=production

POSTGRES_DB=ai_ecommerce
POSTGRES_USER=ai_admin
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://ai_admin:${DB_PASSWORD}@postgres:5432/ai_ecommerce

ADMIN_USERNAME=${ADMIN_USER}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASS}

JWT_SECRET=${JWT_SECRET}

OPENAI_API_KEY=
GEMINI_API_KEY=
EOF

# 6. Build App & Docker Containers
echo -e "\n${YELLOW}[6/8] Building Docker Containers & Initializing PostgreSQL...${NC}"

# Copy codebase into app folder if needed
if [ ! -d "app/src" ]; then
  mkdir -p app
  cp -r ../src ../server ../server.ts ../package*.json ../tsconfig.json ../vite.config.ts ../index.html app/ 2>/dev/null || true
fi

docker compose build
docker compose up -d

# 7. Configure Nginx & SSL
echo -e "\n${YELLOW}[7/8] Setting Up Nginx Reverse Proxy & SSL (Certbot)...${NC}"

sed "s/DOMAIN_NAME_PLACEHOLDER/${DOMAIN_NAME}/g" nginx/ai-ecommerce.conf > /etc/nginx/sites-available/ai-ecommerce.conf
ln -sf /etc/nginx/sites-available/ai-ecommerce.conf /etc/nginx/sites-enabled/ai-ecommerce.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Execute Certbot SSL
echo -e "Requesting Let's Encrypt SSL Certificate for ${DOMAIN_NAME}..."
certbot --nginx -d "${DOMAIN_NAME}" --non-interactive --agree-tos -m "${ADMIN_EMAIL}" --redirect || {
  echo -e "${YELLOW}[WARNING] SSL Certificate acquisition failed or DNS not pointing to this server yet.${NC}"
  echo -e "${YELLOW}HTTP is still active. You can run 'certbot --nginx -d ${DOMAIN_NAME}' later.${NC}"
}

# 8. Create Systemd Service
echo -e "\n${YELLOW}[8/8] Registering systemd Service (ai-ecommerce.service)...${NC}"
INSTALL_DIR=$(pwd)
cat <<EOF > /etc/systemd/system/ai-ecommerce.service
[Unit]
Description=AI Ecommerce Operation Center Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ai-ecommerce.service

# Completion Output
echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN} AI Ecommerce Operation Center Installed Successfully! ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e " Website URL:     https://${DOMAIN_NAME}"
echo -e " Admin Panel:     https://${DOMAIN_NAME}/settings"
echo -e " Username:        ${GREEN}${ADMIN_USER}${NC}"
echo -e " Password:        ${GREEN}${ADMIN_PASS}${NC}"
echo -e " Database:        PostgreSQL (Containerized)"
echo -e " SSL Certificate: Enabled"
echo -e "${GREEN}=====================================================${NC}"
echo -e " Service Control Commands:"
echo -e "   Start:   systemctl start ai-ecommerce"
echo -e "   Stop:    systemctl stop ai-ecommerce"
echo -e "   Status:  systemctl status ai-ecommerce"
echo -e "   Logs:    journalctl -u ai-ecommerce"
echo -e "${GREEN}=====================================================${NC}\n"
