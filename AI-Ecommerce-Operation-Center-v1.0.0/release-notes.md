# Release Notes - AI Ecommerce Operation Center v1.0.0

**Release Tag:** `v1.0.0`  
**Release Name:** AI Ecommerce Operation Center v1.0.0 (Production Release Candidate)  
**Release Date:** 2026-07-24  
**Target Environments:** Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (Docker / Nginx / Certbot)

---

## 🚀 Key Features Introduced in v1.0.0

- **WordPress WooCommerce Multi-Store Integration**: Direct WooCommerce REST API integration supporting store health monitoring, automatic category/tag synchronization, gallery publishing, and pricing controls.
- **OpenAI Vision Image Studio**: Intelligent background removal, watermark clearing, white background generation, and aspect ratio conversion (1:1, 3:4, 16:9).
- **Gemini Multilingual Copywriting Engine**: High-converting SEO title generation, structured bullet points, HTML long/short descriptions, and multi-language adaptation (English, German, French, Spanish, Japanese, Chinese).
- **Sequential SKU Mutex Generator**: Thread-safe database transaction queue with prefixing, code padding, and auto-increment guarantees.
- **Production Shell Suite & Systemd Automation**: One-click installer (`install.sh`), systemd auto-start service (`ai-ecommerce.service`), Let's Encrypt SSL auto-renew, PostgreSQL 15 containerization, and Nginx reverse proxy setup.

---

## 🛠️ Optimizations & Bug Fixes

- Resolved concurrent SKU collision under high load using PostgreSQL mutex lock chains.
- Hardened all server endpoints with payload size validation (20MB max upload limit).
- Optimized Nginx reverse proxy headers for SSE (Server-Sent Events) and long AI task execution.

---

## 📦 Upgrade Instructions

To upgrade an existing installation:
```bash
sudo ./update.sh
```
