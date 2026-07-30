# AI Ecommerce Operation Center 一键安装教程 (Quick Start Guide)

本教程适用于在全新 Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS 服务器上进行生产环境一键部署。

---

## 1、服务器要求 (System Requirements)

- **操作系统**: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (纯净系统)
- **CPU**: 2 核 (2 Core) 或以上
- **内存**: 4GB RAM 或以上 (最低 2GB)
- **磁盘**: 40GB+ 可用 SSD 存储空间
- **网络**: 拥有独立公网 IPv4，80, 443, 22 端口处于开放状态

---

## 2、域名解析 (DNS Configuration)

在您的域名 DNS 服务商（如 Cloudflare, Aliyun, DNSPod）后台添加一条 **A 记录**：

```text
主机记录 (Host):  ai
记录类型 (Type):  A
记录值 (Value):   [您的 VPS 公网 IP 地址]
TTL:             默认 (或 600 秒)
```

> **示例**: `ai.example.com` → `123.45.67.89`  
> *提示：请等待 1-2 分钟确保 DNS 解析生效。*

---

## 3、SSH 登录服务器 (SSH Connection)

在本地终端 (Terminal / PowerShell) 中运行以下命令登录 VPS：

```bash
ssh root@123.45.67.89
```

*(将 `123.45.67.89` 替换为您的服务器真实 IP 地址)*

---

## 4、上传项目发布包 (Upload Release Package)

在本地电脑上，将下载好的 release 压缩包上传至服务器 root 目录：

```bash
scp AI-Ecommerce-Operation-Center-v1.0.0.zip root@123.45.67.89:/root/
```

*如果使用 `.tar.gz` 格式：*
```bash
scp AI-Ecommerce-Operation-Center-v1.0.0.tar.gz root@123.45.67.89:/root/
```

---

## 5、解压项目包 (Extract Package)

在服务器终端中执行解压：

```bash
# 若上传的是 zip 包
unzip AI-Ecommerce-Operation-Center-v1.0.0.zip

# 若上传的是 tar.gz 包
tar -xzf AI-Ecommerce-Operation-Center-v1.0.0.tar.gz
```

---

## 6、进入项目目录 (Navigate to Directory)

```bash
cd AI-Ecommerce-Operation-Center-v1.0.0
```

---

## 7、授予脚本执行权限 (Set Permissions)

```bash
chmod +x install.sh update.sh uninstall.sh backup.sh scripts/*.sh
```

---

## 8、执行一键安装脚本 (Run Installer)

```bash
./install.sh
```

---

## 9、交互式输入配置参数 (Interactive Prompt)

安装脚本启动后，会提示输入以下配置信息：

1. **域名 (Domain Name)**: `ai.example.com`
2. **管理员账号 (Admin Username)**: `admin` *(直接回车使用默认)*
3. **管理员邮箱 (Admin Email)**: `your-email@example.com` *(用于 SSL 证书申请与登录)*
4. **管理员密码 (Admin Password)**: *(直接回车由系统随机生成 16 位强密码)*
5. **OpenAI API Key**: `sk-proj-xxxxxxxx...` *(可选，亦可在系统后台配置)*
6. **Gemini API Key**: `AIzaSyxxxxxxxxx...` *(可选，亦可在系统后台配置)*

---

## 10、脚本自动完成生产环境搭建 (Automated Installation)

脚本将按顺序自动完成以下全套搭建：

- [x] 检测系统资源与 CPU/RAM 满足度
- [x] 自动安装 Docker & Docker Compose 插件
- [x] 自动安装 Nginx 与 Certbot (SSL 自动化工具)
- [x] 开启 UFW 防火墙并开放 80, 443, 22 端口
- [x] 构建 Node.js 生产应用容器与启动 PostgreSQL 15 数据库
- [x] 初始化数据库 Schema 数据表与写入配置
- [x] 自动创建 Root 管理员账号与加密凭据
- [x] 配置 Nginx 反向代理与 Gzip 压缩
- [x] 自动向 Let's Encrypt SSL 申请证书并配置 HTTPS 强转
- [x] 注册 Ubuntu `systemd` 服务 (`ai-ecommerce.service`) 确保开机自启

---

## 11、安装完成控制台输出 (Installation Output)

安装完成后，终端将打印访问信息：

```text
=====================================================
 AI Ecommerce Operation Center Installed Successfully! 
=====================================================
 网站入口 (Website URL):   https://ai.example.com
 系统设置 (Admin Panel):   https://ai.example.com/settings
 管理员账号 (Username):   admin
 管理员密码 (Password):   aB3#xK9$mP2!qW5z
 数据库状态:               PostgreSQL (Running Containerized)
 SSL 证书加密:             Active (Auto-Renew Enabled)
=====================================================
```

---

## 12、首次登录与店铺配置 (First Login & Setup)

1. 打开浏览器，访问控制台输出的网站地址：`https://ai.example.com`
2. 登录账号：`admin`，密码输入上方输出的随机强密码。
3. 导航至 **Settings (设置)** 菜单：
   - 及时修改初始管理员密码。
   - 校验或填入 OpenAI 与 Gemini API Keys。
4. 导航至 **WordPress Stores (店铺管理)** 菜单：
   - 添加您的 WooCommerce 独立站域名与 REST API Consumer Key/Secret。
5. 进入 **AI Product Creator (商品处理)**，导入商品图片并体验自动化处理刊登流程！
