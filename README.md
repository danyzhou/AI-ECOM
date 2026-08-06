# 🚀 AI-ECOM - 电商多店铺自动化处理管理系统 (Pro Edition)

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Release-v1.0.0-blue.svg" alt="Release v1.0.0"></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License"></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg" alt="Node.js 18+"></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18%2B-61dafb.svg" alt="React 18"></a>
  <a href="#"><img src="https://img.shields.io/badge/WooCommerce-v3--REST--API-purple.svg" alt="WooCommerce API"></a>
  <a href="#"><img src="https://img.shields.io/badge/Gemini-2.5%2F1.5-orange.svg" alt="Google Gemini API"></a>
</p>

<p align="center">
  <strong>基于 AI 大模型驱动的跨境电商自动化商品生产线，实现商品图片识别、AI 视觉美化、多语言文案生成、SEO 优化与 WooCommerce 多站点一键矩阵上架。</strong>
</p>

---

## ⚡ 极速一键部署 (Recommended for VPS)

针对 **Ubuntu 22.04 / 24.04 LTS** 云服务器（VPS），系统提供了一键自动化部署脚本。无需预先安装 Docker、Nginx 或手动配置 SSL，直接以 `root` 身份在终端粘贴执行以下一键命令：

```bash
curl -sSL https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh -o /tmp/install.sh && sudo bash /tmp/install.sh
```

> **💡 自动化部署特性**：
> 1. **基础环境**：自动安装 Curl、Git、Docker、Docker Compose、Nginx、UFW 防火墙与 Certbot。
> 2. **内存保护 (Swap)**：检测并自动创建 **2GB Swap 虚拟内存**（防止小内存 VPS 编译或运行构建时因 OOM 被 Killed）。
> 3. **反向代理 & 防超时**：自动配置 Nginx 代理并将长连接与读取超时扩展至 **600 秒**（针对 AI 图像处理与大模型生成文案的耗时特性）。
> 4. **数据库 & 动态账号**：启动 PostgreSQL 容器，自动执行 Schema Migration 以及包含自定义 `ADMIN_USER` / `ADMIN_PASSWORD` 的账号初始化。
> 5. **HTTPS 证书**：使用 Certbot 自动申请 Let's Encrypt 免费 SSL 证书并开启 HTTP 到 HTTPS 重定向与自动续期。

### 🗑️ 一键彻底卸载

如果需要彻底清理并卸载 AI-ECOM 系统，可以运行以下本地或远程卸载命令：

```bash
# 1. 免交互一键彻底卸载（推荐，直接清理容器、数据卷与 Nginx 配置）：
curl -sSL https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh | sudo bash -s -- --uninstall -y

# 2. 本地交互式卸载：
sudo bash /opt/AI-ECOM/install.sh --uninstall
```

---

## 📖 目录 (Table of Contents)

