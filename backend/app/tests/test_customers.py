"""Tests de endpoints de clientes — CRUD.

Todos los endpoints de /customers exigen admin autenticado (son operaciones del
panel, no del funnel público). Cada test se loguea primero; además
test_customer_endpoints_require_auth verifica el rechazo 401 sin sesión.
"""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    """Registra y loguea un admin; deja la cookie de sesión en el client."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "customers@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "customers@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_customer_endpoints_require_auth(client: AsyncClient):
    """Sin login, POST/GET/PATCH de clientes deben rechazarse con 401."""
    create = await client.post(
        "/api/v1/customers/",
        json={"name": "No Auth", "email": "noauth@example.com", "phone": "6240000001"},
    )
    assert create.status_code == 401

    get = await client.get("/api/v1/customers/does-not-matter")
    assert get.status_code == 401

    patch = await client.patch("/api/v1/customers/does-not-matter", json={"name": "x"})
    assert patch.status_code == 401


@pytest.mark.asyncio
async def test_create_customer(client: AsyncClient):
    """Test: crear cliente devuelve 201 con los datos."""
    await _login_as_admin(client)
    payload = {
        "name": "Carlos Sánchez",
        "email": "carlos@example.com",
        "phone": "6241112222",
        "country": "México",
        "language": "es",
    }

    response = await client.post("/api/v1/customers/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Carlos Sánchez"
    assert data["email"] == "carlos@example.com"
    assert data["phone"] == "6241112222"


@pytest.mark.asyncio
async def test_create_duplicate_customer(client: AsyncClient):
    """Test: email duplicado devuelve 409."""
    await _login_as_admin(client)
    payload = {
        "name": "Dup Customer",
        "email": "dup@example.com",
        "phone": "6240000000",
    }

    r1 = await client.post("/api/v1/customers/", json=payload)
    assert r1.status_code == 201

    r2 = await client.post("/api/v1/customers/", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_get_customer(client: AsyncClient):
    """Test: crear y luego obtener cliente por ID."""
    await _login_as_admin(client)
    create_resp = await client.post(
        "/api/v1/customers/",
        json={
            "name": "Get Test",
            "email": "get@example.com",
            "phone": "6243334444",
        },
    )
    customer_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Get Test"


@pytest.mark.asyncio
async def test_update_customer(client: AsyncClient):
    """Test: actualizar cliente cambia los campos enviados."""
    await _login_as_admin(client)
    create_resp = await client.post(
        "/api/v1/customers/",
        json={
            "name": "Original",
            "email": "update@example.com",
            "phone": "6245556666",
        },
    )
    customer_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"/api/v1/customers/{customer_id}",
        json={"name": "Actualizado", "country": "USA"},
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["name"] == "Actualizado"
    assert data["country"] == "USA"
    assert data["email"] == "update@example.com"  # No cambió


@pytest.mark.asyncio
async def test_phone_cleaning(client: AsyncClient):
    """Test: el teléfono se limpia automáticamente."""
    await _login_as_admin(client)
    payload = {
        "name": "Phone Test",
        "email": "phone@example.com",
        "phone": "(624) 123-4567",
    }

    response = await client.post("/api/v1/customers/", json=payload)
    assert response.status_code == 201
    assert response.json()["phone"] == "6241234567"
