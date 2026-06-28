"""Lógica operativa de reservas — espejo en Python de
`frontend/src/features/admin/lib/booking-operations.ts`.

Una reserva de transporte se descompone en SERVICIOS OPERATIVOS (piernas):
- LLEGADA  (route 'airport-hotel'): Aeropuerto → Hotel.
- SALIDA   (route 'hotel-airport'): Hotel → Aeropuerto.
- ROUND TRIP (trip_type 'roundtrip'): genera AMBAS piernas.

Para la operación de la empresa, en cada pierna es IMPRESCINDIBLE:
- de dónde sale y a dónde va (origen → destino),
- la HORA DEL SERVICIO. En las salidas, la hora del servicio es el **pickup
  time** (cuándo recogemos al pasajero en el hotel), que por defecto es 3 horas
  antes de la hora del vuelo de salida.

Mantener esta lógica idéntica a la del frontend para que el PDF muestre lo mismo
que ve el admin.
"""

from __future__ import annotations

_AIRPORT_FALLBACK = "Aeropuerto"
_HOTEL_FALLBACK = "Hotel / Pickup"


def _clean_date(value: str | None) -> str:
    if not value:
        return ""
    return value[:10]


def _minutes_from_time(value: str | None) -> int | None:
    if not value or len(value) < 4 or ":" not in value:
        return None
    try:
        hours, minutes = value[:5].split(":")
        return int(hours) * 60 + int(minutes)
    except (ValueError, TypeError):
        return None


def _time_from_minutes(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def subtract_three_hours(value: str | None) -> str | None:
    """Pickup por defecto = hora del vuelo de salida − 3 horas."""
    minutes = _minutes_from_time(value)
    if minutes is None:
        return None
    return _time_from_minutes(max(0, minutes - 180))


def _departure_date_from_metadata(booking: dict) -> str:
    meta = booking.get("metadata")
    if isinstance(meta, dict):
        raw = meta.get("departureDate")
        if isinstance(raw, str):
            return _clean_date(raw)
    return ""


def build_operation_legs(booking: dict) -> list[dict]:
    """Descompone una reserva (dict de `_booking_to_dict`) en sus piernas.

    Cada pierna devuelta:
        type:         'arrival' | 'departure' | 'service'
        label:        'LLEGADA' | 'SALIDA' | 'SERVICIO'
        service_date: 'YYYY-MM-DD'
        service_time: hora del servicio (en salidas = pickup time)
        origin:       de dónde sale
        destination:  a dónde va
        flight:       número de vuelo
        airline:      aerolínea
        flight_time:  hora del vuelo (referencia; en salidas distinta al pickup)
    """
    legs: list[dict] = []

    trip_type = (booking.get("trip_type") or "").lower()
    route = booking.get("route")
    is_roundtrip = trip_type == "roundtrip"
    arrival_date = _clean_date(booking.get("booking_date"))
    departure_date = _departure_date_from_metadata(booking) or arrival_date

    pickup = booking.get("pickup_location")
    dropoff = booking.get("dropoff_location")

    has_arrival_data = any(
        booking.get(k) for k in ("flight_number", "arrival_time", "arrival_airline")
    )
    has_departure_data = any(
        booking.get(k)
        for k in ("departure_flight_number", "departure_time", "departure_airline", "pickup_time")
    )

    # ─── LLEGADA ───
    want_arrival = route == "airport-hotel" or is_roundtrip or (route is None and has_arrival_data)
    if want_arrival:
        legs.append(
            {
                "type": "arrival",
                "label": "LLEGADA",
                "service_date": arrival_date,
                "service_time": booking.get("booking_time") or booking.get("arrival_time") or "",
                "origin": pickup or _AIRPORT_FALLBACK,
                "destination": dropoff or _HOTEL_FALLBACK,
                "flight": booking.get("flight_number") or "",
                "airline": booking.get("arrival_airline") or "",
                "flight_time": booking.get("arrival_time") or "",
            }
        )

    # ─── SALIDA ───
    departure_service_time = (
        booking.get("pickup_time")
        or subtract_three_hours(booking.get("departure_time"))
        or booking.get("departure_time")
        or ""
    )
    if is_roundtrip:
        # En un round trip el pickup de ida es el aeropuerto y el drop es el hotel;
        # la salida es la ruta inversa: Hotel → Aeropuerto.
        legs.append(
            {
                "type": "departure",
                "label": "SALIDA",
                "service_date": departure_date,
                "service_time": departure_service_time,
                "origin": dropoff or _HOTEL_FALLBACK,
                "destination": pickup or _AIRPORT_FALLBACK,
                "flight": booking.get("departure_flight_number") or "",
                "airline": booking.get("departure_airline") or "",
                "flight_time": booking.get("departure_time") or "",
            }
        )
    elif route == "hotel-airport" or (route is None and has_departure_data):
        # Salida de una sola vía: el pickup es el hotel, el drop es el aeropuerto.
        legs.append(
            {
                "type": "departure",
                "label": "SALIDA",
                "service_date": arrival_date,
                "service_time": departure_service_time,
                "origin": pickup or _HOTEL_FALLBACK,
                "destination": dropoff or _AIRPORT_FALLBACK,
                "flight": booking.get("departure_flight_number")
                or booking.get("flight_number")
                or "",
                "airline": booking.get("departure_airline") or "",
                "flight_time": booking.get("departure_time") or "",
            }
        )

    # ─── Servicio genérico (sin ruta ni vuelos) ───
    if not legs:
        legs.append(
            {
                "type": "service",
                "label": "SERVICIO",
                "service_date": arrival_date,
                "service_time": (
                    booking.get("booking_time")
                    or booking.get("arrival_time")
                    or booking.get("departure_time")
                    or ""
                ),
                "origin": pickup or "",
                "destination": dropoff or "",
                "flight": booking.get("flight_number")
                or booking.get("departure_flight_number")
                or "",
                "airline": booking.get("arrival_airline") or booking.get("departure_airline") or "",
                "flight_time": "",
            }
        )

    return legs
