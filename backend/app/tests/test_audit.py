"""Tests del log de auditoría: las acciones del admin quedan registradas y
se pueden leer vía GET /api/v1/admin/audit-logs (requiere auth)."""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "audit@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "audit@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


async def _create_booking(client: AsyncClient, email: str) -> str:
    resp = await client.post(
        "/api/v1/bookings/",
        json={
            "type": "TRANSPORTATION",
            "customer": {"name": "Audit Cliente", "email": email, "phone": "6240005555"},
            "booking_date": "2026-12-25",
            "passengers": 2,
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_audit_logs_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/admin/audit-logs")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cancel_creates_audit_entry(client: AsyncClient):
    await _login_as_admin(client)
    booking_id = await _create_booking(client, "audit-cancel@example.com")

    cancel = await client.post(
        f"/api/v1/admin/bookings/{booking_id}/cancel",
        json={"reason": "prueba auditoría"},
    )
    assert cancel.status_code == 200

    logs = await client.get(f"/api/v1/admin/audit-logs?entity_id={booking_id}")
    assert logs.status_code == 200
    data = logs.json()
    assert data["total"] >= 1
    entry = data["items"][0]
    assert entry["action"] == "CANCEL"
    assert entry["entity_id"] == booking_id
    assert entry["entity_type"] == "Booking"
    assert entry["user_email"] == "audit@classvip.com"
    assert "prueba auditoría" in entry["description"]


@pytest.mark.asyncio
async def test_mark_paid_creates_payment_audit_entry(client: AsyncClient):
    await _login_as_admin(client)
    booking_id = await _create_booking(client, "audit-paid@example.com")

    paid = await client.post(
        f"/api/v1/admin/bookings/{booking_id}/mark-paid",
        json={"method": "cash"},
    )
    assert paid.status_code == 200

    logs = await client.get(f"/api/v1/admin/audit-logs?entity_id={booking_id}")
    assert logs.status_code == 200
    actions = [item["action"] for item in logs.json()["items"]]
    assert "PAYMENT" in actions
