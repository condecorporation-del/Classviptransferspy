"""Tests directos del BookingService (admin): create_manual, confirm, cancel,
mark_paid, update, list_paginated y dashboard.

Van a nivel servicio (con db_session) en vez de HTTP+auth porque es más directo
para cubrir la máquina de estados de una reserva y las consultas de listado.
"""

import pytest

from app.core.exceptions import InvalidBookingStateError
from app.models.enums import BookingStatus
from app.schemas.booking import (
    AssignBookingRequest,
    CreateManualBookingRequest,
    MarkPaidRequest,
    UpdateBookingRequest,
)
from app.schemas.fleet import CreateDriverRequest, CreateVehicleRequest
from app.services.booking import BookingService
from app.services.fleet import FleetService


def _manual_req(email: str = "svc@example.com", passengers: int = 2) -> CreateManualBookingRequest:
    return CreateManualBookingRequest(
        type="TRANSPORTATION",
        customer={"name": "Svc Tester", "email": email, "phone": "6240000000"},
        booking_date="2026-12-25",
        passengers=passengers,
        pickup_location="SJD Airport",
        dropoff_location="Grand Velas",
        items=[
            {
                "type": "TRANSPORTATION",
                "name": "Transfer",
                "quantity": 1,
                "unit_price": 12000,
                "total_price": 12000,
            }
        ],
    )


@pytest.mark.asyncio
async def test_create_manual_then_get_by_id(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(_manual_req(), status=BookingStatus.CONFIRMED)
    assert booking.status == BookingStatus.CONFIRMED
    assert booking.confirmation_code is not None
    # create_manual también aplica IVA 16%: 12000 + 1920 = 13920.
    assert booking.subtotal_amount == 12000
    assert booking.tax_amount == 1920
    assert booking.total_amount == 13920

    fetched = await svc.get_by_id(booking.id)
    assert fetched.id == booking.id


@pytest.mark.asyncio
async def test_confirm_from_offline_hold(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("confirm@example.com"), status=BookingStatus.OFFLINE_HOLD
    )
    confirmed = await svc.confirm(booking.id)
    assert confirmed.status == BookingStatus.CONFIRMED
    assert confirmed.confirmed_at is not None


@pytest.mark.asyncio
async def test_cancel_sets_status_and_reason(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("cancel@example.com"), status=BookingStatus.CONFIRMED
    )
    cancelled = await svc.cancel(booking.id, reason="cliente canceló")
    assert cancelled.status == BookingStatus.CANCELLED
    assert cancelled.cancelled_at is not None
    assert "cliente canceló" in (cancelled.internal_notes or "")


@pytest.mark.asyncio
async def test_mark_paid_registers_payment(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("paid@example.com"), status=BookingStatus.OFFLINE_HOLD
    )
    paid = await svc.mark_paid(booking.id, MarkPaidRequest(method="cash"))
    assert paid.status in {BookingStatus.PAID, BookingStatus.CONFIRMED}


@pytest.mark.asyncio
async def test_update_edits_operational_fields(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("update@example.com"), status=BookingStatus.CONFIRMED
    )
    updated = await svc.update(
        booking.id, UpdateBookingRequest(pickup_location="Hotel Cambiado", pickup_time="10:30")
    )
    assert updated.pickup_location == "Hotel Cambiado"
    assert updated.pickup_time == "10:30"


@pytest.mark.asyncio
async def test_list_paginated_returns_created_bookings(db_session):
    svc = BookingService(db_session)
    await svc.create_manual(_manual_req("l1@example.com"), status=BookingStatus.CONFIRMED)
    await svc.create_manual(_manual_req("l2@example.com"), status=BookingStatus.CONFIRMED)

    bookings, total = await svc.list_paginated(page=1, page_size=10)
    assert total >= 2
    assert len(bookings) >= 2

    # Filtro por búsqueda de email
    found, found_total = await svc.list_paginated(page=1, page_size=10, search="l1@example.com")
    assert found_total >= 1


@pytest.mark.asyncio
async def test_dashboard_stats_counts_confirmed(db_session):
    svc = BookingService(db_session)
    await svc.create_manual(_manual_req("dash@example.com"), status=BookingStatus.CONFIRMED)
    stats = await svc.get_dashboard_stats()
    # El response trae contadores e ingresos; al menos no truena y devuelve enteros.
    assert stats.total_month >= 1
    assert stats.revenue_month >= 12000


@pytest.mark.asyncio
async def test_assign_driver_and_vehicle(db_session):
    svc = BookingService(db_session)
    fleet = FleetService(db_session)
    driver = await fleet.create_driver(CreateDriverRequest(name="Pedro", phone="6240001111"))
    vehicle = await fleet.create_vehicle(
        CreateVehicleRequest(make="Mercedes", model="Sprinter", license_plate="ABC123", capacity=11)
    )
    booking = await svc.create_manual(
        _manual_req("assign@example.com"), status=BookingStatus.CONFIRMED
    )

    result = await svc.assign(
        booking.id, AssignBookingRequest(driver_id=driver.id, vehicle_id=vehicle.id)
    )
    assert result.id == booking.id
    # Reasignar (upsert) no debe duplicar filas ni romper.
    again = await svc.assign(booking.id, AssignBookingRequest(driver_id=driver.id))
    assert again.id == booking.id


@pytest.mark.asyncio
async def test_cancel_already_cancelled_raises(db_session):
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("dbl-cancel@example.com"), status=BookingStatus.CONFIRMED
    )
    await svc.cancel(booking.id)
    with pytest.raises(InvalidBookingStateError):
        await svc.cancel(booking.id)


@pytest.mark.asyncio
async def test_confirm_from_invalid_state_raises(db_session):
    """Una reserva CANCELLED no es confirmable."""
    svc = BookingService(db_session)
    booking = await svc.create_manual(
        _manual_req("bad-confirm@example.com"), status=BookingStatus.CONFIRMED
    )
    await svc.cancel(booking.id)
    with pytest.raises(InvalidBookingStateError):
        await svc.confirm(booking.id)
