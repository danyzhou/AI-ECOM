# Troubleshooting Guide

### 1. SSL Certificate Request Failed
**Cause**: Domain DNS A record has not propagated or points to a different IP.  
**Fix**: Ensure your domain DNS points to your VPS IP, then run:
```bash
sudo certbot --nginx -d ai.yourdomain.com
```

### 2. Database Connection Error
**Cause**: PostgreSQL container is starting up or healthy check hasn't passed.  
**Fix**: Check status:
```bash
docker compose ps
docker compose logs postgres
```

### 3. Image Upload Errors
**Cause**: File payload exceeds Nginx 25M client max body size.  
**Fix**: Verify `/etc/nginx/sites-available/ai-ecommerce.conf` contains `client_max_body_size 25M;`.
