# PathForge AI — AI-Powered Career Roadmap Platform

Plan, track, and master your tech career with AI-guided learning paths. PathForge imports **76+ real roadmaps from roadmap.sh**, enriches every topic with AI explanations, quizzes, project suggestions, and weekly study plans — all in one place.

## Features

- **76+ Role & Skill Roadmaps** — Frontend, Backend, DevOps, AI/ML, System Design, and more — scraped live from roadmap.sh
- **AI Topic Explanations** — Gemini (primary) + OpenAI (fallback) explains any node in simple terms
- **Adaptive Quizzes** — Generate multiple-choice questions per topic to test understanding
- **Project Suggestions** — Get coding project ideas based on completed topics
- **Weekly Learning Plans** — AI generates a 7-day study schedule based on your pace
- **Progress Tracking** — Mark nodes complete, track completion %, dashboard with streaks
- **Node Dependencies** — Visual dependency graph showing prerequisites and follow-up topics
- **User Auth** — Email/password registration with JWT + bcrypt
- **Admin Dashboard** — Platform stats, user management, feedback moderation

## Tech Stack

| Layer       | Technology                                   |
|-------------|----------------------------------------------|
| Frontend    | React 18 + Vite + Tailwind CSS + Zustand     |
| Backend     | FastAPI (Python 3.11) + SQLAlchemy 2.0 async |
| Database    | PostgreSQL 16                                |
| AI          | Google Gemini (primary) / OpenAI (fallback)  |
| Auth        | JWT (HS256) + bcrypt                         |
| Container   | Docker + docker-compose                      |

## Architecture

```mermaid
graph TB
    subgraph Client["Client Layer"]
        B[Browser] --> F[React SPA]
        F --> A[API Client / Axios]
    end

    subgraph Server["Server Layer (FastAPI)"]
        R[Routes]
        S[Services]
        M[SQLAlchemy Models]
        Sch[Pydantic Schemas]
        C[Core: Config / Security]
        R --> S
        R --> M
        R --> Sch
        R --> C
    end

    subgraph AI["AI Service Layer"]
        G[Google Gemini API]
        O[OpenAI API]
        S --> G
        S --> O
    end

    subgraph Storage["Data Layer"]
        PG[(PostgreSQL 16)]
        M --> PG
    end

    A --> R
```

### Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API as FastAPI
    participant AI as AI Service
    participant DB as PostgreSQL

    User->>Browser: Browse roadmaps
    Browser->>API: GET /api/roadmaps
    API->>DB: Query published roadmaps
    DB-->>API: Roadmap list
    API-->>Browser: JSON response
    Browser-->>User: Render roadmap cards

    User->>Browser: Click a roadmap
    Browser->>API: GET /api/roadmaps/frontend
    API->>DB: Query roadmap + nodes
    DB-->>API: Roadmap with nodes
    API-->>Browser: Nodes with positions
    Browser-->>User: Display interactive graph

    User->>Browser: Ask AI to explain node
    Browser->>API: POST /api/ai/explain-node
    API->>DB: Check cache
    alt Cache miss
        API->>AI: Generate explanation
        AI-->>API: Response text
        API->>DB: Store in ai_explanations
    end
    API-->>Browser: Explanation text
    Browser-->>User: Display AI explanation

    User->>Browser: Mark node complete
    Browser->>API: PATCH /api/progress/node/{id}
    API->>DB: Upsert UserNodeProgress
    API->>DB: Recalculate completion %
    API-->>Browser: Updated status + %
    Browser-->>User: Visual progress update
```

### Auth Flow

```mermaid
graph LR
    subgraph Register
        RE[POST /register] --> H[hash password]
        H --> S[store in DB]
        S --> TJ[generate JWT]
    end
    subgraph Login
        L[POST /login] --> V[verify bcrypt]
        V --> TJ
    end
    subgraph Access
        TJ --> MW[Bearer middleware]
        MW --> D[decode & verify]
        D --> U[return user]
    end
