"""Schemas Pydantic para cuentas por cobrar de clientes frecuentes.

Usado por la pestaña Finanzas/Cuentas del admin: cada cuenta acumula
cargos (servicios prestados) y pagos recibidos; el balance es la
diferencia entre ambos.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AccountChargeStatus, AccountPaymentMethod, ClientAccountStatus

# ═══════════════════════════════════════════════════════════════════
# REQUEST
# ═══════════════════════════════════════════════════════════════════


class CreateAccountRequest(BaseModel):
    """Schema para POST /api/v1/admin/accounts."""

    name: str = Field(..., min_length=1, max_length=255)
    company: str | None = Field(None, max_length=255)
    email: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=20)
    notes: str | None = Field(None, max_length=500)


class CreateChargeRequest(BaseModel):
    """Schema para POST /api/v1/admin/accounts/{id}/charges — cargo manual."""

    description: str = Field(..., min_length=1, max_length=500)
    amount_cents: int = Field(..., gt=0)
    status: AccountChargeStatus = AccountChargeStatus.PENDING
    notes: str | None = Field(None, max_length=500)


class CreateChargeFromBookingRequest(BaseModel):
    """Schema para POST /api/v1/admin/accounts/{id}/bookings.

    Crea un cargo derivado de una reserva existente — el monto se toma
    directo de booking.total_amount, no se vuelve a teclear.
    """

    booking_id: str


class UpdateChargeRequest(BaseModel):
    """Schema para PATCH /api/v1/admin/accounts/{id}/charges/{charge_id}."""

    status: AccountChargeStatus


class CreatePaymentRequest(BaseModel):
    """Schema para POST /api/v1/admin/accounts/{id}/payments."""

    amount_cents: int = Field(..., gt=0)
    method: AccountPaymentMethod = AccountPaymentMethod.MANUAL
    reference: str | None = Field(None, max_length=255)


# ═══════════════════════════════════════════════════════════════════
# RESPONSE
# ═══════════════════════════════════════════════════════════════════


class AccountBookingSummary(BaseModel):
    """Datos mínimos de la reserva ligada a un cargo, para mostrar contexto."""

    id: str
    confirmation_code: str | None = None
    booking_date: datetime
    booking_time: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    notes: str | None = None
    customer_name: str | None = None


class ChargeResponse(BaseModel):
    id: str
    description: str
    amount_cents: int
    status: AccountChargeStatus
    notes: str | None = None
    service_date: datetime | None = None
    booking: AccountBookingSummary | None = None

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    id: str
    amount_cents: int
    method: AccountPaymentMethod
    reference: str | None = None
    received_at: datetime

    model_config = {"from_attributes": True}


class AccountTotals(BaseModel):
    charges_cents: int
    payments_cents: int


class AccountSummaryResponse(BaseModel):
    """Cuenta en la lista.

    Incluye `charges` (no `payments`) porque la pestaña Finanzas necesita
    ver, de un vistazo sobre todas las cuentas, qué cargos PENDING/INVOICED
    existen sin tener que pedir el detalle completo cuenta por cuenta.
    """

    id: str
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    status: ClientAccountStatus
    balance_cents: int
    charge_count: int
    payment_count: int
    charges: list[ChargeResponse] = []

    model_config = {"from_attributes": True}


class AccountDetailResponse(BaseModel):
    """Cuenta con su detalle completo de cargos y pagos."""

    id: str
    name: str
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    status: ClientAccountStatus
    balance_cents: int
    notes: str | None = None
    credit_limit_cents: int | None = None
    totals: AccountTotals
    charges: list[ChargeResponse]
    payments: list[PaymentResponse]

    model_config = {"from_attributes": True}
