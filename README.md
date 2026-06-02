# PathForge AI — AI-Powered Career Roadmap Platform

Plan, track, and master your tech career with AI-guided learning paths. PathForge imports **86 real roadmaps from roadmap.sh**, visualises every topic as an interactive node graph, and enriches everything with AI explanations, quizzes, project suggestions, and weekly study plans — all in one place.

## Features

- **86 Role & Skill Roadmaps** — Frontend, Backend, DevOps, AI/ML, System Design, and more — scraped live from roadmap.sh
- **AI Topic Explanations** — Gemini (primary) + OpenAI (fallback) explains any node in simple terms, cached per node
- **Adaptive Quizzes** — Generate multiple-choice questions per topic to test understanding
- **Project Suggestions** — Get coding project ideas based on completed topics
- **Weekly Learning Plans** — AI generates a 7-day study schedule based on your pace
- **Progress Tracking** — Mark nodes complete/in-progress/skipped, track completion %, dashboard with streaks
- **User Notes & Bookmarks** — Save personal notes per node, bookmark topics for later
- **Node Dependencies** — Prerequisite and follow-up topic graph
- **Interactive Node Graph** — React Flow graph visualisation with zoom/pan, minimap, and click-to-highlight connections
- **User Auth** — Email/password + Google/GitHub OAuth with JWT + bcrypt, race-condition safe
- **Admin Dashboard** — Platform stats, user management, feedback moderation

## Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18 + Vite + Tailwind CSS + Zustand     |
| Backend     | FastAPI (Python 3.11) + SQLAlchemy 2.0 async |
| Database    | PostgreSQL 16+                               |
| AI          | Google Gemini (primary) / OpenAI (fallback)  |
| Auth        | JWT (HS256) + bcrypt                         |
| Container   | Docker + docker-compose                      |

## Architecture

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
        ORM["SQLAlchemy ORM\n10 entity models"]
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

### Middleware & Error Handling Flow

```mermaid
flowchart TD
    subgraph PRE["Pre-Handler Pipeline"]
        Request["Incoming HTTP Request"]
        CORS["CORS Middleware\nwhitelist check"]
        Logging["RequestLogging\nMETHOD /api/path status duration"]
        Rate["RateLimit\n30 req/60s per IP on /api/ai/*"]
        RouteMatch["Path Matcher\n/api/*"]

        Request --> CORS
        CORS --> Logging
        Logging --> Rate
        Rate --> RouteMatch
    end

    subgraph AUTH["Authentication Gate"]
        RouteMatch --> NeedsAuth{Requires Auth?}
        NeedsAuth -->|"Yes: most routes"| JWT["JWT Verification\nget_current_user / get_current_admin\nExtract Bearer, decode HS256"]
        NeedsAuth -->|"No: register, login,\nGET roadmaps"| Handler["Route Handler\nasync reads params\ncalls services, queries DB"]

        JWT --> ValidJWT{Valid JWT?}
        ValidJWT -->|"Yes"| LoadProfile["Load Profile from DB\nby user_id"]
        ValidJWT -->|"No"| Err401["401 Unauthorized\ninvalid or expired token"]
        LoadProfile --> Handler
    end

    subgraph POST["Post-Handler Responses"]
        Handler --> Result{Handler Result}
        Result -->|"200 / 201"| JSON["JSON Response\nPydantic serialization\napplication/json"]
        Result -->|"204"| NoContent["204 No Content\nempty body for DELETE"]
        Result -->|"Exception raised"| ExceptionType{Exception Type}
        ExceptionType -->|"RequestValidationError"| Err422["422 Unprocessable Entity\nfield-level error detail"]
        ExceptionType -->|"HTTPException"| ErrStatus["Status from exception\nreturns status_code + detail"]
        ExceptionType -->|"Unhandled"| Err500["500 Internal Server Error\ntraceback logged, generic message"]
    end
```

### Database ERD

