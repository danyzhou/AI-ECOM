# AI Ecommerce Operation Center (Production Release Candidate)

AI 电商多店铺自动化处理管理系统 (Release Candidate v1.0.0)

本项目是一个为跨境电商与独立站卖家打造的自动化商品处理与刊登发布系统。集成 OpenAI 视觉解析与 Gemini 多语言 SEO 营销文案生成，支持将自动化处理后的商品批量分发与一键刊登到多个 WordPress WooCommerce 独立站。

---

## 目录结构 (Directory Structure)

```
ai-ecommerce-center/
├── install.sh                # Ubuntu 22.04 / 24.04 一键安装自动化脚本
├── uninstall.sh              # 卸载与清理脚本
├── update.sh                 # Docker 容器与源码自动化更新脚本
├── backup.sh                 # PostgreSQL 数据库与配置文件备份脚本
├── docker-compose.yml        # Docker 生产容器编排文件
├── .env.example              # 环境变量与密匙模板
├── README.md                 # 生产部署与使用文档
├── database/
│   └── init.sql              # PostgreSQL 生产环境数据库初始化 Schema
├── nginx/
│   └── ai-ecommerce.conf     # Nginx 反向代理与 HTTP/HTTPS 安全配置
└── app/                      # AI Ecommerce 核心系统源码与构建镜像
    ├── src/                  # React + Tailwind Frontend 源码
    ├── server/               # Node.js + Express API Backend 源码
    ├── server.ts             # 生产全栈服务器入口
    └── Dockerfile            # 多阶段 Node.js 生产环境 Dockerfile
```

---

## 快速安装步骤 (Installation Guide)

### 环境要求 (Prerequisites)
- **操作系统**: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS
- **权限**: root 权限 (sudo bash)
- **资源配置**: 建议 2 CPU Core, 2GB+ RAM, 20GB+ 磁盘空间
- **网络**: 端口 80, 443, 22 已开放，且域名已解析至服务器 IP

### 1. 运行一键安装脚本
```bash
cd ai-ecommerce-center
sudo bash install.sh
```

### 2. 交互式提示输入
安装脚本会自动检测 CPU/RAM/磁盘，自动安装 Docker、Docker Compose、Nginx 与 Certbot，并引导提示输入：
- **域名 (Domain)**: 例如 `ai.yourdomain.com`
- **管理员账号 (Admin Username)**: 默认 `admin`
- **管理员邮箱 (Admin Email)**: 用于 Let's Encrypt SSL 申请与通知
- **管理员密码 (Admin Password)**: 可回车自动生成 16 位强随机密码

### 3. 安装完成输出
安装完成后，系统将输出以下访问地址与凭据：
- **网站与后台地址**: `https://ai.yourdomain.com`
- **默认管理员账号**: `admin`
- **默认管理员密码**: (控制台打印的随机强密码)
- **数据库**: PostgreSQL (容器隔离，公网禁止直接访问)
- **SSL 证书**: 已自动申请并配置自动续期

---

## 服务管理命令 (Service Management)

系统已自动注册为 Ubuntu `systemd` 服务：

```bash
# 启动服务
sudo systemctl start ai-ecommerce

# 停止服务
sudo systemctl stop ai-ecommerce

# 查看服务运行状态
sudo systemctl status ai-ecommerce

# 查看系统实时日志
sudo journalctl -u ai-ecommerce -f
```

---

## 数据库与配置备份 (Backup Guide)

定期执行备份脚本将自动导出 PostgreSQL 数据库 SQL 镜像并打包配置文件：

```bash
sudo bash backup.sh
```
备份压缩包将存放在 `./backup/ai_ecommerce_backup_YYYYMMDD_HHMMSS.tar.gz`。

---

## 系统升级 (Upgrade Guide)

平滑拉取最新代码并重新构建应用容器：

```bash
sudo bash update.sh
```

---

## 系统卸载 (Uninstall Guide)

完全移除系统服务与 Nginx 配置：

```bash
sudo bash uninstall.sh
```
在提示中可选择是否彻底清除 PostgreSQL 持久化数据卷。

---

## 安全与架构规范 (Security & Architecture)
1. **API Key 保护**: OpenAI / Gemini API Key 仅保存在服务器端 `.env` 中，客户端绝对无法获取。
2. **PostgreSQL 安全**: 数据库仅绑定在 127.0.0.1:5432，禁止公网IP直接连通。
3. **上传文件限制**: 前后端统一限制单张图片最大 20MB，防止大文件缓冲区溢出攻击。
4. **SKU 并发安全**: 使用数据库事务锁 (Mutex Lock Chain)，确保高并发下 SKU 100% 唯一不重复。
