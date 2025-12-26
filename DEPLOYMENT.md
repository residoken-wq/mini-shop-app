# Deployment Guide: Mini Shop App with Nginx Proxy Manager

## 1. Docker Configuration Check
Your `docker-compose.yml` is configured to map port 3100 on the host to 3000 in the container.
- **Service Name:** `mini-shop-app`
- **Container Port:** `3000` (Internal)
- **Host Port:** `3100` (External)

## 2. Nginx Proxy Manager (NPM) Configuration [CRITICAL]

Since NPM is likely running in a separate Docker stack/container, it cannot see `mini-shop-app` by its hostname (`web` or `mini-shop-app`) or `localhost`.

**You MUST use the VPS Internal IP Address.**

### Get your Internal IP
Run this command on your VPS:
```bash
hostname -I
```
Use the first IP address returned (e.g., `10.128.0.2` or similar). Do NOT use `127.0.0.1`.

### NPM Proxy Host Settings

#### Details Tab
- **Domain Names:** `shoprau.nemmamnon.com`
- **Scheme:** `http`
- **Forward Hostname / IP:** `<YOUR_VPS_INTERNAL_IP>` (e.g., `10.128.0.2`)
- **Forward Port:** `3100`  <-- IMPORTANT: Use the external mapped port
- **Cache Assets:** Enable
- **Block Common Exploits:** Enable
- **Websockets Support:** Enable

#### SSL Tab
- **SSL Certificate:** Request a new Let's Encrypt certificate
- **Force SSL:** Enable
- **HTTP/2 Support:** Enable

## 3. Verify Deployment
Run the following commands on your VPS:

```bash
# 1. Pull latest changes
git pull

# 2. Rebuild and start container (if you haven't already)
docker-compose up -d --build

# 3. Check logs to ensure it started correctly
docker logs -f mini-shop-app
```

**Troubleshooting 504 Gateway Timeout:**
If you still see 504:
1.  **Firewall:** Ensure port `3100` is allowed on the VPS firewall (e.g., `ufw allow 3100`).
2.  **Connectivity:** Test if NPM can reach the app. Enter the NPM container shell (`docker exec -it <npm_container_id> sh`) and try `curl http://<YOUR_VPS_INTERNAL_IP>:3100`. If it fails, check your VPS firewall or network rules.