```mermaid
erDiagram
    profiles ||--o{ user_roadmaps : enrolls
    profiles ||--o{ user_node_progress : progresses
    profiles ||--o{ notes : writes
    profiles ||--o{ bookmarks : creates
    profiles ||--o{ feedback : submits
    roadmaps ||--o{ roadmap_nodes : contains
    roadmaps ||--o{ user_roadmaps : tracked
    roadmaps ||--o{ quizzes : has
    roadmap_nodes ||--o{ node_dependencies : depends-on
    roadmap_nodes ||--o{ user_node_progress : tracked
    roadmap_nodes ||--o{ resources : has
    roadmap_nodes ||--o{ ai_explanations : cached
    roadmap_nodes ||--o{ notes : has
    roadmap_nodes ||--o{ bookmarks : bookmarked
    roadmap_nodes ||--o{ quizzes : tested-by
    roadmap_nodes ||--o{ feedback : references
    profiles ||--o{ quiz_attempts : takes
    roadmap_nodes ||--o{ quiz_attempts : targets

    profiles {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string role "user | admin | super_admin"
        int streak_days
        string avatar_url
        string bio
        string current_role
        string target_role
        int hours_per_week
        string experience_level
        boolean is_public
        datetime created_at
    }

    roadmaps {
        uuid id PK
        string slug UK
        string title
        text description
        string category
        string difficulty
        float estimated_hours
        string cover_image_url
        boolean is_published
        uuid created_by FK "ondelete SET NULL"
        datetime created_at
    }

    roadmap_nodes {
        uuid id PK
        uuid roadmap_id FK "ondelete CASCADE"
        string source_node_id
        string node_type
        string title
        text description
        string category
        string difficulty
        string why_important
        boolean is_optional
        float estimated_hours
        int order_index
        float position_x
        float position_y
    }

    node_dependencies {
        uuid node_id FK "ondelete CASCADE"
        uuid depends_on_node_id FK "ondelete CASCADE"
    }

    user_node_progress {
        uuid id PK
        uuid user_id FK "ondelete CASCADE"
        uuid node_id FK "ondelete CASCADE"
        uuid roadmap_id FK "ondelete CASCADE"
        string status "pending | in_progress | done | skipped"
        datetime updated_at
    }

    user_roadmaps {
        uuid user_id FK "ondelete CASCADE"
        uuid roadmap_id FK "ondelete CASCADE"
        datetime started_at
        datetime completed_at
        float completion_pct
        boolean is_pinned
    }

    resources {
        uuid id PK
        uuid node_id FK "ondelete CASCADE"
        string title
        string url
        string type
    }

    notes {
        uuid id PK
        uuid user_id FK "ondelete CASCADE"
        uuid node_id FK "ondelete CASCADE"
        text content
        datetime created_at
        datetime updated_at
    }

    bookmarks {
        uuid user_id FK "ondelete CASCADE"
        uuid node_id FK "ondelete CASCADE"
        datetime created_at
    }

    ai_explanations {
        uuid id PK
        uuid node_id FK "ondelete CASCADE"
        string prompt_type
        text response_text
        string model_used
        datetime created_at
    }

    quizzes {
        uuid id PK
        uuid node_id FK "ondelete CASCADE"
        string title
        text questions_json
    }

    quiz_attempts {
        uuid id PK
        uuid user_id FK "ondelete CASCADE"
        uuid node_id FK "ondelete CASCADE"
        int score
        int total
        datetime created_at
    }

    feedback {
        uuid id PK
        uuid user_id FK "ondelete CASCADE"
        uuid node_id FK "ondelete SET NULL"
        string type
        text content
        string status "open | closed"
        datetime created_at
    }
```

All foreign keys use `ondelete` — owned resources (progress, notes, bookmarks, etc.) cascade; optional references (feedback → node) set null.

## Quick Start

### Prerequisites

| Tool       | Version   |
|------------|-----------|
| Python     | 3.11+     |
| Node.js    | 20+       |
| PostgreSQL | 16+       |
| Docker     | 24+ (optional) |

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable           | Required | Default                                               | Description                      |
|--------------------|----------|-------------------------------------------------------|----------------------------------|
| `DATABASE_URL`     | Yes      | `postgresql+asyncpg://postgres:postgres@localhost:5432/pathforge` | PostgreSQL connection string     |
| `JWT_SECRET`       | Yes      | `change-me-in-production-use-a-real-secret`           | Secret for signing JWT tokens    |
| `GEMINI_API_KEY`   | No       | *(empty)*                                             | Google Gemini API key (primary)  |
| `OPENAI_API_KEY`   | No       | *(empty)*                                             | OpenAI API key (fallback)        |
| `CORS_ORIGINS`     | No       | `["http://localhost:5173","http://localhost:3000"]`   | Allowed CORS origins             |

> At least one of `GEMINI_API_KEY` or `OPENAI_API_KEY` must be set for AI features to work.

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Configure environment
copy .env.example .env        # Windows
# Edit .env — set DATABASE_URL, JWT_SECRET, and at least one AI key

# Create the database (edit credentials as needed)
createdb pathforge

# Seed 86 roadmaps with real data from roadmap.sh
python -m seed_data

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Access the app

