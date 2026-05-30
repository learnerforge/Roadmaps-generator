import pytest
from httpx import AsyncClient


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={
            "email": "new@example.com",
            "password": "newpass123",
            "full_name": "New User",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["full_name"] == "New User"
        assert data["user"]["role"] == "user"

    async def test_register_duplicate_email(self, client: AsyncClient):
        await client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "password": "pass123",
            "full_name": "First",
        })
        resp = await client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "password": "pass456",
            "full_name": "Second",
        })
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"].lower()

    async def test_register_missing_fields(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={
            "email": "bad@example.com",
        })
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient):
        await client.post("/api/auth/register", json={
            "email": "login@example.com",
            "password": "loginpass",
            "full_name": "Login User",
        })
        resp = await client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "loginpass",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "login@example.com"

    async def test_login_wrong_password(self, client: AsyncClient):
        await client.post("/api/auth/register", json={
            "email": "wrong@example.com",
            "password": "correctpass",
            "full_name": "Wrong User",
        })
        resp = await client.post("/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "anything",
        })
        assert resp.status_code == 401


class TestProfile:
    async def test_get_me(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    async def test_get_me_unauthorized(self, client: AsyncClient):
        resp = await client.get("/api/me")
        assert resp.status_code == 403

    async def test_update_me(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch("/api/me", headers=auth_headers, json={
            "full_name": "Updated Name",
            "bio": "New bio text",
        })
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"
        assert resp.json()["bio"] == "New bio text"

    async def test_update_me_partial(self, client: AsyncClient, auth_headers: dict):
        resp = await client.patch("/api/me", headers=auth_headers, json={
            "current_role": "Senior Dev",
        })
        assert resp.status_code == 200
        assert resp.json()["current_role"] == "Senior Dev"
