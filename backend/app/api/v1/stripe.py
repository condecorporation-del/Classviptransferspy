"""Endpoints de Stripe — PaymentIntent y webhook."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.dependencies import get_db
from app.models.enums import BookingStatus, PaymentProvider, PaymentStatus
from app.schemas.payment import CreatePaymentRequest
from app.services.booking import BookingService
from app.services.payment import PaymentService
from app.services.stripe import StripeService

logger = logging.getLogger(__name__)
router = APIRouter()
stripe_service = StripeService()


@router.post(
    "/create-payment-intent",
    summary="Crear PaymentIntent de Stripe para una reserva",
)
async def create_payment_intent(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/stripe/create-payment-intent

    El frontend llama a este endpoint para obtener el client_secret.
    Luego usa Stripe.js (Stripe Elements) para mostrar el formulario
    de tarjeta y confirmar el pago con confirmCardPayment().

    Body esperado:
    {
        "booking_id": "uuid-de-la-reserva",
        "email": "cliente@email.com"
    }
    """
    body = await request.json()
    # El frontend habla camelCase (bookingId); aceptamos también snake_case por
    # compatibilidad. Mismo criterio que confirm-payment más abajo.
    booking_id = body.get("bookingId") or body.get("booking_id")

    if not booking_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bookingId es requerido",
        )

    # Obtener la reserva
    booking_service = BookingService(db)
    booking = await booking_service.get_by_id(booking_id)

    # Crear PaymentIntent en Stripe
    intent = await stripe_service.create_payment_intent(
        amount_cents=booking.total_amount,
        currency=booking.currency.lower(),
        booking_id=booking.id,
        customer_email=body.get("email", ""),
        description=f"ClassVIP Transfer — {booking.confirmation_code or booking.id[:8]}",
    )

    # Registrar pago pendiente en nuestra DB
    payment_service = PaymentService(db)
    await payment_service.create_manual(
        booking_id=booking.id,
        data=CreatePaymentRequest(
            provider=PaymentProvider.STRIPE,
            amount=booking.total_amount,
            currency=booking.currency,
            notes=f"PaymentIntent: {intent['payment_intent_id']}",
        ),
    )

    # La reserva ya no es un borrador: está esperando el pago. Esto deja el
    # estado coherente para que mark_completed (webhook o confirm-payment)
    # la promueva a PAID.
    if booking.status == BookingStatus.DRAFT:
        booking.status = BookingStatus.PENDING_PAYMENT
        await db.commit()

    return intent


