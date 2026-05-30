import asyncio, sys
sys.path.insert(0, ".")
from app.db.session import AsyncSessionLocal, init_db
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from app.models.progress import UserNodeProgress
from app.models.user import Profile
from sqlalchemy import select, func, text

async def check():
    await init_db()
    async with AsyncSessionLocal() as db:
        rm_count = (await db.execute(select(func.count(Roadmap.id)))).scalar()
        node_count = (await db.execute(select(func.count(RoadmapNode.id)))).scalar()
        dep_q = await db.execute(text("SELECT COUNT(*) FROM node_dependencies"))
        dep_count = dep_q.scalar()

        cat_result = await db.execute(
            select(Roadmap.category, func.count(Roadmap.id))
            .group_by(Roadmap.category).order_by(Roadmap.category)
        )
        cats = {r[0]: r[1] for r in cat_result.all()}

        orphan_nodes = (await db.execute(
            select(func.count(RoadmapNode.id)).where(RoadmapNode.roadmap_id == None)
        )).scalar()

        profile_count = (await db.execute(select(func.count(Profile.id)))).scalar()
        prog_count = (await db.execute(select(func.count(UserNodeProgress.id)))).scalar()

        print(f"Roadmaps: {rm_count}")
        print(f"Nodes: {node_count}")
        print(f"Dependencies: {dep_count}")
        print(f"Categories: {cats}")
        print(f"Orphaned nodes: {orphan_nodes}")
        print(f"Profiles: {profile_count}")
        print(f"Progress records: {prog_count}")

        if rm_count:
            result = await db.execute(
                select(Roadmap.slug, func.count(RoadmapNode.id))
                .outerjoin(RoadmapNode, RoadmapNode.roadmap_id == Roadmap.id)
                .group_by(Roadmap.slug)
                .having(func.count(RoadmapNode.id) == 0)
            )
            empty = [r[0] for r in result.all()]
            if empty:
                print(f"Roadmaps with 0 nodes: {empty}")

            sample = await db.execute(select(NodeDependency).limit(3))
            for s in sample.scalars().all():
                src = await db.get(RoadmapNode, s.depends_on_node_id)
                tgt = await db.get(RoadmapNode, s.node_id)
                if src and tgt:
                    print(f"  Edge: {src.title} -> {tgt.title}")

asyncio.run(check())
