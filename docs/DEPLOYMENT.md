# Deployment Guide

This guide covers running PathForge AI in production. The `docker-compose.yml` at the project root is tuned for local development (live code mounts, `--reload`); treat it as a baseline and harden it as described below.

## Architecture Overview

The stack has three services:

| Service   | Container Name        | Port  | Description                            |
|-----------|-----------------------|-------|----------------------------------------|
| Database  | `pathforge-db-1`      | 5432  | PostgreSQL 16 (`postgres:16-alpine`)   |
| Backend   | `pathforge-backend-1` | 8000  | FastAPI served by uvicorn              |
| Frontend  | `pathforge-frontend-1`| 5173  | React SPA built with Vite, served by Nginx |

Container names are derived from the Docker Compose project name (the directory name, lowercased). The examples below assume the project directory is `pathforge`; run `docker compose ps` on your host to confirm the real names and adjust commands if they differ.

The frontend image is a two-stage build: `node:20-alpine` compiles the SPA with `vite build`, then `nginx:alpine` serves the static `dist/` output. That Nginx container listens on port `5173` (not 80) and proxies `/api/` to `backend:8000` over the Compose network, so the browser only ever talks to one origin.

---

## Docker Setup

### Prerequisites

- Docker 24+ with the Compose v2 plugin (`docker compose`, not the legacy `docker-compose`)
- A valid `JWT_SECRET` (at least 32 characters) — Compose aborts at startup if it is missing
- At least one AI API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`)
- Git and network access to GitHub (required for the seed step, see [Seed Data](#seed-data))

### Quick Start

Create a `.env` file in the project root. Compose reads it automatically:

```bash
# .env — never commit this file
DB_PASSWORD=use-a-long-random-password
JWT_SECRET=REPLACE_WITH_OUTPUT_OF_GENERATION_COMMAND_BELOW
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key_optional_fallback
```

Generate the JWT secret with one of:

```bash
# Linux / macOS
openssl rand -hex 32

# Or with Python (any platform)
python -c "import secrets; print(secrets.token_hex(32))"
```

Then build and start:

```bash
# Enter the project directory (use your actual directory name)
cd roadmaps-generator

# Build images and start all three services in the background
docker compose up --build -d

# Confirm everything is healthy
docker compose ps
```

The backend validates its configuration on startup (`backend/app/core/config.py`). If `JWT_SECRET` is missing or shorter than 32 characters, or if `DEBUG=true` is combined with `PRODUCTION=1`, the container exits with a `ValueError` — check `docker compose logs backend` and fix the `.env` before continuing.

### Verify

```bash
# Backend health endpoint (must return {"status":"ok",...})
curl http://localhost:8000/api/health

# Frontend
curl -I http://localhost:5173
```

### Seed Data

After the services are running, load the roadmap data:

```bash
docker exec -it pathforge-backend-1 python -m seed_data
```

If your Compose project name differs, confirm the container name first with `docker compose ps` and adjust the `exec` command.

**Network requirement:** `backend/seed_data.py` downloads live content from GitHub (`raw.githubusercontent.com`, `api.github.com`, and a `github.com` archive zip). The database must reach the public internet during seeding. For offline or isolated deployments:

- Run the seed once on a connected host and take a database dump, then restore that dump on the isolated host, or
- Run `python -m seed_data` on a build host and bake the generated `backend/content_cache.json` and `backend/content_body_cache.json` into the image or a persistent volume, or
- Let the seed fall back to the built-in `ROADMAP_META` slugs (the script degrades gracefully if GitHub is unreachable, but you will get far less content).

The seed clears and repopulates the `roadmaps` tables, so do not run it against a live database that users depend on.

### Logs and Stop

```bash
# Follow backend logs
docker compose logs -f backend

# Stop and remove containers (keeps the database volume)
docker compose down