@router.post(
    "/confirm-payment",
    summary="Confirmar el pago tras confirmCardPayment en el navegador (fast-path)",
)
async def confirm_payment(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/stripe/confirm-payment

    Después de que Stripe.js confirma el pago en el navegador, el cliente
    llama aquí para que la reserva pase a PAID de inmediato, sin esperar a
    que llegue el webhook.

    Seguridad: NO se confía en el cliente. Se recupera el PaymentIntent de
    Stripe y se verifica (a) que de verdad esté `succeeded` y (b) que su
    metadata.booking_id coincida con la reserva. Es idempotente con el
    webhook — si el webhook ya completó el pago, este endpoint responde 200
    sin duplicar nada.

    Body: { "bookingId": "...", "paymentIntentId": "pi_..." }
    """
    body = await request.json()
    booking_id = body.get("bookingId") or body.get("booking_id")
    payment_intent_id = body.get("paymentIntentId") or body.get("payment_intent_id")

    if not booking_id or not payment_intent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="bookingId y paymentIntentId son requeridos",
        )

    # Verificar el pago DIRECTO contra Stripe (nunca confiar en el cliente).
    try:
        intent = await stripe_service.retrieve_payment_intent(payment_intent_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo verificar el pago con Stripe: {exc}",
        )

    if intent["status"] != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El pago aún no está completado (estado Stripe: {intent['status']})",
        )

    # El PaymentIntent debe pertenecer a esta reserva (anti-manipulación).
    if intent["booking_id"] and intent["booking_id"] != booking_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pago no corresponde a esta reserva",
        )

    # Completar el pago pendiente de Stripe (idempotente con el webhook).
    payment_service = PaymentService(db)
    payments = await payment_service.get_payments_for_booking(booking_id)
    stripe_payment = next((p for p in payments if p.provider == PaymentProvider.STRIPE), None)
    just_paid = False
    if stripe_payment and stripe_payment.status == PaymentStatus.PENDING:
        try:
            await payment_service.mark_completed(
                stripe_payment.id, transaction_id=payment_intent_id
            )
            just_paid = True
        except ValidationError:
            # El webhook ganó la carrera y ya lo completó — no es un error.
            pass

    booking_service = BookingService(db)
    booking = await booking_service.get_by_id(booking_id)

    # Enviar la confirmación al cliente + aviso a operaciones SOLO si fue ESTE
    # request el que completó el pago (just_paid). Así es idempotente con el
    # webhook: el que gane la carrera de mark_completed manda los correos una
    # sola vez (el otro ve el pago ya completado y no duplica). Esto cubre el
    # caso —común— de que el webhook de Stripe no esté configurado en producción:
    # sin esto, la confirmación nunca se enviaría. Best-effort: un fallo de email
    # nunca debe romper la confirmación del pago (Stripe ya cobró).
    if just_paid:
        try:
            from app.api.v1.bookings import _booking_to_dict
            from app.services.email import EmailService

            booking_dict = _booking_to_dict(booking)
            email_service = EmailService()
            await email_service.send_booking_confirmation(booking_dict, payment_method="stripe")
            await email_service.send_company_notification(booking_dict, payment_method="stripe")
        except Exception as exc:  # noqa: BLE001 — email best-effort
            logger.warning(
                "Email de confirmación/operaciones tras pago (booking %s) no enviado: %s",
                booking_id,
                exc,
            )

    return {"status": "ok", "bookingStatus": booking.status.value}


@router.post(
    "/webhook",
    summary="Webhook de Stripe — recibe eventos de pago",
)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/stripe/webhook

    Stripe envía eventos a este endpoint cuando:
    - Un pago se completa (payment_intent.succeeded)
    - Un pago falla (payment_intent.payment_failed)
    - Hay disputas, reembolsos, etc.

    CRÍTICO: verifica la firma criptográfica para asegurar
    que el POST realmente viene de Stripe, no de un atacante.

    IMPORTANTE: Este endpoint debe recibir el body como bytes crudos.
    FastAPI lo configura automáticamente al usar request.body().
    """
    # Leer body como bytes (NO como JSON) — requerido para verificar firma
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    # Verificar firma
    try:
        event = stripe_service.verify_webhook_signature(payload, signature)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Manejar evento según tipo
    event_type = event["type"]
    payment_service = PaymentService(db)

    if event_type == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        booking_id = payment_intent["metadata"].get("booking_id")

        if booking_id:
            # Buscar el pago pendiente y marcarlo como completado
            payments = await payment_service.get_payments_for_booking(booking_id)
            paid_now = False
            for payment in payments:
                if (
                    payment.provider == PaymentProvider.STRIPE
                    and payment.status == PaymentStatus.PENDING
                ):
                    await payment_service.mark_completed(
                        payment.id,
                        transaction_id=payment_intent["id"],
                    )
                    paid_now = True
                    break

            # Al confirmarse el pago con tarjeta, enviar al cliente la confirmación
            # detallada (con método de pago = Stripe). Best-effort: un fallo de email
            # NUNCA debe romper el webhook — Stripe reintentaría el evento.
            if paid_now:
                try:
                    from app.api.v1.bookings import _booking_to_dict
                    from app.services.email import EmailService

                    booking = await BookingService(db).get_by_id(booking_id)
                    booking_dict = _booking_to_dict(booking)
                    await EmailService().send_booking_confirmation(
                        booking_dict, payment_method="stripe"
                    )
                except Exception as exc:  # noqa: BLE001
                    import logging

                    logging.getLogger(__name__).warning(
                        "Email de confirmación Stripe no enviado (booking %s): %s",
                        booking_id,
                        exc,
                    )

    elif event_type == "payment_intent.payment_failed":
        payment_intent = event["data"]["object"]
        booking_id = payment_intent["metadata"].get("booking_id")
        error_msg = payment_intent.get("last_payment_error", {}).get("message", "Error desconocido")

        if booking_id:
            payments = await payment_service.get_payments_for_booking(booking_id)
            for payment in payments:
                if (
                    payment.provider == PaymentProvider.STRIPE
                    and payment.status == PaymentStatus.PENDING
                ):
                    await payment_service.mark_failed(payment.id, error=error_msg)
                    break

    return {"status": "ok"}
