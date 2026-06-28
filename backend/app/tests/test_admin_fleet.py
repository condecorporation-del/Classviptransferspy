"""Tests de conductores y vehículos (pestaña RRHH del admin)."""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "fleet@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "fleet@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_drivers_require_auth(client: AsyncClient):
    """Test: sin sesión, /admin/drivers devuelve 401."""
    response = await client.get("/api/v1/admin/drivers")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_drivers(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/drivers",
        json={"name": "Juan Pérez", "phone": "6241234567", "email": "juan@classvip.com"},
    )
    assert create_resp.status_code == 201
    driver = create_resp.json()
    assert driver["name"] == "Juan Pérez"
    assert driver["is_active"] is True

    list_resp = await client.get("/api/v1/admin/drivers")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Juan Pérez"


@pytest.mark.asyncio
async def test_create_and_list_vehicles(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/vehicles",
        json={"make": "Ford", "model": "Transit", "license_plate": "ABC-1234", "capacity": 14},
    )
    assert create_resp.status_code == 201
    vehicle = create_resp.json()
    assert vehicle["license_plate"] == "ABC-1234"
    assert vehicle["is_active"] is True

    list_resp = await client.get("/api/v1/admin/vehicles")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["items"][0]["make"] == "Ford"
