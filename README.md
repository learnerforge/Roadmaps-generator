# PathForge AI — AI-Powered Career Roadmap Platform

Plan, track, and master your tech career with AI-guided learning paths. PathForge imports **76+ real roadmaps from roadmap.sh**, enriches every topic with AI explanations, quizzes, project suggestions, and weekly study plans — all in one place.

## Features

- **76+ Role & Skill Roadmaps** — Frontend, Backend, DevOps, AI/ML, System Design, and more — scraped live from roadmap.sh
- **AI Topic Explanations** — Gemini (primary) + OpenAI (fallback) explains any node in simple terms, cached per node
- **Adaptive Quizzes** — Generate multiple-choice questions per topic to test understanding
- **Project Suggestions** — Get coding project ideas based on completed topics
- **Weekly Learning Plans** — AI generates a 7-day study schedule based on your pace
- **Progress Tracking** — Mark nodes complete/in-progress/skipped, track completion %, dashboard with streaks
- **User Notes & Bookmarks** — Save personal notes per node, bookmark topics for later
- **Node Dependencies** — Prerequisite and follow-up topic graph
- **User Auth** — Email/password registration with JWT + bcrypt, race-condition safe
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
graph TB
    subgraph Client["Client Layer"]
        B[Browser] --> F[React SPA]

        subgraph Frontend["React App Internals"]
            direction TB
            P[Pages\nHome | Roadmaps | Dashboard | Learn | Admin | Login/Register]
            C[Components\nNavbar | LoadingSkeleton]
            ST[Stores\nZustand authStore]
            L[Lib\napi.js fetch wrapper | utils.js cn()]
            P --> C
            P --> ST
            P --> L
            ST --> L
        end

        F --> P
        F --> A[API Client / fetch]
    end

    subgraph Server["Server Layer (FastAPI)"]
        direction TB

        subgraph Middleware["Middleware Stack"]
            direction LR
            LM[RequestLogging\nlogs: METHOD /path status duration]
            RM[RateLimit\nin-memory per-user\n30 req/min on AI endpoints]
            EH[Error Handlers\n422 Validation | HTTPException | 500]
            LM --> RM --> EH
        end

        subgraph Routes["Route Groups"]
            direction TB
            Auth[Auth\nPOST register | POST login\nGET/PATCH /me]
            RMaps[Roadmaps\nCRUD roadmaps\nCRUD nodes\nCRUD resources]
            Prog[Progress\nenroll | unenroll\nupdate node | dashboard]
            Cont[Content\nfeedback CRUD\nbookmark toggle\nnotes CRUD]
            AI[AI\nexplain | simplify\nquiz | projects | weekly]
            Admin[Admin\nstats | users | feedback]
        end

        S[Services / Business Logic]
        M[SQLAlchemy ORM Models\nProfile | Roadmap | RoadmapNode\nNodeDependency | UserRoadmap\nUserNodeProgress | Resource\nNote | Bookmark | AIExplanation\nQuiz | QuizAttempt | Feedback]
        Sch[Pydantic Schemas\nrequest validation\nresponse serialization]
        C[Core\nconfig.py env settings\nsecurity.py JWT + bcrypt]
        U[Utils\npagination.py\nParseParams + PaginatedResponse\ndb_helpers.py\nparse_uuid + resolve_roadmap]

        Middleware --> Routes
        Routes --> S
        Routes --> M
        Routes --> Sch
        Routes --> C
        Routes --> U
    end

    subgraph AI_APIS["AI Service Layer"]
        G[Google Gemini API\nprimary provider]
        O[OpenAI API\nfallback provider]
        S --> G
        S --> O
    end

    subgraph Storage["Data Layer"]
        PG[(PostgreSQL 16+)]
        M --> PG
    end

    A --> Middleware
