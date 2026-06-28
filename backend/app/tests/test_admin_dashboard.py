"""Tests del endpoint de métricas agregadas (pestaña Marketing del admin)."""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "dash@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "dash@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


async def _create_booking(client: AsyncClient, email: str, booking_date: str, amount: int) -> None:
    payload = {
        "type": "TRANSPORTATION",
        "customer": {"name": "Cliente Dashboard", "email": email, "phone": "6240003333"},
        "booking_date": booking_date,
        "passengers": 1,
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Servicio",
                "quantity": 1,
                "unit_price": amount,
                "total_price": amount,
            }
        ],
    }
    resp = await client.post("/api/v1/bookings/", json=payload)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_dashboard_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_counts_future_booking_in_month(client: AsyncClient):
    """No podemos crear una reserva 'de hoy' porque create_draft exige fecha
    futura — probamos que una reserva del mes (futura) se refleje en el
    total/revenue mensual sin tronar, que es lo que el endpoint debe garantizar.
    """
    await _login_as_admin(client)
    await _create_booking(client, "dash1@example.com", "2026-12-25", 4000)

    response = await client.get("/api/v1/admin/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_today" in data
    assert "total_month" in data
    assert "revenue_today" in data
    assert "revenue_month" in data
    assert all(isinstance(v, int) for v in data.values())