| URL                          | Description        |
|------------------------------|--------------------|
| http://localhost:5173        | Frontend app       |
| http://localhost:8000/api    | Backend API        |
| http://localhost:8000/docs   | Swagger API docs   |
| http://localhost:8000/redoc  | ReDoc API docs     |

### Docker (alternative)

```bash
docker-compose up --build
```

This starts PostgreSQL, the backend, and the frontend. The seed script must be run manually inside the container:

```bash
docker exec -it pathforge-backend-1 python -m seed_data
```

## How Seeding Works

The seed script (`backend/seed_data.py`):

1. Calls the **GitHub API** to list all directories under `kamranahmedse/developer-roadmap/src/data/roadmaps/`
2. Downloads each roadmap's **React Flow JSON** file (e.g., `frontend.json`)
3. Extracts **topic nodes** (filters out labels, buttons, paragraphs)
4. Parses **edges** to build `NodeDependency` records
5. For roadmaps that have migrated from JSON to markdown content files, falls back to `fetch_markdown_topics()` — parses filenames in `{slug}/content/` into flat topic lists
6. Maps each roadmap to a hardcoded metadata entry (title, category, difficulty, description)
7. Inserts everything into PostgreSQL — **86 roadmaps with 9,501 real nodes and 2,215 dependency edges**

The script is **idempotent** — run it multiple times safely; existing roadmaps are skipped. 3-attempt retry logic handles transient GitHub API failures.

## API Reference

### Auth

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "Jane Doe"
}

# Response: 201 Created
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "role": "user"
  }
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

# Response: 200
```

### User Profile

```http
GET /api/me
Authorization: Bearer <token>

# Response: 200
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "role": "user",
  "bio": null,
  "current_role": null,
  "experience_level": "beginner",
  "streak_days": 0,
  "created_at": "2025-06-01T00:00:00Z"
}

PATCH /api/me
Authorization: Bearer <token>
Content-Type: application/json

{ "full_name": "Jane Updated", "bio": "Learning backend" }

# Response: 200
```

### Roadmaps

```http
# List all published roadmaps
GET /api/roadmaps

# Response: 200
[
  {
    "id": "uuid",
    "title": "Frontend Developer",
    "slug": "frontend",
    "category": "role-based",
    "difficulty": "beginner",
    "node_count": 85
  }
]

# Get a single roadmap with all nodes
GET /api/roadmaps/frontend

# Response: 200
{
  "roadmap": { "id": "uuid", "title": "Frontend Developer", ... },
  "nodes": [...],
  "edges": [{ "id": "uuid", "source": "uuid", "target": "uuid" }]
}

# Node detail with dependencies, status, resources
GET /api/roadmaps/nodes/{nodeId}
Authorization: Bearer <token>

# Response: 200
{
  "id": "uuid",
  "title": "React",
  "dependencies": [{ "node_id": "uuid", "title": "JavaScript" }],
  "dependents": [{ "node_id": "uuid", "title": "Next.js" }],
  "status": "in_progress",
  "is_bookmarked": false,
  "resources": []
}
```

### Admin — Roadmap CRUD

```http
POST /api/roadmaps
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "title": "New Roadmap", "slug": "new-rm", "category": "skill-based", "difficulty": "intermediate" }

# Response: 201 Created

POST /api/roadmaps/{roadmap_id}/nodes
Authorization: Bearer <admin-token>

# Response: 201 Created

POST /api/roadmaps/nodes/{node_id}/resources
Authorization: Bearer <admin-token>

# Response: 201 Created

DELETE /api/roadmaps/{roadmap_id}
DELETE /api/roadmaps/nodes/{node_id}
DELETE /api/roadmaps/resources/{resource_id}
# Response: 204 No Content
```

### Progress

```http
# Enroll in a roadmap (by slug or UUID)
POST /api/progress/frontend/start
Authorization: Bearer <token>

# Response: 201 Created
{ "message": "Enrolled successfully" }

# Unenroll
DELETE /api/progress/frontend/unenroll
Authorization: Bearer <token>

# Response: 204 No Content

# Get progress for a roadmap
GET /api/progress/frontend/progress
Authorization: Bearer <token>

# Response: 200
{ "progress": [{ "node_id": "uuid", "status": "done", "updated_at": "..." }] }

# Mark a node
PATCH /api/progress/node/{nodeId}
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "done" }

# Response: 200
{ "status": "done", "completion_pct": 42.5, "node_id": "uuid" }

# Dashboard summary
GET /api/progress/dashboard/summary
Authorization: Bearer <token>

# Response: 200
{
  "active_roadmaps": 3,
  "total_nodes_completed": 42,
  "streak_days": 5,
  "recent_activity": []
}

