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

针对 **Ubuntu 22.04 / 24.04 LTS** 云服务器（VPS），系统提供了一键自动化部署脚本。无需手动预先安装 Docker、Nginx 或配置 SSL，直接以 `root` 权限在 VPS 终端执行以下一键指令即可完成全部配置：

```bash
curl -sSL https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh -o /tmp/install.sh && sudo bash /tmp/install.sh
```

> **💡 一键部署自动化能力**：
> 1. **基础依赖**：自动安装并配置 Curl、Git、Docker、Docker Compose、Nginx、UFW、Certbot。
> 2. **内存保护 (Swap)**：检测并自动创建 **2GB Swap 虚拟内存**（防止小内存 VPS 构建过程因内存溢出而被系统 Kill）。
> 3. **反向代理 & 防超时**：自动配置 Nginx 代理并将连接与读取超时调至 **600 秒**（防止 AI 美化图片与大语言模型生成长文案时触发 HTTP 502/504）。
> 4. **数据库 & 账号**：启动 PostgreSQL 数据库，自动执行 Schema Migration 和默认 Admin 账号 Seed。
> 5. **HTTPS 证书**：自动申请 Let's Encrypt 免费 SSL 证书并配置 HTTP 到 HTTPS 强转与定时续期。

---

## 📖 目录 (Table of Contents)

