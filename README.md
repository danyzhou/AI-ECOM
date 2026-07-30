# AI Ecommerce Operation Center

<p naming="badges">
  <a href="VERSION"><img src="https://img.shields.io/badge/Release-v1.0.0-blue.svg" alt="Release v1.0.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License"></a>
  <a href="QUICK_INSTALL.md"><img src="https://img.shields.io/badge/Ubuntu-22.04%20%7C%2024.04-orange.svg" alt="Ubuntu 22.04/24.04"></a>
  <a href="docs/CHANGELOG.md"><img src="https://img.shields.io/badge/Build-Passing-brightgreen.svg" alt="Build Passing"></a>
</p>

**AI Ecommerce Operation Center** 是一款专为跨境电商卖家、独立站运营团队与 Dropshipping 自动化打造的商品全生命周期 AI 处理与多店铺刊登系统。系统深度集成 **OpenAI 视觉解析** 算法与 **AI 智能西班牙语 SEO 营销文案** 引擎，支持将处理完成的 1:1 精修白底商品一键分发、批量刊登至多个 WordPress WooCommerce 独立站。

---
##
💡 说明：运行后将自动交互提示配置自定义域名、PostgreSQL 数据库及管理员账号密码，并全自动安装 Docker、Nginx 反向代理与数据库初始化，无需人工干预！
📸 项目界面预览 (Screenshots)运营数据大盘 (Dashboard)商品处理与 AI 精修 (Product Studio)多店铺分发刊登 (Publishing Center)WordPress WooCommerce 管理 (Stores)
✨ 核心功能亮点 (Key Features)
🎨 AI 智能图像修图与解析 (OpenAI Vision)自动定位并清除供应商图片中的水印、Logo 与杂乱干扰。智能主体抠图，一键生成符合 Amazon / Google Shopping 规范的标准 1:1 白底图。支持 1:1, 3:4, 16:9 比例一键适配裁剪与高清优化。
✍️ AI 智能专有文案与 SEO 引擎 (独占西班牙语)自动提炼核心卖点，输出带有 HTML 完美排版的长描述、短描述与结构化参数列表。精细化西语市场：全系统严格遵循西班牙语（Spanish）电商语境生成，全面提升拉美及西班牙地区的转化率。智能生成符合 Google SEO 梯度的 Meta Title、Meta Description 及 URL Slug。
🏬 WordPress WooCommerce 多店铺统一管理无缝绑定并实时监控多台 WooCommerce 独立站的连通健康度。自动同步分类与标签，支持图片画廊与价格/促销价精确刊登。支持单键一键发布与多店铺一键批量排期刊登。
🔢 数据库级高并发 SKU 锁机制PostgreSQL 事务互斥锁保障 SKU 序列号生成，支持前缀、代码长度补零与自定义递增规则，100% 防重。
🚀 全自动化 Docker + PostgreSQL + Nginx 生产环境内置开箱即用的一键脚本，自动集成域名反向代理绑定、系统自启服务与数据库自动持久化备份。
🏗️ 系统架构设计 (System Architecture)Plaintext
┌─────────────────────────────────────────────────────────────┐
│                  Client Browser (Web UI)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (443) / SSL Encrypted
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                        │
│       - SSL Termination (Let's Encrypt / Certbot)           │
│       - Gzip Compression & Security Header Hardening        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Proxy Pass HTTP (3000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│        Node.js + Express API Server (Container)            │
│   ├── JWT Authentication & User Management                  │
│   ├── OpenAI Vision Processing Service                      │
│   ├── AI 智能 Multilingual SEO Copywriter                  │
│   ├── WooCommerce REST API Integration Layer                │
│   └── Sequential SKU Mutex Engine                           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal Network (5432)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            PostgreSQL Database (Isolated Container)         │
└─────────────────────────────────────────────────────────────┘
📁 项目目录结构 (Directory Layout)PlaintextAI-Ecommerce-Operation-Center-v1.0.0/
├── app/                  # 前后端整合全栈 Web 源码
├── server/               # Node.js + Express API 后端
├── src/                  # React + Tailwind Frontend 源码
├── public/               # 前端静态资源
├── database/             # PostgreSQL 架构与初始化 SQL
│   ├── schema.sql        # 全量表结构定义
│   └── seed.sql          # 基础配置种子数据
├── docker-compose.yml    # 服务编排 (App + Postgres)
├── install.sh            # 一条龙一键安装部署脚本
├── README.md             # GitHub 主页入口
└── .env.example          # 环境变量模板
⚙️ 配置文件说明 (Configuration Guide)系统所有的核心参数均会在运行 install.sh 时通过交互自动生成并写入 .env 文件：变量名 (Key)说明 (Description)DOMAIN_NAME系统主域名 (例: ecom.yourdomain.com)POSTGRES_DBPostgreSQL 数据库名POSTGRES_USERPostgreSQL 数据库用户名POSTGRES_PASSWORDPostgreSQL 数据库强密码ADMIN_INIT_USER系统初始 Root 管理员账号ADMIN_INIT_PASS系统初始 Root 管理员密码JWT_SECRETJWT 鉴权加密密钥OPENAI_API_KEYOpenAI API Key (图文解析用)
🔑 AI API 密钥与后台管理安装完成后，登录系统 Web 后台，导航至 Settings (系统设置) 菜单中：修改管理员：可随时更改管理员用户名与登录密码。API Key 配置：配置 OpenAI API Key 充当“AI 智能”图片处理与文本生成引擎。域名与数据库设置：在线校验数据库连通性与绑定域名。
🛒 WooCommerce 店铺接入说明 (WooCommerce Store Config)进入目标 WordPress 网站后台，导航至 WooCommerce > Settings > Advanced > REST API。点击 Add Key，Description 填写 AI-Ecommerce，Permissions 必须选择 Read/Write。复制生成的 Consumer Key 与 Consumer Secret。打开本系统的 WordPress Stores 菜单，录入店铺网址及 Key/Secret 即可完成一键绑定。
---

## ⚡ 极速一键部署 (One-Click Deployment)

只需准备一台干净的 **Ubuntu 20.04 / 22.04 / 24.04 VPS** 并解析好域名，在 VPS 终端中运行以下**一条龙一键安装命令**即可：

```bash
curl -sSL [https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh](https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh) | sudo bash
---

##


📜 许可证 (License)本项目采用 MIT License 协议开源。
