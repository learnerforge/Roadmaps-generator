# API Reference

Base URL: `http://localhost:8000/api`

All endpoints return `application/json` unless noted. Protected endpoints require `Authorization: Bearer <token>` header.

---

## Table of Contents

- [Auth](#auth)
- [User Profile](#user-profile)
- [Roadmaps](#roadmaps)
- [Progress](#progress)
- [Content (Notes, Bookmarks, Feedback)](#content-notes-bookmarks-feedback)
- [AI](#ai)
- [Admin](#admin)

---

## Auth

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "full_name": "Jane Doe"
}
```

**Response: 201 Created**

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "role": "user"
  }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response: 200 OK** (same shape as Register)

> JWT tokens expire after the duration set by JWT_EXPIRY_MINUTES. Token refresh is not yet implemented — users must re-authenticate after expiry.

### Social Login

```http
POST /api/auth/social
Content-Type: application/json

{
  "provider": "google",
  "token": "<oauth-access-token>"
}
```

For Google login, `token` is an OAuth access token obtained via the Google Identity Services client-side flow. For GitHub login, `token` is the authorization `code` returned by GitHub OAuth — the backend exchanges it for an access token.

**Response: 200 OK** (same shape as Register)

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

**Response: 200 OK** (updated profile)

---

## Roadmaps

### List Roadmaps

```http
GET /api/roadmaps
```

**Query Parameters:**

| Param      | Type   | Default | Description                        |
|------------|--------|---------|------------------------------------|
| `category` | string | —       | Filter by category                 |
| `difficulty`| string | —      | Filter by difficulty level         |
| `search`   | string | —       | Search in title and description    |

**Response: 200 OK**

```json
[
  {
    "id": "uuid",
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

### Get Roadmap

```http
GET /api/roadmaps/{slug}
```

`slug` can be the roadmap slug (e.g., `frontend`) or UUID.

**Response: 200 OK**

```json
{
  "roadmap": { "id": "uuid", "title": "Frontend Developer", ... },
  "nodes": [
    {
      "id": "uuid",
      "roadmap_id": "uuid",
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
      "id": "uuid_uuid",
      "source": "uuid",
      "target": "uuid",
      "order_index": 1
    }
  ]
}
```

### List Nodes

```http
GET /api/roadmaps/{roadmap_id}/nodes
```

**Response: 200 OK** — array of node objects (same shape as Node above).

### Get Node Detail

```http
GET /api/roadmaps/nodes/{nodeId}
Authorization: Bearer <token>  (optional — returns public data without auth)
```

**Response: 200 OK**

```json
{
  "id": "uuid",
  "roadmap_id": "uuid",
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
  "dependencies": [{ "node_id": "uuid", "title": "JavaScript" }],
  "dependents": [{ "node_id": "uuid", "title": "Next.js" }],
  "status": "in_progress",
  "is_bookmarked": false,
  "resources": []
}
```

---

## Progress

### Start Roadmap

```http
POST /api/progress/{slug}/start
Authorization: Bearer <token>
```

**Response: 201 Created**

```json
{ "message": "Enrolled successfully" }
```

If already enrolled, returns `{ "message": "Already enrolled" }`.

### Unenroll

```http
DELETE /api/progress/{slug}/unenroll
Authorization: Bearer <token>
```

**Response: 204 No Content**

### Get Roadmap Progress

```http
GET /api/progress/{slug}/progress
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{
  "progress": [
    { "node_id": "uuid", "status": "done", "updated_at": "2025-06-15T10:00:00Z" },
    { "node_id": "uuid", "status": "in_progress", "updated_at": "2025-06-15T11:00:00Z" }
  ]
}
```

### Update Node Status

```http
PATCH /api/progress/node/{nodeId}
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "done" }
```

**Valid statuses:** `pending`, `in_progress`, `done`, `skipped`

**Response: 200 OK**

```json
{
  "status": "done",
  "completion_pct": 42.5,
  "node_id": "uuid"
}
```

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

Supports pagination query params: `page` (default 1) and `per_page` (default 20).

**Response: 200 OK**

```json
{
  "items": [
    {
      "roadmap": {
        "id": "uuid",
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

---

## Content (Notes, Bookmarks, Feedback)

### Toggle Bookmark

```http
POST /api/content/nodes/{node_id}/bookmark
Authorization: Bearer <token>
```

**Response: 200 OK**

```json
{ "is_bookmarked": true }
```

### List Notes

```http
GET /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
```

**Response: 200 OK** — array of note objects

### Create Note

```http
POST /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "My learning notes about this topic" }
```

**Response: 201 Created**

### Update Note

```http
PUT /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "Updated notes" }
```

**Response: 200 OK**

### Delete Note

```http
DELETE /api/content/nodes/{node_id}/notes
Authorization: Bearer <token>
```

**Response: 204 No Content**

### Submit Feedback

```http
POST /api/content/feedback
Authorization: Bearer <token>
Content-Type: application/json

{ "content": "Great platform!", "type": "general", "node_id": "optional-uuid" }
```

**Response: 201 Created**

### List My Feedback

```http
GET /api/content/feedback
Authorization: Bearer <token>
```

**Response: 200 OK** — paginated list of feedback items

---

## AI

> All AI endpoints require a valid API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`) in `.env`.

### Explain Topic

```http
POST /api/ai/explain-node
Authorization: Bearer <token>
Content-Type: application/json

{ "node_id": "uuid" }
```

**Response: 200 OK**

```json
{
  "explanation": "React is a JavaScript library for building user interfaces...",
  "cached": false
}
```

Responses are cached per node per experience level — subsequent identical requests return `"cached": true`.

### Simplify Topic

```http
POST /api/ai/simplify-node
Authorization: Bearer <token>
Content-Type: application/json

{ "node_id": "uuid" }
```

**Response: 200 OK** — same shape as Explain, with beginner-friendly explanation.

### Generate Quiz

```http
POST /api/ai/generate-quiz
Authorization: Bearer <token>
Content-Type: application/json

{
  "node_id": "uuid",
  "count": 5
}
```

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

### Suggest Projects

```http
POST /api/ai/suggest-projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "roadmap_id": "uuid",
  "completed_node_ids": ["uuid1", "uuid2"]
}
```

**Response: 200 OK**

```json
{
  "projects": "1. **Todo App** — ...\n2. **Blog Platform** — ...\n3. **E-commerce** — ..."
}
```

### Weekly Learning Plan

```http
POST /api/ai/weekly-plan
Authorization: Bearer <token>
Content-Type: application/json

{
  "roadmap_id": "uuid",
  "hours_available": 10
}
```

**Response: 200 OK**

```json
{
  "plan": "Day 1: Review JavaScript basics (2h)\nDay 2: ..."
}
```

---

## Admin

> All admin endpoints require `role: admin` or `role: super_admin`.

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
  "total_nodes": 9635,
  "open_feedback": 3
}
```

All values are live database counts.

### List Users

```http
GET /api/admin/users
Authorization: Bearer <admin-token>
```

**Response: 200 OK** — paginated list of user profiles

### Change User Role

```http
PATCH /api/admin/users/{user_id}/role
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{ "role": "admin" }
```

**Valid roles:** `user`, `admin`, `super_admin`

**Response: 200 OK**

### List Feedback (Admin)

```http
GET /api/admin/feedback
Authorization: Bearer <admin-token>
```

**Response: 200 OK** — paginated list of all feedback items

### Update Feedback Status

```http
PATCH /api/admin/feedback/{feedback_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "status": "resolved" }
```

**Valid statuses:** `open`, `resolved`, `dismissed`

**Response: 200 OK**

---

## Error Responses

All errors follow a consistent format:

```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — duplicate email, dependency conflict |
| 422 | Unprocessable Entity — validation error |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — unexpected failure |

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| `/api/auth/*` | 20 requests | per user per day |
| `/api/ai/*` (unauthenticated) | 5 requests | per user per day |
| `/api/ai/*` (authenticated) | 20 requests | per user per day |

Rate limits are per-user (identified by JWT). Unauthenticated requests fall back to IP-based identification. The AI rate limit configuration also includes a `AI_CALLS_PER_DAY_PREMIUM` setting (999) for future tiered access.
