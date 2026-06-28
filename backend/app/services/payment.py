"""PaymentService — Gestión de pagos de reservas.

Registra pagos manuales (CASH, BANK_TRANSFER) y maneja
transiciones de estado del pago y del booking asociado.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BookingNotFoundError, NotFoundError, ValidationError
from app.models.booking import Booking
from app.models.enums import BookingStatus, PaymentStatus
from app.models.payment import Payment
from app.schemas.payment import CreatePaymentRequest


class PaymentService:
    """Gestión de pagos de reservas."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_manual(self, booking_id: str, data: CreatePaymentRequest) -> Payment:
        """Registra un pago manual (CASH, BANK_TRANSFER, MANUAL).

        No procesa Stripe — solo registra pagos offline.
        El pago se crea en estado PENDING.
        """
        # Verificar que el booking existe
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if not booking:
            raise BookingNotFoundError(booking_id)

        payment = Payment(
            booking_id=booking_id,
            provider=data.provider,
            status=PaymentStatus.PENDING,
            amount=data.amount,
            currency=data.currency,
            notes=data.notes,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def mark_completed(self, payment_id: str, transaction_id: str | None = None) -> Payment:
        """Marca un pago como completado.

        Si el booking aún no está pagado/cerrado, lo mueve a PAID. Un pago
        completado = dinero recibido, así que la reserva debe quedar PAID sin
        importar si venía en PENDING_PAYMENT o en DRAFT (las reservas públicas
        nacen DRAFT; si solo promoviéramos desde PENDING_PAYMENT, una reserva
        pagada con tarjeta quedaría atascada en DRAFT). No se toca si ya está
        CONFIRMED/COMPLETED/CANCELLED.
        """
        payment = await self._get_payment(payment_id)

        if payment.status != PaymentStatus.PENDING:
            raise ValidationError(f"No se puede completar un pago en estado {payment.status.value}")

        payment.status = PaymentStatus.COMPLETED
        payment.transaction_id = transaction_id
        payment.completed_at = datetime.now(UTC)

        # Actualizar booking → PAID (desde DRAFT o PENDING_PAYMENT)
        result = await self.db.execute(select(Booking).where(Booking.id == payment.booking_id))
        booking = result.scalar_one_or_none()
        if booking and booking.status in (
            BookingStatus.DRAFT,
            BookingStatus.PENDING_PAYMENT,
        ):
            booking.status = BookingStatus.PAID

        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def mark_failed(self, payment_id: str, error: str | None = None) -> Payment:
        """Marca un pago como fallido."""
        payment = await self._get_payment(payment_id)

        payment.status = PaymentStatus.FAILED
        if error:
            payment.notes = (payment.notes or "") + f" | Error: {error}"
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_payments_for_booking(self, booking_id: str) -> list[Payment]:
        """Obtiene todos los pagos de una reserva, ordenados del más reciente."""
        result = await self.db.execute(
            select(Payment)
            .where(Payment.booking_id == booking_id)
            .order_by(Payment.created_at.desc())
        )
        return list(result.scalars().all())

    async def _get_payment(self, payment_id: str) -> Payment:
        """Obtiene un pago por ID.

        Raises:
            NotFoundError: Si no existe.
        """
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()
        if not payment:
            raise NotFoundError("Payment", payment_id)
        return payment
