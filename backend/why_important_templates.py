"""Template-based why_important generation for roadmap nodes.

Uses a curated dictionary for common topics and a smart fallback
template for everything else. Designed to be called from seed_data.py
and enrich_why_important.py.
"""

CURATED: dict[str, str] = {
    "react": (
        "React is the most widely used frontend library in the industry. "
        "Mastering it unlocks the ability to build modern, interactive UIs "
        "for web and mobile (React Native)."
    ),
    "vue": (
        "Vue's gentle learning curve and progressive design make it a "
        "top choice for projects of any scale. It powers many production "
        "apps and is in high demand."
    ),
    "angular": (
        "Angular is a full-featured framework maintained by Google. "
        "It provides strong opinions on structure, testing, and dependency "
        "injection, making it ideal for large enterprise applications."
    ),
    "javascript": (
        "JavaScript is the lingua franca of the web. Every frontend and "
        "backend (Node.js) developer relies on it daily."
    ),
    "typescript": (
        "TypeScript adds static types to JavaScript, catching bugs at "
        "compile time. It has become the standard for serious web development."
    ),
    "python": (
        "Python is the go-to language for data science, AI, and backend "
        "development. Its readability and vast ecosystem make it indispensable."
    ),
    "sql": (
        "SQL is the universal language for relational databases. Every "
        "backend developer needs it to store, query, and analyze data."
    ),
    "postgresql": (
        "PostgreSQL is the most advanced open-source relational database. "
        "Its reliability, extensibility, and ACID compliance make it a "
        "popular choice for production systems."
    ),
    "mongodb": (
        "MongoDB is the leading NoSQL document database. Its flexible "
        "schema design is well suited for rapid prototyping and big data."
    ),
    "docker": (
        "Docker containerizes applications for consistent deployment "
        "across environments. It is the foundation of modern DevOps and CI/CD."
    ),
    "kubernetes": (
        "Kubernetes orchestrates containerized applications at scale. "
        "It is the industry standard for production container management."
    ),
    "git": (
        "Git is the version control system used by virtually every "
        "software team. Branching, merging, and collaboration all depend on it."
    ),
    "linux": (
        "Linux powers most servers, cloud infrastructure, and DevOps "
        "tooling. Understanding the command line and file system is "
        "foundational for backend and infrastructure roles."
    ),
    "rest": (
        "REST APIs are the backbone of modern web communication. "
        "Understanding REST principles is essential for building "
        "interoperable services."
    ),
    "graphql": (
        "GraphQL provides a flexible, type-safe alternative to REST. "
        "It allows clients to request exactly the data they need, "
        "reducing over-fetching."
    ),
    "oauth": (
        "OAuth 2.0 is the industry standard for authorization. Every "
        "application that delegates authentication or uses third-party "
        "APIs relies on it."
    ),
    "redis": (
        "Redis is an in-memory data store used for caching, sessions, "
        "and real-time features. Its sub-millisecond latency is critical "
        "for high-performance systems."
    ),
    "nginx": (
        "Nginx is a high-performance web server and reverse proxy. "
        "It handles millions of concurrent connections and is a staple "
        "of production infrastructure."
    ),
    "html": (
        "HTML is the markup language that structures every web page. "
        "Semantic HTML improves accessibility and SEO."
    ),
    "css": (
        "CSS styles the visual presentation of the web. Modern CSS "
        "with Flexbox and Grid enables responsive, maintainable layouts."
    ),
    "node.js": (
        "Node.js brings JavaScript to the server side. Its event-driven "
        "architecture excels at I/O-heavy applications like APIs and "
        "real-time services."
    ),
    "express.js": (
        "Express.js is the most popular Node.js web framework. Its "
        "minimalist design makes it easy to build REST APIs and web apps."
    ),
    "fastapi": (
        "FastAPI provides high-performance async Python APIs with "
        "automatic OpenAPI docs. It is the modern choice for Python web services."
    ),
    "django": (
        "Django is a batteries-included Python web framework. Its "
        "ORM, admin panel, and built-in auth speed up development significantly."
    ),
    "flask": (
        "Flask is a lightweight Python web framework that gives you "
        "flexibility to choose your own components. It is great for "
        "small to medium-sized projects."
    ),
    "aws": (
        "AWS is the largest cloud provider, offering compute, storage, "
        "and managed services. Cloud skills are essential for modern "
        "infrastructure roles."
    ),
    "azure": (
        "Azure is Microsoft's cloud platform, deeply integrated with "
        "the Microsoft ecosystem. It is especially common in enterprise settings."
    ),
    "gcp": (
        "Google Cloud Platform offers leading services for data, AI, "
        "and Kubernetes (GKE). It is a strong third pillar in the cloud market."
    ),
    "terraform": (
        "Terraform enables infrastructure-as-code across multiple cloud "
        "providers. Codifying infrastructure makes deployments reproducible "
        "and auditable."
    ),
    "ansible": (
        "Ansible automates configuration management and application "
        "deployment without requiring agents on target machines."
    ),
    "pandas": (
        "Pandas is the foundational library for data manipulation in "
        "Python. Its DataFrame API is essential for data analysis and ETL."
    ),
    "numpy": (
        "NumPy provides fast numerical computations in Python. It is "
        "the building block for scientific computing and machine learning."
    ),
    "pytorch": (
        "PyTorch is the leading deep learning framework for research "
        "and production. Its dynamic computation graph makes it intuitive "
        "for building neural networks."
    ),
    "tensorflow": (
        "TensorFlow is Google's machine learning platform used in "
        "production systems worldwide. It supports both research and "
        "deployment."
    ),
    "scikit-learn": (
        "scikit-learn provides simple, battle-tested machine learning "
        "algorithms. It is the go-to library for classical ML workflows."
    ),
    "go": (
        "Go is a fast, compiled language designed for concurrent systems. "
        "It powers cloud infrastructure tools like Docker and Kubernetes."
    ),
    "rust": (
        "Rust offers memory safety without a garbage collector. It is "
        "ideal for systems programming, WebAssembly, and performance-critical code."
    ),
    "java": (
        "Java remains one of the most widely used languages, particularly "
        "in enterprise environments and Android development."
    ),
    "spring": (
        "Spring Boot dominates Java web development with its dependency "
        "injection, auto-configuration, and massive ecosystem."
    ),
    "dotnet": (
        ".NET is a cross-platform framework by Microsoft for building "
        "web, desktop, and mobile applications with C#."
    ),
    "testing": (
        "Automated testing ensures code quality and prevents regressions. "
        "Unit, integration, and end-to-end tests form the backbone of "
        "reliable software delivery."
    ),
    "ci/cd": (
        "CI/CD automates building, testing, and deploying code. It "
        "accelerates delivery and reduces human error in releases."
    ),
    "microservices": (
        "Microservices decompose applications into independently "
        "deployable services. They improve scalability and team autonomy "
        "at the cost of operational complexity."
    ),
    "design patterns": (
        "Design patterns provide reusable solutions to common software "
        "problems. They give developers a shared vocabulary and proven "
        "architectural approaches."
    ),
    "algorithm": (
        "Algorithms are the heart of computer science. Understanding "
        "time complexity and data structures enables efficient problem-solving."
    ),
    "data structure": (
        "Data structures organize information for efficient access and "
        "modification. Choosing the right structure is critical for "
        "performance and clarity."
    ),
    "networking": (
        "Networking fundamentals — TCP/IP, DNS, HTTP, load balancers — "
        "are essential for debugging and designing distributed systems."
    ),
    "security": (
        "Security best practices protect users and data from threats. "
        "Every developer should understand common vulnerabilities like "
        "XSS, CSRF, and SQL injection."
    ),
}


def generate_why_important(title: str, category: str | None, description: str | None) -> str:
    """Generate a meaningful why_important string for a given node."""
    lower = title.lower().strip()

    if lower in CURATED:
        return CURATED[lower]

    for key, value in CURATED.items():
        if key in lower:
            return value

    subject = title
    domain = (category or "software development").lower()

    if description:
        return (
            f"{subject} is a key concept in {domain}. {description[:200].rstrip('.')}. "
            f"Understanding it builds a stronger foundation for your {domain} skills."
        )

    return (
        f"{subject} is an important topic in {domain}. "
        f"Mastering it will strengthen your overall expertise and "
        f"help you build more robust applications."
    )
