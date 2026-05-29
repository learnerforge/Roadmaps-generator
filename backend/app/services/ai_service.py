import json
from typing import Optional
from app.core.config import get_settings

settings = get_settings()

EXPLAIN_PROMPT = """You are a patient, friendly tech mentor helping an Indian engineering student learn {topic_title}.

The student has described their level as: {experience_level}.
This topic is part of the {roadmap_title} roadmap.

Please explain "{topic_title}" in the following structure:
1. **What it is** (2-3 simple sentences, no jargon)
2. **Real-world analogy** (something from everyday life)
3. **Why it matters** (how it helps in a developer job)
4. **Quick code example** (if applicable, 5-10 lines max)
5. **What to learn next** (1-2 topics that logically follow)

Keep the tone friendly, encouraging, and clear. Avoid overwhelming the student."""

SIMPLIFY_PROMPT = """Explain "{topic_title}" as if you're talking to a complete beginner who has never coded before. Use:
- Everyday analogies (food, sports, travel)
- No technical jargon
- Maximum 150 words
- End with: "The key thing to remember is: [one sentence summary]""""

QUIZ_PROMPT = """Generate exactly {count} multiple-choice questions to test understanding of "{topic_title}".

Rules:
- Each question should have 4 options (A, B, C, D)
- Only 1 correct answer per question
- Include a short explanation for the correct answer
- Target difficulty: {difficulty_level}
- Questions should test conceptual understanding, not memorisation

Return as valid JSON array:
[{{"question": "...", "options": ["A: ...", "B: ...", "C: ...", "D: ..."], "correct": "A", "explanation": "..."}}]

Only return the JSON array. No preamble, no markdown fences."""

PROJECT_PROMPT = """A student has completed the following topics from the {roadmap_title} roadmap:
{completed_topics_list}

Suggest 3 coding projects they can build to practice these skills:
1. **Beginner project** — can be built in 1-2 days, uses the basics
2. **Intermediate project** — takes 1 week, combines multiple concepts
3. **Advanced project** — takes 2-3 weeks, portfolio-worthy

For each project:
- Project name
- What it does (1-2 sentences)
- Technologies used (from their learned skills only)
- Key learning outcome
- Suggested first step to start

Keep it practical and achievable for an Indian engineering student building a portfolio."""

WEEKLY_PLAN_PROMPT = """You are a learning coach helping a developer follow the {roadmap_title} roadmap.

Student profile:
- Experience: {experience_level}
- Available hours per week: {hours_per_week}
- Completed nodes: {completed_nodes_list}
- Remaining nodes: {remaining_nodes_list}

Generate a structured 7-day learning plan for this week.
For each day, list:
- The topic/node to focus on
- What to do (read, practice, build)
- Estimated time (in hours)
- One small output or exercise

Keep the plan realistic. Do not overload any single day."""


async def call_gemini(prompt: str) -> str:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}")


async def call_openai(prompt: str) -> str:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


async def call_ai(prompt: str) -> str:
    if settings.GEMINI_API_KEY:
        try:
            return await call_gemini(prompt)
        except Exception:
            if settings.OPENAI_API_KEY:
                return await call_openai(prompt)
            raise
    elif settings.OPENAI_API_KEY:
        return await call_openai(prompt)
    raise Exception("No AI API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env")


async def explain_topic(
    topic_title: str,
    experience_level: str = "beginner",
    roadmap_title: str = "General",
) -> str:
    prompt = EXPLAIN_PROMPT.format(
        topic_title=topic_title,
        experience_level=experience_level,
        roadmap_title=roadmap_title,
    )
    return await call_ai(prompt)


async def simplify_topic(topic_title: str) -> str:
    prompt = SIMPLIFY_PROMPT.format(topic_title=topic_title)
    return await call_ai(prompt)


async def generate_quiz(topic_title: str, count: int = 5, difficulty_level: str = "beginner") -> list:
    prompt = QUIZ_PROMPT.format(
        topic_title=topic_title,
        count=count,
        difficulty_level=difficulty_level,
    )
    result = await call_ai(prompt)
    try:
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return []


async def suggest_projects(
    roadmap_title: str,
    completed_topics: list[str],
) -> str:
    prompt = PROJECT_PROMPT.format(
        roadmap_title=roadmap_title,
        completed_topics_list=", ".join(completed_topics),
    )
    return await call_ai(prompt)


async def generate_weekly_plan(
    roadmap_title: str,
    experience_level: str,
    hours_per_week: int,
    completed_nodes: list[str],
    remaining_nodes: list[str],
) -> str:
    prompt = WEEKLY_PLAN_PROMPT.format(
        roadmap_title=roadmap_title,
        experience_level=experience_level,
        hours_per_week=hours_per_week,
        completed_nodes_list=", ".join(completed_nodes) if completed_nodes else "None yet",
        remaining_nodes_list=", ".join(remaining_nodes) if remaining_nodes else "All completed",
    )
    return await call_ai(prompt)
