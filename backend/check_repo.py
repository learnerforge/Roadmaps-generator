import httpx, asyncio

async def check():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        tests = [
            ("master branch dir", "https://api.github.com/repos/nilbuild/developer-roadmap/contents/src/data/roadmaps"),
            ("main branch dir", "https://api.github.com/repos/nilbuild/developer-roadmap/contents/src/data/roadmaps?ref=main"),
            ("frontend.json master", "https://raw.githubusercontent.com/nilbuild/developer-roadmap/master/src/data/roadmaps/frontend/frontend.json"),
            ("frontend.json main", "https://raw.githubusercontent.com/nilbuild/developer-roadmap/main/src/data/roadmaps/frontend/frontend.json"),
        ]
        for label, url in tests:
            resp = await client.get(url, timeout=15)
            print(f"{label}: HTTP {resp.status_code}")
            if resp.status_code == 200:
                if url.endswith(".json"):
                    data = resp.json()
                    print(f"  nodes: {len(data.get('nodes', []))}, edges: {len(data.get('edges', []))}")
                else:
                    items = resp.json()
                    print(f"  Found {len(items)} items")
                    for item in items[:5]:
                        print(f"  - {item['name']} ({item['type']})")
            else:
                print(f"  {resp.text[:300]}")

asyncio.run(check())
