# AI Ecommerce Operation Center - REST API Documentation

## Auth Endpoints
- `POST /api/auth/login` - Administrator login (JWT)
- `GET /api/auth/me` - Get current session user info
- `POST /api/auth/change-password` - Modify admin password

## AI Pipeline Endpoints
- `POST /api/ai/vision-analyze` - OpenAI Vision product feature extraction
- `POST /api/ai/generate-content` - Gemini SEO product copy generator

## WooCommerce Store Management Endpoints
- `GET /api/stores` - List bound stores
- `POST /api/stores` - Add WooCommerce store credentials
- `PUT /api/stores/:id` - Update store config
- `DELETE /api/stores/:id` - Remove store
- `POST /api/stores/test-connection` - Live connectivity diagnostic

## Publishing Endpoints
- `POST /api/woocommerce/publish` - Publish product to WooCommerce store via REST API
- `GET /api/woocommerce/history` - Retrieve publishing history logs

## System Health & Logs Endpoints
- `GET /api/health` - Health check diagnostic (Database, AI, WooCommerce, Disk, Memory)
- `GET /api/logs` - Query structured execution logs
- `DELETE /api/logs` - Clear execution log history
