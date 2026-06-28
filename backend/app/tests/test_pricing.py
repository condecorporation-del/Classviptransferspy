"""Tests de endpoints de precios — hoteles, áreas, reglas, extras.

Los GET son públicos (el formulario de reserva necesita ver precios sin login),
pero las escrituras (POST/PATCH) exigen admin autenticado. Estos tests cubren
ambos caminos, incluyendo el rechazo 401 sin auth y el 409 por nombre duplicado.
"""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    """Registra y loguea un admin; deja la cookie de sesión en el client."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "pricing@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "pricing@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_create_and_list_hotels(client: AsyncClient):
    """Test: crear hotel y listarlo."""
    await _login_as_admin(client)
    payload = {"name": "Grand Velas", "zone": "Los Cabos", "is_active": True}

    create_resp = await client.post("/api/v1/pricing/hotels", json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["name"] == "Grand Velas"

    list_resp = await client.get("/api/v1/pricing/hotels")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["items"]) >= 1


@pytest.mark.asyncio
async def test_update_hotel(client: AsyncClient):
    """Test: crear hotel y actualizarlo."""
    await _login_as_admin(client)
    create_resp = await client.post(
        "/api/v1/pricing/hotels",
        json={"name": "Original Hotel", "zone": "Cabo", "is_active": True},
    )
    hotel_id = create_resp.json()["id"]

    patch_resp = await client.patch(
        f"/api/v1/pricing/hotels/{hotel_id}",
        json={"name": "Updated Hotel"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Updated Hotel"


@pytest.mark.asyncio
async def test_create_and_list_areas(client: AsyncClient):
    """Test: crear área y listarla."""
    await _login_as_admin(client)
    payload = {
        "name": "SJD Airport",
        "one_way_price_cents": 12000,
        "round_trip_price_cents": 20000,
        "sprinter_one_way_price_cents": 18000,
        "sprinter_round_trip_price_cents": 30000,
    }

    create_resp = await client.post("/api/v1/pricing/areas", json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["one_way_price_cents"] == 12000

    list_resp = await client.get("/api/v1/pricing/areas")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["items"]) >= 1


@pytest.mark.asyncio
async def test_create_and_list_extras(client: AsyncClient):
    """Test: crear extra y listarlo."""
    await _login_as_admin(client)
    payload = {
        "active": True,
        "included": False,
        "code": "GROCERY_STOP",
        "label": "Grocery Stop",
        "label_es": "Parada en supermercado",
        "price_cents": 2500,
        "pricing_mode": "PER_STOP",
        "max_qty": 3,
    }

    create_resp = await client.post("/api/v1/pricing/extras", json=payload)
    assert create_resp.status_code == 201
    assert create_resp.json()["code"] == "GROCERY_STOP"

    list_resp = await client.get("/api/v1/pricing/extras")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["items"]) >= 1


@pytest.mark.asyncio
async def test_pricing_reads_are_public(client: AsyncClient):
    """Los GET de precios NO exigen auth (el formulario público los consume)."""
    for path in ("hotels", "areas", "extras"):
        resp = await client.get(f"/api/v1/pricing/{path}")
        assert resp.status_code == 200, f"GET /pricing/{path} debería ser público"


@pytest.mark.asyncio
async def test_pricing_writes_require_auth(client: AsyncClient):
    """Sin login, las escrituras de precios deben rechazarse con 401.

    Antes esto devolvía 201: cualquiera podía reescribir las tarifas.
    """
    area = await client.post(
        "/api/v1/pricing/areas",
        json={"name": "Hack Zone", "one_way_price_cents": 1, "round_trip_price_cents": 1},
    )
    assert area.status_code == 401

    hotel = await client.post("/api/v1/pricing/hotels", json={"name": "Ghost", "zone": "Nowhere"})
    assert hotel.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_area_name_returns_409(client: AsyncClient):
    """Nombre de área duplicado → 409 limpio, no 500 (UniqueViolation)."""
    await _login_as_admin(client)
    payload = {
        "name": "Cabo San Lucas",
        "one_way_price_cents": 12000,
        "round_trip_price_cents": 20000,
    }
    first = await client.post("/api/v1/pricing/areas", json=payload)
    assert first.status_code == 201

    duplicate = await client.post("/api/v1/pricing/areas", json=payload)
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_update_and_deactivate_area(client: AsyncClient):
    """PATCH de área: cambiar precios y desactivarla (is_active=false)."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/pricing/areas",
        json={
            "name": "Editable Zone",
            "one_way_price_cents": 9000,
            "round_trip_price_cents": 16000,
        },
    )
    area_id = create.json()["id"]

    # Cambiar precio
    patch = await client.patch(
        f"/api/v1/pricing/areas/{area_id}",
        json={"one_way_price_cents": 11000, "sprinter_one_way_price_cents": 15500},
    )
    assert patch.status_code == 200
    assert patch.json()["one_way_price_cents"] == 11000
    assert patch.json()["sprinter_one_way_price_cents"] == 15500

    # Desactivar
    off = await client.patch(f"/api/v1/pricing/areas/{area_id}", json={"is_active": False})
    assert off.status_code == 200
    assert off.json()["is_active"] is False


@pytest.mark.asyncio
async def test_deactivate_hotel(client: AsyncClient):
    """PATCH hotel is_active=false lo desactiva (no se borra)."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/pricing/hotels", json={"name": "Temp Hotel", "zone": "Cabo", "is_active": True}
    )
    hotel_id = create.json()["id"]

    off = await client.patch(f"/api/v1/pricing/hotels/{hotel_id}", json={"is_active": False})
    assert off.status_code == 200
    assert off.json()["is_active"] is False


@pytest.mark.asyncio
async def test_update_and_deactivate_extra(client: AsyncClient):
    """PATCH de extra: cambiar precio y desactivarlo."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/pricing/extras",
        json={
            "active": True,
            "included": False,
            "code": "BABY_SEAT",
            "label": "Baby Seat",
            "price_cents": 1500,
            "pricing_mode": "PER_BOOKING",
        },
    )
    assert create.status_code == 201
    extra_id = create.json()["id"]

    patch = await client.patch(f"/api/v1/pricing/extras/{extra_id}", json={"price_cents": 2000})
    assert patch.status_code == 200
    assert patch.json()["price_cents"] == 2000

    off = await client.patch(f"/api/v1/pricing/extras/{extra_id}", json={"active": False})
    assert off.status_code == 200
    assert off.json()["active"] is False


@pytest.mark.asyncio
async def test_update_nonexistent_area_returns_404(client: AsyncClient):
    """PATCH a un área inexistente → 404 limpio."""
    await _login_as_admin(client)
    resp = await client.patch("/api/v1/pricing/areas/no-existe", json={"one_way_price_cents": 1})
    assert resp.status_code == 404
