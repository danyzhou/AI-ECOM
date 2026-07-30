# AI Ecommerce Operation Center - VPS & CyberPanel Deployment Guide

## 1. CyberPanel / Nginx Setup

When deploying under CyberPanel or standard Nginx reverse proxy, proxy pass traffic to port 3000:

```nginx
server {
    listen 80;
    server_name ecom.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ecom.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ecom.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ecom.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 2. PM2 Production Management

```bash
# Start with PM2
pm2 start dist/server.cjs --name ecom-op-center

# Save process list for system reboot
pm2 save
pm2 startup
```
