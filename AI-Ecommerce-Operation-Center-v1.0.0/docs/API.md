# API Reference Endpoint Summary

## Endpoints

### Auth
- `POST /api/auth/login`: Authenticate admin account.
- `POST /api/auth/change-password`: Update admin credentials.

### Products
- `GET /api/products`: List all products.
- `POST /api/products`: Create product record.
- `GET /api/products/:id`: Get product details.
- `PUT /api/products/:id`: Update product record.
- `DELETE /api/products/:id`: Remove product.

### SKU Management
- `POST /api/sku/generate`: Generate next unique SKU sequence.
- `GET /api/sku/settings`: Get current SKU rule.
- `POST /api/sku/settings`: Update prefix and auto-generation rule.

### WooCommerce Stores
- `GET /api/stores`: List connected stores.
- `POST /api/stores`: Connect new WordPress WooCommerce store.
- `POST /api/stores/test`: Health check WooCommerce credentials.
- `DELETE /api/stores/:id`: Remove connected store.

### Product Publishing
- `POST /api/publish`: Publish product to target WooCommerce store.
- `GET /api/publish/logs`: View publication history logs.

### AI Processing Tasks
- `POST /api/ai/process-image`: Execute OpenAI image analysis & optimization.
- `POST /api/ai/generate-copy`: Execute Gemini multilingual content generation.
