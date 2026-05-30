import pytest
from httpx import AsyncClient


class TestListRoadmaps:
    async def test_list_published(self, client: AsyncClient, test_roadmap):
        resp = await client.get("/api/roadmaps")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["slug"] == "test-roadmap"

    async def test_list_empty_when_none_published(self, client: AsyncClient, test_roadmap):
        test_roadmap.is_published = False
        resp = await client.get("/api/roadmaps")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    async def test_list_filter_by_category(self, client: AsyncClient, test_roadmap):
        resp = await client.get("/api/roadmaps?category=skill-based")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        resp = await client.get("/api/roadmaps?category=nonexistent")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    async def test_list_search(self, client: AsyncClient, test_roadmap):
        resp = await client.get("/api/roadmaps?search=Test")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        resp = await client.get("/api/roadmaps?search=zzzzz")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


class TestGetRoadmap:
    async def test_get_by_slug(self, client: AsyncClient, test_roadmap, test_roadmap_nodes):
        resp = await client.get(f"/api/roadmaps/{test_roadmap.slug}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["roadmap"]["slug"] == test_roadmap.slug
        assert len(data["nodes"]) == 3

    async def test_get_by_uuid(self, client: AsyncClient, test_roadmap, test_roadmap_nodes):
        resp = await client.get(f"/api/roadmaps/{test_roadmap.id}")
        assert resp.status_code == 200
        assert resp.json()["roadmap"]["id"] == str(test_roadmap.id)

    async def test_get_not_found(self, client: AsyncClient):
        resp = await client.get("/api/roadmaps/nonexistent-slug")
        assert resp.status_code == 404


class TestNodeDetail:
    async def test_get_node_detail(self, client: AsyncClient, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.get(f"/api/roadmaps/nodes/{node.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == node.title
        assert "dependencies" in data
        assert "dependents" in data
        assert "resources" in data
        assert data["status"] == "pending"
        assert data["is_bookmarked"] is False

    async def test_get_node_detail_with_deps(self, client: AsyncClient, test_roadmap_nodes):
        node = test_roadmap_nodes[1]
        resp = await client.get(f"/api/roadmaps/nodes/{node.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["dependencies"]) >= 1

    async def test_get_node_invalid_uuid(self, client: AsyncClient):
        resp = await client.get("/api/roadmaps/nodes/not-a-uuid")
        assert resp.status_code == 400

    async def test_get_node_not_found(self, client: AsyncClient):
        resp = await client.get("/api/roadmaps/nodes/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404

    async def test_get_node_dependencies(self, client: AsyncClient, test_roadmap_nodes):
        node = test_roadmap_nodes[1]
        resp = await client.get(f"/api/roadmaps/nodes/{node.id}/dependencies")
        assert resp.status_code == 200
        data = resp.json()
        assert "depends_on" in data
        assert "required_by" in data

    async def test_get_node_resources(self, client: AsyncClient, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.get(f"/api/roadmaps/nodes/{node.id}/resources")
        assert resp.status_code == 200
        assert resp.json() == []


class TestListNodes:
    async def test_list_nodes(self, client: AsyncClient, test_roadmap, test_roadmap_nodes):
        resp = await client.get(f"/api/roadmaps/{test_roadmap.id}/nodes")
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    async def test_list_nodes_by_slug(self, client: AsyncClient, test_roadmap, test_roadmap_nodes):
        resp = await client.get(f"/api/roadmaps/{test_roadmap.slug}/nodes")
        assert resp.status_code == 200
        assert len(resp.json()) == 3


class TestCreateRoadmapAdmin:
    async def test_create_roadmap(self, client: AsyncClient, admin_headers: dict):
        resp = await client.post("/api/roadmaps", headers=admin_headers, json={
            "title": "New Roadmap",
            "slug": "new-roadmap",
            "description": "Brand new",
            "category": "skill-based",
            "difficulty": "intermediate",
        })
        assert resp.status_code == 200
        assert resp.json()["slug"] == "new-roadmap"

    async def test_create_roadmap_duplicate_slug(self, client: AsyncClient, admin_headers: dict, test_roadmap):
        resp = await client.post("/api/roadmaps", headers=admin_headers, json={
            "title": "Duplicate",
            "slug": test_roadmap.slug,
            "description": "Will fail",
            "category": "skill-based",
        })
        assert resp.status_code == 400

    async def test_create_roadmap_unauthorized(self, client: AsyncClient, test_roadmap):
        resp = await client.post("/api/roadmaps", json={
            "title": "Hacked",
            "slug": "hacked",
            "description": "Should fail",
            "category": "skill-based",
        })
        assert resp.status_code == 403


class TestUpdateDeleteRoadmap:
    async def test_update_roadmap(self, client: AsyncClient, admin_headers: dict, test_roadmap):
        resp = await client.patch(f"/api/roadmaps/{test_roadmap.id}", headers=admin_headers, json={
            "title": "Updated Title",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    async def test_publish_roadmap(self, client: AsyncClient, admin_headers: dict, test_roadmap):
        test_roadmap.is_published = False
        resp = await client.patch(f"/api/roadmaps/{test_roadmap.id}/publish", headers=admin_headers, json={
            "is_published": True,
        })
        assert resp.status_code == 200
        assert resp.json()["is_published"] is True

    async def test_delete_roadmap(self, client: AsyncClient, admin_headers: dict, test_roadmap):
        resp = await client.delete(f"/api/roadmaps/{test_roadmap.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True


class TestNodesCRUD:
    async def test_create_node(self, client: AsyncClient, admin_headers: dict, test_roadmap):
        resp = await client.post(f"/api/roadmaps/{test_roadmap.id}/nodes", headers=admin_headers, json={
            "title": "New Node",
            "order_index": 5,
            "node_type": "topic",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Node"

    async def test_update_node(self, client: AsyncClient, admin_headers: dict, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.patch(f"/api/roadmaps/nodes/{node.id}", headers=admin_headers, json={
            "title": "Updated Node",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Node"

    async def test_delete_node(self, client: AsyncClient, admin_headers: dict, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.delete(f"/api/roadmaps/nodes/{node.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True


class TestResources:
    async def test_create_resource(self, client: AsyncClient, admin_headers: dict, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        resp = await client.post(f"/api/roadmaps/nodes/{node.id}/resources", headers=admin_headers, json={
            "title": "Test Resource",
            "url": "https://example.com",
            "type": "article",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Test Resource"

    async def test_delete_resource(self, client: AsyncClient, admin_headers: dict, test_roadmap_nodes):
        node = test_roadmap_nodes[0]
        create = await client.post(f"/api/roadmaps/nodes/{node.id}/resources", headers=admin_headers, json={
            "title": "To Delete",
            "url": "https://example.com/del",
            "type": "video",
        })
        rid = create.json()["id"]
        resp = await client.delete(f"/api/roadmaps/resources/{rid}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True