```

### Deployment Architecture

```mermaid
graph TB
    subgraph Internet
        User[User Browser]
    end

    subgraph Docker_Host["Docker Host"]
        subgraph Network["pathforge-network"]
            direction TB

            subgraph Frontend_Container["Frontend Container"]
                F[Vite Dev Server :5173]
                FA[Static Assets]
            end

            subgraph Backend_Container["Backend Container"]
                B[Uvicorn :8000]
                BA[FastAPI App]
                BS[Seed Script]
            end

            subgraph DB_Container["Database Container"]
                PG[(PostgreSQL 16 :5432)]
                PV[Persistent Volume]
            end
        end
    end

    User -->|HTTP :5173| F
    F -->|API Proxy :8000| B
    B -->|AsyncPG :5432| PG
    PG --> PV
    BS -->|seeds data| PG
    B -->|API calls| G[Google Gemini API]
    B -->|API calls| O[OpenAI API]
```

### Frontend Component Tree

```mermaid
graph TB
    App[App.jsx] --> Router[React Router]
    Router --> Layout[Layout / Navbar]

    Layout --> Home[Home Page]
    Layout --> Roadmaps[Roadmaps Browse]

    Layout --> RoadmapDetail[Roadmap Detail]

    Layout --> Learn[Learn / Node Detail]

    Layout --> Dashboard[Dashboard]
    Layout --> Login[Login]
    Layout --> Register[Register]
    Layout --> Admin[Admin Panel]

    Home --> Hero[Hero Section]
    Home --> CategoryGrid[Category Grid]

    Roadmaps --> FilterBar[Filter by Category / Difficulty]
    Roadmaps --> SearchBar[Search]
    Roadmaps --> CardGrid[Roadmap Card Grid]

    RoadmapDetail --> GraphView[Interactive Graph View]
    RoadmapDetail --> NodeList[Sidebar Node List]
    GraphView --> NodePopup[Node Popup]

    Learn --> AIExplain[AI Explanation]
    Learn --> AIQuiz[AI Quiz]
    Learn --> AIPlan[Weekly Plan]
    Learn --> Notes[User Notes]
    Learn --> Resources[Resource Links]

    Dashboard --> ProgressChart[Progress Chart]
    Dashboard --> Streak[Streak Tracker]
    Dashboard --> Enrolled[Enrolled Roadmaps]

    subgraph State["Zustand State"]
        AuthStore[Auth Store]
    end

    subgraph API["API Client Layer"]
        Axios[Axios Instance]
        Interceptors[JWT Interceptor]
    end

    Layout --> State
    Layout --> API
```

### Error Handling & Middleware Flow

```mermaid
graph TD
    Request[Incoming Request] --> CORS[CORS Middleware]
    CORS --> Route[Route Matcher]

    Route --> Auth{Requires Auth?}
    Auth -->|Yes| JWT[JWT Bearer Extract]
    Auth -->|No| Handler[Route Handler]

    JWT --> Valid{Valid Token?}
    Valid -->|Yes| Decode[Decode & Load User]
    Valid -->|No| 401[401 Unauthorized]
    401 --> Response[Error Response]

    Decode --> Handler

    Handler --> Success{Success?}
    Success -->|Yes| 200[200 OK]
    Success -->|No| Exception{Exception Type}

    Exception -->|Validation| 422[422 Validation Error]
    Exception -->|Not Found| 404[404 Not Found]
    Exception -->|Auth Error| 401
    Exception -->|Permission| 403[403 Forbidden]
    Exception -->|DB Error| 500[500 Internal Error]

    200 --> Response
    422 --> Response
    404 --> Response
    401 --> Response
    403 --> Response
    500 --> Response
```

### Database Migration Strategy

```mermaid
graph LR
    subgraph Dev["Development"]
        A[Define Models] --> B[create_all on startup]
        B --> C[Seed Data]
    end

    subgraph Prod["Production"]
        D[Alembic Init] --> E[Generate Migration]
        E --> F[Review & Edit]
        F --> G[Apply Migration]
        G --> H[Verify]
    end

    subgraph Seed["Data Seeding"]
        I[GitHub API] --> J[Fetch roadmap.sh JSON]
        J --> K[Parse React Flow Format]
        K --> L[Insert Roadmaps]
        K --> M[Insert Nodes]
        K --> N[Insert Dependencies]
    end
```

### Caching Strategy

```mermaid
graph TB
    subgraph AI_Cache["AI Explanation Cache"]
        Req[POST /explain-node] --> Check{Exists in DB?}
        Check -->|Yes| Return[Return Cached Response]
        Check -->|No| Gen[Call Gemini / OpenAI]
        Gen --> Store[Save to ai_explanations table]
        Store --> Return
    end

    subgraph DB_Cache["Database-Level"]
        Q[Query] --> Pool[Connection Pool (20 connections)]
        Pool --> PG[(PostgreSQL)]
    end
