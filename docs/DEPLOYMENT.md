# Deployment Guide

## Docker Setup

### Prerequisites

- Docker 24+ and docker-compose
- A valid `JWT_SECRET` (min 32 chars)
- At least one AI API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`)

### Quick Start

```bash
# Clone and enter the project
cd pathforge-ai

# Set required environment variables
export JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
export DB_PASSWORD=your_secure_db_password
export GEMINI_API_KEY=your_key_here

# Build and start all services
docker-compose up --build -d
```

### Seed Data

After the services are running, seed the database with roadmap data:

```bash
docker exec -it pathforge-backend-1 python -m seed_data
```

### Service Overview

| Service   | Container Name          | Port  | Description                |
|-----------|------------------------|-------|----------------------------|
| Database  | pathforge-db-1         | 5432  | PostgreSQL 16              |
| Backend   | pathforge-backend-1    | 8000  | FastAPI (uvicorn)          |
| Frontend  | pathforge-frontend-1   | 5173  | Nginx-served React SPA     |

### Stopping

```bash
docker-compose down          # Stop and remove containers
docker-compose down -v       # Also remove the database volume
```

---

## Production Environment Variables

| Variable              | Required | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| `DATABASE_URL`        | Yes      | PostgreSQL async connection string               |
| `JWT_SECRET`          | Yes      | Min 32 characters. Generate with `secrets.token_hex(32)` |
| `JWT_ALGORITHM`       | No       | Default: `HS256`                                 |
| `JWT_EXPIRY_MINUTES`  | No       | Default: `60`                                    |
| `GEMINI_API_KEY`      | No       | Google Gemini API key (primary AI provider)      |
| `GEMINI_MODEL`        | No       | Default: `gemini-2.0-flash`                      |
| `OPENAI_API_KEY`      | No       | OpenAI API key (fallback AI provider)            |
| `OPENAI_MODEL`        | No       | Default: `gpt-4o-mini`                           |
| `GOOGLE_CLIENT_ID`    | No       | Google OAuth client ID                           |
| `GITHUB_CLIENT_ID`    | No       | GitHub OAuth client ID                           |
| `GITHUB_CLIENT_SECRET`| No       | GitHub OAuth client secret                       |
| `CORS_ORIGINS`        | No       | JSON array of allowed origins                    |
| `FRONTEND_URL`        | No       | Frontend URL for CORS (default: `http://localhost:5173`) |
| `BACKEND_URL`         | No       | Backend URL (default: `http://localhost:8000`)   |
| `PRODUCTION`          | No       | Set to `1` in production. Disables debug mode    |
| `DEBUG`               | No       | Must be `false` when `PRODUCTION=1`              |
| `AI_CALLS_PER_DAY_FREE`| No      | Default: `5`                                     |
| `AI_CALLS_PER_DAY_REGISTERED`| No | Default: `20`                               |

### Production Checklist

- [ ] Set `JWT_SECRET` to a strong random value (min 32 chars)
- [ ] Set `DB_PASSWORD` to a strong password
- [ ] Set `PRODUCTION=1` and `DEBUG=false`
- [ ] Set `CORS_ORIGINS` to your frontend domain(s)
- [ ] Enable HTTPS in your reverse proxy
- [ ] Configure a health check endpoint at `/api/health`
- [ ] Set up database backups

---

## Database Setup

### Using Docker Compose (Recommended)

The `docker-compose.yml` includes a `db` service with PostgreSQL 16. It creates a database named `pathforge` automatically.

### Manual Setup

```bash
# macOS / Linux (with psql installed)
createdb pathforge

# Or via psql
psql -U postgres -c "CREATE DATABASE pathforge;"
```

### Migrations

```bash
# Run pending migrations
cd backend
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1
```

### Backup & Restore

```bash
# Backup
docker exec -t pathforge-db-1 pg_dump -U postgres pathforge > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker exec -i pathforge-db-1 psql -U postgres pathforge
```

---

## Nginx Reverse Proxy Config

### Basic Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend static files
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for HMR
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for AI requests
        proxy_read_timeout 120s;

        # Rate limiting
        limit_req zone=api burst=30 nodelay;
    }

    # Swagger docs (optional — disable in production)
    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

### Rate Limiting Zone Definition

Add to `http` block in `/etc/nginx/nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

### Docker Compose with Nginx (Alternative)

For a fully containerized setup, add an `nginx` service to `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

---

## CI/CD

Example GitHub Actions workflow for automated deployment:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and deploy
        run: |
          docker compose -f docker-compose.yml build
          docker compose -f docker-compose.yml push
```

## Cloud Deployment

### Railway / Render / Fly.io
These platforms support Docker-based deployments. Set the environment variables from the table above and deploy the Dockerfile in each service directory.

### AWS ECS
1. Build images with `docker compose build`
2. Push to ECR
3. Create ECS task definitions with the environment variables
4. Set up an Application Load Balancer in front of the backend service
