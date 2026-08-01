# API Reference

Base URL: `http://localhost:8000/api`

All endpoints return `application/json` unless otherwise noted. Protected endpoints require an `Authorization: Bearer <token>` header.

---

## Table of Contents

- [Conventions](#conventions)
- [Health](#health)
- [Auth](#auth)
- [User Profile](#user-profile)
- [Roadmaps](#roadmaps)
- [Progress](#progress)
- [Content (Notes, Bookmarks, Feedback)](#content-notes-bookmarks-feedback)
- [AI](#ai)
- [Admin](#admin)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Conventions

- **Content-Type:** JSON requests must send `Content-Type: application/json`. All responses are `application/json` unless noted (the only exception is `GET /api/progress/export/{roadmap_ref}?format=csv`, which returns `text/csv`).
- **Authentication:** Protected endpoints accept `Authorization: Bearer <token>`. Tokens are issued by the Auth endpoints.
- **JWT:** Tokens use HS256 (`JWT_ALGORITHM`) and expire after `JWT_EXPIRY_MINUTES` (default 60). Token refresh is **not implemented** — after expiry, re-authenticate via `POST /api/auth/login` or `POST /api/auth/social`.
- **IDs:** All primary keys are UUID strings.
- **Roadmap references:** Routes taking `{roadmap_ref}` or `{slug}` accept either the roadmap slug or its UUID.
- **Pagination:** Paginated endpoints accept `page` (min 1, default 1) and `per_page` (1-100, default 20). They return `{ items, total, page, per_page }`.
- **Errors:** Every error returns a non-2xx status with a JSON body (see [Error Responses](#error-responses)).

---

## Health

### Health Check

```http
GET /api/health
```

**Response: 200 OK**

```json
{
  "status": "ok",
  "app": "PathForge AI"
}
```

---

## Auth

> The `/api/auth/*` prefix is rate-limited to 20 requests per user per day (see [Rate Limiting](#rate-limiting)).

### Register

Creates a new user account.

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "Jane Doe"
}
```

**Body:**

| Field       | Type   | Required | Notes                              |
|-------------|--------|----------|------------------------------------|
| `email`     | string | yes      | Valid email address                |
| `password`  | string | yes      | 6-128 characters                   |
| `full_name` | string | yes      | 1-100 characters                   |

**Response: 201 Created**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "avatar_url": null,
    "bio": null,
    "current_role": null,
    "target_role": null,
    "hours_per_week": 10,
    "experience_level": "beginner",
    "role": "user",
    "is_public": false,
    "streak_days": 0,
    "created_at": "2025-06-01T00:00:00Z"
  }
}
```

**Statuses:** 201 Created; 409 Conflict (email already registered); 422 Validation Error.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Body:** `email`, `password`.

**Response: 200 OK** — same shape as Register.

**Statuses:** 200 OK; 401 Unauthorized (`"Invalid email or password"`); 422 Validation Error.

> JWT tokens expire after the duration set by `JWT_EXPIRY_MINUTES`. Token refresh is not yet implemented — users must re-authenticate after expiry.

### Social Login

```http
POST /api/auth/social
Content-Type: application/json

{
  "provider": "google",
  "token": "<oauth-access-token>"
}
```

**Body:**

| Field      | Type   | Required | Notes                                                                                     |
|------------|--------|----------|-------------------------------------------------------------------------------------------|
| `provider` | string | yes      | `google` or `github`                                                                      |
| `token`    | string | yes      | Google: OAuth access token. GitHub: the authorization `code` (exchanged server-side).     |

For Google, `token` is an OAuth access token obtained via the Google Identity Services client-side flow. For GitHub, `token` is the authorization `code` returned by GitHub OAuth — the backend exchanges it for an access token and fetches the user profile. If no user exists for the provider email, an account is created automatically.

**Response: 200 OK** — same shape as Register.

**Statuses:** 200 OK; 400 Bad Request (unsupported provider, or email could not be retrieved from provider); 401 Unauthorized (invalid provider token); 409 Conflict (email collision during account creation); 500 Internal Server Error (OAuth not configured).

---

## User Profile

### Get Current User

```http
GET /api/me
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "avatar_url": null,
  "bio": null,
  "current_role": null,
  "target_role": null,
  "hours_per_week": 10,
  "experience_level": "beginner",
  "role": "user",
  "is_public": false,
  "streak_days": 0,
  "created_at": "2025-06-01T00:00:00Z"
}
```

### Update Profile

```http
PATCH /api/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Jane Updated",
  "bio": "Learning backend development",
  "experience_level": "intermediate",
  "hours_per_week": 15
}
```

**Body (all optional):**

| Field              | Type   | Notes                                    |
|--------------------|--------|------------------------------------------|
| `full_name`        | string |                                          |
| `bio`              | string |                                          |
| `current_role`     | string |                                          |
| `target_role`      | string |                                          |
| `hours_per_week`   | int    |                                          |
| `experience_level` | string | e.g. `beginner`, `intermediate`          |
| `avatar_url`       | string |                                          |

**Response: 200 OK** — the updated profile (same shape as Get Current User).

---

## Roadmaps

### List Roadmaps

Returns only published roadmaps, ordered by creation date (newest first).

```http
GET /api/roadmaps
```

**Query Parameters:**

| Param        | Type   | Default | Description                     |
|--------------|--------|---------|---------------------------------|
| `category`   | string | —       | Filter by exact category        |
| `difficulty` | string | —       | Filter by difficulty level      |
| `search`     | string | —       | Case-insensitive search in **title only** |

**Response: 200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Frontend Developer",
    "slug": "frontend",
    "description": "Step by step guide to becoming a modern frontend developer in 2026.",
    "category": "role-based",
    "difficulty": "beginner",
    "estimated_hours": 480,
    "cover_image_url": null,
    "is_published": true,
    "created_at": "2025-06-01T00:00:00Z",
    "node_count": 115
  }
]
```

`node_count` is computed live per roadmap.

### Get Roadmap

```http
GET /api/roadmaps/{slug}
```

`{slug}` can be the roadmap slug (e.g., `frontend`) or its UUID. Returns the roadmap, its nodes (ordered by `order_index`), and the dependency edges between them.

**Response: 200 OK**

```json
{
  "roadmap": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Frontend Developer",
    "slug": "frontend",
    "description": "Step by step guide to becoming a modern frontend developer.",
    "category": "role-based",
    "difficulty": "beginner",
    "estimated_hours": 480,
    "cover_image_url": null,
    "is_published": true,
    "created_by": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2025-06-01T00:00:00Z",
    "updated_at": "2025-06-01T00:00:00Z"
  },
  "nodes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "roadmap_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "HTML",
      "description": "HTML content...",
      "why_important": "HTML is the foundation...",
      "category": null,
      "source_node_id": null,
      "node_type": "topic",
      "position_x": 0.0,
      "position_y": 0.0,
      "width": null,
      "height": null,
      "order_index": 1,
      "is_optional": false,
      "difficulty": "beginner",
      "estimated_hours": 2,
      "created_at": "2025-06-01T00:00:00Z"
    }
  ],
  "edges": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002_550e8400-e29b-41d4-a716-446655440003",
      "source": "550e8400-e29b-41d4-a716-446655440002",
      "target": "550e8400-e29b-41d4-a716-446655440003",
      "order_index": 1
    }
  ]
}
```

`edges` only include dependencies where both endpoints belong to the roadmap.

### List Nodes

```http
GET /api/roadmaps/{roadmap_id}/nodes
```

`{roadmap_id}` accepts a slug or UUID. Returns the roadmap's nodes ordered by `order_index`.

**Response: 200 OK** — array of Node objects (same shape as `nodes` above).

### Get Node Detail

```http
GET /api/roadmaps/nodes/{node_id}
Authorization: Bearer <token>  (optional — without auth, status is always "pending" and is_bookmarked is false)
```

Node detail includes progress/bookmark state for the authenticated user plus dependencies, dependents, and resources.

**Response: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "roadmap_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "React",
  "description": "React is a JavaScript library...",
  "why_important": "React is the most widely used...",
  "category": null,
  "source_node_id": null,
  "node_type": "topic",
  "position_x": 0.0,
  "position_y": 0.0,
  "width": null,
  "height": null,
  "order_index": 1,
  "is_optional": false,
  "difficulty": "beginner",
  "estimated_hours": 2,
  "created_at": "2025-06-01T00:00:00Z",
  "status": "in_progress",
  "is_bookmarked": false,
  "dependencies": [
    { "node_id": "550e8400-e29b-41d4-a716-446655440005", "title": "JavaScript" }
  ],
  "dependents": [
    { "node_id": "550e8400-e29b-41d4-a716-446655440006", "title": "Next.js" }
  ],
  "resources": []
}
```

**Statuses:** 200 OK; 400 Bad Request (invalid node UUID); 404 Not Found (node does not exist).

### Get Node Dependencies

```http
GET /api/roadmaps/nodes/{node_id}/dependencies
```

**Response: 200 OK**

```json
{
  "depends_on": [
    { "node_id": "550e8400-e29b-41d4-a716-446655440005", "title": "JavaScript", "id": "550e8400-e29b-41d4-a716-446655440005" }
  ],
  "required_by": [
    { "node_id": "550e8400-e29b-41d4-a716-446655440006", "title": "Next.js", "id": "550e8400-e29b-41d4-a716-446655440006" }
  ]
}
```

`depends_on` lists prerequisites of the node; `required_by` lists nodes that depend on it.

### List Node Resources

```http
GET /api/roadmaps/nodes/{node_id}/resources
```

**Response: 200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "node_id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Official React Docs",
    "url": "https://react.dev",
    "type": "docs",
    "is_free": true,
    "is_recommended": true
  }
]
```

### Create Roadmap (Admin)

```http
POST /api/roadmaps
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Backend Developer",
  "slug": "backend",
  "description": "Step by step guide to backend development.",
  "category": "role-based",
  "difficulty": "beginner",
  "estimated_hours": 400,
  "cover_image_url": null
}
```

**Body:**

| Field              | Type    | Required | Default    |
|--------------------|---------|----------|------------|
| `title`            | string  | yes      |            |
| `slug`             | string  | yes      |            |
| `description`      | string  | yes      |            |
| `category`         | string  | yes      |            |
| `difficulty`       | string  | no       | `beginner` |
| `estimated_hours`  | int     | no       |            |
| `cover_image_url`  | string  | no       |            |

**Response: 201 Created** — `RoadmapRead` with `node_count: 0`.

**Statuses:** 201 Created; 400 Bad Request (slug already exists); 403 Forbidden (not admin); 409 Conflict (concurrent slug collision).

### Update Roadmap (Admin)

```http
PATCH /api/roadmaps/{roadmap_ref}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "Backend Developer 2026",
  "is_published": true
}
```

**Body:** any subset of `title`, `description`, `category`, `difficulty`, `estimated_hours`, `cover_image_url`, `is_published`.

**Response: 200 OK** — `RoadmapRead` (with live `node_count`).

### Delete Roadmap (Admin)

```http
DELETE /api/roadmaps/{roadmap_ref}
Authorization: Bearer <admin-token>
```

**Response: 204 No Content**

### Publish Roadmap (Admin)

```http
PATCH /api/roadmaps/{roadmap_ref}/publish
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "is_published": true }
```

**Body:** `is_published` is optional. If omitted (`null`), the current value is toggled.

**Response: 200 OK**

```json
{ "is_published": true }
```

### Create Node (Admin)

```http
POST /api/roadmaps/{roadmap_ref}/nodes
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "SQL",
  "description": "Structured query language...",
  "why_important": null,
  "category": null,
  "source_node_id": null,
  "node_type": "topic",
  "order_index": 5,
  "is_optional": false,
  "difficulty": "beginner",
  "estimated_hours": 4,
  "position_x": 0.0,
  "position_y": 0.0,
  "width": null,
  "height": null
}
```

**Response: 201 Created** — `NodeRead`.

### Update Node (Admin)

```http
PATCH /api/roadmaps/nodes/{node_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "description": "Updated node description" }
```

**Body:** any subset of the Node fields from Create Node (including `node_type`, `is_optional`, `estimated_hours`, etc.).

**Response: 200 OK** — `NodeRead`.

### Delete Node (Admin)

```http
DELETE /api/roadmaps/nodes/{node_id}
Authorization: Bearer <admin-token>
```

**Response: 204 No Content**

**Statuses:** 204 No Content; 404 Not Found; 409 Conflict (other nodes depend on this node — remove dependencies first).

### Create Resource (Admin)

```http
POST /api/roadmaps/nodes/{node_id}/resources
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "title": "SQL Course",
  "url": "https://example.com/sql",
  "type": "course",
  "is_free": true,
  "is_recommended": false
}
```

**Body:**

| Field            | Type    | Required | Default |
|------------------|---------|----------|---------|
| `title`          | string  | yes      |         |
| `url`            | string  | yes      |         |
| `type`           | string  | yes      |         |
| `is_free`        | bool    | no       | `true`  |
| `is_recommended` | bool    | no       | `false` |

**Response: 201 Created** — `ResourceRead`.

### Delete Resource (Admin)

```http
DELETE /api/roadmaps/resources/{resource_id}
Authorization: Bearer <admin-token>
```

**Response: 204 No Content**

---

## Progress

### Start Roadmap (Enroll)

```http
POST /api/progress/{roadmap_ref}/start
Authorization: Bearer <token>
```

**Response: 201 Created**

```json
{ "message": "Enrolled successfully" }
```

If already enrolled, returns `{ "message": "Already enrolled" }` (still 201).

### Unenroll

```http
DELETE /api/progress/{roadmap_ref}/unenroll
Authorization: Bearer <token>
```

Deletes the enrollment and all node progress for that roadmap.

**Response: 204 No Content**

**Statuses:** 204 No Content; 404 Not Found (not enrolled in this roadmap).

### Get Roadmap Progress

```http
GET /api/progress/{roadmap_ref}/progress
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "progress": [
    { "node_id": "550e8400-e29b-41d4-a716-446655440002", "status": "done", "updated_at": "2025-06-15T10:00:00Z" },
    { "node_id": "550e8400-e29b-41d4-a716-446655440003", "status": "in_progress", "updated_at": "2025-06-15T11:00:00Z" }
  ]
}
```

### Update Node Status

```http
PATCH /api/progress/node/{node_id}
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "done" }
```

**Valid statuses:** `pending`, `in_progress`, `done`, `skipped`

Setting a node to `done` requires all of its prerequisites to be `done` first.

**Response: 200 OK**

```json
{
  "status": "done",
  "completion_pct": 42.5,
  "node_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

`completion_pct` is the updated roadmap-wide completion percentage. When it reaches 100 the roadmap is marked completed.

**Statuses:** 200 OK; 400 Bad Request (`"Complete all prerequisites first"`, or invalid status); 404 Not Found (node does not exist).

### Dashboard Summary

```http
GET /api/progress/dashboard/summary
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "active_roadmaps": 3,
  "total_nodes_completed": 42,
  "streak_days": 5,
  "recent_activity": []
}
```

### My Roadmaps

```http
GET /api/progress/my-roadmaps
Authorization: Bearer <token>
```

Supports pagination query params: `page` (default 1) and `per_page` (default 20). Ordered by enrollment date (newest first).

**Response: 200 OK**

```json
{
  "items": [
    {
      "roadmap": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Frontend Developer",
        "slug": "frontend",
        "category": "role-based",
        "cover_image_url": null
      },
      "started_at": "2025-06-10T00:00:00Z",
      "completion_pct": 50.0,
      "is_pinned": false
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

> All paginated endpoints return the same shape: `{ items: [...], total: number, page: number, per_page: number }`.

### Export Progress

```http
GET /api/progress/export/{roadmap_ref}?format=json
Authorization: Bearer <token>
```

**Query Parameters:**

| Param    | Type   | Default | Notes                  |
|----------|--------|---------|------------------------|
| `format` | string | `json`  | `json` or `csv`       |

**JSON response: 200 OK**

```json
{
  "roadmap": "Frontend Developer",
  "slug": "frontend",
  "total_nodes": 115,
  "completed": 58,
  "progress": [
    {
      "title": "HTML",
      "category": "Frontend Basics",
      "difficulty": "beginner",
      "estimated_hours": 2,
      "status": "done"
    }
  ]
}
```

**CSV response: 200 OK** — `text/csv` attachment (`{slug}_progress.csv`) with columns `title, category, difficulty, estimated_hours, status`.

---

## Content (Notes, Bookmarks, Feedback)

### Toggle Bookmark

```http
POST /api/content/nodes/{node_id}/bookmark
Authorization: Bearer <token>
```

Adds the bookmark if absent, removes it if present.

**Response: 200 OK**

```json
{ "is_bookmarked": true }
```

**Statuses:** 200 OK; 404 Not Found (node does not exist).

### List Notes

```http
GET /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
```

Returns the current user's note for this node (a user can have at most one note per node).

**Response: 200 OK**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "node_id": "550e8400-e29b-41d4-a716-446655440002",
    "content": "My learning notes about this topic",
    "created_at": "2025-06-15T10:00:00Z",
    "updated_at": "2025-06-15T11:00:00Z"
  }
]
```

### Create Note

```http
POST /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "My learning notes about this topic" }
```

**Response: 201 Created** — `NoteRead`.

**Statuses:** 201 Created; 404 Not Found (node does not exist).

### Update Note

```http
PUT /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "Updated notes" }
```

**Response: 200 OK** — `NoteRead`.

**Statuses:** 200 OK; 404 Not Found (note does not exist).

### Delete Note

```http
DELETE /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
```

**Response: 204 No Content**

**Statuses:** 204 No Content; 404 Not Found (note does not exist).

### Submit Feedback

```http
POST /api/content/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great platform!",
  "type": "general",
  "node_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Body:**

| Field     | Type   | Required | Default    | Notes                          |
|-----------|--------|----------|------------|--------------------------------|
| `content` | string | yes      |            |                                |
| `type`    | string | no       | `general`  |                                |
| `node_id` | UUID   | no       |            | Must reference an existing node |

**Response: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "node_id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "general",
  "content": "Great platform!",
  "status": "open",
  "created_at": "2025-06-15T10:00:00Z"
}
```

**Statuses:** 201 Created; 404 Not Found (node does not exist).

### List My Feedback

```http
GET /api/content/feedback
Authorization: Bearer <token>
```

Supports pagination. Returns the current user's feedback, newest first.

**Response: 200 OK**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "node_id": null,
      "type": "general",
      "content": "Great platform!",
      "status": "open",
      "created_at": "2025-06-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

---

## AI

> All AI endpoints require authentication. They use `GEMINI_API_KEY` (primary) or `OPENAI_API_KEY` (primary or fallback) from `.env`.
>
> The `/api/ai/*` prefix is rate-limited (see [Rate Limiting](#rate-limiting)). Explain/simplify responses are cached — subsequent identical requests return `"cached": true` without calling the AI provider.

### Explain Topic

```http
POST /api/ai/explain-node
Authorization: Bearer <token>
Content-Type: application/json

{ "node_id": "550e8400-e29b-41d4-a716-446655440002" }
```

**Body:** `node_id` (UUID).

**Response: 200 OK**

```json
{
  "explanation": "React is a JavaScript library for building user interfaces...",
  "cached": false
}
```

Cached per node per experience level (e.g. `explain_beginner`, `explain_intermediate`).

### Simplify Topic

```http
POST /api/ai/simplify-node
Authorization: Bearer <token>
Content-Type: application/json

{ "node_id": "550e8400-e29b-41d4-a716-446655440002" }
```

**Response: 200 OK** — same shape as Explain, with a beginner-friendly explanation (cached per node, key `simplify`).

### Generate Quiz

```http
POST /api/ai/generate-quiz
Authorization: Bearer <token>
Content-Type: application/json

{
  "node_id": "550e8400-e29b-41d4-a716-446655440002",
  "count": 5
}
```

**Body:**

| Field     | Type | Required | Default | Notes               |
|-----------|------|----------|---------|---------------------|
| `node_id` | UUID | yes      |         |                     |
| `count`   | int  | no       | 5       | 1-20                |

**Response: 200 OK**

```json
{
  "questions": [
    {
      "question": "What is a React component?",
      "options": ["A: A function", "B: A class", "C: Both A and B", "D: None"],
      "correct": "C",
      "explanation": "Components can be functions or classes..."
    }
  ]
}
```

**Statuses:** 200 OK; 404 Not Found (node does not exist); 502 Bad Gateway (AI returned an invalid quiz response).

### Suggest Projects

```http
POST /api/ai/suggest-projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "roadmap_id": "550e8400-e29b-41d4-a716-446655440000",
  "completed_node_ids": ["550e8400-e29b-41d4-a716-446655440002"]
}
```

**Body:**

| Field                | Type      | Required | Notes                    |
|----------------------|-----------|----------|--------------------------|
| `roadmap_id`         | UUID      | yes      |                          |
| `completed_node_ids` | UUID list | yes      | Topics used to tailor suggestions |

**Response: 200 OK** — `projects` is an object describing the AI result (`text` contains the project suggestions).

```json
{
  "projects": {
    "text": "1. **Todo App** - ...\n2. **Blog Platform** - ...\n3. **E-commerce** - ...",
    "model_used": "gemini",
    "openai_fallback": false
  }
}
```

**Statuses:** 200 OK; 404 Not Found (roadmap does not exist).

### Weekly Learning Plan

```http
POST /api/ai/weekly-plan
Authorization: Bearer <token>
Content-Type: application/json

{
  "roadmap_id": "550e8400-e29b-41d4-a716-446655440000",
  "hours_available": 10
}
```

**Body:**

| Field             | Type | Required | Default | Notes              |
|-------------------|------|----------|---------|--------------------|
| `roadmap_id`      | UUID | yes      |         |                    |
| `hours_available` | int  | no       | 10      | 1-168              |

The plan is built from the roadmap's nodes, excluding those the user has already completed.

**Response: 200 OK** — `plan` is an object describing the AI result (`text` contains the 7-day plan).

```json
{
  "plan": {
    "text": "Day 1: Review JavaScript basics (2h)\nDay 2: ...",
    "model_used": "gemini",
    "openai_fallback": false
  }
}
```

**Statuses:** 200 OK; 404 Not Found (roadmap does not exist).

---

## Admin

> All admin endpoints require a token whose role is `admin` or `super_admin`. Role changes additionally require `super_admin`.

### Platform Stats

```http
GET /api/admin/stats
Authorization: Bearer <admin-token>
```

**Response: 200 OK**

```json
{
  "total_users": 42,
  "total_roadmaps": 87,
  "published_roadmaps": 87,
  "total_nodes": 9444,
  "open_feedback": 3
}
```

All values are live database counts.

### List Users

```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

Supports pagination. Ordered by creation date (newest first).

**Response: 200 OK**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Jane Doe",
      "role": "user",
      "experience_level": "beginner",
      "streak_days": 0,
      "created_at": "2025-06-01T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

### Change User Role (Super Admin)

```http
PATCH /api/admin/users/{user_id}/role
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{ "role": "admin" }
```

**Valid roles:** `user`, `admin`, `super_admin`

**Response: 200 OK**

```json
{ "success": true, "new_role": "admin" }
```

**Statuses:** 200 OK; 400 Bad Request (invalid role); 403 Forbidden (requires `super_admin`); 404 Not Found (user does not exist).

### List Feedback (Admin)

```http
GET /api/admin/feedback
Authorization: Bearer <admin-token>
```

Supports pagination. Returns all users' feedback, newest first.

**Response: 200 OK**

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "node_id": null,
      "type": "general",
      "content": "Great platform!",
      "status": "open",
      "created_at": "2025-06-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

### Update Feedback Status

```http
PATCH /api/admin/feedback/{feedback_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "status": "resolved" }
```

**Valid statuses:** `open`, `resolved`, `dismissed`

**Response: 200 OK**

```json
{ "success": true }
```

**Statuses:** 200 OK; 400 Bad Request (invalid status); 404 Not Found (feedback does not exist).

---

## Error Responses

All errors return a non-2xx status code and a JSON body. The primary message is always in `detail`; handlers also include `status_code` and a `request_id` (the request correlation id set by the logging middleware). Validation errors (422) additionally include an `errors` array.

```json
{
  "detail": "Human-readable error message",
  "status_code": 404,
  "request_id": "5b8d4c8a-...-9d3e2f1a0b4c"
}
```

```json
{
  "detail": "Validation error",
  "errors": [{ "loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error" }],
  "status_code": 422,
  "request_id": "5b8d4c8a-...-9d3e2f1a0b4c"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — invalid input or precondition |
| 401 | Unauthorized — missing, invalid, or expired token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — duplicate email/slug, dependency conflict |
| 422 | Unprocessable Entity — request validation error |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — unexpected failure |
| 502 | Bad Gateway — AI provider returned invalid output |

---

## Rate Limiting

Rate limiting applies only to the `/api/auth/*` and `/api/ai/*` prefixes. The limit key is compound: `{user_id}:{prefix}` where `prefix` is `auth` or `ai`, and `user_id` is the JWT `sub` claim. Requests without a valid token fall back to `anonymous`. The window is a rolling 24 hours.

| Endpoint Group | Identity | Limit | Window |
|----------------|----------|-------|--------|
| `/api/auth/*` | per user | 20 requests | rolling 24h |
| `/api/ai/*` | anonymous | 5 requests/day (`AI_CALLS_PER_DAY_FREE`) | rolling 24h |
| `/api/ai/*` | authenticated | 20 requests/day (`AI_CALLS_PER_DAY_REGISTERED`) | rolling 24h |

The config also defines `AI_CALLS_PER_DAY_PREMIUM` (999) for a future premium tier; it is not applied by the current middleware.

When a limit is exceeded the endpoint returns **429 Too Many Requests** with `{ "detail": "Rate limit exceeded" }` (plus `status_code` and `request_id` fields).
