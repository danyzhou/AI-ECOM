# Deployment Architecture Guide

The AI Ecommerce Operation Center utilizes a containerized production architecture:

```
[ Internet Client ]
       │ (Port 80/443 SSL)
       ▼
  [ Nginx Reverse Proxy ]
       │ (Port 3000)
       ▼
  [ Node.js Express App Container ]
       │ (Internal Network)
       ▼
  [ PostgreSQL Database Container ] (127.0.0.1:5432)
```

## Docker Compose Setup
To run manually via Docker Compose:
```bash
docker compose -f docker/docker-compose.yml up -d
```