```

### Middleware & Error Handling Flow

```mermaid
graph TD
    Request[Incoming HTTP Request] --> CORS[CORS Middleware\nchecks Origin header against whitelist]

    CORS --> Log[RequestLoggingMiddleware\nlogs: METHOD /api/path -> status (duration ms)\nformats: INFO pathforge]

    Log --> Rate[RateLimitMiddleware\nreads X-Forwarded-For or client IP\nin-memory dict: {ip: [timestamps]}\n30 requests per 60s window on /api/ai/*\npass-through for all other routes]

    Rate --> Route[/api/* Path Matcher]

    Route --> Auth{Requires Auth?}
    Auth -->|Yes - most routes| JWT[get_current_user / get_current_admin Depends\nExtract Authorization: Bearer header\nDecode HS256 JWT → user_id + role]

    Auth -->|No - register, login, GET roadmaps| Handler[Route Handler\nAsync def reads path/query/body params\nCalls services, queries DB, returns response]

    JWT --> Valid{Valid JWT Signature & Expiry?}
    Valid -->|Yes| Load[Load Profile from DB by user_id]
    Valid -->|No| 401["401 Unauthorized\n{detail: 'Invalid or expired token'}"]

    Load --> Handler

    Handler --> Success{Handler Executes}

    Success -->|200 / 201| JSON["JSON Response\nPydantic schema serialization\nContent-Type: application/json"]

    Success -->|204| NoContent["204 No Content\nEmpty body for DELETE operations"]

    Success -->|Exception Raised| Exception{Exception Type}

    Exception -->|RequestValidationError| 422["422 Unprocessable Entity\nvalidation_exception_handler\nshows field-level errors"]

    Exception -->|HTTPException| StatusCode["Dynamic Status Code\nhttp_exception_handler\nreturns HTTPException.status_code + detail"]

    Exception -->|Unhandled Exception| 500["500 Internal Server Error\ngeneral_exception_handler\nlogs traceback, returns generic message"]
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

# Seed 76+ roadmaps with real data from roadmap.sh
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
5. Maps each roadmap to a hardcoded metadata entry (title, category, difficulty, description)
6. Inserts everything into PostgreSQL — **76+ roadmaps with thousands of real nodes**

The script is **idempotent** — run it multiple times safely; existing roadmaps are skipped.

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
  "nodes": [...]
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
  "total_roadmaps": 76,
  "published_roadmaps": 76,
  "total_nodes": 5400,
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

```bash
backend/
├── app/
│   ├── core/
│   │   ├── config.py             # Pydantic settings from env
│   │   └── security.py           # JWT, bcrypt, auth deps
│   ├── db/
│   │   └── session.py            # Async engine, session factory, Base
│   ├── middleware/
│   │   ├── logging.py            # RequestLoggingMiddleware (method/path/status/duration)
│   │   ├── error_handlers.py     # HTTP, Validation, 500 handlers
│   │   └── rate_limit.py         # In-memory per-user rate limiter for AI endpoints
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py               # Profile
│   │   ├── roadmap.py            # Roadmap, RoadmapNode, NodeDependency
│   │   ├── progress.py           # UserRoadmap, UserNodeProgress
│   │   ├── content.py            # Note, Bookmark, AIExplanation
│   │   ├── quiz.py               # Quiz, QuizAttempt
│   │   ├── resource.py           # Resource
│   │   └── feedback.py           # Feedback
│   ├── schemas/                  # Pydantic request/response
│   │   ├── roadmap.py
│   │   ├── user.py               # ProfileRead includes email
│   │   └── progress.py           # FeedbackRead, NoteRead, BookmarkToggleResponse
│   ├── routes/
│   │   ├── auth_register.py      # POST /register (201), POST /login
│   │   ├── auth.py               # GET /me, PATCH /me
│   │   ├── roadmaps.py           # CRUD roadmaps/nodes/resources
│   │   ├── progress.py           # Enroll, unenroll, update node, dashboard
│   │   ├── content.py            # Feedback, bookmarks, notes CRUD
│   │   ├── ai.py                 # Explain, simplify, quiz, projects, weekly
│   │   └── admin.py              # Stats, users, feedback
│   ├── services/
│   │   └── ai_service.py         # Gemini primary + OpenAI fallback
│   ├── utils/
│   │   ├── pagination.py         # PaginationParams + PaginatedResponse
│   │   └── db_helpers.py         # parse_uuid, resolve_roadmap (shared)
│   └── main.py                   # FastAPI app, middleware stack, router registration
├── tests/
│   ├── conftest.py               # Async test fixtures, DB reset per test
│   ├── test_auth.py              # Register, login, profile (11)
│   ├── test_roadmaps.py          # CRUD, nodes, resources (21)
│   ├── test_progress.py          # Enroll, progress, dashboard (11)
│   └── test_admin.py             # Stats, users, feedback (8)
├── alembic/
│   ├── env.py
│   ├── versions/
│   │   └── 001_initial_schema.py
│   └── alembic.ini
├── seed_data.py                  # Scrapes 76+ roadmaps from GitHub
├── requirements.txt
├── Dockerfile
├── .env.example
└── pytest.ini

frontend/
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx          # Landing page
│   │   ├── RoadmapsPage.jsx      # Browse all roadmaps
│   │   ├── RoadmapDetailPage.jsx # Single roadmap detail
│   │   ├── LearnPage.jsx         # Interactive learning view
│   │   ├── DashboardPage.jsx     # User dashboard
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── AdminPage.jsx         # Admin panel
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.jsx        # Top nav with mobile hamburger
│   │   └── shared/
│   │       └── LoadingSkeleton.jsx
│   ├── lib/
│   │   ├── api.js                # fetch wrapper with 401 interceptor
│   │   └── utils.js              # cn() helper (clsx + tailwind-merge)
│   ├── stores/
│   │   └── authStore.js          # Zustand auth state
│   ├── test/
│   │   ├── setup.js              # @testing-library/jest-dom imports
│   │   ├── api.test.js           # API client tests (10)
│   │   ├── authStore.test.js     # Zustand store tests (7)
│   │   ├── utils.test.js         # cn() utility tests (5)
│   │   ├── Navbar.test.jsx       # Navbar rendering tests (5)
│   │   └── App.test.jsx          # Route guard tests (7)
│   └── App.jsx                   # Router, ProtectedRoute, GuestRoute, AdminRoute
├── package.json
├── vite.config.js                # Vitest config integrated
├── Dockerfile
├── .eslintrc.cjs
└── .prettierrc
```

## Security

```mermaid
graph TB
    subgraph Measures["Implemented Security Measures"]
        direction TB

        subgraph AuthN_AuthZ["Authentication & Authorization"]
            A1[Register] --> A1a[Password hashed with bcrypt\n12 salt rounds\nbefore DB insert]
            A2[Login] --> A2a[Verify password hash\nIssue JWT with user_id + role]
            A3[JWT Token] --> A3a[Algorithm: HS256\nPayload: sub, role, exp, iat\nExpiry: configurable via JWT_EXPIRY_MINUTES\nSecret: from JWT_SECRET env var]
            A4[Protected Routes] --> A4a[get_current_user Depends\nExtracts Bearer token\nDecodes JWT → loads Profile\n403 if invalid/missing]
            A5[Admin Routes] --> A5a[get_current_admin Depends\nChecks role in ['admin', 'super_admin']\n403 if insufficient role]
            A6[Super Admin] --> A6a[Role check in endpoint body\nOnly super_admin can PATCH /users/{id}/role]
        end

        subgraph DataProtection["Data Protection"]
            D1[SQLAlchemy ORM] --> D1a[Parameterized queries\nNo raw SQL interpolation\nPrevents SQL injection]
            D2[Foreign Keys] --> D2a[ondelete CASCADE for owned\nresources (progress, notes, bookmarks)\nondelete SET NULL for optional\nreferences (feedback → node)]
            D3[Register Race Condition] --> D3a[No pre-check SELECT\nUnique constraint on email\n409 Conflict on duplicate]
        end

        subgraph NetworkProtection["Network Protection"]
            N1[CORS Middleware] --> N1a[Origin whitelist from\nCORS_ORIGINS env var\nBlocks unauthorized origins]
            N2[Rate Limiting] --> N2a[In-memory sliding window\nPer IP address\n30 requests / 60 seconds\nOnly on /api/ai/* endpoints]
        end

        subgraph FrontendProtection["Frontend Protections"]
            F1[401 Interceptor] --> F1a[api.js handleResponse\nOn 401: clear token, redirect /login\nPrevents infinite auth loops]
            F2[Route Guards] --> F2a[ProtectedRoute: redirect /login\nGuestRoute: redirect /dashboard\nAdminRoute: check role, redirect /]
            F3[Token Storage] --> F3a[localStorage only\nNo httpOnly cookies\nXSS protection via React]
        end
    end

    subgraph Recommended["Production Hardening"]
        R1[Use strong JWT_SECRET\nvia environment variable]
        R2[Enable HTTPS\nvia reverse proxy]
        R3[Short JWT expiry\n15-30 minutes + refresh tokens]
        R4[Redis-backed rate limiting\nshared across workers]
        R5[Connection pool limits\ntune pool_size + max_overflow]
        R6[Add CSRF protection\nfor cookie-based auth]
        R7[Security headers\nCSP, HSTS, X-Frame-Options]
    end
```

## Testing

### Backend Test Suite (60 tests)

| File              | Tests | Scope                          |
|-------------------|-------|--------------------------------|
| `test_auth.py`    | 11    | Register, login, profile CRUD  |
| `test_roadmaps.py`| 21    | List, get, CRUD, nodes, resources |
| `test_progress.py`| 11    | Enroll, progress, dashboard    |
| `test_admin.py`   | 8     | Stats, users, feedback         |

Tests use a dedicated `pathforge_test` database (configurable via `TEST_DATABASE_URL` env var) with per-function schema reset.

```bash
cd backend
$env:TEST_DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/pathforge_test"
pytest -v
```

### Frontend Test Suite (34 tests)

| File                 | Tests | Scope                             |
|----------------------|-------|-----------------------------------|
| `api.test.js`        | 10    | API client (GET/POST/PATCH/DELETE, 401 redirect, 204 null) |
| `authStore.test.js`  | 7     | Zustand store (login/logout/init/updateUser) |
| `utils.test.js`      | 5     | `cn()` utility (merge, conflicts, edge cases) |
| `Navbar.test.jsx`    | 5     | Auth-dependent rendering, admin link visibility |
| `App.test.jsx`       | 7     | Route guards, guest redirects, admin access |

```bash
cd frontend
npm test              # single run
npm run test:watch    # watch mode
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
| P1       | Social OAuth (Google, GitHub)    | Sign in with existing accounts                         |
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
