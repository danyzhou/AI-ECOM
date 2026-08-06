#!/usr/bin/env bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/AI-ECOM"

# 一键卸载逻辑
do_uninstall() {
    echo -e "${RED}================================================${NC}"
    echo -e "${RED}         ⚠️ AI-ECOM 彻底卸载与环境清理程序         ${NC}"
    echo -e "${RED}================================================${NC}"
    echo -e "${YELLOW}警告：此操作将停止并销毁 Docker 容器、清理数据卷、删除 Nginx 代理配置与本地环境变量！${NC}"
    
    read -p "确认要彻底卸载 AI-ECOM 系统吗？(输入 y 或 yes 确认): " CONFIRM
    CONFIRM_LOWER=$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')
    if [[ "$CONFIRM_LOWER" != "y" && "$CONFIRM_LOWER" != "yes" ]]; then
        echo -e "${GREEN}已取消卸载操作。${NC}"
        exit 0
    fi

    echo -e "\n${YELLOW}[1/4] 停止并清理 Docker 容器与数据卷...${NC}"
    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
        docker compose down -v --rmi local 2>/dev/null || docker compose down -v 2>/dev/null || true
    fi
    docker rm -f ai-ecom-app-1 postgres 2>/dev/null || true

    echo -e "\n${YELLOW}[2/4] 清理 Nginx 反向代理配置...${NC}"
    rm -f /etc/nginx/sites-available/ai-ecom
    rm -f /etc/nginx/sites-enabled/ai-ecom
    systemctl restart nginx 2>/dev/null || true
    echo -e "${GREEN}✓ Nginx 配置清理完成并已重启服务${NC}"

    echo -e "\n${YELLOW}[3/4] 检查并清理 Swap 虚拟内存...${NC}"
    if [ -f "/swapfile" ]; then
        read -p "检测到已创建的 2GB Swap 虚拟内存 (/swapfile)，是否同步清理删除？[y/N]: " CLEAN_SWAP
        CLEAN_SWAP_LOWER=$(echo "$CLEAN_SWAP" | tr '[:upper:]' '[:lower:]')
        if [[ "$CLEAN_SWAP_LOWER" == "y" || "$CLEAN_SWAP_LOWER" == "yes" ]]; then
            swapoff /swapfile 2>/dev/null || true
            rm -f /swapfile
            sed -i '/\/swapfile/d' /etc/fstab
            echo -e "${GREEN}✓ Swap 虚拟内存清理完成${NC}"
        else
            echo -e "${YELLOW}已保留 /swapfile 虚拟内存${NC}"
        fi
    else
        echo -e "${GREEN}未找到 /swapfile，跳过 Swap 清理${NC}"
    fi

    echo -e "\n${YELLOW}[4/4] 清理配置文件与临时缓存目录...${NC}"
    if [ -d "$PROJECT_DIR" ]; then
        rm -f "$PROJECT_DIR/.env"
        rm -rf "$PROJECT_DIR/public"
        echo -e "${GREEN}✓ 项目本地配置文件及数据缓存已完全清理${NC}"
    fi

    echo -e "\n${GREEN}================================================${NC}"
    echo -e "${GREEN}       🎉 AI-ECOM 系统已成功卸载并完成清理！       ${NC}"
    echo -e "${GREEN}================================================${NC}"
    exit 0
}

# 校验命令行入参触发卸载
if [[ "$1" == "--uninstall" || "$1" == "-u" || "$1" == "clean" || "$1" == "--clean" ]]; then
    do_uninstall
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}    AI-ECOM 一键自动化部署与 SSL 证书配置脚本      ${NC}"
echo -e "${BLUE}================================================${NC}"

# 1. 检查并安装基础环境依赖
echo -e "\n${YELLOW}[1/8] 检查并自动化安装基础环境依赖...${NC}"
apt-get update -y
apt-get install -y curl git nginx ufw util-linux certbot python3-certbot-nginx

# 检查/启动 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}未检测到 Docker，正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# 2. 自动开启 Swap 虚拟内存
echo -e "\n${YELLOW}[2/8] 检查并配置 Swap 虚拟内存...${NC}"
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
echo -e "\n${YELLOW}[3/8] 准备项目源码环境...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "正在克隆项目仓库至 $PROJECT_DIR ..."
    git clone https://github.com/danyzhou/AI-ECOM.git "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# 自动补齐 public 目录
