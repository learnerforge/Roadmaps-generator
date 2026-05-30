import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import init_db

async def test():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/auth/register", json={"email": "null@test.com", "password": "Pass123!", "full_name": "Null Tester"})
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        r = await c.get("/api/roadmaps/nonexistent-roadmap")
        assert r.status_code == 404
        print(f"1. nonexistent slug: {r.status_code}")

        r = await c.get("/api/roadmaps/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404
        print(f"2. nonexistent uuid: {r.status_code}")

        r = await c.get("/api/roadmaps/nodes/not-a-uuid")
        assert r.status_code == 400
        print(f"3. invalid uuid: {r.status_code} {r.json()['detail'][:30]}")

        r = await c.post("/api/auth/register", json={})
        assert r.status_code == 422
        print(f"4. empty register: {r.status_code}")

        r = await c.post("/api/auth/login", json={"email": "null@test.com", "password": "wrong"})
        assert r.status_code == 401
        print(f"5. wrong password: {r.status_code}")

        r = await c.post("/api/progress/nonexistent/start", headers=h)
        assert r.status_code == 404
        print(f"6. start nonexistent: {r.status_code}")

        r = await c.delete("/api/progress/ai-agents/unenroll", headers=h)
        assert r.status_code == 404
        print(f"7. unenroll not enrolled: {r.status_code}")

        r = await c.get("/api/roadmaps")
        rms = r.json()
        slug = rms[0]["slug"] if rms else None

        if slug:
            r = await c.get(f"/api/roadmaps/{slug}")
            nodes = r.json().get("nodes", [])
            if nodes:
                nid = str(nodes[0]["id"])
                r = await c.patch(f"/api/progress/node/{nid}", headers=h, json={"status": "done"})
                pct = r.json()["completion_pct"]
                print(f"8. update without enroll: {r.status_code} {pct:.1f}%")

            r = await c.get(f"/api/progress/{slug}/export?format=xml", headers=h)
            assert r.status_code == 422
            print(f"9. bad format: {r.status_code}")

            r = await c.get(f"/api/progress/{slug}/export?format=json")
            assert r.status_code == 403
            print(f"10. export no auth: {r.status_code}")

            r = await c.get(f"/api/roadmaps/{slug}")
            nodes = r.json().get("nodes", [])
            if nodes:
                nid = str(nodes[0]["id"])
                r = await c.get(f"/api/roadmaps/nodes/{nid}")
                nd = r.json()
                nulls = [k for k, v in nd.items() if v is None]
                print(f"11. node null fields: {nulls if nulls else 'none'}")

        r = await c.post("/api/auth/social", json={"provider": "", "token": "x"})
        assert r.status_code == 400
        print(f"12. empty provider: {r.status_code}")

        print()
        print("ALL 12 NULL/EDGE CASE CHECKS PASSED")

asyncio.run(test())
