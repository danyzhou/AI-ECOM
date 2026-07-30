# AI Ecommerce Operation Center

<p naming="badges">
  <a href="VERSION"><img src="https://img.shields.io/badge/Release-v1.0.0-blue.svg" alt="Release v1.0.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License"></a>
  <a href="QUICK_INSTALL.md"><img src="https://img.shields.io/badge/Ubuntu-22.04%20%7C%2024.04-orange.svg" alt="Ubuntu 22.04/24.04"></a>
  <a href="docs/CHANGELOG.md"><img src="https://img.shields.io/badge/Build-Passing-brightgreen.svg" alt="Build Passing"></a>
</p>

**AI Ecommerce Operation Center** 是一款专为跨境电商卖家、独立站运营团队与 Dropshipping 自动化打造的商品全生命周期 AI 处理与多店铺刊登系统。系统深度集成 **OpenAI 视觉解析** 算法与 **Gemini 多语言 SEO 营销文案** 引擎，支持将处理完成的精修商品一键分发、批量刊登至多个 WordPress WooCommerce 独立站。

---

## 📸 项目界面预览 (Screenshots)

| 运营数据大盘 (Dashboard) | 商品处理与 AI 精修 (Product Studio) |
| :---: | :---: |
| ![Dashboard](screenshots/dashboard.png) | ![Product Creation](screenshots/creator.png) |

| 多店铺分发刊登 (Publishing Center) | WordPress WooCommerce 管理 (Stores) |
| :---: | :---: |
| ![Publishing](screenshots/publishing.png) | ![Store Management](screenshots/stores.png) |

---

## ✨ 核心功能亮点 (Key Features)

- 🎨 **AI 智能图像修图与解析 (OpenAI Vision)**
  - 自动定位并清除供应商图片中的水印、Logo 与杂乱干扰。
  - 智能主体抠图，一键生成符合 Amazon / Google Shopping 规范的标准白底图。
  - 支持 1:1, 3:4, 16:9 比例一键适配裁剪与高清优化。

- ✍️ **Gemini 营销文案与多语言 SEO 引擎**
  - 自动提炼核心卖点，输出带有 HTML 排版的长描述、短描述与结构化参数列表。
  - 自动适配英语、德语、法语、西班牙语、日语等全球主流电商语言。
  - 智能生成符合 Google SEO 梯度的 Meta Title、Meta Description 及 URL Slug。

- 🏬 **WordPress WooCommerce 多店铺统一管理**
  - 无缝绑定并实时监控多台 WooCommerce 独立站的连通健康度。
  - 自动同步分类与标签，支持图片画廊与价格/促销价精确刊登。
  - 支持单键一键发布与多店铺一键批量排期刊登。

- 🔢 **数据库级高并发 SKU 锁机制**
  - PostgreSQL 事务互斥锁保障 SKU 序列号生成，支持前缀、代码长度补零与自定义递增规则，100% 防重。

- 🚀 **全自动化 Docker + Nginx 生产环境**
  - 内置开箱即用的一键脚本，自动集成 Certbot SSL 证书申请、Gzip 压缩、系统自启服务与数据库自动备份。

---

## 🏗️ 系统架构设计 (System Architecture)

```text
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (Web UI)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (443) / SSL Encrypted
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Nginx Reverse Proxy                         │
│       - SSL Termination (Let's Encrypt / Certbot)           │
│       - Gzip Compression & Security Header Hardening        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Proxy Pass HTTP (3000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Node.js + Express API Server (Container)          │
│   ├── JWT Authentication & User Management                  │
│   ├── OpenAI Vision Processing Service                      │
│   ├── Gemini Multilingual SEO Copywriter                    │
│   ├── WooCommerce REST API Integration Layer                │
│   └── Sequential SKU Mutex Engine                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal Network (5432)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           PostgreSQL Database (Isolated Container)          │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ 快速开始 (Quick Start)

仅需一台 Ubuntu 22.04 或 24.04 VPS 即可完成部署：

```bash
# 1. 登录 VPS 并下载发布包
wget https://github.com/your-org/AI-Ecommerce-Operation-Center/releases/download/v1.0.0/AI-Ecommerce-Operation-Center-v1.0.0.zip
unzip AI-Ecommerce-Operation-Center-v1.0.0.zip
cd AI-Ecommerce-Operation-Center-v1.0.0

# 2. 赋予脚本执行权限
chmod +x install.sh

