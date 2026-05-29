# PathForge AI — AI Career Roadmap Platform

Navigate your tech career with AI-powered clarity. Learn step by step, track progress, and never wonder "what to learn next" again.

## Tech Stack

| Layer       | Technology          |
|-------------|---------------------|
| Frontend    | React 18 + Vite     |
| Backend     | FastAPI (Python 3.11) |
| Database    | PostgreSQL 16       |
| AI          | Google Gemini (primary) / OpenAI (fallback) |
| Auth        | JWT (bcrypt)        |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16

### 1. Backend Setup

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
cd backend
pip install -r requirements.txt

# Set environment variables
copy .env.example .env
# Edit .env with your database URL and API keys

# Create database
createdb pathforge

# Seed roadmaps (70+ roadmaps from roadmap.sh)
python -m seed_data

# Run server
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open in browser
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/docs

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── core/        # Config, security
│   │   ├── db/          # Database session
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app
│   ├── seed_data.py     # 70+ roadmaps seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # UI components
│   │   ├── lib/         # API client
│   │   ├── stores/      # Zustand stores
│   │   └── App.jsx      # Root component
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in

### Roadmaps
- `GET /api/roadmaps` — List published roadmaps
- `GET /api/roadmaps/:slug` — Get roadmap with nodes
- `POST /api/roadmaps` — Create (admin)
- `PATCH /api/roadmaps/:id` — Update (admin)
- `DELETE /api/roadmaps/:id` — Delete (admin)

### Progress
- `POST /api/progress/:ref/start` — Enroll in roadmap
- `GET /api/progress/:ref/progress` — Get progress
- `PATCH /api/progress/node/:nodeId` — Update node status
- `GET /api/progress/dashboard/summary` — Dashboard stats

### AI
- `POST /api/ai/explain-node` — AI topic explanation
- `POST /api/ai/simplify-node` — Simplified explanation
- `POST /api/ai/generate-quiz` — Generate quiz questions
- `POST /api/ai/suggest-projects` — Suggest practice projects
- `POST /api/ai/weekly-plan` — Generate weekly learning plan

### Admin
- `GET /api/admin/stats` — Platform statistics
- `GET /api/admin/users` — List users
- `GET /api/admin/feedback` — List feedback

## License
MIT
