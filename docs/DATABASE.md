# Database

The application uses PostgreSQL (asyncpg via SQLAlchemy 2.x async ORM). The schema is defined by 13 models in `backend/app/models/` and applied through Alembic migrations in `backend/alembic/versions/` (`001` initial schema, `002` adds `ai_explanations.openai_fallback` and `notes.created_at`, `003` adds `node_dependencies.order_index`).

The schema is split into three logical groups:

- **Catalog** — the roadmap content tree: `roadmaps`, `roadmap_nodes`, `node_dependencies`.
- **Users & personalization** — `profiles`, `user_roadmaps`, `user_node_progress`, `notes`, `bookmarks`.
- **AI, assessment & moderation** — `ai_explanations`, `quizzes`, `quiz_attempts`, `resources`, `feedback`.

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles o|--o{ roadmaps : authors
    profiles ||--o{ user_roadmaps : enrolls
    profiles ||--o{ user_node_progress : progresses
    profiles ||--o{ notes : writes
    profiles ||--o{ bookmarks : creates
    profiles ||--o{ feedback : submits
    profiles ||--o{ quiz_attempts : takes
    roadmaps ||--o{ roadmap_nodes : contains
    roadmaps ||--o{ user_roadmaps : tracked
    roadmaps ||--o{ user_node_progress : tracks
    roadmap_nodes ||--o{ node_dependencies : depends-on
    roadmap_nodes ||--o{ node_dependencies : prerequisite-for
    roadmap_nodes ||--o{ user_node_progress : tracked
    roadmap_nodes ||--o{ resources : has
    roadmap_nodes ||--o{ ai_explanations : cached
    roadmap_nodes ||--o{ notes : has
    roadmap_nodes ||--o{ bookmarks : bookmarked
    roadmap_nodes ||--o{ quizzes : tested-by
    roadmap_nodes ||--o{ quiz_attempts : targets
    roadmap_nodes ||--o{ feedback : referenced-by

    profiles {
        uuid id PK
        string email UK "nullable"
        string password_hash "nullable"
        string full_name
        text avatar_url "nullable"
        text bio "nullable"
        string current_role "nullable"
        string target_role "nullable"
        smallint hours_per_week "default 10"
        string experience_level "default beginner"
        string role "user | admin | super_admin"
        boolean is_public "default false"
        int streak_days "default 0"
        datetime last_active_at "nullable"
        datetime created_at
        datetime updated_at
    }

    roadmaps {
        uuid id PK
        string title
        string slug UK "indexed"
        text description
        string category
        string difficulty "beginner | intermediate | advanced"
        int estimated_hours "nullable"
        text cover_image_url "nullable"
        boolean is_published "default false"
        uuid created_by FK "profiles.id, ondelete SET NULL"
        datetime created_at
        datetime updated_at
    }

    roadmap_nodes {
        uuid id PK
        uuid roadmap_id FK "roadmaps.id, ondelete CASCADE"
        string source_node_id "content path or upstream id"
        string node_type "default topic"
        string title
        text description "nullable"
        text why_important "nullable"
        string category "nullable"
        float position_x "default 0"
        float position_y "default 0"
        int order_index "default 0"
        float width "nullable"
        float height "nullable"
        boolean is_optional "default false"
        string difficulty "default beginner"
        smallint estimated_hours "default 2"
        datetime created_at
    }

    node_dependencies {
        uuid node_id PK FK "roadmap_nodes.id, ondelete CASCADE"
        uuid depends_on_node_id PK FK "roadmap_nodes.id, ondelete CASCADE"
        int order_index "default 0"
    }

    user_roadmaps {
        uuid user_id PK FK "profiles.id, ondelete CASCADE"
        uuid roadmap_id PK FK "roadmaps.id, ondelete CASCADE"
        datetime started_at
        datetime completed_at "nullable"
        float completion_pct "default 0.0"
        boolean is_pinned "default false"
    }

    user_node_progress {
        uuid id PK
        uuid user_id FK "profiles.id, ondelete CASCADE"
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        uuid roadmap_id FK "roadmaps.id, ondelete CASCADE"
        string status "pending | in_progress | done | skipped"
        datetime updated_at
    }

    resources {
        uuid id PK
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        string title
        text url
        string type
        boolean is_free "default true"
        boolean is_recommended "default false"
        datetime created_at
    }

    notes {
        uuid id PK
        uuid user_id FK "profiles.id, ondelete CASCADE"
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        text content
        datetime created_at
        datetime updated_at
    }

    bookmarks {
        uuid user_id PK FK "profiles.id, ondelete CASCADE"
        uuid node_id PK FK "roadmap_nodes.id, ondelete CASCADE"
        datetime created_at
    }

    ai_explanations {
        uuid id PK
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        string prompt_type
        text response_text
        string model_used
        boolean openai_fallback "default false"
        datetime created_at
    }

    quizzes {
        uuid id PK
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        text question
        jsonb options
        string correct_answer
        text explanation "nullable"
        datetime created_at
    }

    quiz_attempts {
        uuid id PK
        uuid user_id FK "profiles.id, ondelete CASCADE"
        uuid node_id FK "roadmap_nodes.id, ondelete CASCADE"
        int score
        jsonb answers "nullable"
        datetime taken_at
    }

    feedback {
        uuid id PK
        uuid user_id FK "profiles.id, ondelete CASCADE"
        uuid node_id FK "roadmap_nodes.id, ondelete SET NULL"
        string type "default general"
        text content
        string status "open | resolved | dismissed"
        datetime created_at
    }
```

Every foreign key declares an `ondelete` action. Owned resources (nodes, progress, notes, bookmarks, attempts, etc.) cascade on parent deletion; optional references set null (`roadmaps.created_by`, `feedback.node_id`). There is no direct FK from `quizzes` to `roadmaps` — quizzes hang off `roadmap_nodes` (which belongs to a roadmap), so "roadmap's quizzes" is a transitive join through `roadmaps → roadmap_nodes → quizzes`.

## Table-by-table reference

### profiles

User accounts. Seeded with a single admin at startup; identity and personalization data live here.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| email | String(255) | Unique, indexed, nullable |
| password_hash | String(255) | Nullable |
| full_name | String(100) | Not null |
| avatar_url | Text | Nullable |
| bio | Text | Nullable |
| current_role | String(100) | Nullable |
| target_role | String(100) | Nullable |
| hours_per_week | SmallInteger | Default 10 |
| experience_level | String(20) | Default `beginner` |
| role | String(20) | Default `user`; values `user` \| `admin` \| `super_admin` |
| is_public | Boolean | Default `false` |
| streak_days | Integer | Default 0 |
| last_active_at | DateTime(tz) | Nullable |
| created_at | DateTime(tz) | Server default `now()` |
| updated_at | DateTime(tz) | Server default `now()`, onupdate |

Uniques: `email`. Indexes: `email`.

### roadmaps

A roadmap (e.g. "Frontend Developer", "Docker"). All rows in this table come from the seed pipeline; no user-created roadmaps exist yet.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| title | String(150) | Not null |
| slug | String(100) | Unique, indexed, not null |
| description | Text | Not null |
| category | String(50) | Not null, e.g. `role-based`, `skill-based`, `languages`, `frameworks`, `devops` |
| difficulty | String(20) | Default `beginner` |
| estimated_hours | Integer | Nullable; seeded as `nodes × 4` |
| cover_image_url | Text | Nullable |
| is_published | Boolean | Default `false`; seeded `true` |
| created_by | UUID | FK → `profiles.id`, **ondelete SET NULL**, nullable |
| created_at | DateTime(tz) | Server default `now()` |
| updated_at | DateTime(tz) | Server default `now()`, onupdate |

Uniques: `slug`. Indexes: `slug`.

### roadmap_nodes

A single topic node inside a roadmap. Seeded as a flat, ordered list of topics (see Seeding); no hierarchy or grouping is stored.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| roadmap_id | UUID | FK → `roadmaps.id`, **ondelete CASCADE**, not null, indexed |
| source_node_id | String(100) | Nullable, indexed; the upstream content file path (markdown) or JSON node id |
| node_type | String(20) | Default `topic` |
| title | String(150) | Not null, title-cased label |
| description | Text | Nullable; loaded from `content_body_cache.json` |
| why_important | Text | Nullable; generated by `generate_why_important()` |
| category | String(100) | Nullable; seeded `null` |
| position_x | Float | Default 0; grid layout for markdown fallback, or JSON position |
| position_y | Float | Default 0 |
| order_index | Integer | Not null, default 0; position in the roadmap's linear chain |
| width | Float | Nullable |
| height | Float | Nullable |
| is_optional | Boolean | Default `false` |
| difficulty | String(20) | Default `beginner` |
| estimated_hours | SmallInteger | Default 2 |
| created_at | DateTime(tz) | Server default `now()` |

Indexes: `roadmap_id`, `source_node_id`.

### node_dependencies

Adjacency list for roadmap ordering. One row per edge: `node_id` depends on `depends_on_node_id`. The composite PK is `(node_id, depends_on_node_id)`.

| Column | Type | Notes |
|---|---|---|
| node_id | UUID | PK, FK → `roadmap_nodes.id`, **ondelete CASCADE** |
| depends_on_node_id | UUID | PK, FK → `roadmap_nodes.id`, **ondelete CASCADE** |
| order_index | Integer | Not null, default 0; sequential edge order (1..n-1), added by migration `003` |

Both FKs reference `roadmap_nodes.id` (self-referential). Seeding produces a single linear chain per roadmap.

### user_roadmaps

Enrollment of a user in a roadmap. Composite PK `(user_id, roadmap_id)`; one row per user/roadmap pair.

| Column | Type | Notes |
|---|---|---|
| user_id | UUID | PK, FK → `profiles.id`, **ondelete CASCADE** |
| roadmap_id | UUID | PK, FK → `roadmaps.id`, **ondelete CASCADE** |
| started_at | DateTime(tz) | Server default `now()` |
| completed_at | DateTime(tz) | Nullable |
| completion_pct | Float | Default 0.0 |
| is_pinned | Boolean | Default `false` |

### user_node_progress

Per-user per-node status. Unlike `user_roadmaps`, it has a surrogate PK plus a unique constraint on `(user_id, node_id)`.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| user_id | UUID | FK → `profiles.id`, **ondelete CASCADE**, not null, indexed |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| roadmap_id | UUID | FK → `roadmaps.id`, **ondelete CASCADE**, not null, indexed |
| status | String(20) | Not null, default `pending`; values `pending` \| `in_progress` \| `done` \| `skipped` |
| updated_at | DateTime(tz) | Server default `now()`, onupdate |

Uniques: `(user_id, node_id)` named `uq_user_node`. Indexes: `user_id`, `node_id`, `roadmap_id`.

### notes

User note attached to a node. One note per user/node (`uq_user_note_node`).

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| user_id | UUID | FK → `profiles.id`, **ondelete CASCADE**, not null, indexed |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| content | Text | Not null |
| created_at | DateTime(tz) | Server default `now()`; added by migration `002` |
| updated_at | DateTime(tz) | Server default `now()`, onupdate |

Uniques: `(user_id, node_id)` named `uq_user_note_node`. Indexes: `user_id`, `node_id`.

### bookmarks

User bookmark on a node. Composite PK `(user_id, node_id)`.

| Column | Type | Notes |
|---|---|---|
| user_id | UUID | PK, FK → `profiles.id`, **ondelete CASCADE** |
| node_id | UUID | PK, FK → `roadmap_nodes.id`, **ondelete CASCADE** |
| created_at | DateTime(tz) | Server default `now()` |

### resources

Curated learning links for a node (articles, videos, courses, docs). Currently not seeded.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| title | String(200) | Not null |
| url | Text | Not null |
| type | String(20) | Not null |
| is_free | Boolean | Default `true` |
| is_recommended | Boolean | Default `false` |
| created_at | DateTime(tz) | Server default `now()` |

Indexes: `node_id`.

### ai_explanations

Cache of AI-generated explanations per node, keyed by `prompt_type`. Prevents re-billing for the same prompt.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| prompt_type | String(20) | Not null (model); DB column created as String(50) by migration `001` — see Migrations |
| response_text | Text | Not null |
| model_used | String(50) | Not null |
| openai_fallback | Boolean | Default `false`; added by migration `002` |
| created_at | DateTime(tz) | Server default `now()` |

Uniques: `(node_id, prompt_type)` named `uq_ai_explanation_node_type`. Indexes: `node_id`.

### quizzes

Single-question multiple-choice quiz attached to a node.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| question | Text | Not null |
| options | JSONB | Not null; array of answer choices |
| correct_answer | String(10) | Not null; index of the correct option |
| explanation | Text | Nullable |
| created_at | DateTime(tz) | Server default `now()` |

Indexes: `node_id`. There is no FK to `roadmaps`; the owning roadmap is reached through the node.

### quiz_attempts

One row per quiz submission.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| user_id | UUID | FK → `profiles.id`, **ondelete CASCADE**, not null, indexed |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete CASCADE**, not null, indexed |
| score | Integer | Not null |
| answers | JSONB | Nullable; submitted answers |
| taken_at | DateTime(tz) | Server default `now()` |

Indexes: `user_id`, `node_id`.

### feedback

User-reported issues or suggestions, optionally attached to a node. `node_id` is nullable with **ondelete SET NULL**, so feedback survives node deletion.

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, client-generated `uuid4` |
| user_id | UUID | FK → `profiles.id`, **ondelete CASCADE**, not null, indexed |
| node_id | UUID | FK → `roadmap_nodes.id`, **ondelete SET NULL**, nullable, indexed |
| type | String(50) | Not null, default `general` |
| content | Text | Not null |
| status | String(20) | Not null, default `open`; values `open` \| `resolved` \| `dismissed` |
| created_at | DateTime(tz) | Server default `now()` |

Indexes: `user_id`, `node_id`.

## Key Relationships

**Roadmap catalog and traversal.** `roadmaps` (1) → `roadmap_nodes` (N) → `node_dependencies` (N). A roadmap's topics are ordered by `roadmap_nodes.order_index`; the prerequisite order is expressed by `node_dependencies`, where each edge says "`node_id` depends on `depends_on_node_id`". The self-referential FKs (both to `roadmap_nodes.id`) let a node be reached as either a dependent or a prerequisite of another node.

**Enrollment and progress.** `profiles` (1) → `user_roadmaps` (N) marks which roadmaps a user is studying (`started_at`, `completion_pct`, `is_pinned`, optional `completed_at`). Fine-grained progress lives in `user_node_progress`: one row per `(user_id, node_id)` with a `status`, plus a denormalized `roadmap_id` so all of a user's progress for a roadmap can be fetched without joining `roadmap_nodes`. Deleting a user cascades through enrollment and progress rows; deleting a roadmap cascades through its nodes and in turn their progress rows.

**Notes and bookmarks.** Both hang off `profiles` and `roadmap_nodes` with **ondelete CASCADE** in both directions. `notes` keeps exactly one note per user/node (unique `uq_user_note_node`); `bookmarks` uses the composite PK itself to enforce one bookmark per user/node.

**AI caching.** `ai_explanations` is keyed by `(node_id, prompt_type)` (unique `uq_ai_explanation_node_type`). A request for an explanation looks up an existing `(node, prompt_type)` row first and only calls the model provider on a miss. CASCADE on node deletion drops stale cached explanations.

**Quizzes and attempts.** A node may have zero or more `quizzes` (each a single MC question with `options` JSONB and `correct_answer`). Users answer via `quiz_attempts`, which reference both the user and the node. There is no direct FK from attempts to a specific quiz — attempts are recorded per node, so per-user scores aggregate across that node's questions.

**Admin and moderation.** `profiles.role` gates admin (`admin`) and super-admin (`super_admin`) privileges. `roadmaps.created_by` is an optional reference to a profile (SET NULL) — seeded rows reference the first admin profile. `feedback` captures user reports with a `status` workflow (`open` → `resolved`/`dismissed`); its `node_id` is optional (SET NULL) so feedback referencing a deleted node is preserved rather than destroyed.

## Seeding pipeline

Seeding is a two-step pipeline: `fetch_content.py` downloads content bodies, then `seed_data.py` parses them into nodes. The source repo is `nilbuild/developer-roadmap`, branch `master`, with content under `roadmaps/{slug}/content/*.md`.

### 1. `backend/fetch_content.py` — content body cache

1. Downloads the repo archive (`https://github.com/nilbuild/developer-roadmap/archive/refs/heads/master.zip`) and scans it for `.md` files under `roadmaps/{slug}/content/` (3 attempts with 3s backoff). The path list is saved to `backend/content_cache.json`, keyed by slug.
2. Downloads each markdown file from `raw.githubusercontent.com` with 20-way concurrency, 3 retries, and 100-file batches, saving incrementally to `backend/content_body_cache.json` keyed by full content file path.
3. Each body is cleaned before caching: the `# Title` heading is dropped, everything from the "Visit the following resources" footer onward is truncated, and `@article@` / `@video@` / `@course@` link prefixes are stripped.

Current cache: **9,662 content files** across the roadmaps. Flags: `--force` re-downloads everything, `--refresh` rebuilds `content_cache.json`, `--stats` prints per-roadmap coverage.

### 2. `backend/seed_data.py` — node seeding

1. Deletes all existing `node_dependencies`, `roadmap_nodes`, and `roadmaps` rows, then re-inserts from scratch. Running it again always produces a fresh, deterministic seed.
2. Loads the content map (from `content_cache.json`, or re-downloads the archive) and the body cache (`content_body_cache.json`).
3. Lists roadmap directories from the GitHub API (excluding `content`, `assets`, `resources`), falling back to the content map or `ROADMAP_META` slugs if the API fails.
4. For each slug with an entry in the hardcoded `ROADMAP_META` table (title, category, difficulty, description), it tries to fetch `roadmaps/{slug}/{slug}.json` for topic nodes (`type` in `topic`/`subtopic`). If none are found, it falls back to `parse_markdown_topics()`, which parses filenames under `{slug}/content/*.md` into a flat topic list (title-cased label, id = file path), skipping `index.md` and `@hash@` placeholder files, and assigns a grid layout (`position_x`/`position_y`) since markdown files carry no spatial data.
5. **Dependency edges are never parsed from JSON.** A linear chain is built from the ordered topic list: for `n` nodes, `n-1` `NodeDependency` rows are created, each depending on the previous node with `order_index` running `1..n-1`.
6. Node `description` is populated from the body cache by `source_node_id` (the content file path) — **9,395 of 9,444 nodes** have descriptions. `why_important` is generated per node by `generate_why_important()`; `estimated_hours` is set to `nodes × 4` on the roadmap and defaults (2) on nodes; roadmaps are inserted `is_published = true` and `created_by` set to the first profile.
7. Inserts everything in a single transaction and reports totals.

Current seed results: **87 roadmaps, 9,444 nodes, 9,357 dependency edges, 0 isolated nodes**.

Retry logic (3 attempts with backoff) guards the archive download and per-file raw fetches against transient GitHub failures. Run order: `python fetch_content.py` then `python seed_data.py`.

## Node Dependency Model

`node_dependencies` expresses the learning order for each roadmap. Seeding constructs a single linear chain per roadmap: every node depends on exactly the node before it, so each non-first node has **indegree = 1** and each non-last node has **outdegree = 1** (the first node has indegree 0, the last has outdegree 0). Each edge carries a sequential `order_index` (1..n-1) within its roadmap, giving a stable traversal order independent of UUID.

Because every roadmap contributes exactly `nodes - 1` edges, the totals are consistent: `9,444 - 87 = 9,357` dependency edges. There are **0 isolated nodes** — every node in every roadmap belongs to its roadmap's chain.

## Indexing and queries

All foreign-key columns that are queried on the hot path are explicitly indexed in the model/migrations:

- `roadmap_nodes(roadmap_id)`, `roadmap_nodes(source_node_id)` — roadmap content and description lookups.
- `user_node_progress(user_id)`, `(node_id)`, `(roadmap_id)` — per-roadmap progress queries (e.g. progress bars) benefit from the `roadmap_id` index plus the `uq_user_node` unique `(user_id, node_id)` pair.
- `notes(user_id)`, `(node_id)`, `resources(node_id)`, `ai_explanations(node_id)`, `quizzes(node_id)`, `quiz_attempts(user_id)`, `(node_id)`, `feedback(user_id)`, `(node_id)` — child-side FK lookups.
- `profiles(email)` and `roadmaps(slug)` are unique indexes supporting authentication and slug-based routing.

Composite PKs double as covering indexes for common lookups: `user_roadmaps(user_id, roadmap_id)` and `bookmarks(user_id, node_id)` serve the "what is this user doing" queries directly, and `node_dependencies(node_id, depends_on_node_id)` serves both direction lookups (reverse traversal requires only the index on `depends_on_node_id`, which is the PK's second column).

Uniqueness constraints worth knowing: `uq_user_node` (one progress row per user/node), `uq_user_note_node` (one note per user/node), `uq_ai_explanation_node_type` (one cached explanation per node/prompt-type).

## Migrations

Alembic history (`backend/alembic/versions/`):

- `001_initial_schema` — all 13 tables.
- `002_add_missing_columns` — `ai_explanations.openai_fallback` (Boolean, not null, default `false`), `notes.created_at`.
- `003_add_edge_order_index` — `node_dependencies.order_index` (Integer, not null, default 0).

One known model/schema mismatch: `ai_explanations.prompt_type` is declared `String(20)` in the model but was created as `String(50)` by migration `001`; the DB column is `varchar(50)`. If the column is ever recreated from the models it would shrink to 20 characters.