# Stop and remove containers AND delete all database data (destructive)
docker compose down -v
```

### Production Compose Adjustments

The checked-in `docker-compose.yml` is a development file. Before production:

- Drop the `volumes: ./backend:/app` bind mount and the `/app/__pycache__` exclusion from the backend service — the image already contains the code.
- The backend Dockerfile runs uvicorn with `--reload` (dev mode). Remove `--reload` in production, e.g. override the command: `command: uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Pin image tags (`postgres:16-alpine`, `python:3.11-slim`, `node:20-alpine`, `nginx:alpine`) to a specific digest for reproducibility.
- Set `POSTGRES_PASSWORD` from a secret manager instead of `.env` if possible.

---

## Building the Frontend for Production

The SPA is a plain static build — Vite compiles it to plain HTML/JS/CSS with no server runtime.

### Local build

```bash
cd frontend
npm ci
npm run lint
npm run build
# Output is written to frontend/dist/
```

`npm run build` runs `vite build` (`frontend/package.json`). The resulting `dist/` folder can be served by any static file server (Nginx, Caddy, S3 + CloudFront, `nginx:alpine`).

### What the frontend Dockerfile does

The `frontend/Dockerfile` is a multi-stage build:

1. `node:20-alpine` → `npm ci` → `npm run build` produces `/app/dist`
2. `nginx:alpine` → copies `/app/dist` to `/usr/share/nginx/html`, writes an Nginx config that:
   - listens on port `5173`
   - serves the SPA with `try_files $uri $uri/ /index.html` (client-side routing)
   - proxies `location /api/` to `http://backend:8000`

The API base is hard-coded at build time: `frontend/src/lib/api.js` reads `import.meta.env.VITE_API_BASE || '/api'`. The same-origin default `/api` is the right choice here because the frontend Nginx proxies `/api` to the backend. Setting `VITE_API_BASE` at container runtime has no effect — it must be passed to `vite build` (as a build ARG or Compose build `args`) if you ever serve the SPA from a different origin than the API.

### Serving with a standalone Nginx (no container)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/pathforge/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Production Environment Variables

All variables are defined in `backend/app/core/config.py` and documented in `backend/.env.example`. Values are read from the environment or from a `backend/.env` file (Pydantic settings). For Compose deployments, set them in the root `.env` file.

| Variable                     | Required | Description                                                   |
|------------------------------|----------|---------------------------------------------------------------|
| `DATABASE_URL`               | Yes      | PostgreSQL async connection string (`postgresql+asyncpg://...`) |
| `JWT_SECRET`                 | Yes      | At least 32 chars. Generate with `secrets.token_hex(32)`      |
| `APP_NAME`                   | No       | App display name (default: `PathForge AI`)                    |
| `APP_VERSION`                | No       | App version string (default: `1.0.0`)                         |
| `JWT_ALGORITHM`              | No       | Default: `HS256`                                              |
| `JWT_EXPIRY_MINUTES`         | No       | Token lifetime in minutes (default: `60`)                     |
| `GEMINI_API_KEY`             | No       | Google Gemini API key (primary AI provider)                   |
| `GEMINI_MODEL`               | No       | Default: `gemini-2.0-flash`                                   |
| `OPENAI_API_KEY`             | No       | OpenAI API key (fallback AI provider)                         |
| `OPENAI_MODEL`               | No       | Default: `gpt-4o-mini`                                        |
| `GOOGLE_CLIENT_ID`           | No       | Google OAuth client ID                                        |
| `GITHUB_CLIENT_ID`           | No       | GitHub OAuth client ID                                        |
| `GITHUB_CLIENT_SECRET`       | No       | GitHub OAuth client secret                                    |
| `CORS_ORIGINS`               | No       | JSON array of allowed origins (default: localhost:5173/3000)  |
| `FRONTEND_URL`               | No       | Frontend URL used for CORS (default: `http://localhost:5173`) |
| `BACKEND_URL`                | No       | Backend URL (default: `http://localhost:8000`)                |
| `PRODUCTION`                 | No       | Set to `1` in production. Forces `DEBUG=false` validation     |
| `DEBUG`                      | No       | Must be `false` when `PRODUCTION=1` (default: `false`)        |
| `AI_CALLS_PER_DAY_FREE`      | No       | Daily AI calls for anonymous users (default: `5`)             |
| `AI_CALLS_PER_DAY_REGISTERED`| No       | Daily AI calls for registered users (default: `20`)           |
| `AI_CALLS_PER_DAY_PREMIUM`   | No       | Daily AI calls for premium users (default: `999`)             |

