"""Tests del EmailService — foco en el link de pago del email 'pending'."""

import pytest
import resend

from app.services.email import EmailService


@pytest.mark.asyncio
async def test_pending_email_includes_payment_link(monkeypatch):
    """El email de reserva pendiente debe traer el botón con el link al checkout."""
    captured: dict = {}

    def fake_send(params):
        captured["params"] = params
        return {"id": "email_test_1"}

    monkeypatch.setattr(resend.Emails, "send", fake_send)

    await EmailService().send_booking_pending(
        {
            "id": "abc-123",
            "confirmation_code": "CLASS2026123456",
            "customer_name": "Pay Test",
            "customer_email": "pay@example.com",
            "booking_date": "2026-12-25",
            "pickup_location": "SJD Airport",
            "total_amount": 15000,
            "currency": "USD",
        }
    )

    html = captured["params"]["html"]
    assert "/checkout?bookingId=abc-123" in html
    assert "Complete Payment" in html


@pytest.mark.asyncio
async def test_pending_email_without_id_has_no_payment_button(monkeypatch):
    """Sin id de reserva no se arma link (cae al texto genérico, sin botón roto)."""
    captured: dict = {}

    monkeypatch.setattr(
        resend.Emails, "send", lambda params: captured.update(params) or {"id": "x"}
    )

    await EmailService().send_booking_pending(
        {
            "confirmation_code": "CLASS2026000000",
            "customer_name": "No Id",
            "customer_email": "noid@example.com",
            "total_amount": 10000,
            "currency": "USD",
        }
    )

    assert "Complete Payment" not in captured["html"]
