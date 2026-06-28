"""Schemas Pydantic para pagos (Payment) y webhooks de Stripe.

Los pagos siempre se registran en centavos de USD para evitar
errores de punto flotante con decimales.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import PaymentProvider, PaymentStatus

# ═══════════════════════════════════════════════════════════════════
# REQUEST — Crear / actualizar pago
# ═══════════════════════════════════════════════════════════════════


class CreatePaymentRequest(BaseModel):
    """Schema para POST /api/v1/bookings/{id}/payments — Registrar un pago.

    Normalmente los pagos se crean vía webhook de Stripe, pero este
    endpoint permite registrar pagos manuales (CASH, BANK_TRANSFER).
    """

    provider: PaymentProvider = Field(..., description="STRIPE, CASH, BANK_TRANSFER, MANUAL")
    amount: int = Field(..., ge=1, description="Monto en centavos de USD")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    notes: str | None = Field(None, max_length=255, description="Notas internas")


class UpdatePaymentRequest(BaseModel):
    """Schema para PATCH /api/v1/payments/{id} — Actualizar estado."""

    status: PaymentStatus = Field(..., description="Nuevo estado del pago")
    transaction_id: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=255)


# ═══════════════════════════════════════════════════════════════════
# STRIPE WEBHOOK — Payloads entrantes
# ═══════════════════════════════════════════════════════════════════


class StripeCheckoutSession(BaseModel):
    """Payload del webhook checkout.session.completed.

    Stripe envía este JSON cuando un cliente completa el pago.
    Extraemos: session ID, payment intent, amount, metadata.
    """

    id: str = Field(..., alias="session_id", description="Stripe Checkout Session ID")
    payment_intent: str | None = Field(None, description="Stripe PaymentIntent ID")
    amount_total: int | None = Field(None, description="Monto total en centavos")
    currency: str | None = Field(None, min_length=3, max_length=3)
    metadata: dict = Field(
        default_factory=dict, description="Metadata que pusimos al crear la sesión"
    )

    # El metadata debe contener al menos booking_id para asociar el pago
    @property
    def booking_id(self) -> str | None:
        return self.metadata.get("booking_id")


class StripeWebhookEvent(BaseModel):
    """Evento de webhook de Stripe (estructura genérica).

    Stripe envía: { type: "checkout.session.completed", data: { object: {...} } }
    """

    type: str = Field(..., description="Tipo de evento (checkout.session.completed, etc.)")
    data: dict = Field(..., description="Payload del evento")


# ═══════════════════════════════════════════════════════════════════
# RESPONSE
# ═══════════════════════════════════════════════════════════════════


class PaymentResponse(BaseModel):
    """Pago en respuesta JSON."""

    id: str
    booking_id: str
    provider: PaymentProvider
    status: PaymentStatus
    order_id: str | None = None
    capture_id: str | None = None
    transaction_id: str | None = None
    amount: int
    currency: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaymentListResponse(BaseModel):
    """Lista paginada de pagos."""

    items: list[PaymentResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