# 3. 运行一键安装脚本
sudo ./install.sh
```

详细逐步教程请参考 [QUICK_INSTALL.md](QUICK_INSTALL.md)。

---

## 📁 项目目录结构 (Directory Layout)

```text
AI-Ecommerce-Operation-Center-v1.0.0/
├── app/                      # 前后端整合全栈 Web 源码
├── server/                   # Node.js + Express API 后端
├── src/                      # React + Tailwind Frontend 源码
├── public/                   # 前端静态资源
├── database/                 # PostgreSQL 架构与初始化 SQL
│   ├── schema.sql            # 全量表结构定义
│   ├── migration.sql         # 性能索引与迁移
│   └── seed.sql              # 基础配置种子数据
├── docker/                   # 生产环境 Docker 配置文件
│   ├── Dockerfile            # 优化多阶段镜像构建
│   ├── docker-compose.yml    # 服务编排 (App + Postgres)
│   └── .dockerignore
├── nginx/                    # Nginx 反向代理配置
│   └── ai-ecommerce.conf
├── scripts/                  # 运维自动化 Shell 脚本
│   ├── install.sh            # 一键安装脚本
│   ├── update.sh             # 平滑更新脚本
│   ├── uninstall.sh          # 彻底卸载脚本
│   ├── backup.sh             # 数据库与配置导出备份
│   └── restore.sh            # 数据库镜像还原
├── config/                   # 环境配置模板
│   ├── production.env.example
│   ├── development.env.example
│   └── default.config.json
├── docs/                     # 完整开发与运维指南文档
│   ├── INSTALL.md
│   ├── DEPLOY.md
│   ├── CONFIG.md
│   ├── API.md
│   ├── CHANGELOG.md
│   ├── FAQ.md
│   ├── TROUBLESHOOTING.md
│   └── LICENSE.md
├── screenshots/              # 界面效果预览截图
├── QUICK_INSTALL.md          # 12步一键安装教程
├── README.md                 # GitHub 主页入口
├── LICENSE                   # MIT 开源协议
├── VERSION                   # 1.0.0
├── release-notes.md          # 发行说明
├── install.sh                # 根目录安装快捷链接
├── docker-compose.yml        # 根目录编排快捷链接
└── .env.example              # 环境变量模板
```

---

## ⚙️ 配置文件说明 (Configuration Guide)

主要的配置项定义于环境变量文件 `.env`（可参考 `config/production.env.example`）：

| 变量名 (Key) | 必填 | 说明 (Description) |
| --- | --- | --- |
| `DOMAIN_NAME` | 是 | 系统主域名 (例: `ai.yourdomain.com`) |
| `POSTGRES_DB` | 是 | PostgreSQL 数据库名 |
| `POSTGRES_USER` | 是 | PostgreSQL 数据库用户名 |
| `POSTGRES_PASSWORD` | 是 | PostgreSQL 数据库强密码 |
| `ADMIN_USERNAME` | 是 | 系统初始 Root 管理员账号 |
| `ADMIN_PASSWORD` | 是 | 系统初始 Root 管理员密码 |
| `JWT_SECRET` | 是 | JWT 鉴权加密密匙 |
| `OPENAI_API_KEY` | 否 | OpenAI API Key (图文解析用) |
| `GEMINI_API_KEY` | 否 | Gemini API Key (SEO 文案生成用) |

---

## 🔑 AI API 密匙配置 (OpenAI & Gemini)

您可以在安装时提供密匙，也可在安装后登录系统 Web 后台，导航至 **Settings (设置)** 菜单中随时填写或升级您的 API Key：

- **OpenAI API Key**: 用于视觉分析与商品图去除水印去背景。
- **Gemini API Key**: 用于智能商品 SEO 多语言长短描述生成。

---

## 🛒 WooCommerce 店铺接入说明 (WooCommerce Store Config)

1. 进入目标 WordPress 网站后台，导航至 **WooCommerce > Settings > Advanced > REST API**。
2. 点击 **Add Key**，Description 填写 `AI-Ecommerce`，Permissions 必须选择 **Read/Write**。
3. 复制生成的 `Consumer Key` 与 `Consumer Secret`。
4. 打开本系统的 **WordPress Stores** 菜单，录入店铺网址及 Key/Secret 即可完成一键绑定。

---

## 🔄 系统升级 (Upgrade)

拉取最新的 GitHub 发行版本并重新打包镜像：

```bash
sudo ./update.sh
```

---

## 💾 备份与恢复 (Backup & Restore)

- **一键备份数据库与配置**:
  ```bash
  sudo ./backup.sh
  ```
  备份归档包将存放于 `./backup/ai_ecommerce_backup_YYYYMMDD_HHMMSS.tar.gz`。

- **恢复数据库镜像**:
  ```bash
  sudo ./scripts/restore.sh ./backup/ai_ecommerce_backup_20260724_100000.tar.gz
  ```

---

## 🗑️ 彻底卸载 (Uninstall)

```bash
sudo ./uninstall.sh
```

---

## ❓ 常见问题 (FAQ)

完整的常见问题解答请阅读 [docs/FAQ.md](docs/FAQ.md) 与 [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)。

---

## 📜 许可证 (License)

本项目采用 [MIT License](LICENSE) 协议开源。
