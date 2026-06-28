"""Endpoints de reservas — POST /bookings, GET /bookings/{id}."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BookingNotFoundError, ClassVIPError
from app.core.rate_limit import limiter
from app.dependencies import get_db
from app.models.enums import BookingSource
from app.schemas.booking import BookingResponse, CreateBookingRequest
from app.services.booking import BookingService
from app.services.email import EmailService
from app.services.pdf import PDFService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una reserva",
    description=(
        "Crea una reserva en estado DRAFT con sus items. " "Envía email de confirmación pendiente."
    ),
)
@limiter.limit("20/minute")  # anti spam — 20 reservas por minuto por IP
async def create_booking(
    request: Request,
    data: CreateBookingRequest,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/bookings — Crear reserva nueva."""
    service = BookingService(db)
    try:
        booking = await service.create_draft(data, source=BookingSource.WEBSITE)

        # Enviar emails en background (no bloquea la respuesta)
        try:
            email_service = EmailService()
            booking_dict = _booking_to_dict(booking)
            await email_service.send_booking_pending(booking_dict)
        except Exception as exc:
            logger.warning("Email pending no enviado: %s", exc)

        try:
            email_service = EmailService()
            booking_dict = _booking_to_dict(booking)
            await email_service.send_company_notification(booking_dict)
        except Exception as exc:
            logger.warning("Email company notification no enviado: %s", exc)

        return booking
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Obtener una reserva por ID",
)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/v1/bookings/{booking_id} — Obtener reserva por ID."""
    service = BookingService(db)
    try:
        return await service.get_by_id(booking_id)
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get(
    "/{booking_id}/pdf",
    summary="Descargar PDF de la reserva (confirmación u orden de servicio)",
    description=(
        "Genera y descarga el PDF de la reserva. Por defecto incluye precios "
        "(confirmación para el cliente). Con `?precios=false` genera la **orden de "
        "servicio para subcontratar**: todos los datos operativos PERO sin ningún "
        "precio — para pasar el servicio a otra empresa de transporte."
    ),
)
async def download_booking_pdf(
    booking_id: str,
    precios: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/v1/bookings/{booking_id}/pdf — Genera y descarga PDF.

    Query param `precios`:
    - `true` (default): confirmación con precios para el cliente.
    - `false`: orden de servicio SIN precios, para subcontratar a otra empresa.
    """
    service = BookingService(db)
    try:
        booking = await service.get_by_id(booking_id)
        booking_dict = _booking_to_dict(booking)

        pdf_service = PDFService()
        pdf_bytes = await pdf_service.generate_booking_confirmation(
            booking_dict, show_prices=precios
        )

        suffix = "" if precios else "-orden-servicio"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f"inline; filename=booking-{booking.confirmation_code}{suffix}.pdf"
                )
            },
        )
    except BookingNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


def _booking_to_dict(booking) -> dict:
    """Convierte un objeto Booking a dict para templates de email/PDF.

    Incluye TODOS los datos operativos para que el PDF pueda mostrar las dos
    piernas de un round trip (llegada y salida) por separado y, en la orden de
    servicio para subcontratistas, todo el detalle del servicio sin precios.
    """
    return {
        "id": booking.id,
        "confirmation_code": booking.confirmation_code,
        "status": booking.status.value if booking.status else None,
        "type": booking.type.value if booking.type else None,
        "trip_type": booking.trip_type,
        "route": booking.route,
        "metadata": booking.metadata_,
        "service_type": booking.service_type,
        "booking_date": str(booking.booking_date),
        "booking_time": booking.booking_time,
        "pickup_time": booking.pickup_time,
        # ─── Ubicaciones ───
        "pickup_location": booking.pickup_location,
        "dropoff_location": booking.dropoff_location,
        # ─── Pierna de LLEGADA (arrival) ───
        "flight_number": booking.flight_number,
        "arrival_time": booking.arrival_time,
        "arrival_airline": booking.arrival_airline,
        # ─── Pierna de SALIDA (departure) ───
        "departure_flight_number": booking.departure_flight_number,
        "departure_time": booking.departure_time,
        "departure_airline": booking.departure_airline,
        # ─── Pasajeros y notas ───
        "passengers": booking.passengers,
        "notes": booking.notes,
        # ─── Items (servicios) ───
        "items": [
            {
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total_price": item.total_price,
            }
            for item in (booking.items or [])
        ],
        # ─── Precios (en centavos) ───
        "total_amount": booking.total_amount,
        "subtotal_amount": booking.subtotal_amount,
        "discount_amount": booking.discount_amount,
        "tax_amount": booking.tax_amount,
        "currency": booking.currency,
        # ─── Cliente ───
        "customer_name": booking.customer.name if booking.customer else "Guest",
        "customer_email": booking.customer.email if booking.customer else "",
        "customer_phone": booking.customer.phone if booking.customer else "",
    }
