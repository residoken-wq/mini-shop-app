# Deployment Guide: Mini Shop App with Nginx Proxy Manager

## 1. Docker Configuration Check
Your `docker-compose.yml` is already configured to avoid port conflicts with your existing service.
- **Service Name:** `mini-shop-app`
- **Container Port:** `3000` (Internal)
- **Host Port:** `3100` (External)

This mapping (`3100:3000`) ensures that `mini-shop-app` listens on port **3100** on your VPS, leaving port 3000 free for your other service.

## 2. Nginx Proxy Manager Setup

To expose the app via a domain (e.g., `shop.yourdomain.com`), configure a new Proxy Host in Nginx Proxy Manager:

### Details Tab
- **Domain Names:** `shop.yourdomain.com` (or your chosen domain)
- **Scheme:** `http`
- **Forward Hostname / IP:** `<YOUR_VPS_IP>` 
  - *Note: Do not use `localhost` if NPM is in a container. Use the actual Public IP or the Docker Gateway IP (often `172.17.0.1`).*
- **Forward Port:** `3100`
- **Cache Assets:** Enable
- **Block Common Exploits:** Enable
- **Websockets Support:** Enable

### SSL Tab
- **SSL Certificate:** Request a new Let's Encrypt certificate
- **Force SSL:** Enable
- **HTTP/2 Support:** Enable

## 3. Verify Deployment
Run the following commands on your VPS:

```bash
# 1. Pull latest changes
git pull

# 2. Rebuild and start container
docker-compose up -d --build

# 3. Check logs to ensure it started correctly
docker logs -f mini-shop-app
```

Once the container is running, your app should be accessible at `http://<YOUR_VPS_IP>:3100` and via the domain you configured in NPM.
