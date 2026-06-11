# Project Error Report

Checked on: 2026-06-11 19:51:43 +05:30

## Summary

The production frontend build and Python syntax compilation pass. Two project issues were found:

1. The frontend lint command is configured but cannot run because ESLint and its configured plugins are not installed.
2. The backend app import fails when launched from the repository root because `backend/app/core/config.py` loads `.env` relative to the current working directory, not relative to the backend folder.

No TypeScript type-check was run because this frontend is JavaScript/JSX only and has no `tsconfig.json` or `tsc` script.

## Checks Run

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

Relevant output:

```text
vite v6.4.2 building for production...
224 modules transformed.
built in 1.41s
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

Result: Failed before linting source files.

Output:

```text
> pathforge-frontend@1.0.0 lint
> eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0

'eslint' is not recognized as an internal or external command,
operable program or batch file.
```

### Frontend lint dependency verification

Command:

```powershell
npm ls eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Working directory:

```text
frontend
```

Result: Failed because none of the requested lint packages are installed.

Output:

```text
pathforge-frontend@1.0.0 E:\GitHub Projects\Roadmaps generator\frontend
`-- (empty)
```

### Backend Python compilation

Command:

```powershell
.\.venv\Scripts\python.exe -m compileall backend
```

Working directory:

```text
E:\GitHub Projects\Roadmaps generator
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
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "E:\GitHub Projects\Roadmaps generator\backend\app\main.py", line 8, in <module>
    from app.db.session import init_db
  File "E:\GitHub Projects\Roadmaps generator\backend\app\db\session.py", line 5, in <module>
    settings = get_settings()
               ^^^^^^^^^^^^^^
  File "E:\GitHub Projects\Roadmaps generator\backend\app\core\config.py", line 61, in get_settings
    s.validate_startup()
  File "E:\GitHub Projects\Roadmaps generator\backend\app\core\config.py", line 55, in validate_startup
    raise ValueError("\n".join(errors))
ValueError: JWT_SECRET must be at least 32 characters. Set a strong random value in .env
```

### Python static/type/lint tool availability

Command:

```powershell
.\.venv\Scripts\python.exe -m pip show mypy pyright ruff
```

Working directory:

```text
E:\GitHub Projects\Roadmaps generator
```

Result: No Python type/lint tools are installed in the local virtual environment.

Output:

```text
WARNING: Package(s) not found: mypy, pyright, ruff
```

## Issues

### 1. Frontend lint command cannot run because ESLint packages are missing

Severity: High for project validation, low for runtime.

Files involved:

- `frontend/package.json`
- `frontend/.eslintrc.cjs`

Details:

`frontend/package.json` defines this script:

```json
"lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
```

However, `eslint` is not present in `frontend/package.json` dependencies or devDependencies, and it is not installed in `frontend/node_modules`.

The ESLint config also references plugins/configs that are not installed:

```js
extends: [
  'eslint:recommended',
  'plugin:react/recommended',
  'plugin:react/jsx-runtime',
  'plugin:react-hooks/recommended',
],
plugins: ['react-refresh'],
```

Missing packages identified:

- `eslint`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

Impact:

The configured lint command exits immediately, so JavaScript/JSX lint errors cannot currently be detected. Because the command never reaches source analysis, there may be additional source-level lint issues hidden behind this dependency problem.

Suggested fix:

Install and save the missing dev dependencies:

```powershell
cd frontend
npm install -D eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Then rerun:

```powershell
npm run lint
```

### 2. Backend import fails from repository root because `.env` is resolved from the current working directory

Severity: Medium.

Files involved:

- `backend/app/core/config.py`
- `backend/app/db/session.py`
- `backend/app/main.py`

Details:

`backend/app/core/config.py` uses:

```python
model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

That path is relative to the process working directory. When the backend is imported or launched from the `backend` directory, it finds `backend/.env` and startup validation passes. When the backend is imported from the repository root, it looks for `E:\GitHub Projects\Roadmaps generator\.env`, does not find the backend environment file, falls back to the default empty `JWT_SECRET`, and raises:

```text
ValueError: JWT_SECRET must be at least 32 characters. Set a strong random value in .env
```

Impact:

Backend startup behavior depends on where the process is launched from. Commands run from the repository root can fail even though the backend configuration in `backend/.env` is valid.

Suggested fixes:

Option 1: Always launch backend commands from `backend`.

Option 2: Make the env file path absolute relative to `config.py`, for example:

```python
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

model_config = SettingsConfigDict(
    env_file=BASE_DIR / ".env",
    env_file_encoding="utf-8",
)
```

This would make settings load `backend/.env` consistently regardless of the current working directory.

## Checks With No Errors Found

- `npm run build` in `frontend` completed successfully.
- Python syntax compilation with `compileall backend` completed successfully.
- Backend app import from the `backend` working directory completed successfully.

## Not Checked

- TypeScript type-checking: not applicable because the project has no TypeScript files, no `tsconfig.json`, and no `tsc` script.
- Python static type-checking: no configured or installed Python type checker was found.
- Python linting: no configured or installed Python linter was found.
- Full runtime/API tests: no test suite command was found in the inspected project manifests.