- [⚡ 极速一键部署 (Recommended for VPS)](#-极速一键部署-recommended-for-vps)
- [✨ 项目简介与核心痛点](#-项目简介与核心痛点)
- [🔥 核心功能亮点](#-核心功能亮点)
- [🛠️ 技术栈](#️-技术栈)
- [📐 架构与全自动流水线工作流](#-架构与全自动流水线工作流)
- [🚀 部署与开发指南](#-部署与开发指南)
  - [1. 方案一：一键脚本自动化部署 (推荐)](#1-方案一构建一键脚本自动化部署-推荐)
  - [2. 方案二：Docker / Docker Compose 手动部署](#2-方案二docker--docker-compose-手动部署)
  - [3. 方案三：本地 Node.js 开发环境运行](#3-方案三本地-nodejs-开发环境运行)
  - [4. WooCommerce 独立站 API 绑定与配置](#4-woocommerce-独立站-api-绑定与配置)
- [⚙️ 环境变量配置 (.env.example)](#️-环境变量配置-envexample)
- [❓ 常见问题与排错 (FAQ)](#-常见问题与排错-faq)
- [🤝 贡献指南 (Contributing)](#-贡献指南-contributing)
- [📜 开源许可证 (License)](#-开源许可证-license)

---

## ✨ 项目简介与核心痛点

在跨境电商（如 WooCommerce、Shopify、Amazon）运营与多独立站矩阵铺货模式中，运营团队往往面临以下痛点：

1. **修图效率低，图像无视觉质感**：供应商商品原图含水印、文字杂物、尺寸比例混乱，手动修图极度耗时。
2. **多语言 SEO 文案撰写成本高**：手动撰写英文、德文、法文等符合 Google SEO 标准的带 HTML 标签排版文案需要大量外语运营人员。
3. **关键商品属性缺失**：发布至 WooCommerce 站点的商品经常漏填规范 SKU、市场价格（`regular_price`）、促销价（`sale_price`）与库存数量（`stock_quantity`）。
4. **多店铺刊登重复劳动**：无法实现商品全自动流转以及一键同步分发至多个 WooCommerce 矩阵独立站。

**AI-ECOM** (AI Ecommerce Operation Center) 打造了从 **“原图 AI 视觉识别与抠图美化 → Gemini 2.5 多语言文案生成 & SKU/价格/库存自动定标 → WooCommerce REST API 媒体库与商品矩阵刊登”** 的全自动化流水线。

---

## 🔥 核心功能亮点

- 🎨 **AI 图像识别与多比例构图美化**
  - **视觉识别**：大模型自动解析商品材质、色彩、轮廓与适用场景。
  - **智能美化构图**：支持 1:1 (正方形)、4:3 (标准)、16:9 (宽屏)、3:4 (电商) 智能构图、抠图去杂物与背景美化。
  - **WordPress 媒体库无缝绑定**：AI 处理后的图片自动上传至目标独立站媒体库并关联为商品主图。

- ✍️ **Gemini 智能文案与 SKU / 价格 / 库存生成**
  - **结构化 HTML 输出**：自动输出规范包含标题、`<h3>` 结构、`<ul>` / `<li>` 卖点特性的 SEO 描述与摘要。
  - **自动定标 SKU 与价格**：流转中自动生成唯一 SKU（如 `AIECOM-CAT-XXXX`）、市场零售价、促销折扣价及随机合理库存（50-200件）。
  - **多语言适配**：一键切换英语、德语、法语、西班牙语、日语等多国语言。

- 🏬 **WooCommerce 独立站矩阵管理与自动刊登**
  - 支持多店铺 REST API 状态健康度检测与集中管理。
  - 自动获取并同步目标店铺的分类（Categories）与标签（Tags）。
  - 支持“保存草稿 (Draft)”与“一键发布 (Publish)”双模式批量上架。

- 📊 **可视化数据大盘与持久化存储**
  - 实时统计商品总量、待上架商品数、任务流进度与成功率。
  - 支持 PostgreSQL 与 JSON 本地存储引擎，服务端物理持久化，彻底解决删除/更新后刷新页面重现的 Bug。

---

## 🛠️ 技术栈

### 前端 (Frontend)
- **核心框架**：React 18 + Vite + TypeScript
- ** UI & 样式**：Tailwind CSS + Lucide React 图标库
- **可视化图表**：Recharts
- **平滑动画**：Framer Motion

### 后端 (Backend)
- **运行环境**：Node.js 18+ / 20+
- **Web 服务**：Express.js + TypeScript (`tsx` 开发，`esbuild` 编译 bundling)
- **AI 智能服务**：
  - `@google/genai` (Google Gemini 2.5/1.5 Flash 大语言模型)
  - OpenAI Vision / Image API (辅助图像抠图美化)
- **电商接口**：WooCommerce REST API (`@woocommerce/woocommerce-rest-api` / Axios)

### 数据库与持久化 (Storage)
- **数据库**：PostgreSQL / 文件持久化引擎 (`data_db/products.json`, `data_db/stores.json`, `data_db/tasks.json`)

---

## 📐 架构与全自动流水线工作流

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

### 1. 方案一：一键脚本自动化部署 (推荐)

在干净的 **Ubuntu 22.04 / 24.04 LTS VPS** 终端中，直接复制运行：

```bash
curl -sSL https://raw.githubusercontent.com/danyzhou/AI-ECOM/main/install.sh -o /tmp/install.sh && sudo bash /tmp/install.sh
```

**命令行交互填空提示**：
- **自定义域名**：例如 `ecom.yourdomain.com`（须提前在 DNS 中解析到服务器公网 IP）。
- **SSL 邮箱**：接收 Let's Encrypt 证书到期通知。
- **PostgreSQL 账号密码**与 **系统 Admin 登录凭证**。

---

### 2. 方案二：Docker / Docker Compose 手动部署

若本地已有 Docker 环境，可以通过 Compose 一键构建启动：

```bash
# 1. 克隆项目仓库
git clone https://github.com/danyzhou/AI-ECOM.git /opt/AI-ECOM
cd /opt/AI-ECOM

# 2. 复制并配置 .env 文件
cp .env.example .env
nano .env   # 填入 GEMINI_API_KEY 与 数据库凭证

# 3. 启动容器
docker compose up -d --build
```

---

### 3. 方案三：本地 Node.js 开发环境运行

#### 1) 克隆项目与安装依赖
```bash
git clone https://github.com/danyzhou/AI-ECOM.git
cd AI-ECOM
npm install
```

#### 2) 配置 `.env` 文件
```bash
cp .env.example .env
```
在 `.env` 中指定 API 密钥：
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_google_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

#### 3) 启动开发服务
```bash
npm run dev
```
启动成功后，访问 `http://localhost:3000` 即可进入系统。

---

### 4. WooCommerce 独立站 API 绑定与配置

1. **登录 WordPress 后台**：进入 **WooCommerce -> 设置 (Settings) -> 高级 (Advanced) -> REST API**。
2. **生成 API 密钥**：
   - 点击 **添加密钥 (Add Key)**。
   - 描述填写：`AI-ECOM Operation Center`。
   - **权限 (Permissions)** 必须设置为：**读写 (Read/Write)**。
   - 点击 **生成 API 密钥**，保存生成的 `Consumer Key` (`ck_...`) 和 `Consumer Secret` (`cs_...`)。
3. **系统录入**：
   - 在 AI-ECOM 前端进入 **店铺管理 (Store Management)** 界面。
   - 点击 **添加店铺**，填入你的站点 URL、`Consumer Key` 与 `Consumer Secret` 并点击测试连通性。

---

## ⚙️ 环境变量配置 (.env.example)

| 环境变量 Key | 是否必填 | 默认值 | 作用描述 (Description) |
| --- | --- | --- | --- |
| `PORT` | 否 | `3000` | 后端 Express 服务器监听端口 |
| `NODE_ENV` | 否 | `development` | 运行模式 (`development` / `production`) |
| `GEMINI_API_KEY` | **是** | - | Google Gemini API Key (用于商品视觉解析与 SEO 文案生成) |
| `OPENAI_API_KEY` | 否 | - | OpenAI API Key (用于 AI 图像美化与抠图) |
| `DATABASE_URL` | 否 | - | PostgreSQL 数据库连接串（未配置时默认自动切换为持久化 JSON 存储） |

---

## ❓ 常见问题与排错 (FAQ)

### Q1: 发布商品至 WooCommerce 时提示 `401 Unauthorized` 或 `404 Not Found`？
> **原因与解答**：
> 1. 请检查所填 Key 的权限是否为 **Read/Write (读写)**。
> 2. WordPress 站点必须开启 HTTPS 并启用固定链接（Permalink设置不能为“常规”，须选择“文章名”或“Custom Structure”）。

### Q2: 批量发布或生成时，Nginx 报 HTTP 502 / 504 Gateway Timeout？
> **原因与解答**：
> 大模型生成多语言长文案或高精度图像处理可能耗时 30-90 秒。请确保 Nginx 配置文件中的 `proxy_read_timeout` 与 `proxy_send_timeout` 均已调大至 `600s`（一键部署脚本已自动处理）。

### Q3: 为什么删除商品或更新数据后，刷新页面数据不会丢失？
> **原因与解答**：
> 本系统已完美修补底层数据流。无论是调用 `DELETE /api/products/:id` 还是更新商品，请求均会实时持久化写入 PostgreSQL 数据库或服务端 `data_db/products.json` 磁盘物理库中，刷新页面数据始终保持最新。

---

## 🤝 贡献指南 (Contributing)

非常欢迎提交 Issue 或 Pull Request！

```bash
# 提交代码前请执行代码格式与 Lint 校验
npm run lint
npm run build
```

---

## 📜 开源许可证 (License)

本项目遵循 [MIT License](LICENSE) 协议开源。

<p align="center">
  Made with ❤️ by AI Ecommerce Team
</p>
