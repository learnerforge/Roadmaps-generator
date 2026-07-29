![License](https://img.shields.io/badge/license-MIT-blue) ![Python](https://img.shields.io/badge/python-3.11-blue) ![Node](https://img.shields.io/badge/node-20-green)

# PathForge AI — AI-Powered Career Roadmap Platform

Plan, track, and master your tech career with AI-guided learning paths. PathForge imports **87 real roadmaps from roadmap.sh** (9,531 topics, 9,444 dependency edges), visualises every topic as an interactive node graph, and enriches everything with AI explanations, quizzes, project suggestions, and weekly study plans — all in one place.

**Why PathForge?** Most roadmaps are static images or lists — you cannot track progress, get AI help on a specific topic, or see how concepts connect. PathForge turns any roadmap into a living, interactive, AI-augmented experience where you can mark nodes as complete, take topic quizzes, get personalised project ideas, and receive a weekly study plan tailored to your pace and completed topics. Whether you are a beginner following the Frontend roadmap or an engineer levelling up in System Design, PathForge adapts to your learning journey.

<!-- TODO: Add screenshot or GIF of the interactive node graph -->

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Roadmap Data Sources](#roadmap-data-sources)
- [AI Prompts](#ai-prompts)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [FAQ](#faq)
- [Future Work](#future-work)
- [License](#license)

## Features

- **87 Role & Skill Roadmaps** (9,531 topics, 9,444 dependency edges — 0 isolated nodes) — Frontend, Backend, DevOps, AI/ML, System Design, and more — scraped live from roadmap.sh via its GitHub repository
- **AI Topic Explanations** — Gemini (primary) + OpenAI (fallback) explains any node in simple terms, cached per node in the `ai_explanations` table so subsequent requests return instantly
- **Adaptive Quizzes** — Generate multiple-choice questions per topic with explanations for each answer to reinforce learning
- **Project Suggestions** — Get coding project ideas based on completed topics, at beginner, intermediate, and advanced levels
- **Weekly Learning Plans** — AI generates a 7-day study schedule based on your pace (hours per week) and completed nodes
- **Progress Tracking** — Mark nodes complete/in-progress/skipped, track completion % per roadmap, dashboard with streaks and stats
- **User Notes & Bookmarks** — Save personal notes per node, bookmark topics for later reference
- **Node Dependencies** — Prerequisite and follow-up topic graph so you always know what to learn next
- **Interactive Node Graph** — React Flow graph visualisation with zoom/pan, minimap, and click-to-highlight connections
- **User Auth** — Email/password + Google/GitHub OAuth with JWT + bcrypt, race-condition safe with unique constraint on email
- **Admin Dashboard** — Platform stats, user management, feedback moderation with role-based access (user, admin, super_admin)
- **Community-Driven UI** — Button, card, toast, and spinner styles inspired by [uiverse.io](https://uiverse.io) community designs, with animated hover effects and glassmorphism
- **Responsive Design** — Mobile-friendly layout with dark mode support and accessible colour contrast throughout the UI

## Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18 + Vite 6 + Tailwind CSS 3.4 + Zustand 4 |
| Backend     | FastAPI 0.115 (Python 3.11) + SQLAlchemy 2.0 async |
| Database    | PostgreSQL 16+                               |
| AI          | Google Gemini 2.0 (primary) / OpenAI GPT-4o-mini (fallback) |
| Auth        | JWT (HS256) + bcrypt                         |
| Container   | Docker + docker-compose                      |

All async database operations use SQLAlchemy 2.0's async session with asyncpg driver. FastAPI async route handlers ensure non-blocking I/O across the stack. Alembic handles database migrations with an auto-generated version history in `backend/alembic/versions/`.

## Quick Start

### Docker (30 seconds)

```bash
docker-compose up --build
# In another terminal, seed the database:
docker exec -it pathforge-backend-1 python -m seed_data
```

Then open http://localhost:5173. The Docker setup starts three services: `postgres` (PostgreSQL 16), `backend` (FastAPI with hot-reload on port 8000), and `frontend` (Vite dev server on port 5173). Make sure `.env` is configured before running — the Docker Compose setup reads from the same `.env` file as the manual setup. The compose configuration is designed for local development; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production adjustments (reverse proxy, SSL, environment hardening).

The first build may take a few minutes as it installs Python and Node dependencies. Subsequent starts use Docker layer caching and are nearly instant.

### Manual Setup

#### Prerequisites

| Tool       | Version   |
|------------|-----------|
| Python     | 3.11+     |
| Node.js    | 20+       |
| PostgreSQL | 16+       |
| npm        | 9+ (ships with Node 20) |

#### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable           | Required | Default                                               | Description                      |
|--------------------|----------|-------------------------------------------------------|----------------------------------|
| `DATABASE_URL`     | Yes      | `postgresql+asyncpg://postgres:postgres@localhost:5432/pathforge` | PostgreSQL connection string     |
| `JWT_SECRET`       | Yes      | *(empty)*                                             | Secret for signing JWT tokens (min 32 chars) |
| `GEMINI_API_KEY`   | No       | *(empty)*                                             | Google Gemini API key (primary)  |
| `OPENAI_API_KEY`   | No       | *(empty)*                                             | OpenAI API key (fallback)        |
| `CORS_ORIGINS`     | No       | `["http://localhost:5173","http://localhost:3000"]`   | Allowed CORS origins             |

> At least one of `GEMINI_API_KEY` or `OPENAI_API_KEY` must be set for AI features to work. The seed script populates the database with 87 roadmaps, 9,531 topics, and 9,444 dependency edges from roadmap.sh. Run it once after creating the database.

#### Backend

The backend is a FastAPI application using SQLAlchemy 2.0 async with PostgreSQL. Start by setting up the Python environment:

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux
cd backend
pip install -r requirements.txt
copy .env.example .env        # Windows
# Edit .env — set DATABASE_URL, JWT_SECRET, and at least one AI key
createdb pathforge
python -m seed_data
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

The frontend is a React 18 SPA built with Vite 6 and styled with Tailwind CSS 3.4.

```bash
cd frontend
npm install
npm run dev
```

#### Access

| URL                          | Description        |
|------------------------------|--------------------|
| http://localhost:5173        | Frontend app       |
| http://localhost:8000/api    | Backend API        |
| http://localhost:8000/docs   | Swagger API docs   |
| http://localhost:8000/redoc  | ReDoc API docs     |

## Architecture

The system follows a layered architecture: a React SPA communicates with a FastAPI backend through a middleware pipeline. The client layer manages global state with Zustand and routes all API requests through a fetch-based client. On the server side, incoming requests pass through CORS origin checks, request logging, and in-memory rate limiting (30 req/min per IP on AI routes) before reaching route handlers. Route handlers in FastAPI delegate to service classes, which contain business logic and AI orchestration. Pydantic schemas (Zod-equivalent for Python) handle request validation and response serialisation at every endpoint. The ORM layer (SQLAlchemy 2.0 async) maps 13 entity models to PostgreSQL tables with cascade deletes on owned resources. AI requests are sent to Google Gemini by default, with automatic fallback to OpenAI if the primary provider fails or times out.

Authentication uses a JWT (HS256) flow: users register with bcrypt-hashed passwords (12 rounds), then receive a signed token on login. Protected routes verify the token via a `get_current_user` dependency; admin routes additionally check the user role. OAuth providers (Google, GitHub) are supported alongside email/password authentication. Rate limiting is enforced per-IP on AI routes using an in-memory sliding window algorithm.

```mermaid
flowchart TB
    subgraph CLIENT["Client Layer"]
        direction TB
        Browser["Browser"]
        SPA["React SPA"]
        Pages["Pages\nHome, Roadmaps, Dashboard,\nLearn, Admin, Auth"]
        Components["Components\nNavbar, RoadmapGraph,\nLoadingSkeleton"]
        Store["Zustand Store\nauthStore"]
        API["API Client\nfetch wrapper"]

        Browser --> SPA
        SPA --> Pages
        SPA --> API
        Pages --> Components
        Pages --> Store
        Store --> API
    end

    subgraph GATEWAY["API Gateway"]
        direction TB
        CORS["CORS Middleware\norigin whitelist"]
        Logging["RequestLogging\nmethod/path/status/duration"]
        RateLimit["RateLimit\n30 req/min per IP on AI routes"]

        CORS --> Logging --> RateLimit
    end

    subgraph SERVER["FastAPI Server"]
        direction TB
        Routes["Route Groups\nAuth, Roadmaps, Progress,\nContent, AI, Admin"]
        Services["Services\nBusiness Logic + AI Service"]
        ORM["SQLAlchemy ORM\n13 entity models"]
        Schemas["Pydantic Schemas\nvalidation + serialization"]
        Utils["Utilities\npagination, db_helpers"]
        Core["Core\nconfig, security"]

        RateLimit --> Routes
        Routes --> Services
        Routes --> ORM
        Routes --> Schemas
        Routes --> Utils
        Routes --> Core
    end

    subgraph AI_PROVIDERS["AI Providers"]
        direction TB
        Gemini["Google Gemini API\nprimary"]
        OpenAI["OpenAI API\nfallback"]
    end

    subgraph STORAGE["Data Layer"]
        PG[("PostgreSQL 16+")]
    end

    API -->|"HTTP"| CORS
    Services --> Gemini
    Services --> OpenAI
    ORM --> PG
```

> The architecture diagram above omits the Alembic migration layer and Redis caching (planned) for clarity. These are covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### How Seeding Works

The seed script (`backend/seed_data.py`) calls the GitHub API to list all directories under `kamranahmedse/developer-roadmap/src/data/roadmaps/`, downloads each roadmap's React Flow JSON file, extracts topic nodes (filtering out labels, buttons, and paragraphs), parses edges to build `NodeDependency` records, and inserts everything into PostgreSQL. For roadmaps that have migrated from JSON to markdown content files, it falls back to parsing filenames in `{slug}/content/` into flat topic lists. Each roadmap is also mapped to hardcoded metadata (title, category, difficulty, description) to enrich the database records. The script is **idempotent** — run it multiple times safely; existing roadmaps are skipped, and 3-attempt retry logic handles transient GitHub API failures. After seeding, the database contains 87 roadmaps with 9,531 real nodes and 9,444 dependency edges, with zero isolated nodes.

## Roadmap Data Sources

All roadmap data comes from [roadmap.sh](https://roadmap.sh) via its [GitHub repository](https://github.com/kamranahmedse/developer-roadmap), covering role-based roadmaps (Frontend, Backend, DevOps, AI Engineer), skill-based roadmaps (React, Python, Kubernetes, System Design), and specialised topics (Prompt Engineering, Best Practices, Databases). The seed script fetches the React Flow JSON files directly from the repo and parses nodes and edges automatically. Roadmaps span 10 categories including languages, frameworks, databases, AI/ML, mobile, web development, and DevOps.

## AI Prompts

The app uses five prompt templates — explain, simplify, quiz, projects, and weekly plan — each engineered to return structured output:

- **Explain**: what the topic is, real-world analogy, code example, next steps
- **Simplify**: beginner-friendly 150-word explanation with everyday analogies
- **Quiz**: N multiple-choice questions with explanations (returns JSON)
- **Projects**: 3 project ideas at beginner, intermediate, and advanced levels
- **Weekly Plan**: 7-day learning schedule based on pace and completed nodes

All responses are cached in the `ai_explanations` table so repeated requests for the same node return instantly without consuming API quota. See [docs/API.md](docs/API.md) for the full prompt reference and request formats.

## API Reference

Full API documentation with all endpoints, request/response schemas, and examples is available in [docs/API.md](docs/API.md). The API is organised into route groups: Auth (register, login, OAuth), Roadmaps (list, detail, nodes), Progress (update, retrieve), Content (notes, bookmarks), AI (explain, quiz, projects, weekly plan), and Admin (stats, user management, feedback). Interactive docs are also available at `/docs` (Swagger UI) and `/redoc` (ReDoc) when the backend is running.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup including reverse proxy, SSL, environment hardening, and Docker Compose configurations. The deployment doc covers environment variable configuration, database migrations, CI/CD integration, and monitoring. For a production deployment, you should also configure a process manager (e.g., systemd or supervisord) for the backend and a static file server for the frontend build.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed setup, style guidelines, and PR workflow. Contributions of all kinds are welcome — bug fixes, new features, documentation improvements, and community UI components.

Before submitting a PR, please run the existing tests and ensure your code follows the project's style conventions (ESLint for frontend, ruff for backend).

## FAQ

**Do I need my own AI API key?** Yes. You need at least a Google Gemini API key (free tier available at ai.google.dev) or an OpenAI API key for AI features to work. Without one, the app runs but AI-powered features (explanations, quizzes, projects, weekly plans) will not function. Keys are configured via the `GEMINI_API_KEY` and `OPENAI_API_KEY` environment variables in your `.env` file. If both are provided, Gemini is the primary provider and OpenAI acts as fallback.

**Can I use this without Docker?** Absolutely. The manual setup section above walks through a Docker-free installation using Python venv and npm. You just need Python 3.11+, Node.js 20+, and PostgreSQL 16+ installed directly on your machine. The app has been tested on Windows, macOS, and Linux.

**Is there a hosted version?** Not yet. PathForge is self-hosted only. Deployment guides and production configuration examples are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). If you are interested in a hosted offering, please open a GitHub issue to express interest.

## Future Work

- **E2E tests** — End-to-end tests covering auth, progress tracking, AI features, and admin flows (P0)
- **AI streaming responses** — Stream explanations token-by-token via SSE for a more interactive experience (P1)
- **Resource library** — Curated articles, videos, and courses per node to complement AI explanations (P2)

For the full roadmap of planned features, see [GitHub Issues](https://github.com/anomalyco/Roadmaps-generator/issues).

## License

MIT
