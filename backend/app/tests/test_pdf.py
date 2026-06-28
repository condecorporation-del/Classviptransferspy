"""Tests F13.1 — PDF de la reserva (operativo + orden de servicio sin precios).

Lógica del negocio que se valida:
1. Un round trip muestra DOS servicios: LLEGADA y SALIDA, cada uno con su
   RUTA (de dónde sale → a dónde va) y su HORA DE SERVICIO.
2. En las salidas, la hora del servicio es el PICKUP TIME (3h antes del vuelo).
3. La orden de servicio (?precios=false) lleva todos los datos operativos pero
   NINGÚN precio — para subcontratar a otra empresa.
"""

import pytest
from httpx import AsyncClient

from app.services.booking_operations import build_operation_legs, subtract_three_hours
from app.services.pdf import PDFService, jinja_env

# ─── Round trip: pickup = aeropuerto, dropoff = hotel ───────────────────────
_ROUND_TRIP = {
    "confirmation_code": "CVIP-RT-1",
    "customer_name": "John Roundtrip",
    "customer_email": "john@example.com",
    "customer_phone": "+1 555 0100",
    "booking_date": "2026-06-23",
    "booking_time": None,
    "trip_type": "roundtrip",
    "route": None,
    "metadata": None,
    "service_type": "Private Transfer",
    "passengers": 4,
    "pickup_location": "Aeropuerto SJD",
    "dropoff_location": "Hotel Sandos",
    "flight_number": "212",
    "arrival_airline": "Alaska",
    "arrival_time": "16:00",
    "departure_flight_number": "AA1212",
    "departure_airline": "American Airlines",
    "departure_time": "15:00",
    "pickup_time": "12:00",
    "notes": "VIP",
    "items": [
        {
            "name": "Round Trip — Hotel Sandos",
            "quantity": 1,
            "unit_price": 18000,
            "total_price": 18000,
        }
    ],
    "total_amount": 18000,
    "subtotal_amount": 18000,
    "currency": "USD",
}

_OPERATIONAL_DATA = [
    "212",
    "Alaska",
    "16:00",  # llegada
    "AA1212",
    "American Airlines",
    "12:00",  # salida (pickup 3h antes)
    "Hotel Sandos",
    "Aeropuerto SJD",  # ruta: ambos extremos
    "John Roundtrip",
    "LLEGADA",
    "SALIDA",
]


def _render(booking: dict, show_prices: bool) -> str:
    tmpl = jinja_env.get_template("booking_confirmation.html")
    items = [
        {
            "name": it["name"],
            "quantity": it["quantity"],
            "unit_price": it["unit_price"] / 100,
            "total_price": it["total_price"] / 100,
        }
        for it in booking.get("items", [])
    ]
    return tmpl.render(
        booking=booking,
        confirmation_code=booking.get("confirmation_code", ""),
        show_prices=show_prices,
        legs=build_operation_legs(booking),
        items=items,
        total=(booking.get("total_amount") or 0) / 100,
        subtotal=(booking.get("subtotal_amount") or 0) / 100,
        discount=0,
        tax=0,
        currency="USD",
    )


# ─── Lógica de descomposición en piernas ────────────────────────────────────


def test_roundtrip_genera_llegada_y_salida_con_rutas_correctas():
    legs = build_operation_legs(_ROUND_TRIP)
    assert len(legs) == 2
    arrival, departure = legs[0], legs[1]

    # Llegada: Aeropuerto → Hotel, hora de servicio = arrival_time
    assert arrival["type"] == "arrival"
    assert arrival["origin"] == "Aeropuerto SJD"
    assert arrival["destination"] == "Hotel Sandos"
    assert arrival["service_time"] == "16:00"

    # Salida: Hotel → Aeropuerto (inverso), hora de servicio = pickup_time
    assert departure["type"] == "departure"
    assert departure["origin"] == "Hotel Sandos"
    assert departure["destination"] == "Aeropuerto SJD"
    assert departure["service_time"] == "12:00"


