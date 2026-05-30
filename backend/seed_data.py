import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import httpx
from app.db.session import AsyncSessionLocal, init_db
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from app.models.user import Profile
from sqlalchemy import select

REPO = "kamranahmedse/developer-roadmap"
BRANCH = "master"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/src/data/roadmaps"
API_BASE = f"https://api.github.com/repos/{REPO}/contents/src/data/roadmaps"

EXCLUDE_DIRS = {"content", "assets", "resources"}

ROADMAP_META = {
    "frontend": {"title": "Frontend Developer", "category": "role-based", "difficulty": "beginner", "description": "Step by step guide to becoming a modern frontend developer in 2026."},
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
    "backend-performance-best-practices": {"title": "Backend Performance", "category": "devops", "difficulty": "advanced", "description": "Backend performance: caching, database optimization, profiling, and scaling."},
    "frontend-performance-best-practices": {"title": "Frontend Performance", "category": "devops", "difficulty": "intermediate", "description": "Frontend performance: Core Web Vitals, lazy loading, bundle optimization, and rendering."},
    "code-review-best-practices": {"title": "Code Review Best Practices", "category": "devops", "difficulty": "beginner", "description": "Code review best practices: review workflows, constructive feedback, and automation."},
}


async def fetch_json(client: httpx.AsyncClient, slug: str) -> dict | None:
    url = f"{RAW_BASE}/{slug}/{slug}.json"
    try:
        resp = await client.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return None


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db, httpx.AsyncClient(follow_redirects=True) as client:
        admin = await db.execute(select(Profile).limit(1))
        admin_user = admin.scalar_one_or_none()

        dir_resp = await client.get(API_BASE, timeout=15)
        if dir_resp.status_code != 200:
            print(f"Failed to list roadmaps: HTTP {dir_resp.status_code}")
            print("Falling back to ROADMAP_META slugs only...")
            dirs = [d for d in ROADMAP_META.keys() if d not in EXCLUDE_DIRS]
        else:
            dirs = [
                item["name"]
                for item in dir_resp.json()
                if item["type"] == "dir" and item["name"] not in EXCLUDE_DIRS
            ]

        print(f"Found {len(dirs)} roadmap directories")

        total_roadmaps = 0
        total_nodes = 0
        total_deps = 0

        for slug in sorted(dirs):
            existing = await db.execute(select(Roadmap).where(Roadmap.slug == slug))
            if existing.scalar_one_or_none():
                print(f"  Skipping {slug} (already exists)")
                continue

            meta = ROADMAP_META.get(slug)
            if not meta:
                print(f"  Skipping {slug} (no metadata mapping)")
                continue

            data = await fetch_json(client, slug)
            if not data:
                print(f"  Skipping {slug} (no JSON data)")
                continue

            nodes_data = data.get("nodes", [])
            edges_data = data.get("edges", [])

            topic_nodes = [n for n in nodes_data if n.get("type") == "topic"]
            if not topic_nodes:
                print(f"  Skipping {slug} (no topic nodes)")
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
                w = n.get("width")
                h = n.get("height")

                db_node = RoadmapNode(
                    roadmap_id=roadmap.id,
                    source_node_id=source_id,
                    node_type="topic",
                    title=label,
                    description=None,
                    why_important=None,
                    category=None,
                    position_x=position.get("x", 0),
                    position_y=position.get("y", 0),
                    order_index=idx,
                    width=w,
                    height=h,
                )
                db.add(db_node)
                await db.flush()
                node_map[source_id] = db_node.id
                total_nodes += 1

            dep_count = 0
            for edge in edges_data:
                source_id = edge.get("source")
                target_id = edge.get("target")
                if source_id in node_map and target_id in node_map:
                    dep = NodeDependency(
                        node_id=node_map[target_id],
                        depends_on_node_id=node_map[source_id],
                    )
                    db.add(dep)
                    dep_count += 1
                    total_deps += 1

            total_roadmaps += 1
            print(f"  Seeded: {meta['title']} ({slug}) — {len(topic_nodes)} nodes, {dep_count} dependencies")

        await db.commit()
        print(f"\nSeeded {total_roadmaps} roadmaps ({total_nodes} nodes, {total_deps} deps) successfully!")


if __name__ == "__main__":
    print("Seeding PathForge AI database with roadmap.sh data from GitHub...")
    asyncio.run(seed())
