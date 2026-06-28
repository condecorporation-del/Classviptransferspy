"""Tests de las acciones de admin sobre reservas: editar, confirmar,
cancelar, asignar conductor/vehículo, reenviar email, exportar CSV.
"""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "actions@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "actions@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


async def _create_booking(client: AsyncClient, email: str) -> dict:
    payload = {
        "type": "TRANSPORTATION",
        "customer": {"name": "Cliente Acciones", "email": email, "phone": "6240004444"},
        "booking_date": "2026-12-25",
        "passengers": 2,
    }
    resp = await client.post("/api/v1/bookings/", json=payload)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_update_booking_partial(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "update1@example.com")

    response = await client.patch(
        f"/api/v1/admin/bookings/{booking['id']}",
        json={"notes": "Llamó para confirmar hora", "passengers": 4},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "Llamó para confirmar hora"
    assert data["passengers"] == 4
    # Campos no enviados no se borran
    assert data["pickup_location"] is None


@pytest.mark.asyncio
async def test_confirm_booking_from_pending_payment(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "confirm1@example.com")
    assert booking["status"] == "DRAFT"

    response = await client.post(f"/api/v1/admin/bookings/{booking['id']}/confirm")
    assert response.status_code == 409, "DRAFT no es confirmable, debe rechazar con 409"


@pytest.mark.asyncio
async def test_mark_booking_paid_records_payment_and_sets_status(client: AsyncClient):
    """Marcar pagado debe dejar la reserva en PAID y registrar un Payment
    COMPLETED por el total — para que el cobro aparezca en Finanzas."""
    await _login_as_admin(client)
    # Reserva manual en efectivo: queda CONFIRMED con total 12000.
    create = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("markpaid@example.com", "cash")
    )
    booking = create.json()["booking"]
    assert booking["status"] == "CONFIRMED"

    response = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/mark-paid",
        json={"method": "cash"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PAID"
    # El pago quedó registrado, COMPLETED, por el total de la reserva.
    payments = data["payments"]
    assert len(payments) == 1
    assert payments[0]["status"] == "COMPLETED"
    # El total incluye IVA 16%: 12000 + 1920 = 13920.
    assert payments[0]["amount"] == 13920


@pytest.mark.asyncio
async def test_mark_paid_accepts_custom_amount_and_reference(client: AsyncClient):
    """Se puede registrar un monto parcial/distinto y una referencia."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("markpaid-partial@example.com", "none")
    )
    booking = create.json()["booking"]
    assert booking["status"] == "OFFLINE_HOLD"

    response = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/mark-paid",
        json={"method": "bank_transfer", "amount_cents": 5000, "reference": "SPEI-998877"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PAID"
    assert data["payments"][0]["amount"] == 5000


@pytest.mark.asyncio
async def test_mark_paid_twice_is_rejected(client: AsyncClient):
    """No se puede marcar pagado dos veces (evita duplicar el pago)."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("markpaid-twice@example.com", "cash")
    )
    booking_id = create.json()["booking"]["id"]

    first = await client.post(
        f"/api/v1/admin/bookings/{booking_id}/mark-paid", json={"method": "cash"}
    )
    assert first.status_code == 200
    second = await client.post(
        f"/api/v1/admin/bookings/{booking_id}/mark-paid", json={"method": "cash"}
    )
    assert second.status_code == 409, "PAID no es cobrable de nuevo"