Notes:

- `PRODUCTION` is read directly from the process environment (not a Pydantic field). Setting it triggers a startup check that rejects `DEBUG=true`, so keep `PRODUCTION=1` and `DEBUG=false` together.
- At least one of `GEMINI_API_KEY` / `OPENAI_API_KEY` must be set or AI features fail at request time (the app still boots).

### Environment Hardening

- **JWT secret:** use a freshly generated random value of at least 32 characters. Never reuse or commit it. Rotating it invalidates all existing sessions.
- **`PRODUCTION=1`, `DEBUG=false`:** the config validator (`validate_startup` in `backend/app/core/config.py`) refuses to start with debug enabled in production.
- **CORS:** set `CORS_ORIGINS` to exactly the origin(s) your browser uses, scheme and port included, as a JSON array, e.g. `CORS_ORIGINS=["https://app.your-domain.com"]`. Do not use wildcards for credentialed requests.
- **HTTPS:** terminate TLS at your reverse proxy (see below) and set `FRONTEND_URL`/`BACKEND_URL` to the `https://` URLs. Consider adding HSTS.
- **Database password:** never use the `postgres` default. The Compose file substitutes `${DB_PASSWORD:-postgres}`, so an unset variable silently uses a known default — always set it.
- **Never commit secrets:** `.env` files are gitignored. Keep them out of the repository and out of image layers.

### Production Checklist

- [ ] `JWT_SECRET` set to a strong random value (min 32 chars)
- [ ] `DB_PASSWORD` set to a strong password (Compose otherwise defaults to `postgres`)
- [ ] `PRODUCTION=1` and `DEBUG=false`
- [ ] `CORS_ORIGINS` restricted to your production frontend domain(s)
- [ ] `FRONTEND_URL` and `BACKEND_URL` use your `https://` domains
- [ ] At least one AI key configured (`GEMINI_API_KEY` or `OPENAI_API_KEY`)
- [ ] HTTPS enabled with HSTS in the reverse proxy
- [ ] Health check endpoint `GET /api/health` verified and wired into your load balancer / uptime monitor
- [ ] Database backups scheduled (see Backup & Restore)
- [ ] `alembic upgrade head` run before deploying new backend code
- [ ] Seed data loaded and network-dependent seeding moved off the live database

---

## Database Setup

### Using Docker Compose (Recommended)

The `db` service uses `postgres:16-alpine` and creates a database named `pathforge` automatically. It exposes port `5432` and persists data in the `pgdata` volume. Compose gates backend startup on the DB health check (`pg_isready -U postgres`, 5s interval).

```bash
docker compose up -d db
docker compose exec db psql -U postgres -c '\l'
```

### Manual Setup

```bash
# macOS / Linux (with psql installed)
createdb pathforge

# Or via psql
psql -U postgres -c "CREATE DATABASE pathforge;"
```

### Migrations

Migrations live in `backend/alembic/versions/` (001 → 003) and are managed with Alembic. The backend does **not** run migrations automatically on startup — deploy them explicitly.

```bash
# Run pending migrations (from the backend directory)
cd backend
alembic upgrade head

# Create a new migration after changing models
alembic revision --autogenerate -m "describe the change"

# Roll back one step
alembic downgrade -1
```

Inside Docker, run them from the backend container:

```bash
docker exec -it pathforge-backend-1 alembic upgrade head
```

