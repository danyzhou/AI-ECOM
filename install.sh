#!/bin/bash
set -e

# =================================================================
# AI Ecommerce Operation Center - 全自动生产部署安装器
# Stack: React 19 + Express + PostgreSQL + Nginx + Docker
# Repo: https://github.com/danyzhou/AI-ECOM
# =================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    AI Ecommerce Operation Center 生产一键部署器     ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. 检查 ROOT 权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}错误：请使用 root 权限运行此脚本！(例如: sudo bash install.sh)${NC}"
  exit 1
fi

# 2. 检查并安装基本依赖 (git, curl, nginx)
echo -e "\n${YELLOW}[1/6] 检查并自动化安装基础环境依赖...${NC}"
apt-get update -y && apt-get install -y curl git ufw nginx

if ! command -v docker &> /dev/null; then
    echo "未检测到 Docker，正在自动安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# 3. 自动定位或拉取源码目录 (解决缺少 Dockerfile 问题)
echo -e "\n${YELLOW}[2/6] 准备项目源码环境...${NC}"

INSTALL_DIR="/opt/AI-ECOM"

if [ -f "./Dockerfile" ]; then
    echo "当前已在源码目录中，使用当前目录: $(pwd)"
    INSTALL_DIR=$(pwd)
else
    echo "未检测到本地源码，正在克隆项目仓库至 ${INSTALL_DIR} ..."
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
    fi
    git clone https://github.com/danyzhou/AI-ECOM.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 4. 交互收集配置参数
echo -e "\n${YELLOW}[3/6] 请输入系统部署配置参数...${NC}"

read -p "请输入要绑定的自定义域名 (例如: ecom.yourdomain.com): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
    read -p "域名不能为空，请重新输入: " DOMAIN_NAME
done

read -p "请输入 PostgreSQL 数据库名称 [默认: ecom_op_center]: " DB_NAME
DB_NAME=${DB_NAME:-ecom_op_center}

read -p "请输入 PostgreSQL 数据库用户名 [默认: ecom_user]: " DB_USER
DB_USER=${DB_USER:-ecom_user}

read -s -p "请设置 PostgreSQL 数据库密码: " DB_PASS
echo ""
while [ -z "$DB_PASS" ]; do
    read -s -p "数据库密码不能为空，请重新输入: " DB_PASS
    echo ""
done

read -p "请输入系统管理员用户名 [默认: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -s -p "请设置系统管理员密码: " ADMIN_PASS
echo ""
while [ -z "$ADMIN_PASS" ]; do
    read -s -p "管理员密码不能为空，请重新输入: " ADMIN_PASS
    echo ""
done

# 5. 生成动态 .env 环境变量
echo -e "\n${YELLOW}[4/6] 写入用户定制化的环境变量配置 (.env)...${NC}"
mkdir -p logs backups data

JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)

cat << EOF > .env
PORT=3000
NODE_ENV=production
APP_DOMAIN=${DOMAIN_NAME}

# 数据库连接参数
POSTGRES_DB=${DB_NAME}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@postgres:5432/${DB_NAME}

# 系统安全与初始凭证
JWT_SECRET=${JWT_SECRET}
ADMIN_INIT_USER=${ADMIN_USER}
ADMIN_INIT_PASS=${ADMIN_PASS}

# 语言限制
TARGET_LANGUAGE=es
EOF

echo -e "${GREEN}✓ .env 环境变量配置完成${NC}"

# 6. 自动构建并启动 Docker 容器 (移除过期的 version 标签并推荐使用 docker compose)
echo -e "\n${YELLOW}[5/6] 启动 PostgreSQL 数据库与 Node.js 服务容器...${NC}"

cat << 'EOF' > docker-compose.yml
services:
  app:
    build: .
    restart: always
    ports:
      - "127.0.0.1:3000:3000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
EOF

docker compose up -d --build

# 7. 配置 Nginx 反向代理
echo -e "\n${YELLOW}[6/6] 正在配置 Nginx 域名绑定与反向代理...${NC}"

cat << EOF > /etc/nginx/sites-available/ecom-center.conf
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ecom-center.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 完成提示
echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}  🎉 AI Ecommerce Operation Center 部署完成！        ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "访问域名: ${YELLOW}http://${DOMAIN_NAME}${NC}"
echo -e "管理员账号: ${YELLOW}${ADMIN_USER}${NC}"
echo -e "项目路径: ${YELLOW}${INSTALL_DIR}${NC}"
echo -e "${BLUE}====================================================${NC}\n"
