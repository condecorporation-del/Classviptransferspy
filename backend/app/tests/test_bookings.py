"""Tests de endpoints de reservas — creación, validación, obtención."""

import pytest
from httpx import AsyncClient

from app.services.booking import BookingService


@pytest.mark.asyncio
async def test_create_booking_success(client: AsyncClient):
    """Test: crear reserva válida debe devolver 201 con confirmation_code."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "Juan Pérez",
            "email": "juan@example.com",
            "phone": "6241234567",
            "language": "es",
        },
        "booking_date": "2026-12-25",
        "booking_time": "14:00",
        "pickup_location": "SJD Airport Terminal 1",
        "dropoff_location": "Grand Velas Los Cabos",
        "passengers": 3,
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Airport Transfer",
                "quantity": 1,
                "unit_price": 15000,
                "total_price": 15000,
            }
        ],
    }

    response = await client.post("/api/v1/bookings/", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "DRAFT"
    assert data["confirmation_code"] is not None
    assert data["confirmation_code"].startswith("CLASS2026")
    assert data["total_amount"] == 15000
    assert data["passengers"] == 3


@pytest.mark.asyncio
async def test_create_booking_invalid_email(client: AsyncClient):
    """Test: email inválido debe devolver 422 (validation error)."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "John",
            "email": "not-an-email",
            "phone": "6240000000",
        },
        "booking_date": "2026-12-25",
        "passengers": 1,
    }

    response = await client.post("/api/v1/bookings/", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_booking_past_date(client: AsyncClient):
    """Test: fecha pasada debe devolver 400 (error de negocio)."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "John",
            "email": "john@example.com",
            "phone": "6240000000",
        },
        "booking_date": "2020-01-01",
        "passengers": 1,
    }

    response = await client.post("/api/v1/bookings/", json=payload)
    assert response.status_code == 400
    assert "futura" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_booking_by_id(client: AsyncClient):
    """Test: crear y luego obtener reserva por ID."""
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "Ana López",
            "email": "ana@example.com",
            "phone": "6249998888",
        },
        "booking_date": "2026-12-31",
        "passengers": 2,
    }

    create_resp = await client.post("/api/v1/bookings/", json=payload)
    assert create_resp.status_code == 201
    booking_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/bookings/{booking_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == booking_id
    assert get_resp.json()["customer_id"] is not None


@pytest.mark.asyncio
async def test_create_booking_with_item_metadata(client: AsyncClient):
    """Test: un item con metadata debe persistirse y devolverse intacto.

    Regresión del bug donde el servicio pasaba metadata= en vez de
    metadata_= al construir BookingItem (atributo equivocado, porque
    "metadata" es reservado por SQLAlchemy), y el schema de respuesta
    leía item.metadata (el MetaData de SQLAlchemy) en vez del JSON real.
    """
    payload = {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "Metadata Tester",
            "email": "metadata@example.com",
            "phone": "6240001111",
        },
        "booking_date": "2026-12-25",
        "passengers": 1,
        "items": [
            {
                "type": "ADDON",
                "name": "Baby Seat",
                "quantity": 1,
                "unit_price": 1500,
                "total_price": 1500,
                "metadata": {"color": "red", "qty_seats": 2},
            }
        ],
    }

    response = await client.post("/api/v1/bookings/", json=payload)

    assert response.status_code == 201
    item = response.json()["items"][0]
    assert item["metadata"] == {"color": "red", "qty_seats": 2}


@pytest.mark.asyncio
async def test_confirmation_code_collision_retries_with_savepoint(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Test CRÍTICO anti-regresión: si dos reservas generan el mismo código
    de confirmación candidato (colisión), la segunda debe reintentar con un
    código distinto en vez de tronar — y sin perder el booking/customer/items
    ya creados en esa misma transacción (eso es lo que garantiza el SAVEPOINT).
    """

    async def base_payload(email: str) -> dict:
        return {
            "type": "TRANSPORTATION",
            "customer": {"name": "Race Tester", "email": email, "phone": "6240002222"},
            "booking_date": "2026-12-25",
            "passengers": 1,
        }

    # Primera reserva: usa un código fijo "CLASS2026999999" para forzar la colisión después.
    monkeypatch.setattr(
        BookingService, "_random_confirmation_code", staticmethod(lambda: "CLASS2026999999")
    )
    first_resp = await client.post(
        "/api/v1/bookings/", json=await base_payload("race1@example.com")
    )
    assert first_resp.status_code == 201
    assert first_resp.json()["confirmation_code"] == "CLASS2026999999"

    # Segunda reserva: el generador devuelve el MISMO código primero (colisión real
    # contra la fila que ya existe en DB), y uno distinto en el segundo intento.
    candidates = iter(["CLASS2026999999", "CLASS2026111111"])
    monkeypatch.setattr(
        BookingService,
        "_random_confirmation_code",
        staticmethod(lambda: next(candidates)),
    )
    second_resp = await client.post(
        "/api/v1/bookings/", json=await base_payload("race2@example.com")
    )

    assert second_resp.status_code == 201
    data = second_resp.json()
    assert data["confirmation_code"] == "CLASS2026111111"
    assert len(data["items"]) == 0  # confirma que el booking no se perdió tras el reintento


@pytest.mark.asyncio
async def test_get_booking_not_found(client: AsyncClient):
    """Test: booking inexistente debe devolver 404."""
    response = await client.get("/api/v1/bookings/nonexistent-id")
    assert response.status_code == 404
