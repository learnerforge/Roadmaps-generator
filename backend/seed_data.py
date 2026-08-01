import asyncio
import sys
import os
import json
import logging
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger(__name__)

import httpx
from app.db.session import AsyncSessionLocal, init_db
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from app.models.user import Profile
from sqlalchemy import select
from why_important_templates import generate_why_important

REPO = "nilbuild/developer-roadmap"
BRANCH = "master"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/roadmaps"
API_BASE = f"https://api.github.com/repos/{REPO}/contents/roadmaps"

EXCLUDE_DIRS = {"content", "assets", "resources"}
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "content_cache.json")
BODY_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "content_body_cache.json")

ROADMAP_META = {
    "frontend": {"title": "Frontend Developer", "category": "role-based", "difficulty": "beginner", "description": "Step by step guide to becoming a modern frontend developer in 2026."},
    "shell-bash": {"title": "Shell & Bash", "category": "skill-based", "difficulty": "beginner", "description": "Shell scripting and Bash: command line, automation, pipes, and scripting best practices."},
    "wordpress": {"title": "WordPress", "category": "skill-based", "difficulty": "beginner", "description": "WordPress: themes, plugins, block editor, REST API, and headless WordPress."},
    "backend": {"title": "Backend Developer", "category": "role-based", "difficulty": "beginner", "description": "Step by step guide to becoming a backend developer in 2026."},
    "full-stack": {"title": "Full Stack Developer", "category": "role-based", "difficulty": "intermediate", "description": "Complete full-stack development roadmap covering frontend, backend, databases, and DevOps."},
    "devops": {"title": "DevOps", "category": "role-based", "difficulty": "intermediate", "description": "DevOps roadmap covering CI/CD, cloud, containerization, monitoring, and IaC."},
    "devsecops": {"title": "DevSecOps", "category": "role-based", "difficulty": "advanced", "description": "Security-focused DevOps: secure pipelines, scanning, compliance, and automation."},
    "ai-engineer": {"title": "AI Engineer", "category": "role-based", "difficulty": "advanced", "description": "AI engineering: ML, deep learning, LLMs, MLOps, and AI deployment."},
    "ai-data-scientist": {"title": "AI and Data Scientist", "category": "role-based", "difficulty": "advanced", "description": "Complete AI and data science: statistics, ML, deep learning, NLP, and data engineering."},
    "data-analyst": {"title": "Data Analyst", "category": "role-based", "difficulty": "beginner", "description": "Data analyst roadmap: SQL, Python, statistics, visualization, and BI."},
    "data-engineer": {"title": "Data Engineer", "category": "role-based", "difficulty": "intermediate", "description": "Data engineering: ETL pipelines, data warehouses, big data, and data modeling."},
    "android": {"title": "Android Developer", "category": "role-based", "difficulty": "beginner", "description": "Android development: Kotlin, Jetpack Compose, Android SDK, and app architecture."},
    "ios": {"title": "iOS Developer", "category": "role-based", "difficulty": "beginner", "description": "iOS development: Swift, SwiftUI, UIKit, and Apple ecosystem."},
    "machine-learning": {"title": "Machine Learning", "category": "role-based", "difficulty": "advanced", "description": "ML: supervised/unsupervised learning, neural networks, and ML engineering."},
    "postgresql-dba": {"title": "PostgreSQL DBA", "category": "role-based", "difficulty": "intermediate", "description": "PostgreSQL database administration: setup, optimization, backup, and HA."},
    "blockchain": {"title": "Blockchain Developer", "category": "role-based", "difficulty": "advanced", "description": "Blockchain: smart contracts, dApps, web3, and Solidity."},
    "qa": {"title": "QA Engineer", "category": "role-based", "difficulty": "beginner", "description": "Quality assurance: manual testing, automation, CI/CD testing, and test architecture."},
    "software-architect": {"title": "Software Architect", "category": "role-based", "difficulty": "advanced", "description": "Software architecture: design patterns, system design, microservices, and enterprise architecture."},
    "cyber-security": {"title": "Cyber Security", "category": "role-based", "difficulty": "intermediate", "description": "Cyber security: network security, app security, penetration testing, and SecOps."},
    "ux-design": {"title": "UX Designer", "category": "role-based", "difficulty": "beginner", "description": "UX design: user research, wireframing, prototyping, design systems, and usability testing."},
    "technical-writer": {"title": "Technical Writer", "category": "role-based", "difficulty": "beginner", "description": "Technical writing: documentation, API docs, content strategy, and developer advocacy."},
    "game-developer": {"title": "Game Developer", "category": "role-based", "difficulty": "intermediate", "description": "Game development: game engines, 2D/3D graphics, physics, and game design."},
    "mlops": {"title": "MLOps Engineer", "category": "role-based", "difficulty": "advanced", "description": "MLOps: model deployment, monitoring, feature stores, and ML infrastructure."},
    "product-manager": {"title": "Product Manager", "category": "role-based", "difficulty": "beginner", "description": "Product management: strategy, roadmapping, user research, analytics, and agile."},
    "engineering-manager": {"title": "Engineering Manager", "category": "role-based", "difficulty": "intermediate", "description": "Engineering management: technical leadership, team building, project management, and culture."},
    "devrel": {"title": "Developer Relations", "category": "role-based", "difficulty": "beginner", "description": "Developer relations: community building, content creation, speaking, and developer advocacy."},
    "bi-analyst": {"title": "BI Analyst", "category": "role-based", "difficulty": "beginner", "description": "Business intelligence: data visualization, dashboards, SQL, and BI tools."},
    "network-engineer": {"title": "Network Engineer", "category": "role-based", "difficulty": "intermediate", "description": "Network engineering: routing, switching, network protocols, and cloud networking."},
    "forward-deployed-engineer": {"title": "Forward Deployed Engineer", "category": "role-based", "difficulty": "advanced", "description": "Forward deployed engineering: customer-facing software engineering and solution architecture."},
    "ai-product-builder": {"title": "AI Product Builder", "category": "role-based", "difficulty": "intermediate", "description": "AI product building: leveraging AI to build and ship products rapidly."},
    "react": {"title": "React", "category": "skill-based", "difficulty": "beginner", "description": "Complete React roadmap from basics to advanced patterns, hooks, state management, and ecosystem."},
    "vue": {"title": "Vue", "category": "skill-based", "difficulty": "beginner", "description": "Vue.js roadmap covering composition API, Pinia, Vue Router, and ecosystem."},
    "angular": {"title": "Angular", "category": "skill-based", "difficulty": "intermediate", "description": "Angular: TypeScript, RxJS, NgRx, Angular CLI, and enterprise patterns."},
    "javascript": {"title": "JavaScript", "category": "skill-based", "difficulty": "beginner", "description": "Complete JavaScript from fundamentals to advanced: closures, promises, async patterns."},
    "typescript": {"title": "TypeScript", "category": "skill-based", "difficulty": "intermediate", "description": "TypeScript: types, generics, decorators, and advanced type system."},
    "nodejs": {"title": "Node.js", "category": "skill-based", "difficulty": "intermediate", "description": "Node.js: Express, NestJS, databases, real-time apps, and production deployment."},
    "python": {"title": "Python", "category": "skill-based", "difficulty": "beginner", "description": "Python from basics to advanced: web frameworks, data science, automation, and APIs."},
    "system-design": {"title": "System Design", "category": "skill-based", "difficulty": "advanced", "description": "System design: distributed systems, scalability, databases, and design patterns."},
    "java": {"title": "Java", "category": "skill-based", "difficulty": "beginner", "description": "Java: OOP, Spring Boot, microservices, and enterprise development."},
    "spring-boot": {"title": "Spring Boot", "category": "skill-based", "difficulty": "intermediate", "description": "Spring Boot: REST APIs, security, data access, testing, and microservices."},
    "golang": {"title": "Go", "category": "skill-based", "difficulty": "beginner", "description": "Go: concurrency, web services, CLI tools, and cloud-native development."},
    "rust": {"title": "Rust", "category": "skill-based", "difficulty": "intermediate", "description": "Rust: ownership, systems programming, web assembly, and async Rust."},
    "sql": {"title": "SQL", "category": "skill-based", "difficulty": "beginner", "description": "SQL from basic queries to advanced optimization, window functions, and database design."},
    "docker": {"title": "Docker", "category": "skill-based", "difficulty": "beginner", "description": "Docker: containers, images, compose, networking, and production deployment."},
    "kubernetes": {"title": "Kubernetes", "category": "skill-based", "difficulty": "advanced", "description": "Kubernetes: pods, services, deployments, helm, and production clusters."},
    "aws": {"title": "AWS", "category": "skill-based", "difficulty": "intermediate", "description": "AWS: core services, serverless, databases, networking, and infrastructure as code."},
    "git-github": {"title": "Git and GitHub", "category": "skill-based", "difficulty": "beginner", "description": "Git and GitHub: version control, branching, collaboration, and open source workflows."},
    "nextjs": {"title": "Next.js", "category": "skill-based", "difficulty": "intermediate", "description": "Next.js: React, SSR, ISR, app router, server components, and full-stack features."},
    "flutter": {"title": "Flutter", "category": "skill-based", "difficulty": "beginner", "description": "Flutter: Dart, widgets, state management, and cross-platform mobile development."},
    "computer-science": {"title": "Computer Science", "category": "skill-based", "difficulty": "beginner", "description": "CS fundamentals: algorithms, data structures, OS, and networking."},
    "frontend-beginner": {"title": "Frontend Beginner", "category": "absolute-beginners", "difficulty": "beginner", "description": "Start here if you're new to frontend. Learn HTML, CSS, and JavaScript basics."},
    "backend-beginner": {"title": "Backend Beginner", "category": "absolute-beginners", "difficulty": "beginner", "description": "Start here if you're new to backend. Learn server basics, databases, and APIs."},
    "devops-beginner": {"title": "DevOps Beginner", "category": "absolute-beginners", "difficulty": "beginner", "description": "Start here if you're new to DevOps. Learn Linux, scripting, and basic infrastructure."},
    "git-github-beginner": {"title": "Git and GitHub Beginner", "category": "absolute-beginners", "difficulty": "beginner", "description": "Start here if you've never used Git. Learn version control and GitHub basics."},
    "cpp": {"title": "C++", "category": "languages", "difficulty": "intermediate", "description": "C++: memory management, STL, templates, and modern C++ features."},
    "php": {"title": "PHP", "category": "languages", "difficulty": "beginner", "description": "PHP: modern PHP, Laravel, Composer, and web development."},
    "ruby": {"title": "Ruby", "category": "languages", "difficulty": "beginner", "description": "Ruby: fundamentals, metaprogramming, and testing."},
    "claude-code": {"title": "Claude Code", "category": "languages", "difficulty": "beginner", "description": "Learn to use Claude Code effectively for AI-assisted software development."},
    "kotlin": {"title": "Kotlin", "category": "languages", "difficulty": "beginner", "description": "Kotlin: coroutines, flows, Android development, and multiplatform."},
    "scala": {"title": "Scala", "category": "languages", "difficulty": "advanced", "description": "Scala: functional programming, Akka, and JVM ecosystem."},
    "django": {"title": "Django", "category": "frameworks", "difficulty": "intermediate", "description": "Django: models, views, templates, REST framework, and deployment."},
    "ruby-on-rails": {"title": "Ruby on Rails", "category": "frameworks", "difficulty": "intermediate", "description": "Ruby on Rails: MVC, ActiveRecord, API mode, and testing."},
    "laravel": {"title": "Laravel", "category": "frameworks", "difficulty": "intermediate", "description": "Laravel: Eloquent, Blade, Livewire, and the Laravel ecosystem."},
    "aspnet-core": {"title": "ASP.NET Core", "category": "frameworks", "difficulty": "intermediate", "description": "ASP.NET Core: C#, MVC, Web API, Entity Framework, and Azure."},
    "express": {"title": "Express.js", "category": "frameworks", "difficulty": "beginner", "description": "Express.js: REST APIs, middleware, authentication, and database integration."},
    "fastapi": {"title": "FastAPI", "category": "frameworks", "difficulty": "intermediate", "description": "FastAPI: async APIs, Pydantic, SQLAlchemy, and production deployment."},
    "mongodb": {"title": "MongoDB", "category": "databases", "difficulty": "beginner", "description": "MongoDB: document modeling, aggregation, indexing, and Atlas."},
    "redis": {"title": "Redis", "category": "databases", "difficulty": "intermediate", "description": "Redis: data structures, caching, pub/sub, and cluster deployment."},
    "elasticsearch": {"title": "Elasticsearch", "category": "databases", "difficulty": "intermediate", "description": "Elasticsearch: search, analytics, mapping, aggregation, and Kibana."},
    "prompt-engineering": {"title": "Prompt Engineering", "category": "ai-ml", "difficulty": "beginner", "description": "Prompt engineering: LLM prompting, chain-of-thought, and AI interaction patterns."},
    "ai-agents": {"title": "AI Agents", "category": "ai-ml", "difficulty": "advanced", "description": "AI agents: agent architectures, tool use, memory, and multi-agent systems."},
    "ai-red-teaming": {"title": "AI Red Teaming", "category": "ai-ml", "difficulty": "advanced", "description": "AI red teaming: LLM security, prompt injection, jailbreaks, and safety testing."},
    "react-native": {"title": "React Native", "category": "mobile", "difficulty": "intermediate", "description": "React Native: components, navigation, state management, and native modules."},
    "swift-ui": {"title": "Swift & SwiftUI", "category": "mobile", "difficulty": "beginner", "description": "Swift and SwiftUI: iOS development, SwiftUI, Combine, and App Store deployment."},
    "html": {"title": "HTML", "category": "web-development", "difficulty": "beginner", "description": "HTML: semantic HTML, forms, accessibility, and SEO basics."},
    "css": {"title": "CSS", "category": "web-development", "difficulty": "beginner", "description": "CSS: flexbox, grid, animations, responsive design, and modern CSS features."},
    "graphql": {"title": "GraphQL", "category": "web-development", "difficulty": "intermediate", "description": "GraphQL: schemas, resolvers, Apollo, and real-time subscriptions."},
    "design-system": {"title": "Design System", "category": "web-development", "difficulty": "intermediate", "description": "Design systems: component libraries, tokens, documentation, and Storybook."},
    "linux": {"title": "Linux", "category": "devops", "difficulty": "beginner", "description": "Linux: command line, shell scripting, system administration, and networking."},
    "terraform": {"title": "Terraform", "category": "devops", "difficulty": "intermediate", "description": "Terraform: infrastructure as code, modules, state management, and cloud provisioning."},
    "cloudflare": {"title": "Cloudflare", "category": "devops", "difficulty": "intermediate", "description": "Cloudflare: CDN, DNS, workers, DDoS protection, and edge computing."},
    "vibe-coding": {"title": "Vibe Coding", "category": "skill-based", "difficulty": "beginner", "description": "Learn Vibe Coding: use AI tools to rapidly prototype and build applications."},
    "datastructures-and-algorithms": {"title": "Data Structures & Algorithms", "category": "skill-based", "difficulty": "intermediate", "description": "DSA: arrays, trees, graphs, dynamic programming, and interview preparation."},
    "code-review": {"title": "Code Review", "category": "skill-based", "difficulty": "beginner", "description": "Code review: best practices, giving feedback, and code quality."},
    "leetcode": {"title": "LeetCode", "category": "skill-based", "difficulty": "intermediate", "description": "LeetCode preparation: problem-solving patterns and interview strategies."},
    "api-design": {"title": "API Design", "category": "skill-based", "difficulty": "intermediate", "description": "API design: REST, GraphQL, versioning, documentation, and best practices."},
    "aws-best-practices": {"title": "AWS Best Practices", "category": "devops", "difficulty": "advanced", "description": "AWS best practices: Well-Architected Framework, security, cost optimization, and reliability."},
    "api-security-best-practices": {"title": "API Security Best Practices", "category": "devops", "difficulty": "intermediate", "description": "API security: authentication, authorization, rate limiting, and threat protection."},
    "server-side-game-developer": {"title": "Server-Side Game Developer", "category": "role-based", "difficulty": "advanced", "description": "Server-side game development: game servers, networking, matchmaking, and backend systems."},
    "software-design-architecture": {"title": "Software Design & Architecture", "category": "skill-based", "difficulty": "advanced", "description": "Software design and architecture: SOLID, design patterns, clean architecture, and system design."},
    "openclaw": {"title": "Open Claw", "category": "ai-ml", "difficulty": "intermediate", "description": "Open Claw: AI agent framework for automation, tool use, and multi-agent systems."},
}