@pytest.mark.asyncio
async def test_mark_paid_rejects_cancelled_booking(client: AsyncClient):
    """Una reserva cancelada no se puede marcar como pagada."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("markpaid-cancelled@example.com", "cash")
    )
    booking_id = create.json()["booking"]["id"]
    await client.post(f"/api/v1/admin/bookings/{booking_id}/cancel", json={"reason": "x"})

    response = await client.post(
        f"/api/v1/admin/bookings/{booking_id}/mark-paid", json={"method": "cash"}
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_cancel_booking_appends_reason(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "cancel1@example.com")

    response = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/cancel",
        json={"reason": "Cliente cambió de planes"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCELLED"
    assert "Cliente cambió de planes" in data["internal_notes"]

    second_cancel = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/cancel", json={"reason": "otra vez"}
    )
    assert second_cancel.status_code == 409


@pytest.mark.asyncio
async def test_assign_driver_and_vehicle(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "assign1@example.com")

    driver_resp = await client.post(
        "/api/v1/admin/drivers", json={"name": "Carlos", "phone": "6245551111"}
    )
    vehicle_resp = await client.post(
        "/api/v1/admin/vehicles",
        json={"make": "Chevrolet", "model": "Suburban", "license_plate": "XYZ-999", "capacity": 7},
    )
    driver_id = driver_resp.json()["id"]
    vehicle_id = vehicle_resp.json()["id"]

    response = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/assign",
        json={"driver_id": driver_id, "vehicle_id": vehicle_id, "notes": "Pickup puntual"},
    )
    assert response.status_code == 200
    data = response.json()
    assignment_types = {a["type"] for a in data["assignments"]}
    assert assignment_types == {"DRIVER", "VEHICLE"}

    # Reasignar el mismo tipo actualiza en vez de duplicar
    second_driver = await client.post(
        "/api/v1/admin/drivers", json={"name": "Beto", "phone": "6245552222"}
    )
    response2 = await client.post(
        f"/api/v1/admin/bookings/{booking['id']}/assign",
        json={"driver_id": second_driver.json()["id"]},
    )
    assert response2.status_code == 200
    data2 = response2.json()
    driver_assignments = [a for a in data2["assignments"] if a["type"] == "DRIVER"]
    assert len(driver_assignments) == 1
    assert driver_assignments[0]["driver"]["name"] == "Beto"


@pytest.mark.asyncio
async def test_resend_confirmation_does_not_crash_without_resend_key(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "resend1@example.com")

    response = await client.post(f"/api/v1/admin/bookings/{booking['id']}/resend-confirmation")
    assert response.status_code == 200
    # En test no hay RESEND_API_KEY real — debe reportar sent=False, no tronar
    assert response.json()["sent"] is False


@pytest.mark.asyncio
async def test_export_bookings_csv(client: AsyncClient):
    await _login_as_admin(client)
    await _create_booking(client, "csv1@example.com")

    response = await client.get("/api/v1/admin/bookings/export")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "confirmation_code" in response.text
    assert "csv1@example.com" in response.text


# ─── Nueva Reserva / Quick Booking (reserva manual del admin) ──────────────────


def _manual_payload(email: str, payment_method: str) -> dict:
    return {
        "type": "TRANSPORTATION",
        "customer": {"name": "Cliente Manual", "email": email, "phone": "6240005555"},
        "booking_date": "2026-12-30T12:00:00Z",
        "pickup_location": "SJD Airport",
        "dropoff_location": "Pueblo Bonito",
        "passengers": 2,
        "trip_type": "oneway",
        "payment_method": payment_method,
        "send_confirmation": payment_method == "cash",
        "send_payment_link": payment_method == "stripe",
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Private Transfer — Pueblo Bonito (One Way)",
                "quantity": 1,
                "unit_price": 12000,
                "total_price": 12000,
            }
        ],
    }


@pytest.mark.asyncio
async def test_manual_booking_requires_auth(client: AsyncClient):
    """Sin login, crear reserva manual debe rechazarse con 401."""
    response = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("noauth@example.com", "none")
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_manual_booking_cash_is_confirmed(client: AsyncClient):
    """Pago en efectivo → reserva CONFIRMED directamente (sin pago online)."""
    await _login_as_admin(client)
    response = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("cash@example.com", "cash")
    )
    assert response.status_code == 201
    data = response.json()
    assert data["payment_method"] == "cash"
    assert data["booking"]["status"] == "CONFIRMED"
    # Total con IVA 16%: 12000 + 1920 = 13920.
    assert data["booking"]["subtotal_amount"] == 12000
    assert data["booking"]["total_amount"] == 13920
    # Sin RESEND_API_KEY real en test, el email no sale pero la reserva sí se crea
    assert data["email_sent"] is False


@pytest.mark.asyncio
async def test_manual_booking_none_is_offline_hold(client: AsyncClient):
    """Save only → OFFLINE_HOLD, sin email."""
    await _login_as_admin(client)
    response = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("hold@example.com", "none")
    )
    assert response.status_code == 201
    data = response.json()
    assert data["booking"]["status"] == "OFFLINE_HOLD"
    assert data["email_sent"] is False


@pytest.mark.asyncio
async def test_manual_booking_stripe_is_pending(client: AsyncClient):
    """Stripe link → PENDING_PAYMENT."""
    await _login_as_admin(client)
    response = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("stripe@example.com", "stripe")
    )
    assert response.status_code == 201
    assert response.json()["booking"]["status"] == "PENDING_PAYMENT"


@pytest.mark.asyncio
async def test_manual_booking_appears_in_admin_list(client: AsyncClient):
    """La reserva manual debe aparecer en la lista del admin sin filtros."""
    await _login_as_admin(client)
    create = await client.post(
        "/api/v1/admin/bookings", json=_manual_payload("inlist@example.com", "cash")
    )
    booking_id = create.json()["booking"]["id"]

    listing = await client.get("/api/v1/admin/bookings")
    assert listing.status_code == 200
    ids = [b["id"] for b in listing.json()["items"]]
    assert booking_id in ids


# ─── Round trip: la SALIDA no debe perderse (bug reportado por el usuario) ────
#
# Caso real: llegada el 23, salida el 30. Booking.booking_date solo guarda la
# llegada — la fecha de salida vive en metadata.departureDate porque no hay
# columna propia. Antes de este fix, ningún schema de creación/edición exponía
# `departure_date`, así que esa fecha nunca se guardaba y la pierna de SALIDA
# desaparecía del admin (lista y detalle) para cualquier round trip cuya
# fecha de salida fuera distinta a la de llegada.


@pytest.mark.asyncio
async def test_manual_booking_roundtrip_persists_departure_date(client: AsyncClient):
    """El Quick Booking del admin (POST /admin/bookings) debe guardar la fecha
    de salida de un round trip en metadata.departureDate."""
    await _login_as_admin(client)
    payload = _manual_payload("roundtrip-create@example.com", "cash")
    payload["booking_date"] = "2026-12-23T12:00:00Z"  # llegada
    payload["trip_type"] = "roundtrip"
    payload["departure_date"] = "2026-12-30"  # salida

    response = await client.post("/api/v1/admin/bookings", json=payload)
    assert response.status_code == 201
    booking = response.json()["booking"]
    assert booking["trip_type"] == "roundtrip"
    assert booking["metadata"]["departureDate"] == "2026-12-30"


@pytest.mark.asyncio
async def test_manual_booking_oneway_does_not_get_departure_metadata(client: AsyncClient):
    """Si no es round trip, departure_date no debe escribirse en metadata
    aunque se envíe por error — un oneway no tiene pierna de salida separada."""
    await _login_as_admin(client)
    payload = _manual_payload("oneway-no-meta@example.com", "cash")
    payload["departure_date"] = "2026-12-31"

    response = await client.post("/api/v1/admin/bookings", json=payload)
    assert response.status_code == 201
    assert response.json()["booking"]["metadata"] is None


@pytest.mark.asyncio
async def test_update_booking_sets_departure_date_in_metadata(client: AsyncClient):
    """PATCH /admin/bookings/{id} con departure_date debe guardarlo en
    metadata.departureDate sin tocar el resto de la reserva (regresión:
    booking creado sin departure_date debe poder corregirse después)."""
    await _login_as_admin(client)
    booking = await _create_booking(client, "edit-departure-date@example.com")

    response = await client.patch(
        f"/api/v1/admin/bookings/{booking['id']}",
        json={"trip_type": "roundtrip", "departure_date": "2027-01-05"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["departureDate"] == "2027-01-05"
    # No debe perder otros campos no enviados
    assert data["passengers"] == 2
