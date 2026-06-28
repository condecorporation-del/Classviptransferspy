"""Tests del listado de reservas en el panel de administración.

Estos tests existen para evitar el bug reproducido en el proyecto
TypeScript: "creo una reserva y no la veo en el admin". La causa típica
es que el listado filtra por status (CONFIRMED/PAID) por defecto, y una
reserva nueva queda en DRAFT — invisible para el admin aunque sí exista
en la base de datos.
"""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    """Registra y autentica un admin. httpx.AsyncClient guarda la cookie
    'admin_token' automáticamente para las siguientes requests."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": "ops@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "ops@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


async def _create_booking(client: AsyncClient, email: str) -> str:
    payload = {
        "type": "TRANSPORTATION",
        "customer": {"name": "Cliente Nuevo", "email": email, "phone": "6240000000"},
        "booking_date": "2026-12-25",
        "passengers": 1,
    }
    resp = await client.post("/api/v1/bookings/", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_list_bookings_requires_auth(client: AsyncClient):
    """Test: GET /admin/bookings sin sesión devuelve 401."""
    response = await client.get("/api/v1/admin/bookings")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_new_draft_booking_appears_in_admin_list(client: AsyncClient):
    """Test CRÍTICO anti-regresión: una reserva recién creada (DRAFT) debe
    aparecer en el listado del admin SIN pedir ningún filtro de status.

    Este es exactamente el bug del TS: si el endpoint filtrara DRAFT/
    PENDING_PAYMENT por defecto, esta reserva "desaparecería" del admin
    apenas se crea, y el dueño del negocio vería un sistema que pierde
    reservas.
    """
    await _login_as_admin(client)
    booking_id = await _create_booking(client, "visible@example.com")

    response = await client.get("/api/v1/admin/bookings")

    assert response.status_code == 200
    data = response.json()
    ids = [b["id"] for b in data["items"]]
    assert booking_id in ids

    found = next(b for b in data["items"] if b["id"] == booking_id)
    assert found["status"] == "DRAFT"


@pytest.mark.asyncio
async def test_list_bookings_status_filter_is_opt_in(client: AsyncClient):
    """Test: filtrar por ?status=CONFIRMED no debe mostrar una reserva DRAFT,
    pero SIN el filtro debe seguir apareciendo (confirma que el filtro es
    opt-in, no el comportamiento por defecto)."""
    await _login_as_admin(client)
    booking_id = await _create_booking(client, "draft-only@example.com")

    confirmed_only = await client.get("/api/v1/admin/bookings", params={"status": "CONFIRMED"})
    assert confirmed_only.status_code == 200
    confirmed_ids = [b["id"] for b in confirmed_only.json()["items"]]
    assert booking_id not in confirmed_ids

    all_statuses = await client.get("/api/v1/admin/bookings")
    all_ids = [b["id"] for b in all_statuses.json()["items"]]
    assert booking_id in all_ids


@pytest.mark.asyncio
async def test_list_bookings_search_by_customer_email(client: AsyncClient):
    """Test: ?search= encuentra la reserva por email del cliente."""
    await _login_as_admin(client)
    booking_id = await _create_booking(client, "buscable@example.com")

    response = await client.get("/api/v1/admin/bookings", params={"search": "buscable"})

    assert response.status_code == 200
    ids = [b["id"] for b in response.json()["items"]]
    assert booking_id in ids


@pytest.mark.asyncio
async def test_list_bookings_date_filter_includes_exact_day(client: AsyncClient):
    """Test anti-regresión: filtrar con date_from == date_to == el día exacto
    de la reserva debe encontrarla.

    Bug real reportado por Marlon ("el filtrador de reservaciones no
    funciona", "no las encuentro en sus fechas"): booking_date es TIMESTAMP
    y se guarda con hora (p.ej. mediodía), pero date_to llega como DATE sin
    hora. Comparar `booking_date <= date_to` castea date_to a medianoche, así
    que CUALQUIER reserva con hora > 00:00:00 ese día (la inmensa mayoría)
    quedaba excluida — el filtro "Hoy" (date_from == date_to == hoy) no
    encontraba prácticamente ninguna reserva del día.
    """
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/admin/bookings",
        json={
            "type": "TRANSPORTATION",
            "customer": {
                "name": "Filtro Exacto",
                "email": "filtro-exacto@example.com",
                "phone": "6240001111",
            },
            "booking_date": "2026-07-10T19:00:00Z",  # mediodía local -> con hora, no medianoche
            "passengers": 1,
            "trip_type": "oneway",
            "payment_method": "cash",
        },
    )
    assert create.status_code == 201
    booking_id = create.json()["booking"]["id"]

    response = await client.get(
        "/api/v1/admin/bookings",
        params={"date_from": "2026-07-10", "date_to": "2026-07-10"},
    )
    assert response.status_code == 200
    ids = [b["id"] for b in response.json()["items"]]
    assert (
        booking_id in ids
    ), "La reserva del día 10 debe aparecer al filtrar exactamente por el día 10"


@pytest.mark.asyncio
async def test_list_bookings_pagination(client: AsyncClient):
    """Test: total refleja el conteo real aunque page_size sea menor."""
    await _login_as_admin(client)
    for i in range(3):
        await _create_booking(client, f"paged{i}@example.com")

    response = await client.get("/api/v1/admin/bookings", params={"page": 1, "page_size": 2})

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 3
    assert data["page"] == 1
    assert data["page_size"] == 2
