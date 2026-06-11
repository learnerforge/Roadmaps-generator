import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal, init_db
from app.models.roadmap import Roadmap, RoadmapNode, NodeDependency
from sqlalchemy import select, func
from collections import defaultdict

async def analyze():
    await init_db()
    async with AsyncSessionLocal() as db:
        # Get all roadmaps
        roadmaps = await db.execute(select(Roadmap).order_by(Roadmap.slug))
        roadmaps = roadmaps.scalars().all()
        
        total_isolated = 0
        total_nodes = 0
        total_deps = 0
        
        for rm in roadmaps:
            # Get nodes
            nodes_r = await db.execute(
                select(RoadmapNode).where(RoadmapNode.roadmap_id == rm.id).order_by(RoadmapNode.order_index)
            )
            nodes = nodes_r.scalars().all()
            node_ids = [n.id for n in nodes]
            node_map = {str(n.id): n for n in nodes}
            
            if not node_ids:
                continue
            
            # Get dependencies
            deps_r = await db.execute(
                select(NodeDependency).where(NodeDependency.node_id.in_(node_ids))
            )
            deps = deps_r.scalars().all()
            
            # Build adjacency
            incoming = defaultdict(set)  # node_id -> set of depends_on_node_id
            outgoing = defaultdict(set)  # depends_on_node_id -> set of node_id
            
            for d in deps:
                dn = str(d.depends_on_node_id)
                n = str(d.node_id)
                if dn in node_map and n in node_map:
                    outgoing[dn].add(n)
                    incoming[n].add(dn)
            
            n_count = len(nodes)
            d_count = len(deps)
            total_nodes += n_count
            total_deps += d_count
            
            # Analyze connectivity
            isolated = []
            starts = []  # 0 incoming, 1+ outgoing
            ends = []    # 1+ incoming, 0 outgoing
            mid = []     # 1+ incoming, 1+ outgoing
            
            for nid_str, node in node_map.items():
                in_deg = len(incoming.get(nid_str, []))
                out_deg = len(outgoing.get(nid_str, []))
                
                if in_deg == 0 and out_deg == 0:
                    isolated.append(node.title or "?")
                elif in_deg == 0 and out_deg > 0:
                    starts.append((node.title or "?", out_deg))
                elif in_deg > 0 and out_deg == 0:
                    ends.append((node.title or "?", in_deg))
                else:
                    mid.append((node.title or "?", in_deg, out_deg))
            
            total_isolated += len(isolated)
            
            # Show summary
            flag = ""
            if len(isolated) > n_count * 0.3:
                flag = " *** HIGH ISOLATION ***"
            elif d_count == 0 and n_count > 0:
                flag = " *** NO EDGES ***"
            elif len(starts) == 0 and d_count > 0:
                flag = " *** NO ROOT NODES ***"
            elif len(ends) == 0 and d_count > 0:
                flag = " *** NO LEAF NODES ***"
            
            print(f"\n{'='*70}")
            print(f"{rm.title} ({rm.slug})")
            print(f"  Nodes: {n_count}  |  Edges: {d_count}  |  Ratio: {d_count/max(n_count,1):.2f}")
            print(f"  Starts (root): {len(starts)}  |  Ends (leaf): {len(ends)}  |  Mid: {len(mid)}  |  Isolated: {len(isolated)}{flag}")
            
            if starts and len(starts) <= 8:
                for t, od in starts[:8]:
                    print(f"    START -> {t[:55]} (->{od})")
            elif starts:
                print(f"    ({len(starts)} start nodes, showing first 8)")
                for t, od in list(starts)[:8]:
                    print(f"    START -> {t[:55]} (->{od})")
            
            if ends and len(ends) <= 8:
                for t, ide in ends[:8]:
                    print(f"    END <- {t[:55]} ({ide}->)")
            elif ends:
                print(f"    ({len(ends)} end nodes, showing first 8)")
                for t, ide in list(ends)[:8]:
                    print(f"    END <- {t[:55]} ({ide}->)")
            
            if isolated and len(isolated) <= 15:
                for t in isolated[:15]:
                    print(f"    ISOLATED: {t[:55]}")
            elif isolated:
                print(f"    ({len(isolated)} isolated nodes, showing first 15)")
                for t in isolated[:15]:
                    print(f"    ISOLATED: {t[:55]}")
            
            if flag:
                print(f"  *** {flag.strip('* ')} ***")
        
        print(f"\n{'='*70}")
        print(f"TOTAL: {total_nodes} nodes, {total_deps} deps, {total_isolated} isolated")
        print(f"{'='*70}")

if __name__ == "__main__":
    asyncio.run(analyze())