def test_salida_una_via_hotel_a_aeropuerto():
    """route='hotel-airport': pickup=hotel, dropoff=aeropuerto."""
    b = {
        "booking_date": "2026-07-01",
        "trip_type": "oneway",
        "route": "hotel-airport",
        "pickup_location": "Hotel Riu",
        "dropoff_location": "Aeropuerto SJD",
        "departure_flight_number": "DL500",
        "departure_airline": "Delta",
        "departure_time": "18:00",
        "pickup_time": "15:00",
    }
    legs = build_operation_legs(b)
    assert len(legs) == 1
    dep = legs[0]
    assert dep["type"] == "departure"
    assert dep["origin"] == "Hotel Riu"
    assert dep["destination"] == "Aeropuerto SJD"
    assert dep["service_time"] == "15:00"


def test_pickup_auto_3h_antes_si_no_hay_pickup_time():
    """Sin pickup_time, la hora del servicio = vuelo de salida − 3h."""
    assert subtract_three_hours("15:00") == "12:00"
    b = {
        "booking_date": "2026-07-01",
        "route": "hotel-airport",
        "pickup_location": "Hotel Riu",
        "dropoff_location": "Aeropuerto SJD",
        "departure_time": "18:00",
        "pickup_time": None,
    }
    dep = build_operation_legs(b)[0]
    assert dep["service_time"] == "15:00"  # 18:00 − 3h


# ─── Renderizado del PDF ─────────────────────────────────────────────────────


def test_pdf_confirmation_shows_both_legs_routes_and_price():
    html = _render(_ROUND_TRIP, show_prices=True)
    for dato in _OPERATIONAL_DATA:
        assert dato in html, f"falta dato operativo en confirmación: {dato}"
    # Ruta visible (flecha) y pickup como hora de servicio
    assert "→" in html
    assert "PICKUP" in html
    assert "180.00" in html
    assert "TOTAL" in html


def test_service_order_has_all_data_but_no_prices():
    """La orden de subcontratación: todos los datos, CERO precios."""
    html = _render(_ROUND_TRIP, show_prices=False)
    for dato in _OPERATIONAL_DATA:
        assert dato in html, f"falta dato operativo en orden de servicio: {dato}"
    assert "ORDEN DE SERVICIO" in html
    assert "→" in html  # la ruta sigue
    assert "PICKUP" in html  # la hora de servicio sigue
    # Ninguna fuga de precio
    assert "180.00" not in html
    assert "$" not in html
    assert "TOTAL" not in html


@pytest.mark.asyncio
async def test_pdf_service_generates_both_variants():
    svc = PDFService()
    pdf_con = await svc.generate_booking_confirmation(_ROUND_TRIP, show_prices=True)
    pdf_sin = await svc.generate_booking_confirmation(_ROUND_TRIP, show_prices=False)
    assert pdf_con[:4] == b"%PDF"
    assert pdf_sin[:4] == b"%PDF"


# ─── Endpoint de punta a punta ───────────────────────────────────────────────


async def _create_booking(client: AsyncClient) -> str:
    payload = {
        "type": "TRANSPORTATION",
        "customer": {"name": "PDF Cliente", "email": "pdf@example.com", "phone": "6240001111"},
        "booking_date": "2026-12-25",
        "passengers": 2,
    }
    resp = await client.post("/api/v1/bookings/", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_endpoint_pdf_with_prices(client: AsyncClient):
    booking_id = await _create_booking(client)
    resp = await client.get(f"/api/v1/bookings/{booking_id}/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_endpoint_service_order_pdf(client: AsyncClient):
    booking_id = await _create_booking(client)
    resp = await client.get(f"/api/v1/bookings/{booking_id}/pdf?precios=false")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"
    assert "orden-servicio" in resp.headers["content-disposition"]