**Important:** `backend/alembic.ini` hardcodes `sqlalchemy.url = postgresql+asyncpg://postgres:postgres@localhost:5432/pathforge` and `backend/alembic/env.py` does not substitute `DATABASE_URL` from the environment. Point the URL at your real database before running migrations remotely. For the Compose stack the value would be:

```ini
sqlalchemy.url = postgresql+asyncpg://postgres:YOUR_DB_PASSWORD@db:5432/pathforge
```

Apply migrations **before** seeding and **before** starting backend code that expects the new schema. Keep migrations forward-compatible (additive, non-breaking) so old code can run against the new schema during a rolling deploy.

### Backup & Restore

Backup the `pathforge` database (substitute your actual container name):

```bash
# Backup
docker exec -t pathforge-db-1 pg_dump -U postgres pathforge > backup_$(date +%Y%m%d).sql

# Restore (creates/replaces tables in the pathforge database)
cat backup.sql | docker exec -i pathforge-db-1 psql -U postgres pathforge
```

Schedule regular dumps (e.g. a cron entry) and test restores on a scratch database. For a managed or HA database (RDS, Cloud SQL, Neon, Supabase) use the platform's native backup/point-in-time-recovery instead.

---

## Health Checks

The backend exposes `GET /api/health` (`backend/app/main.py`), returning:

```json
{"status": "ok", "app": "PathForge AI"}
```

Use it to:

- Gate deploys / auto-restart (Docker `restart: unless-stopped` plus a probe)
- Configure load balancer target groups and uptime monitors
- Validate that the backend, not just Nginx, is responding:

```bash
curl -fsS http://localhost:8000/api/health
```

The DB service already has a Compose healthcheck (`pg_isready -U postgres`) and the backend service waits for it via `depends_on: condition: service_healthy`. For a full-stack probe, add a healthcheck to the backend service that curls the app's own `/api/health` endpoint.

---

## Nginx Reverse Proxy Config

The frontend container's Nginx listens on port `5173` and already routes `/api/` to the backend, so the simplest production topology is a single host proxy in front of `127.0.0.1:5173`. The following example proxies `/api/` directly to the backend instead (either approach works).

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
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend SPA (served by the frontend container's Nginx on 5173)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Only needed for Vite dev-server HMR (WebSockets). Safe to remove in production.
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

        # AI requests can take a while
        proxy_read_timeout 120s;
    }

    # Swagger docs (optional — consider disabling in production)
    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

### Rate Limiting Zone Definition

Add to the `http` block in `/etc/nginx/nginx.conf`:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
```

and inside the `location /api/ { }` block add:

```nginx
limit_req zone=api burst=30 nodelay;
```

### Docker Compose with Nginx (Alternative)

For a fully containerized edge, add an `nginx` service to `docker-compose.yml`:

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

Inside this Nginx, proxy to the services by name over the Compose network (`http://frontend:5173` and `http://backend:8000`) instead of `127.0.0.1`.

---

## Zero-Downtime Deployments

PathForge is a single-instance Compose stack; for true zero-downtime you need a few extras:

- **Run migrations before shipping new code.** `alembic upgrade head` first, then roll the backend. Keep migrations additive so old code works against the new schema.
- **Gate traffic with the health check.** Point your load balancer target group at `GET /api/health` and only route to instances that report `status: ok`.
- **Do not re-seed in place.** `seed_data.py` truncates the roadmap tables; seed once and let migrations/backups handle later changes.
- **Blue/green or rolling updates.** With multiple backend replicas behind a load balancer, drain and replace instances one at a time. The `pgdata` volume and the single `db` container are the bottleneck — use a managed/HA database for multiple replicas or failover.
- **Keep session state out of memory.** JWT tokens are stateless, so the only shared state is Postgres; verify sticky sessions are not required.

---

## CI/CD

