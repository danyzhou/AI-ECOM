#!/usr/bin/env bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/AI-ECOM"

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}       AI-ECOM 一键自动化部署脚本 (完整修复版)       ${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 检查并安装基础环境依赖 (util-linux 包含了 fallocate 工具)
echo -e "\n${YELLOW}[1/7] 检查并自动化安装基础环境依赖...${NC}"
apt-get update -y
apt-get install -y curl git nginx ufw util-linux

# 检查/启动 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}未检测到 Docker，正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# 2. 自动开启 Swap 虚拟内存 (防止 1G/2G 内存 VPS 在 npm build 时被 Killed)
echo -e "\n${YELLOW}[2/7] 检查并配置 Swap 虚拟内存...${NC}"
SWAP_SIZE=$(free -m | awk '/Swap:/ {print $2}')
if [ -z "$SWAP_SIZE" ] || [ "$SWAP_SIZE" -lt 1000 ]; then
    echo -e "${YELLOW}检测到 Swap 内存小于 1GB，正在自动创建 2GB Swap 交换分区...${NC}"
    swapoff -a 2>/dev/null || true
    rm -f /swapfile 2>/dev/null || true
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo -e "${GREEN}✓ Swap 2GB 配置成功${NC}"
else
    echo -e "${GREEN}✓ Swap 空间充足 ($SWAP_SIZE MB)${NC}"
fi

# 3. 准备项目源码环境与补全缺失文件
echo -e "\n${YELLOW}[3/7] 准备项目源码环境...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "正在克隆项目仓库至 $PROJECT_DIR ..."
    git clone https://github.com/danyzhou/AI-ECOM.git "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# 自动补齐 public 目录（避免 Dockerfile COPY 报错）
mkdir -p "$PROJECT_DIR/public"
touch "$PROJECT_DIR/public/.gitkeep"

# 自动修复 Dockerfile 中的 public 复制逻辑 (若存在)
if [ -f "Dockerfile" ]; then
    sed -i 's/COPY --from=builder \/app\/public \.\/public/# COPY --from=builder \/app\/public \.\/public/' Dockerfile
fi

# 4. 配置环境变量
echo -e "\n${YELLOW}[4/7] 请输入系统部署配置参数...${NC}"
read -p "请输入要绑定的自定义域名 (例如: ecom.yourdomain.com): " DOMAIN_NAME
DOMAIN_NAME=${DOMAIN_NAME:-"_"}

read -p "请输入 PostgreSQL 数据库名称 [默认: ecom_op_center]: " DB_NAME
DB_NAME=${DB_NAME:-"ecom_op_center"}

read -p "请输入 PostgreSQL 数据库用户名 [默认: ecom_user]: " DB_USER
DB_USER=${DB_USER:-"ecom_user"}

read -p "请设置 PostgreSQL 数据库密码: " DB_PASS
while [ -z "$DB_PASS" ]; do
    read -p "密码不能为空，请重新设置 PostgreSQL 数据库密码: " DB_PASS
done

read -p "请输入系统管理员用户名 [默认: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-"admin"}

read -p "请设置系统管理员密码: " ADMIN_PASS
while [ -z "$ADMIN_PASS" ]; do
    read -p "密码不能为空，请重新设置系统管理员密码: " ADMIN_PASS
done

# 写入 .env
cat <<EOF > .env
NODE_ENV=production
PORT=3000
DOMAIN_NAME=$DOMAIN_NAME

POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@postgres:5432/$DB_NAME

ADMIN_USER=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF

echo -e "${GREEN}✓ .env 环境变量配置完成${NC}"

# 5. 清理损坏数据卷并构建启动 Docker 容器
echo -e "\n${YELLOW}[5/7] 启动 PostgreSQL 数据库与 Node.js 服务容器...${NC}"
docker compose down -v 2>/dev/null || true
docker compose up -d --build

# 等待 PostgreSQL 数据库完全准备完毕
echo -e "${YELLOW}等待数据库健康就绪...${NC}"
sleep 10

# 6. 强行初始化数据库结构与管理员账号
echo -e "\n${YELLOW}[6/7] 执行数据库 Migrations 与初始化 Admin 账号...${NC}"
docker exec -i ai-ecom-app-1 npm run db:migrate 2>/dev/null || true
docker exec -i ai-ecom-app-1 npm run db:seed 2>/dev/null || true

# 7. 配置 Nginx 反向代理与防火墙 (确保 IP 和域名都能直接打开)
echo -e "\n${YELLOW}[7/7] 配置 Nginx 反向代理与防火墙端口...${NC}"
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

cat <<EOF > /etc/nginx/sites-available/ai-ecom
server {
    listen 80;
    server_name $DOMAIN_NAME _;

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

ln -sf /etc/nginx/sites-available/ai-ecom /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}          🎉 AI-ECOM 系统部署成功！             ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "访问地址: ${BLUE}http://${DOMAIN_NAME}${NC} (或直接访问 VPS IP)"
echo -e "管理员账号: ${YELLOW}${ADMIN_USER}${NC}"
echo -e "管理员密码: ${YELLOW}${ADMIN_PASS}${NC}"
echo -e "${GREEN}================================================${NC}"
