"""Backfill why_important for all existing roadmap nodes that have NULL values.

Usage: py enrich_why_important.py
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal, init_db
from app.models.roadmap import RoadmapNode
from sqlalchemy import select, null
from why_important_templates import generate_why_important


async def enrich():
    await init_db()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RoadmapNode).where(RoadmapNode.why_important == null())
        )
        nodes = result.scalars().all()
        total = len(nodes)
        if total == 0:
            print("No nodes need enrichment.")
            return

        print(f"Enriching {total} nodes...")
        for i, node in enumerate(nodes):
            node.why_important = generate_why_important(
                node.title, node.category, node.description
            )
            if (i + 1) % 500 == 0:
                await db.flush()
                print(f"  Flushed {i + 1}/{total}")

        await db.commit()
        print(f"Done — enriched {total} nodes.")


if __name__ == "__main__":
    asyncio.run(enrich())
