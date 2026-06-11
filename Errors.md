# Project Error Report

Checked on: 2026-06-11 19:51:43 +05:30  
Deep review updated after line-by-line backend/frontend source inspection.

## Summary

The project builds, and the backend imports correctly when started from the `backend` directory. The deeper review found command-level tooling problems, backend runtime risks, schema/migration mismatches, frontend state bugs, and validation gaps.

High-impact issues:

1. Frontend lint is configured but cannot run because ESLint packages are missing.
2. Backend settings load `.env` from the process working directory, so imports from the repository root fail.
3. Alembic migration and SQLAlchemy models are out of sync for `notes` and `ai_explanations`; a database created by the migration can fail at runtime.
4. Google social login is wired incorrectly: frontend sends a Google OAuth access token, backend validates it as an ID token.
5. Rate limiting groups every authenticated request under the same `"authenticated"` key.
6. Several API inputs are unvalidated and can store invalid domain values or trigger database errors.

## Validation Commands Run

### Frontend production build

Command:

```powershell
npm run build
```

Working directory:

```text
frontend
```

Result: Passed.

Output summary:

```text
vite v6.4.2 building for production...
224 modules transformed.
built in 1.28s
```

### Frontend lint

Command:

```powershell
npm run lint
```

Working directory:

```text
frontend
```

Result: Failed before source analysis.

Output:

```text
> pathforge-frontend@1.0.0 lint
> eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0

'eslint' is not recognized as an internal or external command,
operable program or batch file.
```

### Frontend lint dependency check

Command:

```powershell
npm ls eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Working directory:

```text
frontend
```

Result: Failed; no ESLint packages are installed.

Output:

```text
pathforge-frontend@1.0.0 E:\GitHub Projects\Roadmaps generator\frontend
`-- (empty)
```

### Backend Python compilation

Command:

```powershell
..\.venv\Scripts\python.exe -m compileall .
```

Working directory:

```text
backend
```

Result: Passed.

### Backend app import from backend directory

Command:

```powershell
..\.venv\Scripts\python.exe -c "import app.main; print('backend import ok')"
```

Working directory:

```text
backend
```

Result: Passed.

Output:

```text
backend import ok
```

### Backend app import from repository root

Command:

```powershell
.\.venv\Scripts\python.exe -c "import os, sys; sys.path.insert(0, 'backend'); print(os.getcwd()); import app.main; print('backend import ok')"
```

Working directory:

```text
E:\GitHub Projects\Roadmaps generator
```

Result: Failed.

Output:

```text
E:\GitHub Projects\Roadmaps generator
ValueError: JWT_SECRET must be at least 32 characters. Set a strong random value in .env
```

Reason:

`backend/app/core/config.py:44` uses `env_file=".env"`, which resolves relative to the current process directory. From the repo root it does not find `backend/.env`, so `JWT_SECRET` falls back to the default empty value from `backend/app/core/config.py:19`.

### Python static/type/lint tool availability

Command:

```powershell
.\.venv\Scripts\python.exe -m pip show mypy pyright ruff
```

Result:

```text
WARNING: Package(s) not found: mypy, pyright, ruff
```

No Python type checker or linter is currently available in the virtual environment.

## Backend Issues

### B1. Settings `.env` path is working-directory dependent

Severity: High for local/dev reliability.

Location:

- `backend/app/core/config.py:44`
- `backend/app/core/config.py:48-55`

Problem:

```python
model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

This loads `.env` from the process working directory, not from the backend folder. Running backend code from `backend` works; running from the repository root fails startup validation.

Impact:

Commands, scripts, tests, or tools launched from the repo root can fail with a misleading JWT secret error even though `backend/.env` contains a valid value.

Suggested fix:

Resolve the env path relative to `config.py`:

```python
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]

