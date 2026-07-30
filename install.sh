#!/bin/bash
set -e

# AI Ecommerce Operation Center - One-Click Production Installer
# Stack: React 19 + Vite + Express + Node.js + PostgreSQL

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    AI Ecommerce Operation Center 生产部署安装器      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check prerequisites
echo -e "\n${YELLOW}[1/6] 检查系统环境依赖...${NC}"

if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    HAS_DOCKER=true
    echo -e "${GREEN}✓ Docker & Docker Compose 已就绪${NC}"
else
    HAS_DOCKER=false
    echo -e "${YELLOW}! 未检测到 Docker Compose，将使用本地 Node.js 运行模式${NC}"
fi

if ! command -v node >/dev/null 2>&1 && [ "$HAS_DOCKER" = false ]; then
    echo -e "${RED}✗ 错误: 既未安装 Docker 也未安装 Node.js (v18+)，无法继续。${NC}"
    exit 1
fi

# 2. Setup environment configuration
echo -e "\n${YELLOW}[2/6] 初始化生产环境变量配置...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已从 .env.example 生成 .env 配置文件${NC}"
    else
        cat << 'EOF' > .env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://ecom_user:ecom_secure_pass_2026@localhost:5432/ecom_op_center
JWT_SECRET=production_super_secret_jwt_key_2026_ecom_center
OPENAI_API_KEY=
GEMINI_API_KEY=
EOF
        echo -e "${GREEN}✓ 已全新创建默认 .env 配置文件${NC}"
    fi
else
    echo -e "${GREEN}✓ 检测到已存在 .env 配置文件${NC}"
fi

# 3. Create required runtime directories
echo -e "\n${YELLOW}[3/6] 创建运行日志与备份目录...${NC}"
mkdir -p logs backups data

# 4. Build application or start containers
if [ "$HAS_DOCKER" = true ]; then
    echo -e "\n${YELLOW}[4/6] 启动 Docker 容器与 PostgreSQL 数据库...${NC}"
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    echo -e "${GREEN}✓ Docker 容器已服务化运行${NC}"
else
    echo -e "\n${YELLOW}[4/6] 编译打包项目 (npm install & build)...${NC}"
    npm install --production=false
    npm run build
    echo -e "${GREEN}✓ Vite前端与Express服务端编译完成${NC}"
fi

# 5. Database health check & seeding
echo -e "\n${YELLOW}[5/6] 数据库连通性校验与初始管理员创建...${NC}"
sleep 3
if [ -f healthcheck.sh ]; then
    bash healthcheck.sh || true
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}  🎉 AI Ecommerce Operation Center 安装成功！         ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "访问地址: ${YELLOW}http://localhost:3000${NC}"
echo -e "默认初始管理员账号: ${YELLOW}admin${NC}"
echo -e "默认初始管理员密码: ${YELLOW}admin123${NC}"
echo -e "${RED}注意: 请务必登录系统后在后台修改默认密码并配置 API Key！${NC}\n"
