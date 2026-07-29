# Contributing to PathForge AI

## Code of Conduct

This project follows a standard Code of Conduct. By participating, you agree to maintain a respectful, inclusive environment. Report unacceptable behavior to the maintainers.

## Dev Environment Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- Docker 24+ (optional)

### Backend

```bash
# Clone and enter the repo
cd backend

# Create virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env template and edit it
copy .env.example .env        # Windows
# Edit .env — set DATABASE_URL, JWT_SECRET, and at least one AI key

# Create the database
createdb pathforge

# Seed roadmaps
python -m seed_data

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Code Style Guidelines

### Python (Backend)

- **Formatting**: Follow PEP 8. Use `ruff` for linting and formatting.
- **Imports**: Group in order: standard library, third-party, local. Use absolute imports.
- **Types**: Use type hints for all function signatures and public methods.
- **Async**: All database operations use `async/await` with SQLAlchemy async sessions.
- **Pydantic**: Use Pydantic v2 models for request/response schemas. Use `model_dump()` and `model_validate()`.
- **Routes**: Keep route handlers thin — delegate business logic to `app/services/`.
- **Error handling**: Raise `HTTPException` with descriptive `detail` messages. Do not leak stack traces.

### JavaScript / JSX (Frontend)

- **Formatting**: Use Prettier with the project's `.prettierrc` config.
- **Linting**: ESLint with `eslint-plugin-react` and `eslint-plugin-react-hooks`. Run `npm run lint` before committing.
- **State management**: Use Zustand stores for global state (auth, user prefs). Use React state/hooks for local UI state.
- **Components**: Prefer function components with hooks. Use named exports, not default exports.
- **CSS**: Use Tailwind CSS utility classes. Avoid inline styles and custom CSS files unless necessary.
- **API calls**: Use the shared API client in `src/lib/api.js`. Never call `fetch` directly in components.

## Running Linting

### Backend

```bash
cd backend
ruff check app/
ruff format --check app/
```

### Frontend

```bash
cd frontend
npm run lint
npm run format
```

## Testing

Tests use pytest. Run `cd backend && pytest` for backend tests. Frontend tests use Vitest: `cd frontend && npx vitest run`. Add tests for any new functionality.

## Building for Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for build and deployment instructions.

## PR Workflow

1. Fork the repository.
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes. Keep commits small and focused.
4. Run linting and ensure no warnings:
   - Backend: `ruff check app/`
   - Frontend: `npm run lint`
5. Write or update tests if applicable (backend tests use pytest with async fixtures).
6. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add brief description of the change"
   ```
7. Push to your fork and open a Pull Request against `main`.
8. In the PR description, explain:
   - What the change does
   - Why it's needed
   - How to test it
   - Screenshots for UI changes
9. Ensure CI passes (lint + test steps).
10. Request review from a maintainer.

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or updating tests
- `chore:` — build process, CI, tooling

## Getting Help

If you have questions or need help, open a GitHub Discussion or file an issue.

## Good First Issues

Check out issues labeled `good-first-issue` or `help-wanted` on GitHub to find tasks that are great for newcomers.
