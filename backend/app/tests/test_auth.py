"""Tests de endpoints de autenticación — login, register."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test: login con credenciales válidas devuelve JWT + cookie."""
    # 1. Registrar admin primero
    register_payload = {
        "email": "admin@classvip.com",
        "password": "Admin123!",
        "role": "admin",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_resp.status_code == 201

    # 2. Login
    login_payload = {"email": "admin@classvip.com", "password": "Admin123!"}
    login_resp = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert len(data["access_token"]) > 0
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test: contraseña incorrecta devuelve 401."""
    # Registrar admin
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@classvip.com",
            "password": "Admin123!",
            "role": "admin",
        },
    )

    # Intentar login con contraseña incorrecta
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@classvip.com", "password": "WrongPass1"},
    )
    assert login_resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    """Test: email no registrado devuelve 401."""
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "noexiste@test.com", "password": "Cualquiera1"},
    )
    assert login_resp.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test: registrar mismo email dos veces devuelve 409."""
    payload = {
        "email": "dup@classvip.com",
        "password": "Admin123!",
        "role": "admin",
    }

    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_me_returns_session_after_login(client: AsyncClient):
    """Test CRÍTICO: el frontend (AdminRoute) usa /auth/me para saber si ya
    hay sesión activa al cargar el panel. Sin este endpoint, el login parece
    exitoso pero el admin nunca entra — siempre rebota a /admin/login.
    """
    await client.post(
        "/api/v1/auth/register",
        json={"email": "me@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    await client.post(
        "/api/v1/auth/login",
        json={"email": "me@classvip.com", "password": "Admin123!"},
    )

    me_resp = await client.get("/api/v1/auth/me")
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "me@classvip.com"


@pytest.mark.asyncio
async def test_me_without_session_returns_401(client: AsyncClient):
    """Test: sin cookie de sesión, /auth/me devuelve 401 (no 404)."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_routes_protected(client: AsyncClient):
    """Test: GET /admin/users sin auth devuelve 401."""
    response = await client.get("/api/v1/admin/users")
    assert response.status_code == 401
