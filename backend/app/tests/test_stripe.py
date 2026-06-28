"""Tests del flujo de pago con Stripe — create-payment-intent y confirm-payment.

No se llama a Stripe de verdad: se mockean los métodos del `stripe_service`
(la instancia módulo-global de api/v1/stripe.py). El foco es la lógica nuestra:
transición de estados de la reserva y verificación server-side del pago.
"""

import pytest
from httpx import AsyncClient

import app.api.v1.stripe as stripe_module


def _booking_payload() -> dict:
    return {
        "type": "TRANSPORTATION",
        "customer": {
            "name": "Pay Test",
            "email": "pay@example.com",
            "phone": "6249998888",
            "language": "en",
        },
        "booking_date": "2026-12-25",
        "booking_time": "14:00",
        "pickup_location": "SJD Airport",
        "dropoff_location": "Grand Velas",
        "passengers": 2,
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


async def _create_booking_and_intent(client: AsyncClient, monkeypatch) -> tuple[str, str]:
    """Crea una reserva y su PaymentIntent (mockeado). Devuelve (booking_id, pi_id)."""
    create = await client.post("/api/v1/bookings/", json=_booking_payload())
    assert create.status_code == 201
    booking_id = create.json()["id"]
    assert create.json()["status"] == "DRAFT"

    pi_id = "pi_test_123"

    async def fake_create_intent(**kwargs):
        return {
            "client_secret": "cs_test_secret",
            "payment_intent_id": pi_id,
            "amount": kwargs.get("amount_cents", 15000),
            "currency": kwargs.get("currency", "usd"),
            "status": "requires_payment_method",
        }

    monkeypatch.setattr(stripe_module.stripe_service, "create_payment_intent", fake_create_intent)

    intent_resp = await client.post(
        "/api/v1/stripe/create-payment-intent",
        json={"booking_id": booking_id, "email": "pay@example.com"},
    )
    assert intent_resp.status_code == 200

    # Tras crear el intent, la reserva debe quedar en PENDING_PAYMENT (ya no DRAFT).
    got = await client.get(f"/api/v1/bookings/{booking_id}")
    assert got.json()["status"] == "PENDING_PAYMENT"

    return booking_id, pi_id


@pytest.mark.asyncio
async def test_confirm_payment_marks_booking_paid(client: AsyncClient, monkeypatch):
    booking_id, pi_id = await _create_booking_and_intent(client, monkeypatch)

    async def fake_retrieve(pi):
        return {
            "payment_intent_id": pi,
            "status": "succeeded",
            "amount": 15000,
            "currency": "usd",
            "booking_id": booking_id,
        }

    monkeypatch.setattr(stripe_module.stripe_service, "retrieve_payment_intent", fake_retrieve)

    resp = await client.post(
        "/api/v1/stripe/confirm-payment",
        json={"bookingId": booking_id, "paymentIntentId": pi_id},
    )
    assert resp.status_code == 200
    assert resp.json()["bookingStatus"] == "PAID"

    # Verificación independiente: la reserva quedó PAID en la DB.
    got = await client.get(f"/api/v1/bookings/{booking_id}")
    assert got.json()["status"] == "PAID"


@pytest.mark.asyncio
async def test_confirm_payment_is_idempotent(client: AsyncClient, monkeypatch):
    booking_id, pi_id = await _create_booking_and_intent(client, monkeypatch)

    async def fake_retrieve(pi):
        return {
            "payment_intent_id": pi,
            "status": "succeeded",
            "amount": 15000,
            "currency": "usd",
            "booking_id": booking_id,
        }

    monkeypatch.setattr(stripe_module.stripe_service, "retrieve_payment_intent", fake_retrieve)

    first = await client.post(
        "/api/v1/stripe/confirm-payment",
        json={"bookingId": booking_id, "paymentIntentId": pi_id},
    )
    second = await client.post(
        "/api/v1/stripe/confirm-payment",
        json={"bookingId": booking_id, "paymentIntentId": pi_id},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["bookingStatus"] == "PAID"


@pytest.mark.asyncio
async def test_confirm_payment_rejects_unsucceeded_intent(client: AsyncClient, monkeypatch):
    booking_id, pi_id = await _create_booking_and_intent(client, monkeypatch)

    async def fake_retrieve(pi):
        return {
            "payment_intent_id": pi,
            "status": "requires_payment_method",
            "amount": 15000,
            "currency": "usd",
            "booking_id": booking_id,
        }

    monkeypatch.setattr(stripe_module.stripe_service, "retrieve_payment_intent", fake_retrieve)

    resp = await client.post(
        "/api/v1/stripe/confirm-payment",
        json={"bookingId": booking_id, "paymentIntentId": pi_id},
    )
    assert resp.status_code == 409
    # La reserva NO debe haberse marcado pagada.
    got = await client.get(f"/api/v1/bookings/{booking_id}")
    assert got.json()["status"] == "PENDING_PAYMENT"


@pytest.mark.asyncio
async def test_confirm_payment_rejects_mismatched_booking(client: AsyncClient, monkeypatch):
    booking_id, pi_id = await _create_booking_and_intent(client, monkeypatch)

    async def fake_retrieve(pi):
        return {
            "payment_intent_id": pi,
            "status": "succeeded",
            "amount": 15000,
            "currency": "usd",
            "booking_id": "otra-reserva-distinta",
        }

    monkeypatch.setattr(stripe_module.stripe_service, "retrieve_payment_intent", fake_retrieve)

    resp = await client.post(
        "/api/v1/stripe/confirm-payment",
        json={"bookingId": booking_id, "paymentIntentId": pi_id},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_payment_requires_fields(client: AsyncClient):
    resp = await client.post("/api/v1/stripe/confirm-payment", json={"bookingId": "x"})
    assert resp.status_code == 400
