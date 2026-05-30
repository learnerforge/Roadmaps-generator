import pytest
from httpx import AsyncClient


class TestEnroll:
    async def test_start_roadmap(self, client: AsyncClient, auth_headers: dict, test_roadmap):
        resp = await client.post(f"/api/progress/{test_roadmap.slug}/start", headers=auth_headers)
        assert resp.status_code == 200
        assert "enrolled" in resp.json()["message"].lower()

    async def test_start_roadmap_already_enrolled(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap, test_roadmap):
        resp = await client.post(f"/api/progress/{test_roadmap.slug}/start", headers=auth_headers)
        assert resp.status_code == 200
        assert "already" in resp.json()["message"].lower()

    async def test_start_roadmap_not_found(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/progress/nonexistent/start", headers=auth_headers)
        assert resp.status_code == 404

    async def test_start_roadmap_unauthorized(self, client: AsyncClient, test_roadmap):
        resp = await client.post(f"/api/progress/{test_roadmap.slug}/start")
        assert resp.status_code == 403


class TestProgress:
    async def test_get_progress(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap, test_roadmap):
        resp = await client.get(f"/api/progress/{test_roadmap.slug}/progress", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "progress" in data
        assert isinstance(data["progress"], list)

    async def test_get_progress_not_enrolled(self, client: AsyncClient, auth_headers: dict, test_roadmap):
        resp = await client.get(f"/api/progress/{test_roadmap.slug}/progress", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["progress"] == []


class TestUpdateNodeStatus:
    async def test_mark_node_done(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.patch(f"/api/progress/node/{node.id}", headers=auth_headers, json={
            "status": "done",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "done"
        assert data["completion_pct"] >= 0
        assert data["node_id"] == str(node.id)

    async def test_update_node_in_progress(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.patch(f"/api/progress/node/{node.id}", headers=auth_headers, json={
            "status": "in_progress",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "in_progress"

    async def test_update_node_not_found(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch("/api/progress/node/00000000-0000-0000-0000-000000000000", headers=auth_headers, json={
            "status": "done",
        })
        assert resp.status_code == 404

    async def test_update_node_invalid_uuid(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch("/api/progress/node/bad-uuid", headers=auth_headers, json={
            "status": "done",
        })
        assert resp.status_code == 400

    async def test_update_node_unauthorized(self, client: AsyncClient, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.patch(f"/api/progress/node/{node.id}", json={"status": "done"})
        assert resp.status_code == 403

    async def test_completion_pct(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap, test_roadmap_nodes):
        for node in test_roadmap_nodes:
            resp = await client.patch(f"/api/progress/node/{node.id}", headers=auth_headers, json={
                "status": "done",
            })
        assert resp.status_code == 200
        assert resp.json()["completion_pct"] == 100.0


class TestDashboard:
    async def test_dashboard_summary(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/progress/dashboard/summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "active_roadmaps" in data
        assert "total_nodes_completed" in data
        assert "streak_days" in data
        assert "recent_activity" in data

    async def test_my_roadmaps(self, client: AsyncClient, auth_headers: dict, enrolled_roadmap):
        resp = await client.get("/api/progress/my-roadmaps", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["roadmap"]["slug"] == "test-roadmap"
        assert "started_at" in data[0]
        assert "completion_pct" in data[0]