model_config = SettingsConfigDict(
    env_file=BACKEND_DIR / ".env",
    env_file_encoding="utf-8",
)
```

### B2. Alembic migration is missing `notes.created_at`

Severity: High if the database is created by migrations.

Locations:

- Model expects column: `backend/app/models/content.py:38`
- Response schema expects field: `backend/app/schemas/progress.py:43`
- Migration creates `notes` without `created_at`: `backend/alembic/versions/001_initial_schema.py:117-125`

Problem:

The SQLAlchemy `Note` model defines:

```python
created_at = Column(DateTime(timezone=True), server_default=func.now())
```

The `NoteRead` schema also requires `created_at`. But the initial Alembic migration creates only `id`, `user_id`, `node_id`, `content`, and `updated_at` for the `notes` table.

Impact:

On a migrated database, selecting or returning notes can fail because SQLAlchemy will reference a column that does not exist. Creating/listing notes may produce database-level errors.

Suggested fix:

Add a migration that adds `notes.created_at`, or correct the initial migration if it has not been applied anywhere.

### B3. Alembic migration is missing `ai_explanations.openai_fallback`

Severity: High if the database is created by migrations.

Locations:

- Model expects column: `backend/app/models/content.py:15`
- Route writes field: `backend/app/routes/ai.py:52-54` and `backend/app/routes/ai.py:88-90`
- Migration creates table without the column: `backend/alembic/versions/001_initial_schema.py:134-143`

Problem:

The model has:

```python
openai_fallback = Column(Boolean, default=False)
```

The migration does not create this column.

Impact:

Any insert/query involving `AIExplanation.openai_fallback` can fail against a database built from the migration.

Suggested fix:

Add `openai_fallback` to the migration path.

### B4. `ai_explanations` unique constraint name differs between model and migration

Severity: Medium.

Locations:

- Model: `backend/app/models/content.py:18-20`
- Migration: `backend/alembic/versions/001_initial_schema.py:142`

Problem:

The model names the unique constraint `uq_node_prompt`; the migration names it `uq_ai_explanation_node_type`.

Impact:

Autogenerated migrations will keep detecting drift, and constraint-specific migrations may fail or produce duplicate operations.

Suggested fix:

Use the same constraint name in both model and migration.

### B5. `notes` unique constraint differs between model and migration

Severity: Medium.

Locations:

- Migration: `backend/alembic/versions/001_initial_schema.py:124`
- Model: `backend/app/models/content.py:33-39`
- Route creates notes: `backend/app/routes/content.py:108-115`

Problem:

The migration enforces `UniqueConstraint("user_id", "node_id", name="uq_user_note_node")`, but the model does not define that constraint. The route exposes `POST /nodes/{node_id}/notes` and creates a new note each time.

Impact:

The code appears to allow multiple notes per user/node, but the database migration allows only one. Duplicate note creation can raise an integrity error and become a 500 unless handled.

Suggested fix:

Either add the unique constraint to the model and make `POST` upsert or reject duplicates cleanly, or remove the migration constraint if multiple notes are intended.

### B6. Rate limiter groups all authenticated users together

Severity: High for production behavior.

Location:

- `backend/app/middleware/rate_limit.py:17-22`

Problem:

The middleware checks `request.state.user`, but no earlier middleware sets that value. Authentication happens later in FastAPI route dependencies. Therefore every request with an `Authorization` header uses:

```python
user_id = "authenticated"
```

Impact:

All logged-in users share one rate-limit bucket for `/api/ai/*` and `/api/auth/*`. One active user can throttle every other authenticated user.

Suggested fix:

Decode the bearer token inside the middleware to derive a stable user ID, or rate-limit by IP plus token subject, or move rate limiting into dependencies where the authenticated user is available.

### B7. Rate limiter ignores configured free/registered/premium limits

Severity: Medium.

Locations:

- Config values: `backend/app/core/config.py:31-34`
- Middleware constructor: `backend/app/middleware/rate_limit.py:10-14`
- Middleware registration: `backend/app/main.py:54`

Problem:

Config defines:

```python
AI_CALLS_PER_DAY_FREE = 5
AI_CALLS_PER_DAY_REGISTERED = 20
AI_CALLS_PER_DAY_PREMIUM = 999
```

The middleware instead defaults to `calls_per_day=100`, and `main.py` registers it without passing the configured limits.

Impact:

Actual AI/auth limits do not match application configuration.

Suggested fix:

Pass settings into the middleware or make the middleware read the intended configured values.

### B8. Backend creates tables at app startup while also shipping Alembic migrations

Severity: Medium.

Locations:

- `backend/app/main.py:28-31`
- `backend/app/db/session.py:34-36`

Problem:

The lifespan handler calls:

```python
await init_db()
```

`init_db()` runs `Base.metadata.create_all`.

Impact:

The application mixes Alembic-managed schema evolution with automatic `create_all`. `create_all` will not alter existing tables, so model/migration drift can persist silently. This is especially risky with the mismatches listed above.

Suggested fix:

Use Alembic migrations as the source of truth. Reserve `create_all` for disposable local/dev setups only.

### B9. Creating a node does not verify the parent roadmap exists

Severity: Medium.

Location:

- `backend/app/routes/roadmaps.py:384-391`

Problem:

`create_node` parses `roadmap_id` as a UUID and inserts a `RoadmapNode` without checking that a roadmap exists.

Impact:

Invalid IDs cause database foreign-key failures instead of a controlled 404 response. If foreign-key enforcement differs by environment, orphan behavior can also vary.

Suggested fix:

Query `Roadmap` first and return 404 when not found.

### B10. `create_node` only accepts UUIDs while related read endpoints accept slug or UUID

Severity: Low to Medium.

Locations:

- `list_nodes` resolves slug or UUID: `backend/app/routes/roadmaps.py:370-377`
- `create_node` parses UUID only: `backend/app/routes/roadmaps.py:384-389`

Problem:

`GET /api/roadmaps/{roadmap_id}/nodes` accepts a slug because it calls `resolve_roadmap`, while `POST /api/roadmaps/{roadmap_id}/nodes` only accepts a UUID.

Impact:

Admin/client code can successfully read nodes by slug but fail to create nodes by slug for the same route shape.

Suggested fix:

Use `resolve_roadmap` consistently or rename the path variable to make UUID-only behavior explicit.

### B11. `create_feedback` does not verify optional `node_id`

Severity: Medium.

Location:

- `backend/app/routes/content.py:42-55`

Problem:

The route accepts `node_id` from the body and inserts it directly without checking whether the node exists.

Impact:

Invalid `node_id` values can trigger database integrity errors instead of a clean 404 or 422.

Suggested fix:

If `node_id` is provided, query `RoadmapNode` before insert.

### B12. `create_note` does not verify the target node exists

Severity: Medium.

Location:

- `backend/app/routes/content.py:108-115`

Problem:

The route parses the UUID and inserts a `Note` without checking `RoadmapNode`.

Impact:

Invalid node IDs can produce database errors instead of a clean 404 response.

Suggested fix:

Check `RoadmapNode` before creating the note.

### B13. Progress status is not validated

Severity: Medium.

Locations:

- Schema: `backend/app/schemas/progress.py:6-7`
- Route writes status: `backend/app/routes/progress.py:99-152`
- Frontend expected values: `frontend/src/pages/LearnPage.jsx:9`

Problem:

`NodeProgressUpdate.status` is a plain string:

```python
class NodeProgressUpdate(BaseModel):
    status: str
```

The frontend uses `pending`, `in_progress`, `done`, and `skipped`, but the backend accepts any string.

Impact:

Invalid statuses can be stored, which breaks completion counts and UI styling.

Suggested fix:

Use a `Literal["pending", "in_progress", "done", "skipped"]` or enum.

### B14. Completion timestamp is never cleared when progress drops below 100%

Severity: Low to Medium.

Location:

- `backend/app/routes/progress.py:144-150`

Problem:

When completion reaches 100%, `completed_at` is set. If a user later changes a node from `done` to another status and completion drops below 100%, `completed_at` remains set.

Impact:

A roadmap can look completed historically even when current completion is below 100%.

Suggested fix:

Set `completed_at = None` when `pct < 100`.

### B15. Users can update progress without being enrolled in the roadmap

Severity: Medium.

Location:

- `backend/app/routes/progress.py:99-152`

Problem:

`update_node_status` creates `UserNodeProgress` for any valid node. It only updates `UserRoadmap` if enrollment exists.

Impact:

Users can complete nodes in a roadmap that is not in `my-roadmaps`, causing dashboard/progress inconsistencies.

Suggested fix:

Require enrollment before allowing progress updates, or auto-enroll consistently.

### B16. Admin role update accepts arbitrary role strings

Severity: Medium.

Location:

- `backend/app/routes/admin.py:73-89`

Problem:

The route writes:

```python
target.role = data.get("role", target.role)
```

There is no validation that the new role is `user`, `admin`, or `super_admin`.

Impact:

A typo or malicious body can store unusable roles and lock users out of expected permissions.

Suggested fix:

Use a typed Pydantic request model with an enum/literal role field.

### B17. Admin feedback status update accepts arbitrary status strings

Severity: Medium.

Location:

- `backend/app/routes/admin.py:117-130`

Problem:

The route writes:

```python
fb.status = data.get("status", fb.status)
```

There is no allowed-value validation.

Impact:

Invalid feedback statuses can be persisted and break admin filtering/display assumptions.

Suggested fix:

Use a typed Pydantic model with allowed statuses.

### B18. AI request bounds are not validated

Severity: Medium.

Locations:

- `backend/app/schemas/progress.py:16-25`
- `backend/app/routes/ai.py:99-116`
- `backend/app/routes/ai.py:138-167`

Problem:

`AIQuizRequest.count` and `AIWeeklyPlanRequest.hours_available` are plain integers with defaults and no bounds.

Impact:

Clients can ask for extremely large quizzes or unrealistic plans, causing cost, latency, or provider failures.

Suggested fix:

Use Pydantic `Field` constraints such as `ge=1`, `le=20` for quiz count and a reasonable range for weekly hours.

### B19. AI explanation cache ignores user context

Severity: Medium.

Locations:

- Cache lookup: `backend/app/routes/ai.py:27-35`
- Prompt uses user level: `backend/app/routes/ai.py:42-46`
- Unique constraint only node/prompt type: `backend/app/models/content.py:18-20`

Problem:

The prompt includes `user.experience_level`, but the cache key only uses `node_id` and `prompt_type`.

Impact:

The first generated explanation for a node is reused for all users regardless of experience level.

Suggested fix:

Include experience level or prompt parameters in the cache key, or make the explanation intentionally global and remove user-specific prompt variables.

### B20. AI metadata hardcodes Gemini even when OpenAI fallback is used

Severity: Low to Medium.

Locations:

- `backend/app/routes/ai.py:51-54`
- `backend/app/routes/ai.py:87-90`
- Fallback logic: `backend/app/services/ai_service.py:83-94`

Problem:

Routes store:

```python
model_used="gemini",
openai_fallback=False
```

But `call_ai` can fallback to OpenAI.

Impact:

Stored AI metadata is inaccurate.

Suggested fix:

Return model metadata from `call_ai`, not just text.

### B21. `generate_quiz` silently returns an empty quiz on JSON parse failure

Severity: Low to Medium.

Location:

- `backend/app/services/ai_service.py:121-129`

Problem:

If the provider returns invalid JSON, the function catches `JSONDecodeError` and returns `[]`.

Impact:

The API can return a successful response with no questions, making provider failures look like valid empty quizzes.

Suggested fix:

Return a 502-style error or include an explicit parse failure message.

### B22. `auth.py` contains many unused imports

Severity: Low.

Location:

- `backend/app/routes/auth.py:1-13`

Problem:

`HTTPException`, `AsyncSession`, `select`, `func`, `get_db`, `get_current_admin`, roadmap schemas, and `Resource` are imported but unused.

Impact:

No runtime failure, but lint would flag it once Python linting is added.

Suggested fix:

Remove unused imports.

## Frontend Issues

### F1. Frontend lint command cannot run because ESLint packages are missing

Severity: High for validation.

Locations:

- Script: `frontend/package.json:10`
- Missing dev dependencies: `frontend/package.json:20-29`
- ESLint config references plugins/configs: `frontend/.eslintrc.cjs:4-13`

Problem:

The lint script calls `eslint`, but `eslint` and the configured plugins are not installed.

Missing packages:

- `eslint`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

Impact:

Lint does not inspect any source file. There may be additional lint findings hidden behind this dependency issue.

Suggested fix:

```powershell
cd frontend
npm install -D eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
npm run lint
```

### F2. Google social login sends the wrong token type to the backend

Severity: High.

Frontend locations:

- Google OAuth client: `frontend/src/hooks/useSocialAuth.js:64-89`
- Sends `response.access_token`: `frontend/src/hooks/useSocialAuth.js:73-75`

Backend locations:

- Backend expects Google ID token: `backend/app/routes/auth_register.py:58-69`

Problem:

The frontend uses `google.accounts.oauth2.initTokenClient`, which returns an OAuth access token. It posts that token as:

```js
apiPost('/auth/social', { provider: 'google', token: response.access_token })
```

The backend verifies it using:

```python
client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": data.token})
```

Impact:

Google login is expected to fail because an access token is being validated as an ID token.

Suggested fixes:

Option 1: Frontend should use Google Identity Services ID token flow and send a credential ID token.

Option 2: Backend should treat the incoming value as an access token and call Google userinfo/tokeninfo access-token validation accordingly.

### F3. OAuth callback effect has an empty dependency array

Severity: Low to Medium.

Location:

- `frontend/src/hooks/useSocialAuth.js:19-44`

Problem:

The effect uses `searchParams`, `login`, `navigate`, and `redirectPath` but declares `[]` as dependencies.

Impact:

React hooks lint will flag this once ESLint works. It can also produce stale callback behavior if the hook is reused with a different redirect path.

Suggested fix:

Add the required dependencies or restructure the callback handling.

### F4. API retry logic retries aborted requests and reuses one timeout signal

Severity: Medium.

Location:

- `frontend/src/lib/api.js:20-45`

Problem:

`fetchWithRetry` catches all errors, including `AbortError` and timeout aborts, then waits and retries. It also creates `opts` once before the retry loop, so the same `AbortSignal.timeout` signal is reused for every attempt.

Impact:

User-triggered aborts can be delayed by retry sleeps. After a timeout, later retries may immediately fail because the reused signal is already aborted.

Suggested fix:

Build fetch options inside each retry attempt and do not retry `AbortError`/timeout aborts.

### F5. API error handling assumes `detail` is always a string

Severity: Low.

Locations:

- `frontend/src/lib/api.js:13-15`
- `frontend/src/lib/api.js:98-100`

Problem:

FastAPI validation errors can return structured arrays/objects in `detail`, but the frontend passes `err.detail` directly into `new Error`.

Impact:

Some validation errors may display as `[object Object]` or an unclear message.

Suggested fix:

Normalize non-string error details before throwing.

### F6. `RoadmapGraph` does not sync React Flow state when props change

Severity: Medium.

Locations:

- Initial node state: `frontend/src/components/roadmap/RoadmapGraph.jsx:105-131`
- `useNodesState(initialNodes)`: `frontend/src/components/roadmap/RoadmapGraph.jsx:132`
- `useEdgesState(initialEdges)`: `frontend/src/components/roadmap/RoadmapGraph.jsx:133`

Problem:

`useNodesState` and `useEdgesState` use their initial values only at mount. If `rawNodes`, `rawEdges`, or `category` change while the component stays mounted, the rendered graph can keep old nodes/edges.

Impact:

Navigating between roadmap slugs in the same mounted route, or reloading roadmap data in place, can show a stale graph.

Suggested fix:

Add an effect that calls `setNodes(initialNodes)` and `setEdges(initialEdges)` when those computed values change.

### F7. `AIExplanation` keeps the previous node's explanation after `nodeId` changes

Severity: Medium.

Locations:

- State is local and not reset by `nodeId`: `frontend/src/components/learn/AIExplanation.jsx:5-16`
- Component receives changing node ID: `frontend/src/pages/LearnPage.jsx:184`

Problem:

The component stores `explanation` in state, but does not clear it when `nodeId` changes.

Impact:

If a user generates an explanation for one node and then selects another node, the old explanation remains visible until a new generation is requested.

Suggested fix:

Add:

```js
useEffect(() => {
  setExplanation('')
  setLoading(false)
}, [nodeId])
```

### F8. Learn page swallows progress-load failure

Severity: Low to Medium.

Location:

- `frontend/src/pages/LearnPage.jsx:52-55`

Problem:

The progress request uses:

```js
apiGet(`/progress/${slug}/progress`, { signal }).catch(() => ({ progress: [] }))
```

Impact:

If progress loading fails because of server error or auth problems, the UI silently shows all nodes as pending. That can mislead users into thinking their progress was lost.

Suggested fix:

Only suppress expected "not enrolled" cases, and surface other errors.

### F9. Dashboard and admin page partially swallow API failures

Severity: Low.

Locations:

- Dashboard roadmaps fetch: `frontend/src/pages/DashboardPage.jsx:17-20`
- Admin users/feedback fetches: `frontend/src/pages/AdminPage.jsx:17-19`

Problem:

Some API failures are caught and converted to empty arrays.

Impact:

The UI can display empty data instead of an error when a real backend or authorization problem occurred.

Suggested fix:

Show partial-load errors or only suppress expected empty states.

### F10. Retry handlers create AbortControllers that are never aborted

Severity: Low.

Locations:

- `frontend/src/pages/RoadmapsPage.jsx:104-109`
- `frontend/src/pages/RoadmapDetailPage.jsx:88-93`
- `frontend/src/pages/LearnPage.jsx:138-142`
- `frontend/src/pages/DashboardPage.jsx:47-49`
- `frontend/src/pages/AdminPage.jsx:60-62`

Problem:

Retry handlers create a fresh `AbortController` inline, pass the signal, and discard the controller.

Impact:

If the component unmounts during a retry request, that specific retry cannot be cancelled.

Suggested fix:

Use the same effect-managed cancellation pattern or avoid passing a signal for manual retry.

## Tooling And Type Coverage Gaps

### T1. No TypeScript type-check is available

Severity: Informational.

Details:

The frontend is JavaScript/JSX only. There is no `tsconfig.json`, no TypeScript source files, and no `tsc` script.

Impact:

No static TypeScript type errors can be checked.

### T2. No Python static type checker is configured

Severity: Informational.

Details:

No `mypy` or `pyright` package is installed in the local virtual environment. `pyproject.toml` also does not configure a Python type checker.

Impact:

Python type problems are only catchable by runtime/import/manual review right now.

### T3. No Python linter is configured

Severity: Informational.

Details:

No `ruff` package is installed, and no lint script/tooling is configured for backend code.

Impact:

Issues like unused imports, overly broad exception handling, and style drift are not caught automatically.

### T4. No automated test suite command was found

Severity: Informational.

Details:

The inspected manifests do not define backend or frontend test scripts.

Impact:

Behavioral regressions in auth, progress, migrations, and UI state are not covered by automated tests.

## Checks With No Errors Found

- Frontend production build passes.
- Backend Python files compile.
- Backend imports correctly when launched from `backend`.
- No TypeScript files are present, so there are no TypeScript compiler errors to report.

## Suggested Priority Order

1. Fix migration/model drift for `notes` and `ai_explanations`.
2. Fix Google social auth token mismatch.
3. Fix `.env` path resolution.
4. Install ESLint packages and run lint to expose source-level lint findings.
5. Fix rate-limit identity handling.
6. Add backend request validation enums/bounds.
7. Fix frontend stale state in `RoadmapGraph` and `AIExplanation`.
8. Add backend tests for migrations, auth, progress, content creation, and AI cache behavior.