# My roadmaps
GET /api/progress/my-roadmaps
Authorization: Bearer <token>

# Response: 200
[{ "roadmap": { "id": "uuid", "title": "...", "slug": "..." }, "completion_pct": 50, "is_pinned": false }]
```

### Content — Notes, Bookmarks, Feedback

```http
# Submit feedback
POST /api/content/feedback
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "Great platform!", "type": "general" }

# Response: 201 Created

# List my feedback
GET /api/content/feedback
Authorization: Bearer <token>

# Toggle bookmark
POST /api/content/nodes/{node_id}/bookmark
Authorization: Bearer <token>

# Response: 200
{ "is_bookmarked": true }

# Notes CRUD
GET /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>

POST /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "My note about this topic" }

# Response: 201 Created

PUT /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>

DELETE /api/content/nodes/{node_id}/notes
# Response: 204 No Content
```

### AI

```http
# Explain a topic (cached per node)
POST /api/ai/explain-node
Authorization: Bearer <token>
Content-Type: application/json

{ "node_id": "uuid" }

# Response: 200
{ "explanation": "React is a JavaScript library for building user interfaces...", "cached": false }

# Simplify (also cached)
POST /api/ai/simplify-node
Authorization: Bearer <token>

# Generate quiz questions
POST /api/ai/generate-quiz
Authorization: Bearer <token>

{ "node_id": "uuid", "count": 5 }

# Response: 200
{
  "questions": [
    {
      "question": "What is a React component?",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correct": "A",
      "explanation": "A component is a reusable piece of UI..."
    }
  ]
}

# Suggest projects based on completed nodes
POST /api/ai/suggest-projects
Authorization: Bearer <token>

{ "roadmap_id": "uuid", "completed_node_ids": ["uuid1", "uuid2"] }

# Response: 200
{ "projects": "3 project ideas..." }

# Weekly learning plan
POST /api/ai/weekly-plan
Authorization: Bearer <token>

{ "roadmap_id": "uuid", "hours_available": 10 }

# Response: 200
{ "plan": "Day 1: Review JavaScript basics (2h)..." }
```

### Admin

```http
GET /api/admin/stats
Authorization: Bearer <admin-token>

# Response: 200
{
  "total_users": 42,
  "total_roadmaps": 86,
  "published_roadmaps": 86,
  "total_nodes": 9501,
  "open_feedback": 3
}

GET /api/admin/users
Authorization: Bearer <admin-token>

PATCH /api/admin/users/{user_id}/role
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{ "role": "admin" }

GET /api/admin/feedback
Authorization: Bearer <admin-token>

PATCH /api/admin/feedback/{feedback_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "status": "closed" }
```

## File Structure

```mermaid
mindmap
  root(("PathForge"))
    backend
      app
        core
          config.py
          security.py
        db
          session.py
        middleware
          logging.py
          error_handlers.py
          rate_limit.py
        models
          user.py
          roadmap.py
          progress.py
          content.py
          quiz.py
          resource.py
          feedback.py
        schemas
          roadmap.py
          user.py
          progress.py
        routes
          auth_register.py
          auth.py
          roadmaps.py
          progress.py
          content.py
          ai.py
          admin.py
        services
          ai_service.py
        utils
          pagination.py
          db_helpers.py
        main.py
      alembic
        env.py
        alembic.ini
        versions
          001_initial_schema.py
      seed_data.py
      requirements.txt
      Dockerfile
      .env.example
    frontend
      src
        pages
          HomePage.jsx
          RoadmapsPage.jsx
          RoadmapDetailPage.jsx
          LearnPage.jsx
          DashboardPage.jsx
          LoginPage.jsx
          RegisterPage.jsx
          AdminPage.jsx
        components
          layout
            Navbar.jsx
          roadmap
            RoadmapGraph.jsx
          shared
            LoadingSkeleton.jsx
        lib
          api.js
        stores
          authStore.js
        App.jsx
      package.json
      vite.config.js
      Dockerfile
      .eslintrc.cjs
      .prettierrc
