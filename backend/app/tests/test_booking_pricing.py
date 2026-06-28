"""Tests de la lógica de precio por ÁREA en create_draft.

Regla de negocio (única): el precio de un traslado se define por área, con dos
bandas por capacidad — 1 a 5 pax (campos one_way/round_trip) y 6 a 11 pax
(campos sprinter_*). El cliente NO elige vehículo: el backend cambia de banda
solo por número de pasajeros (passengers >= 6) y SIEMPRE recalcula el precio
server-side desde el área, ignorando lo que mande el navegador.
"""

import pytest
from httpx import AsyncClient

# Precios de prueba del área (en centavos). Son el SUBTOTAL (antes de IVA).
OW_1_5 = 10000  # 1-5 pax, ida
RT_1_5 = 18000  # 1-5 pax, redondo
OW_6_11 = 14500  # 6-11 pax, ida
RT_6_11 = 26100  # 6-11 pax, redondo

IVA_RATE = 0.16


def _with_iva(subtotal_cents: int) -> int:
    """Total con IVA 16% — mismo cálculo que _split_tax en el servicio."""
    return subtotal_cents + round(subtotal_cents * IVA_RATE)


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bandprice@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "bandprice@classvip.com", "password": "Admin123!"},
    )
    assert resp.status_code == 200


async def _create_area(client: AsyncClient) -> str:
    """Crea el área de prueba con las dos bandas y devuelve su id."""
    await _login_as_admin(client)
    resp = await client.post(
        "/api/v1/pricing/areas",
        json={
            "name": "Tourist Corridor Test",
            "one_way_price_cents": OW_1_5,
            "round_trip_price_cents": RT_1_5,
            "sprinter_one_way_price_cents": OW_6_11,
            "sprinter_round_trip_price_cents": RT_6_11,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _booking_payload(area_id: str, passengers: int, trip_type: str) -> dict:
    """Reserva con un item de transporte con precio DELIBERADAMENTE incorrecto
    (1 centavo): el servidor debe ignorarlo y cobrar el precio del área."""
    return {
        "type": "TRANSPORTATION",
        "customer": {"name": "Band Tester", "email": "band@example.com", "phone": "6240000000"},
        "booking_date": "2026-12-25",
        "passengers": passengers,
        "area_id": area_id,
        "trip_type": trip_type,
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Transfer",
                "quantity": 1,
                "unit_price": 1,
                "total_price": 1,
            }
        ],
    }


@pytest.mark.asyncio
async def test_one_way_1_to_5_pax_uses_area_one_way(client: AsyncClient):
    area_id = await _create_area(client)
    resp = await client.post(
        "/api/v1/bookings/", json=_booking_payload(area_id, passengers=5, trip_type="oneway")
    )
    assert resp.status_code == 201
    assert resp.json()["subtotal_amount"] == OW_1_5
    assert resp.json()["total_amount"] == _with_iva(OW_1_5)


@pytest.mark.asyncio
async def test_round_trip_1_to_5_pax_uses_area_round_trip(client: AsyncClient):
    area_id = await _create_area(client)
    resp = await client.post(
        "/api/v1/bookings/", json=_booking_payload(area_id, passengers=4, trip_type="roundtrip")
    )
    assert resp.status_code == 201
    assert resp.json()["subtotal_amount"] == RT_1_5
    assert resp.json()["total_amount"] == _with_iva(RT_1_5)


@pytest.mark.asyncio
async def test_6_pax_uses_sprinter_one_way_band(client: AsyncClient):
    """El cambio de banda ocurre justo en 6 pax (passengers >= 6)."""
    area_id = await _create_area(client)
    resp = await client.post(
        "/api/v1/bookings/", json=_booking_payload(area_id, passengers=6, trip_type="oneway")
    )
    assert resp.status_code == 201
    assert resp.json()["subtotal_amount"] == OW_6_11
    assert resp.json()["total_amount"] == _with_iva(OW_6_11)


@pytest.mark.asyncio
async def test_6_pax_round_trip_uses_sprinter_round_trip_band(client: AsyncClient):
    area_id = await _create_area(client)
    resp = await client.post(
        "/api/v1/bookings/", json=_booking_payload(area_id, passengers=8, trip_type="roundtrip")
    )
    assert resp.status_code == 201
    assert resp.json()["subtotal_amount"] == RT_6_11
    assert resp.json()["total_amount"] == _with_iva(RT_6_11)


@pytest.mark.asyncio
async def test_server_ignores_client_sent_price(client: AsyncClient):
    """Seguridad: aunque el cliente mande total_price=1, el server cobra el área."""
    area_id = await _create_area(client)
    resp = await client.post(
        "/api/v1/bookings/", json=_booking_payload(area_id, passengers=2, trip_type="oneway")
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["subtotal_amount"] == OW_1_5
    assert data["total_amount"] == _with_iva(OW_1_5)
    assert data["items"][0]["total_price"] == OW_1_5


@pytest.mark.asyncio
async def test_invalid_area_id_is_rejected(client: AsyncClient):
    """Un area_id inexistente debe dar 400 (no cobrar a ciegas)."""
    await _login_as_admin(client)
    resp = await client.post(
        "/api/v1/bookings/",
        json=_booking_payload("area-que-no-existe", passengers=3, trip_type="oneway"),
    )
    assert resp.status_code == 400