- [⚡ 极速一键部署 (Recommended for VPS)](#-极速一键部署-recommended-for-vps)
  - [🗑️ 一键彻底卸载](#️-一键彻底卸载)
- [✨ 项目简介与核心痛点](#-项目简介与核心痛点)
- [🔥 核心功能亮点](#-核心功能亮点)
- [🛠️ 技术栈](#️-技术栈)
- [📐 架构与全自动流水线](#-架构与全自动流水线)
- [🚀 部署与开发指南](#-部署与开发指南)
  - [1. 一键脚本自动化部署 (推荐)](#1-一键脚本自动化部署-推荐)
  - [2. Docker / Docker Compose 手动部署](#2-docker--docker-compose-手动部署)
  - [3. 本地 Node.js 开发环境运行](#3-本地-nodejs-开发环境运行)
  - [4. WooCommerce 独立站 API 绑定与配置](#4-woocommerce-独立站-api-绑定与配置)
- [⚙️ 环境变量配置 (.env.example)](#️-环境变量配置-envexample)
- [❓ 常见问题与排错 (FAQ)](#-常见问题与排错-faq)
- [📜 开源许可证 (License)](#-开源许可证-license)

---

## ✨ 项目简介与核心痛点

在跨境电商（如 WooCommerce、Shopify）铺货与多独立站矩阵运营中，团队常面临以下痛点：
1. **修图极度耗时**：供应商原图带水印、杂物或尺寸比例统一性差。
2. **多语言 SEO 撰写门槛高**：人工撰写符合 Google 抓取规则的 HTML 结构化多语言描述成本高昂。
3. **SKU 与价格缺失**：商品发布时常漏填规范 SKU、建议零售价、折后价或库存数量。
4. **多店铺矩阵重复上架**：缺少全自动一键同步分发机制。

**AI-ECOM** 打造了从 **“原图 AI 识别与抠图美化 → Gemini 多语言 SEO 文案生成 & SKU/价格/库存自动定标 → WooCommerce REST API 媒体库与商品矩阵分发”** 的全自动化处理流程。

---

## 🔥 核心功能亮点

- 🎨 **AI 图像识别与多比例构图美化**
  - 自动识别材质、颜色、场景特征。
  - 支持 1:1 (正方形)、4:3 (标准)、16:9 (宽屏)、3:4 (电商) 智能构图与抠图背景美化。
  - 自动同步上传至WordPress媒体库并绑定商品主图。

- ✍️ **Gemini 智能文案与 SKU / 价格 / 库存定标**
  - 自动输出结构化 HTML 描述（含 `<h3>`、`<ul>`、`<li>` 排版）。
  - 自动生成规范 SKU（如 `AIECOM-CAT-XXXX`）、市场价、折后价与合理库存。
  - 支持英语、德语、法语、西班牙语、日语等多国语言。

- 🏬 **WooCommerce 独立站矩阵一键刊登**
  - 实时检测多个独立站 API 健康度。
  - 动态同步目标店铺分类（Categories）与标签（Tags）。
  - 支持“保存草稿 (Draft)”与“一键发布 (Publish)”双模式上架。

- 📊 **可视化大盘与数据持久化**
  - 实时统计商品数、待审任务及刊登成功率。
  - 支持 PostgreSQL 与磁盘物理持久化，确保数据删除/修改刷新页面不丢失。

---

## 🛠️ 技术栈

- **前端**：React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Recharts + Framer Motion
- **后端**：Node.js + Express.js + TypeScript (`tsx` 开发, `esbuild` 生产编译)
- **AI 服务**：`@google/genai` (Google Gemini 2.5/1.5 Flash) + OpenAI Vision
- **电商 API**：WooCommerce REST API (`@woocommerce/woocommerce-rest-api`)
- **存储**：PostgreSQL (Drizzle/Pool) / 磁盘物理 JSON 双引擎

---

## 📐 架构与全自动流水线

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        前端 React / Vite 界面                           │
│     - 仪表盘  - 商品创建流水线  - 多店铺矩阵管理  - 全栈系统日志        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (Port 3000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     后端 Express.js 服务器 (server.ts)                  │
│  ├── API 路由: /api/products, /api/ai-tasks, /api/woocommerce/stores   │
│  ├── 核心 Service 层:                                                  │
│  │   ├── geminiService.ts      (AI 视觉解析 + 文案 + SKU/价格自动生成) │
│  │   ├── publisherService.ts   (WooCommerce API 媒体库与商品矩阵上架)   │
│  │   └── databaseService.ts    (PostgreSQL / JSON 物理数据持久化)       │
└───────────────┬───────────────────┬────────────────────┬───────────────┘
                │                   │                    │
                ▼                   ▼                    ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐
     │  OpenAI / Vision │  │  Google Gemini   │  │ WordPress WooCommerce │
     │  图像抠图视觉美化 │  │  SEO 多语言文案  │  │ REST API (多站点刊登) │
     └──────────────────┘  └──────────────────┘  └───────────────────────┘
```

---

## 🚀 部署与开发指南

### 1. 一键脚本自动化部署 (推荐)

在干净的 **Ubuntu 22.04 / 24.04 LTS VPS** 终端中运行：

```bash
curl -sSL https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh -o /tmp/install.sh && sudo bash /tmp/install.sh
```

**交互提示填写**：
- 输入绑定域名（如 `ecom.yourdomain.com`，需事先解析到 VPS IP）。
- 输入用于接收 SSL 证书提醒的邮箱。
- 设置数据库与管理员 Username/Password（系统初始化将自动应用自定义管理员凭证）。

---

### 2. Docker / Docker Compose 手动部署

```bash
git clone https://github.com/danyzhou/AI-ECOM.git /opt/AI-ECOM
cd /opt/AI-ECOM
cp .env.example .env
# 编辑 .env 配置 GEMINI_API_KEY 与 ADMIN_USER / ADMIN_PASSWORD
docker compose up -d --build
```

---

### 3. 本地 Node.js 开发环境运行

```bash
git clone https://github.com/danyzhou/AI-ECOM.git
cd AI-ECOM
npm install
cp .env.example .env
# 填写 GEMINI_API_KEY
npm run dev
```
启动后访问：`http://localhost:3000`

---

### 4. WooCommerce 独立站 API 绑定与配置

1. 登录 WordPress 后台：进入 **WooCommerce -> 设置 -> 高级 -> REST API**。
2. 添加 API 密钥，描述填写 `AI-ECOM`，权限选择 **读写 (Read/Write)**。
3. 在系统 **店铺管理** 界面录入 URL、`Consumer Key` 与 `Consumer Secret`。

---

## ⚙️ 环境变量配置 (.env.example)

| 环境变量 Key | 是否必填 | 默认值 | 作用描述 (Description) |
| --- | --- | --- | --- |
| `PORT` | 否 | `3000` | 服务端口 |
| `NODE_ENV` | 否 | `development` | 运行环境模式 (`development` / `production`) |
| `GEMINI_API_KEY` | **是** | - | Google Gemini API Key |
| `ADMIN_USER` | 否 | `admin` | 初始化系统管理员用户名 |
| `ADMIN_PASSWORD` | 否 | `admin123` | 初始化系统管理员密码 |
| `DATABASE_URL` | 否 | - | PostgreSQL 数据库串（未配置时降级为 JSON 物理库） |

---

## ❓ 常见问题与排错 (FAQ)

### Q1: 部署时自定义设置的管理员账号登录提示不匹配？
> 已完全修复。`install.sh` 脚本录入的 `ADMIN_USER` 与 `ADMIN_PASSWORD` 会自动被 `npm run db:seed` 提取并对密码加密写入数据库，支持直接使用自定义账号登录。

### Q2: 批量处理图片或生成文案时报 502/504 Gateway Timeout？
> 一键部署脚本已在 Nginx 中将 `proxy_read_timeout` 与 `proxy_send_timeout` 扩展至 `600s`，确保大模型耗时生成任务平滑进行。

---

## 📜 开源许可证 (License)

本项目遵循 [MIT License](LICENSE) 开源。