```

## Security

```mermaid
flowchart TB
    subgraph AUTH["Authentication & Authorization"]
        direction TB
        AA1["Register\nbcrypt 12 rounds before DB insert"]
        AA2["Login\nverify hash, issue HS256 JWT"]
        AA3["JWT Token\nsub, role, exp, iat\nconfigurable expiry from JWT_EXPIRY_MINUTES"]
        AA4["Protected Routes\nget_current_user Depends\n403 on invalid/missing token"]
        AA5["Admin Routes\nget_current_admin Depends\nrole: admin or super_admin"]
        AA6["Super Admin\nbody-level role check\nonly super_admin PATCHES roles"]
    end

    subgraph DATA["Data Protection"]
        direction TB
        D1["SQLAlchemy ORM\nparameterized queries\nno SQL injection"]
        D2["Foreign Keys\nCASCADE on owned resources\nSET NULL on optional references"]
        D3["Race Condition\nunique constraint on email\n409 Conflict on duplicate"]
    end

    subgraph NETWORK["Network Protection"]
        direction TB
        N1["CORS Middleware\norigin whitelist from env"]
        N2["Rate Limiting\nin-memory sliding window\n30 req/60s per IP on /api/ai/*"]
    end

    subgraph FRONTEND["Frontend Protections"]
        direction TB
        F1["401 Interceptor\nclear token, redirect to login"]
        F2["Route Guards\nProtectedRoute, GuestRoute,\nAdminRoute"]
        F3["Token Storage\nlocalStorage, no httpOnly\ncookies"]
    end

    subgraph HARDENING["Production Hardening"]
        direction TB
        H1["Strong JWT_SECRET via env"]
        H2["HTTPS via reverse proxy"]
        H3["Short JWT expiry + refresh tokens"]
        H4["Redis-backed rate limiting"]
        H5["Connection pool tuning"]
        H6["CSRF protection"]
    end
```

## Testing

Test directories have been removed from the repository. To add tests:

### Backend

```bash
cd backend
# Install test dependencies
pip install pytest pytest-asyncio httpx
pytest -v
```

Tests use a dedicated `pathforge_test` database (configurable via `TEST_DATABASE_URL` env var).

### Frontend

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm test
```

## Roadmap Data Sources

All roadmap data from [roadmap.sh](https://roadmap.sh) via its [GitHub repository](https://github.com/kamranahmedse/developer-roadmap).

| Category             | Examples                                         |
|----------------------|--------------------------------------------------|
| Role-based           | Frontend, Backend, DevOps, AI Engineer, Android   |
| Skill-based          | React, Python, Kubernetes, System Design, Go      |
| Absolute Beginners   | Frontend Beginner, Git & GitHub Beginner          |
| Languages            | C++, PHP, Ruby, Kotlin, Scala                     |
| Frameworks           | Django, Laravel, ASP.NET Core, FastAPI            |
| Databases            | MongoDB, Redis, Elasticsearch                     |
| AI/ML                | Prompt Engineering, AI Agents, AI Red Teaming     |
| Mobile               | React Native, Swift & SwiftUI                     |
| Web Development      | HTML, CSS, GraphQL, Design System                 |
| DevOps               | Linux, Terraform, Cloudflare                      |
| Best Practices       | AWS Best Practices, API Security, Code Review     |

## AI Prompts

| Feature         | Prompt Key         | What it generates                                           |
|-----------------|--------------------|-------------------------------------------------------------|
| Explain         | `EXPLAIN_PROMPT`   | What it is, real-world analogy, code example, next steps    |
| Simplify        | `SIMPLIFY_PROMPT`  | Beginner-friendly 150-word explanation with everyday analogies |
| Quiz            | `QUIZ_PROMPT`      | N multiple-choice questions with explanations (returns JSON) |
| Projects        | `PROJECT_PROMPT`   | 3 project ideas (beginner, intermediate, advanced)          |
| Weekly Plan     | `WEEKLY_PLAN_PROMPT` | 7-day learning schedule based on pace and completed nodes |

Responses are cached in `ai_explanations` table — subsequent requests return instantly.

## Future Work

| Priority | Feature                          | Description                                           |
|----------|----------------------------------|-------------------------------------------------------|
| P0       | E2E tests                        | Playwright tests for critical flows                   |
| P1       | AI streaming responses           | Stream explanations token-by-token via SSE             |
| P2       | Resource library                 | Curated articles, videos, and courses per node         |
| P2       | Progress export (PDF)            | Download roadmap progress as a certificate/PDF         |
| P2       | Redis caching layer              | Replace in-memory rate limiter, cache AI responses     |
| P2       | Community roadmaps               | User-submitted roadmaps with voting/curation           |
| P3       | Custom roadmap editor            | Drag-and-drop UI to create and share roadmaps          |
| P3       | Multi-language AI support        | Explain topics in Hindi, Spanish, etc.                 |
| P3       | GitHub integration               | Import starred repos as resources                      |
| P3       | LinkedIn integration             | Export completed roadmaps to LinkedIn skills           |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting and tests
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT
