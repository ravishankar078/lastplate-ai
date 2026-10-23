# LastPlate — Production Deployment & Operations Guide

This guide details the steps required to deploy, configure, secure, and operate LastPlate in production environments.

---

## 1. Prerequisites & System Requirements

| Component | Minimum Specification | Recommended Production |
|---|---|---|
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS |
| **CPU** | 2 Cores | 4 Cores |
| **RAM** | 4 GB | 8 GB |
| **Disk Space** | 20 GB SSD | 50 GB NVMe SSD |
| **Container Engine** | Docker Engine 24.0+ | Docker Engine 26.0+ |
| **Compose** | Docker Compose v2.20+ | Docker Compose v2.27+ |

---

## 2. Production Environment Configuration

1. Clone the repository onto the production server:
   ```bash
   git clone https://github.com/lastplate/lastplate.git /opt/lastplate
   cd /opt/lastplate
   ```

2. Generate strong cryptographic secrets:
   ```bash
   # Generate a 64-character hex secret for JWT token signing
   JWT_SECRET=$(openssl rand -hex 64)
   
   # Generate a strong database password
   DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')
   ```

3. Create the production environment file:
   ```bash
   cp .env.production.example .env.production
   ```

4. Populate `.env.production` with generated credentials and production domain:
   ```ini
   ENVIRONMENT="production"
   DEBUG=false
   SECRET_KEY="<your-generated-jwt-secret>"
   POSTGRES_USER="lastplate_admin"
   POSTGRES_PASSWORD="<your-generated-db-password>"
   POSTGRES_DB="lastplate_prod"
   ALLOWED_ORIGINS='["https://lastplate.org","https://app.lastplate.org"]'
   ```

---

## 3. Deployment with Docker Compose

### 3.1 Build and Launch Services

Launch the full-stack containerized cluster with resource constraints:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Verify that all three services (`lastplate-prod-db`, `lastplate-prod-backend`, `lastplate-prod-frontend`) report healthy status:
```bash
docker compose -f docker-compose.prod.yml ps
```

### 3.2 Execute Database Migrations & Initial Seed

Run database schema migrations inside the backend container:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

Optionally initialize base geographic centers and regulatory taxonomy:
```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

---

## 4. SSL/TLS Certificate Provisioning (Let's Encrypt / Certbot)

For public HTTPS access, install Certbot and configure automatic renewal:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d lastplate.org -d app.lastplate.org
```

Set up automatic certificate renewal:
```bash
sudo systemctl enable certbot.timer
```

---

## 5. Health Checks & Continuous Monitoring

LastPlate provides dedicated readiness and liveness probes designed for Kubernetes / Docker health checks:

- **Liveness Probe:**
  ```bash
  curl -f http://localhost:8000/api/v1/health
  # Returns: {"status":"healthy","version":"1.0.0"}
  ```

- **Readiness Probe (Verifies PostgreSQL connection pool):**
  ```bash
  curl -f http://localhost:8000/api/v1/health/ready
  # Returns: {"status":"ready","database":"connected","pool_status":{"checked_in":...}}
  ```

- **Public Impact Metrics:**
  ```bash
  curl -f http://localhost:8000/api/v1/impact
  # Returns real-time aggregate statistics for public status dashboards
  ```

---

## 6. Backup & Disaster Recovery

### Automated PostgreSQL Backup Script
Set up a daily cron job to take compressed SQL dumps:
```bash
#!/usr/bin/env bash
set -e
BACKUP_DIR="/var/backups/lastplate"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

docker compose -f /opt/lastplate/docker-compose.prod.yml exec -T db \
  pg_dump -U lastplate_admin -d lastplate_prod -Fc > "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Prune backups older than 30 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +30 -delete
```

### Database Restoration Procedure
```bash
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U lastplate_admin -d lastplate_prod --clean --if-exists < /var/backups/lastplate/db_20261023_000000.dump
```

---

## 7. Scaling Considerations

1. **Uvicorn Worker Scaling:**
   In `backend/Dockerfile`, increase Uvicorn worker count based on CPU allocation:
   ```bash
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
   ```
2. **PostgreSQL Connection Pool:**
   Adjust `pool_size` and `max_overflow` in `backend/app/db/session.py` to support high concurrent claim traffic.
3. **Stateless Clustering:**
   The backend FastAPI service is completely stateless; session state is managed via signed JWT tokens, allowing multiple backend replicas behind a load balancer (HAProxy, AWS ALB, Nginx).
