import pytest
from httpx import AsyncClient


class TestAdminStats:
    async def test_stats(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/admin/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_users" in data
        assert "total_roadmaps" in data
        assert "published_roadmaps" in data
        assert "total_nodes" in data
        assert "open_feedback" in data

    async def test_stats_unauthorized(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/admin/stats", headers=auth_headers)
        assert resp.status_code == 403


class TestAdminUsers:
    async def test_list_users(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    async def test_change_role(self, client: AsyncClient, super_admin_headers: dict, test_user):
        resp = await client.patch(f"/api/admin/users/{test_user.id}/role", headers=super_admin_headers, json={
            "role": "admin",
        })
        assert resp.status_code == 200
        assert resp.json()["new_role"] == "admin"

    async def test_change_role_not_super_admin(self, client: AsyncClient, admin_headers: dict, test_user):
        resp = await client.patch(f"/api/admin/users/{test_user.id}/role", headers=admin_headers, json={
            "role": "admin",
        })
        assert resp.status_code == 403

    async def test_change_role_invalid_uuid(self, client: AsyncClient, super_admin_headers: dict):
        resp = await client.patch("/api/admin/users/bad-uuid/role", headers=super_admin_headers, json={
            "role": "admin",
        })
        assert resp.status_code == 400

    async def test_change_role_not_found(self, client: AsyncClient, super_admin_headers: dict):
        resp = await client.patch("/api/admin/users/00000000-0000-0000-0000-000000000000/role", headers=super_admin_headers, json={
            "role": "admin",
        })
        assert resp.status_code == 404


class TestFeedback:
    async def test_list_feedback(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/admin/feedback", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_update_feedback_status(self, client: AsyncClient, admin_headers: dict, test_admin, db):
        from app.models.feedback import Feedback
        import uuid
        fb = Feedback(
            id=uuid.uuid4(),
            user_id=test_admin.id,
            content="Test feedback",
            type="general",
            status="open",
        )
        db.add(fb)
        await db.commit()
        await db.refresh(fb)

        resp = await client.patch(f"/api/admin/feedback/{fb.id}", headers=admin_headers, json={
            "status": "resolved",
        })
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    async def test_update_feedback_invalid_uuid(self, client: AsyncClient, admin_headers: dict):
        resp = await client.patch("/api/admin/feedback/bad-uuid", headers=admin_headers, json={
            "status": "resolved",
        })
        assert resp.status_code == 400