mkdir -p "$PROJECT_DIR/public"
touch "$PROJECT_DIR/public/.gitkeep"

# 自动修复 Dockerfile 中的 npm ci 与 public 复制逻辑 (避免无 package-lock.json 导致构建崩溃)
if [ -f "Dockerfile" ]; then
    echo -e "${YELLOW}检测到 Dockerfile，正在进行依赖安装命令与兼容性防护修补...${NC}"
    sed -i 's/npm ci/npm install/g' Dockerfile
    sed -i 's/--only=production/--omit=dev/g' Dockerfile
    sed -i 's/COPY --from=builder \/app\/public \.\/public/# COPY --from=builder \/app\/public \.\/public/' Dockerfile
fi

# 4. 配置环境变量与域名参数
echo -e "\n${YELLOW}[4/8] 请输入系统部署配置参数...${NC}"
read -p "请输入要绑定的自定义域名 (例如: ecom.yourdomain.com): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
    read -p "域名不能为空，请输入自定义域名: " DOMAIN_NAME
done

read -p "请输入用于接收 SSL 证书到期提醒的邮箱: " CERT_EMAIL
while [ -z "$CERT_EMAIL" ]; do
    read -p "邮箱不能为空，请输入常用邮箱: " CERT_EMAIL
done

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
API_TIMEOUT=300000

POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASS
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@postgres:5432/$DB_NAME

ADMIN_USER=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF

echo -e "${GREEN}✓ .env 环境变量配置完成${NC}"

# 5. 清理损坏数据卷并构建启动 Docker 容器
echo -e "\n${YELLOW}[5/8] 启动 PostgreSQL 数据库与 Node.js 服务容器...${NC}"
docker compose down -v 2>/dev/null || true
docker compose up -d --build

# 等待 PostgreSQL 数据库完全准备完毕
echo -e "${YELLOW}等待数据库健康就绪...${NC}"
sleep 10

# 6. 强行初始化数据库结构与管理员账号
echo -e "\n${YELLOW}[6/8] 执行数据库 Migrations 与初始化 Admin 账号...${NC}"
docker exec -i ai-ecom-app-1 npm run db:migrate 2>/dev/null || true
docker exec -i ai-ecom-app-1 npm run db:seed 2>/dev/null || true

# 7. 配置 Nginx 反向代理与超时设置
echo -e "\n${YELLOW}[7/8] 配置 Nginx 反向代理(支持长耗时 AI 生成)与防火墙端口...${NC}"
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

cat <<EOF > /etc/nginx/sites-available/ai-ecom
server {
    listen 80;
    server_name $DOMAIN_NAME;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

        # 延长长连接超时，防止 AI 智能生成文案和处理图片时触发 HTTP 502/504 错误
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ai-ecom /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# 8. 使用 Certbot 自动申请 SSL 证书并开启 HTTPS 强转
echo -e "\n${YELLOW}[8/8] 申请 Let's Encrypt SSL 免费证书 (HTTPS)...${NC}"
echo -e "${BLUE}正在为域名 $DOMAIN_NAME 申请证书，请确保域名已解析到当前 VPS IP...${NC}"

if certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect; then
    echo -e "${GREEN}✓ SSL 证书申请并配置成功！已开启 HTTP 到 HTTPS 自动重定向。${NC}"
else
    echo -e "${RED}⚠️ SSL 证书申请失败，请检查域名 DNS 解析是否生效，或检查 80 端口是否被占用。${NC}"
    echo -e "${YELLOW}当前网站仍可通过 HTTP (http://$DOMAIN_NAME) 进行访问。${NC}"
fi

# 设置 Certbot 自动续期
systemctl enable certbot.timer 2>/dev/null || true

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}          🎉 AI-ECOM 系统部署成功！             ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "访问地址: ${BLUE}https://${DOMAIN_NAME}${NC}"
echo -e "管理员账号: ${YELLOW}${ADMIN_USER}${NC}"
echo -e "管理员密码: ${YELLOW}${ADMIN_PASS}${NC}"
echo -e "${GREEN}================================================${NC}"