```

## Data Model

```mermaid
erDiagram
    profiles ||--o{ user_roadmaps : enrolls
    profiles ||--o{ user_node_progress : progresses
    roadmaps ||--o{ roadmap_nodes : contains
    roadmaps ||--o{ user_roadmaps : tracked
    roadmap_nodes ||--o{ node_dependencies : depends-on
    roadmap_nodes ||--o{ user_node_progress : tracked
    roadmap_nodes ||--o{ resources : has
    roadmap_nodes ||--o{ ai_explanations : cached
    roadmap_nodes ||--o{ notes : has
    roadmap_nodes ||--o{ bookmarks : bookmarked

    profiles {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string role
        int streak_days
    }

    roadmaps {
        uuid id PK
        string slug UK
        string title
        text description
        string category
        string difficulty
        boolean is_published
    }

    roadmap_nodes {
        uuid id PK
        uuid roadmap_id FK
        string source_node_id
        string node_type
        string title
        float position_x
        float position_y
        int order_index
    }

    node_dependencies {
        uuid node_id FK
        uuid depends_on_node_id FK
    }

    user_node_progress {
        uuid id PK
        uuid user_id FK
        uuid node_id FK
        string status
    }

    ai_explanations {
        uuid id PK
        uuid node_id FK
        string prompt_type
        text response_text
    }
```

## Quick Start

### Prerequisites

| Tool       | Version   |
|------------|-----------|
| Python     | 3.11+     |
| Node.js    | 20+       |
| PostgreSQL | 16        |
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
# cp .env.example .env        # macOS / Linux
# Edit .env — set DATABASE_URL, JWT_SECRET, and at least one AI key

# Create the database
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

# Response: 200
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "full_name": "Jane Doe",
    "email": "user@example.com",
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

# Response: 200 (same shape as register)
```

### Roadmaps

```http
# List all published roadmaps (supports ?category=, ?difficulty=, ?search=)
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
```

```http
# Get a single roadmap with all its nodes
GET /api/roadmaps/frontend

# Response: 200
{
  "roadmap": { "id": "uuid", "title": "Frontend Developer", ... },
  "nodes": [
    {
      "id": "uuid",
      "source_node_id": "abc123",
      "node_type": "topic",
      "title": "HTML",
      "position_x": -214.5,
      "position_y": 32.3
    }
  ]
}
```

```http
# Node detail — dependencies, resources, and user progress
GET /api/roadmaps/nodes/{nodeId}

# Response: 200
{
  "id": "uuid",
  "title": "React",
  "description": null,
  "dependencies": [
    { "node_id": "uuid", "title": "JavaScript" }
  ],
  "dependents": [
    { "node_id": "uuid", "title": "Next.js" }
  ],
  "resources": []
}
```

### Progress

```http
# Enroll in a roadmap (by slug or UUID)
POST /api/progress/frontend/start

# Response: 200
{ "message": "Enrolled successfully" }
```

```http
# Mark a node as done / in_progress / pending
PATCH /api/progress/node/{nodeId}
Content-Type: application/json

{ "status": "done" }

# Response: 200
{ "status": "done", "completion_pct": 42.5, "node_id": "uuid" }
```

### AI

```http
# Explain a topic (cached per node)
POST /api/ai/explain-node
Content-Type: application/json

{ "node_id": "uuid" }

# Response: 200
{ "explanation": "React is a JavaScript library for building user interfaces...", "cached": false }
```

```http
# Generate quiz questions
POST /api/ai/generate-quiz
Content-Type: application/json

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
```

```http
# Weekly learning plan
POST /api/ai/weekly-plan
Content-Type: application/json

{ "roadmap_id": "uuid", "hours_available": 10 }

# Response: 200
{ "plan": "Day 1: Review JavaScript basics (2h)..." }
```

### Admin

```http
GET /api/admin/stats
Authorization: Bearer <admin-jwt>

# Response: 200
{
  "total_users": 42,
  "total_roadmaps": 76,
  "published_roadmaps": 76,
  "total_nodes": 5400,
  "open_feedback": 3
}
```

## File Structure

```bash
backend/
├── app/
│   ├── core/
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   └── security.py        # JWT, bcrypt, auth deps
│   ├── db/
│   │   └── session.py         # Async engine, session factory
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── roadmap.py         # Roadmap, RoadmapNode, NodeDependency
│   │   ├── user.py            # Profile
│   │   ├── progress.py        # UserRoadmap, UserNodeProgress
│   │   ├── content.py         # Note, Bookmark, AIExplanation
│   │   ├── quiz.py            # Quiz, QuizAttempt
│   │   ├── resource.py        # Resource
│   │   └── feedback.py        # Feedback
│   ├── schemas/               # Pydantic request/response models
│   │   ├── roadmap.py
│   │   ├── user.py
│   │   └── progress.py
│   ├── routes/                # API endpoint modules
│   │   ├── auth_register.py   # POST /register, /login
│   │   ├── auth.py            # GET /me, PATCH /me
│   │   ├── roadmaps.py        # CRUD roadmaps, nodes, resources
│   │   ├── progress.py        # Enroll, track, dashboard
│   │   ├── ai.py              # Explain, quiz, projects, weekly plan
│   │   └── admin.py           # Stats, users, feedback
│   ├── services/
│   │   └── ai_service.py      # Gemini + OpenAI prompt templates
│   └── main.py                # FastAPI app, CORS, lifespan
├── seed_data.py               # Scrapes & seeds 76+ roadmaps from GitHub
├── requirements.txt
├── Dockerfile
└── .env.example

frontend/
├── src/
│   ├── pages/
│   │   ├── Home.jsx           # Landing page
│   │   ├── Roadmaps.jsx       # Browse all roadmaps
│   │   ├── RoadmapDetail.jsx  # Interactive roadmap graph
│   │   ├── Learn.jsx          # Node detail + AI features
│   │   ├── Dashboard.jsx      # User dashboard
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Admin.jsx
│   ├── lib/
│   │   └── api.js             # Axios client
│   ├── stores/
│   │   └── authStore.js       # Zustand auth state
│   └── App.jsx                # Router + layout
├── package.json
├── vite.config.js
└── Dockerfile
```

## Roadmap Data Sources

All roadmap data is sourced from [roadmap.sh](https://roadmap.sh) via its [open-source GitHub repository](https://github.com/kamranahmedse/developer-roadmap). The seed script fetches the raw React Flow JSON files directly, ensuring the platform always has the latest community-maintained learning paths.

Supported categories:

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

The AI service (`backend/app/services/ai_service.py`) uses structured prompts:

| Feature         | Prompt Key         | What it generates                                           |
|-----------------|--------------------|-------------------------------------------------------------|
| Explain         | `EXPLAIN_PROMPT`   | What it is, real-world analogy, code example, next steps    |
| Simplify        | `SIMPLIFY_PROMPT`  | Beginner-friendly 150-word explanation with everyday analogies |
| Quiz            | `QUIZ_PROMPT`      | N multiple-choice questions with explanations (returns JSON) |
| Projects        | `PROJECT_PROMPT`   | 3 project ideas (beginner, intermediate, advanced)          |
| Weekly Plan     | `WEEKLY_PLAN_PROMPT` | 7-day learning schedule based on pace and completed nodes |

Responses are **cached** in the `ai_explanations` table — subsequent requests for the same node return instantly.

## Testing

```mermaid
graph LR
    subgraph Test_Suite["Test Suite"]
        Unit[Unit Tests] --> pytest
        Integration[Integration Tests] --> pytest
        API[API Tests] --> httpx
        E2E[E2E Tests] --> Playwright
    end

    subgraph CI["CI Pipeline"]
        Lint --> TypeCheck
        TypeCheck --> Unit
        Unit --> Integration
        Integration --> Build
    end
```

### Current Coverage

| Layer       | Tool         | Status      |
|-------------|--------------|-------------|
| Backend     | pytest       | Not started |
| API Routes  | httpx + pytest | Not started |
| Frontend    | Vitest       | Not started |
| E2E         | Playwright   | Not started |

To run tests:

```bash
cd backend
pytest                      # all backend tests
pytest tests/ -v            # verbose
pytest tests/test_routes/   # route tests only
```

## Security Considerations

```mermaid
graph TB
    subgraph Security_Measures["Security Measures"]
        P[Password] --> B[bcrypt hashing]
        S[Session] --> J[JWT with expiry]
        A[API Access] --> T[Token in Bearer header]
        C[CORS] --> O[Origin whitelist]
        D[Database] --> P2[Parameterized queries via SQLAlchemy]
    end

    subgraph Best_Practices["Production Recommendations"]
        E[Environment] --> E1[Use strong JWT_SECRET]
        E --> E2[Enable HTTPS]
        E --> E3[Set short JWT expiry]
        E --> E4[Rate limit AI endpoints]
        E --> E5[Use connection pooling limits]
    end
```

## Future Work

### Short-term

```mermaid
graph LR
    A[Fix Remaining Todos] --> B[Add Tests]
    B --> C[API Error Refinement]
    C --> D[Frontend Polish]
```

| Priority | Feature                          | Description                                           |
|----------|----------------------------------|-------------------------------------------------------|
| P0       | Backend tests                    | Unit + integration tests for all routes and services  |
| P0       | Frontend tests                   | Component + page tests with Vitest                    |
| P1       | E2E tests                        | Playwright tests for critical flows                   |
| P1       | Rate limiting                    | Per-user and per-IP rate limits on AI endpoints       |
| P1       | Input validation hardening       | Strict Pydantic validation on all request bodies      |
| P2       | Error response standardization   | Consistent error shape across all endpoints           |
| P2       | Logging infrastructure           | Structured logging with request IDs                   |

### Medium-term

```mermaid
gantt
    title Development Roadmap
    dateFormat  YYYY-MM-DD
    section Foundation
    Test Suite           :done, 2025-06-01, 30d
    CI/CD Pipeline       :active, 2025-06-15, 45d
    Error Standardization :2025-07-01, 30d

    section Features
    Social Auth (Google/GitHub) :2025-07-15, 30d
    Resource Library     :2025-08-01, 45d
    User Notes & Bookmarks :2025-08-15, 30d
    Progress Export (PDF) :2025-09-01, 30d

    section AI
    Streaming Responses  :2025-09-01, 30d
    Multi-language Support :2025-09-15, 45d
    Personalized Learning Paths :2025-10-01, 60d
```

| Priority | Feature                          | Description                                           |
|----------|----------------------------------|-------------------------------------------------------|
| P1       | Social OAuth (Google, GitHub)    | Sign in with existing accounts                         |
| P1       | Resource library                 | Curated articles, videos, and courses per node         |
| P2       | User notes & bookmarks           | Save personal notes and bookmark nodes                 |
| P2       | Progress export (PDF)            | Download roadmap progress as a certificate/PDF         |
| P2       | AI streaming responses           | Stream AI explanations token-by-token via SSE          |
| P3       | Multi-language AI support        | Explain topics in Hindi, Spanish, etc.                 |

### Long-term

```mermaid
graph TB
    subgraph Long_Term["Future Architecture"]
        direction TB

        subgraph Platform
            P1[Community Roadmaps]
            P2[User-Generated Content]
            P3[Roadmap Editor]
        end

        subgraph Intelligence
            I1[Personalized Paths]
            I2[Skill Gap Analysis]
            I3[Adaptive Difficulty]
        end

        subgraph Scale
            S1[Redis Cache Layer]
            S2[CDN for Content]
            S3[WebSocket Real-time]
        end

        subgraph Integration
            Int1[GitHub Integration]
            Int2[LinkedIn Integration]
            Int3[VS Code Extension]
        end

        Platform --> Intelligence
        Intelligence --> Scale
        Scale --> Integration
    end
```

| Priority | Feature                          | Description                                           |
|----------|----------------------------------|-------------------------------------------------------|
| P2       | Custom roadmap editor            | Drag-and-drop UI to create and share roadmaps          |
| P2       | Community roadmaps               | User-submitted roadmaps with voting/curation           |
| P3       | Skill gap analysis               | AI evaluates your profile and recommends missing skills |
| P3       | Adaptive difficulty               | Roadmap nodes dynamically adjust to user pace          |
| P3       | Redis caching layer              | Cache AI responses and frequent queries                |
| P3       | WebSocket real-time sync          | Live progress updates across devices                   |
| P3       | GitHub integration                | Import starred repos as resources                      |
| P3       | VS Code extension                 | Learn without leaving your editor                      |
| P3       | LinkedIn integration              | Export completed roadmaps to LinkedIn skills           |

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