async def fetch_json(client: httpx.AsyncClient, slug: str) -> dict | None:
    url = f"{RAW_BASE}/{slug}/{slug}.json"
    try:
        resp = await client.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning("fetch_json failed for %s: %s", slug, e)
    return None


def load_content_cache() -> dict[str, list[str]]:
    """Load cached content map from local JSON file."""
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_content_cache(content_map: dict[str, list[str]]):
    """Save content map to local JSON file."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(content_map, f, indent=2)
    print(f"  Cached {sum(len(v) for v in content_map.values())} files across {len(content_map)} roadmaps")


def load_body_cache() -> dict[str, str]:
    """Load cached markdown content bodies keyed by content file path."""
    try:
        with open(BODY_CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


async def fetch_repo_archive(client: httpx.AsyncClient) -> dict[str, list[str]] | None:
    """Download and extract repo archive to build content map without API rate limits."""
    import io, zipfile

    archive_url = f"https://github.com/{REPO}/archive/refs/heads/{BRANCH}.zip"
    for attempt in range(3):
        try:
            resp = await client.get(archive_url, timeout=60)
            if resp.status_code == 200:
                break
            print(f"  Archive download failed: HTTP {resp.status_code}, retrying...")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"  Archive download error: {e}, retrying...")
            await asyncio.sleep(3)
    else:
        return None

    content_files: dict[str, list[str]] = {}
    prefix = f"developer-roadmap-master/roadmaps/"
    try:
        with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
            for path in z.namelist():
                if path.endswith(".md") and "/content/" in path and path.startswith(prefix):
                    parts = path[len(prefix):].split("/")
                    slug = parts[0]
                    if slug not in content_files:
                        content_files[slug] = []
                    content_files[slug].append(path)
    except Exception as e:
        print(f"  Error extracting archive: {e}")
        return None

    return content_files


def parse_markdown_topics(files: list[str]) -> list[dict]:
    """Parse markdown file paths into topic-like node dicts."""
    topics = []
    seen = set()
    for path in files:
        name = path.rsplit("/", 1)[-1]
        # Skip placeholder files whose name is just a hash
        if name.startswith("@") or name == "index.md":
            continue
        # Strip .md extension before title-casing to avoid "Hello World.Md"
        stem = name.removesuffix(".md").rsplit("@", 1)[0].replace("-", " ").replace("_", " ").title().strip()
        if not stem:
            continue
        if stem in seen:
            continue
        seen.add(stem)
        topic = {
            "id": path,
            "type": "topic",
            "data": {"label": stem},
            "description": None,
        }
        topics.append(topic)
    return topics


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db, httpx.AsyncClient(follow_redirects=True) as client:
        admin = await db.execute(select(Profile).limit(1))
        admin_user = admin.scalar_one_or_none()

        # Clear existing roadmap data for fresh re-seed
        print("Clearing existing roadmap data...")
        await db.execute(NodeDependency.__table__.delete())
        await db.execute(RoadmapNode.__table__.delete())
        await db.execute(Roadmap.__table__.delete())
        await db.commit()
        print("Cleared. Starting fresh seed...")

        # Build content map early: try cache first, then archive download
        content_map = load_content_cache()
        if not content_map:
            print("Downloading repo archive for markdown content discovery...")
            content_map = await fetch_repo_archive(client)
            if content_map:
                save_content_cache(content_map)
            else:
                print("  Archive download failed too. Proceeding with JSON-only roadmaps.")
                content_map = {}

        # Load cached markdown content bodies (keyed by content file path)
        body_cache = load_body_cache()

        dir_resp = await client.get(API_BASE, timeout=15)
        if dir_resp.status_code == 200:
            dirs = [
                item["name"]
                for item in dir_resp.json()
                if item["type"] == "dir" and item["name"] not in EXCLUDE_DIRS
            ]
        elif content_map:
            dirs = sorted(content_map.keys())
            print(f"Using content map for directory listing ({len(dirs)} roadmaps)")
        else:
            print(f"Failed to list roadmaps: HTTP {dir_resp.status_code}")
            print("Falling back to ROADMAP_META slugs only...")
            dirs = [d for d in ROADMAP_META.keys() if d not in EXCLUDE_DIRS]

        print(f"Found {len(dirs)} roadmap directories")
        print(f"Found markdown content for {len(content_map)} roadmaps")

        total_roadmaps = 0
        total_nodes = 0
        total_deps = 0

        for slug in sorted(dirs):
            meta = ROADMAP_META.get(slug)
            if not meta:
                print(f"  Skipping {slug} (no metadata mapping)")
                continue

            data = await fetch_json(client, slug)
            topic_nodes = []
            nodes_data = []
            edges_data = []
            is_markdown = False

            if data:
                nodes_data = data.get("nodes") or []
                edges_data = data.get("edges") or []
                topic_nodes = [n for n in nodes_data if n.get("type") in ("topic", "subtopic")]

            if not topic_nodes:
                # Fallback: try markdown content from pre-fetched tree
                md_topics = parse_markdown_topics(content_map.get(slug, []))
                if md_topics:
                    # Generate grid positions for markdown nodes (no spatial data available)
                    md_cols = 7
                    md_spacing_x = 280
                    md_spacing_y = 130
                    for i, t in enumerate(md_topics):
                        t["position"] = {
                            "x": (i % md_cols) * md_spacing_x,
                            "y": (i // md_cols) * md_spacing_y,
                        }
                    topic_nodes = md_topics
                    is_markdown = True
                    print(f"  Parsed {len(topic_nodes)} topics from markdown for {slug}")

            if not topic_nodes:
                print(f"  Skipping {slug} (no data)")
                continue

            roadmap = Roadmap(
                title=meta["title"],
                slug=slug,
                description=meta["description"],
                category=meta["category"],
                difficulty=meta["difficulty"],
                estimated_hours=len(topic_nodes) * 4,
                cover_image_url=None,
                is_published=True,
                created_by=admin_user.id if admin_user else None,
            )
            db.add(roadmap)
            await db.flush()

            node_map = {}
            for idx, n in enumerate(topic_nodes):
                position = n.get("position", {})
                source_id = n.get("id")
                label = n.get("data", {}).get("label", "Untitled")
                description = n.get("description") if is_markdown else None
                if not description and is_markdown and source_id:
                    description = body_cache.get(source_id)
                w = n.get("width")
                h = n.get("height")

                db_node = RoadmapNode(
                    roadmap_id=roadmap.id,
                    source_node_id=source_id,
                    node_type="topic",
                    title=label,
                    description=description,
                    why_important=generate_why_important(label, "software development", description),
                    category=None,
                    position_x=position.get("x", 0),
                    position_y=position.get("y", 0),
                    order_index=idx,
                    width=w,
                    height=h,
                )
                db.add(db_node)
                await db.flush()
                if source_id:
                    node_map[source_id] = db_node.id
                total_nodes += 1

            # ── Single pass: order_index chain — each node gets exactly 1 input, 1 output ──
            # This guarantees a clean linear path (indegree=1, outdegree=1 for all except first/last)
            # Each edge gets a sequential order_index (1, 2, 3, ...) within its roadmap
            order_ids = [n.get("id") for n in topic_nodes if n.get("id") in node_map]
            dep_count = 0
            for i in range(len(order_ids) - 1):
                tid_a, tid_b = order_ids[i], order_ids[i + 1]
                db.add(NodeDependency(
                    node_id=node_map[tid_b],
                    depends_on_node_id=node_map[tid_a],
                    order_index=i + 1,
                ))
                dep_count += 1
                total_deps += 1

            total_roadmaps += 1
            print(f"  Seeded: {meta['title']} ({slug}) — {len(topic_nodes)} nodes, {dep_count} dependencies")

        await db.commit()
        print(f"\nSeeded {total_roadmaps} roadmaps ({total_nodes} nodes, {total_deps} deps) successfully!")


if __name__ == "__main__":
    print("Seeding PathForge AI database with roadmap.sh data from GitHub...")
    asyncio.run(seed())