Example GitHub Actions workflow: lint and build in CI, then build and push images, then deploy over SSH.

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  IMAGE_BACKEND: ghcr.io/${{ github.repository }}/backend:latest
  IMAGE_FRONTEND: ghcr.io/${{ github.repository }}/frontend:latest

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Lint backend (ruff)
        working-directory: backend
        run: |
          pip install ruff
          ruff check .

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci
      - name: Lint frontend
        working-directory: frontend
        run: npm run lint
      - name: Build frontend
        working-directory: frontend
        run: npm run build

  build-and-push:
    needs: lint-and-build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: ${{ env.IMAGE_BACKEND }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: ${{ env.IMAGE_FRONTEND }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /srv/pathforge
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

Notes:

- The repo does not currently ship backend tests; add a `pytest -q` step in the `backend` working directory once a `tests/` suite exists.
- Store deployment secrets (`SSH_HOST`, `SSH_USER`, `SSH_KEY`) and the app's environment variables as GitHub Actions secrets or use a secret manager.
- Tag images with the commit SHA instead of `latest` for reproducible rollbacks, e.g. `${{ github.sha }}`.

---

## Cloud Deployment

### Railway / Render / Fly.io

These platforms support Dockerfile-based deployments. Create one service per directory and set the environment variables from the table above:

- Backend service: `backend/` with `backend/Dockerfile` (port 8000)
- Frontend service: `frontend/` with `frontend/Dockerfile` (port 5173)
- Database: a managed PostgreSQL instance; set `DATABASE_URL` on the backend to its connection string

Set `PRODUCTION=1`, `DEBUG=false`, and `CORS_ORIGINS`/`FRONTEND_URL`/`BACKEND_URL` to the platform-assigned HTTPS domains. Use the platform's built-in health check (URL path `/api/health`).

### AWS ECS

1. Build and push images with the CI workflow above (or `docker compose build` locally).
2. Push to Amazon ECR.
3. Create ECS task definitions (backend + frontend) with the environment variables from the table above and a `healthCheck` on `GET /api/health`.
4. Run a managed Postgres (RDS) and point `DATABASE_URL` at it.
5. Put an Application Load Balancer in front of the services and terminate TLS there.

---

## Troubleshooting

**Seed fails or produces empty roadmaps.** The seed downloads content from GitHub; firewalled or offline hosts cannot reach it. Check the logs for `Failed to list roadmaps` / archive download errors. Fix: allow egress to `raw.githubusercontent.com`, `api.github.com`, and `github.com`, or pre-seed on a connected host and restore a dump. See [Seed Data](#seed-data).

**Backend exits immediately on startup.** The config validator raises `ValueError` when `JWT_SECRET` is missing/short or when `DEBUG=true` with `PRODUCTION=1`. Run `docker compose logs backend` and fix `.env`. Compose also hard-fails at `up` with `JWT_SECRET is required` if the variable is not set.

**Migrations fail with a connection error.** `alembic.ini` points at `localhost` and ignores `DATABASE_URL`. Edit `sqlalchemy.url` in `backend/alembic.ini` to target the actual database host (e.g. `@db:5432` inside Compose) before running `alembic upgrade head`.

**CORS errors in the browser console.** `CORS_ORIGINS` must contain the exact origin (scheme, host, port) the browser is using, as a valid JSON array. A mismatch between `http://` and `https://` (or a missing port) is the usual cause. Update it and restart the backend.

**AI endpoints return errors but the app works.** No AI key is configured, or the key has no quota. Set `GEMINI_API_KEY` or `OPENAI_API_KEY`, verify the model names, and check the provider console for rate-limit/quota errors.

**Port conflicts on 5432 / 8000 / 5173.** Another process holds the port. Change only the host-side port in Compose (e.g. `"8001:8000"`) and update `FRONTEND_URL`, `BACKEND_URL`, and `CORS_ORIGINS` to match.

**`docker exec ... pathforge-backend-1: No such container`.** The Compose project name comes from the directory name. Run `docker compose ps` and use the actual container names (e.g. `roadmaps-generator-backend-1`).

**Migration ordering issues (columns/nodes missing).** Run `alembic upgrade head` before starting the new backend and before seeding. Check `alembic current` vs `alembic heads` inside the backend container.
