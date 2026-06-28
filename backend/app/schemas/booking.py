"""Schemas Pydantic para reservas (Booking).

Separa claramente:
- Request: lo que el cliente/envía (datos de entrada)
- Response: lo que el servidor devuelve (datos de salida)
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.models.enums import BookingAssignmentType, BookingSource, BookingStatus, BookingType
from app.schemas.fleet import DriverResponse, VehicleResponse
from app.schemas.payment import PaymentResponse

# ═══════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS — Lo que el cliente envía al crear/modificar
# ═══════════════════════════════════════════════════════════════════


class CancelBookingRequest(BaseModel):
    """Schema para POST /api/v1/admin/bookings/{id}/cancel."""

    reason: str | None = Field(None, max_length=500)


class MarkPaidRequest(BaseModel):
    """Schema para POST /api/v1/admin/bookings/{id}/mark-paid.

    Marca una reserva como PAGADA (status=PAID) y registra el pago en la tabla
    `payments` para que aparezca en Finanzas. Para cobros offline (efectivo,
    transferencia) hechos después de crear la reserva — distinto de "confirmar"
    (que solo cambia el estado a CONFIRMED sin registrar un pago).

    - method: cómo se cobró. Se mapea a PaymentProvider (cash→CASH,
      bank_transfer→BANK_TRANSFER, card/manual→MANUAL).
    - amount_cents: monto cobrado en centavos. Si es None, se usa el total de
      la reserva (el caso normal: se cobró el total).
    """

    method: Literal["cash", "bank_transfer", "card", "manual"] = "cash"
    amount_cents: int | None = Field(None, ge=0, description="Centavos; None = total de la reserva")
    reference: str | None = Field(None, max_length=255)
    notes: str | None = Field(None, max_length=255)


class AssignBookingRequest(BaseModel):
    """Schema para POST /api/v1/admin/bookings/{id}/assign.

    driver_id/vehicle_id en None significa "no tocar esa asignación", no
    "quitarla" — para desasignar se manda un id distinto o se construye
    un endpoint de unassign explícito si se necesita más adelante.
    """

    driver_id: str | None = None
    vehicle_id: str | None = None
    notes: str | None = Field(None, max_length=255)


class CustomerInfo(BaseModel):
    """Información del cliente anidada dentro de una reserva.

    Se usa como campo `customer` dentro de CreateBookingRequest.
    Si el email ya existe en DB, se actualizan nombre/teléfono.
    Si no existe, se crea un Customer nuevo.
    """

    name: str = Field(..., min_length=1, max_length=255, description="Nombre completo del cliente")
    email: str = Field(
        ...,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        description="Email válido del cliente",
    )
    phone: str = Field(..., min_length=7, max_length=20, description="Teléfono del cliente")
    country: str | None = Field(None, max_length=100, description="País de origen")
    language: str = Field(default="en", pattern=r"^(en|es)$", description="Idioma preferido")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        """Normaliza el email a minúsculas para búsquedas consistentes."""
        return v.lower().strip()


class BookingItemCreate(BaseModel):
    """Un ítem dentro de una reserva (transporte, actividad, addon, etc.).

    Acepta tanto snake_case (unit_price) como camelCase (unitPrice) — el
    formulario público (Book.tsx) manda camelCase, el admin/tests mandan
    snake_case.
    """

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    type: str = Field(..., description="Tipo: TRANSPORTATION, ACTIVITY, ADDON, COMBO, etc.")
    name: str = Field(..., min_length=1, max_length=255, description="Nombre descriptivo del ítem")
    slug: str | None = Field(None, max_length=255, description="Slug para URL amigable")
    code: str | None = Field(
        None,
        max_length=100,
        description=(
            "Código del catálogo server-side (PricingExtra.code para ADDON, o "
            "id de actividad/combo para ACTIVITY/COMBO/CRAZY_COMBO). Si viene "
            "presente, el servidor recalcula el precio de este item desde su "
            "catálogo e ignora unit_price/total_price del cliente."
        ),
    )
    quantity: int = Field(default=1, ge=1, le=100, description="Cantidad (1-100)")
    unit_price: int = Field(..., ge=0, description="Precio unitario en centavos de USD")
    total_price: int = Field(..., ge=0, description="Precio total = unit_price × quantity")
    metadata: dict | None = Field(None, description="Metadatos adicionales del ítem")


class CreateBookingRequest(BaseModel):
    """Schema para POST /api/v1/bookings — Crear una reserva nueva.

    Todos los precios van en centavos de USD (ej. $150.00 = 15000).

    La validación de fechas se hace aquí para rechazar requests inválidos
    antes de que lleguen a la capa de servicio.

    Acepta tanto snake_case como camelCase (el formulario público manda
    camelCase, p.ej. `bookingDate`, `areaId`, `tripType`).
    """

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    # ─── Tipo de reserva ───
    type: BookingType = Field(..., description="TRANSPORTATION, ACTIVITY, COMBO, CRAZY_COMBO")

    # ─── Cliente ───
    customer: CustomerInfo

    # ─── Fechas y horas ───
    booking_date: str = Field(
        ...,
        description="Fecha del servicio en formato ISO 8601 (YYYY-MM-DD)",
    )
    booking_time: str | None = Field(
        None,
        pattern=r"^\d{2}:\d{2}$",
        description="Hora del servicio (HH:MM, 24h)",
    )
    pickup_time: str | None = Field(
        None,
        pattern=r"^\d{2}:\d{2}$",
        description="Hora exacta de pickup (HH:MM, 24h)",
    )

    # ─── Ubicaciones ───
    pickup_location: str | None = Field(None, description="Dirección de recogida")
    dropoff_location: str | None = Field(None, description="Dirección de destino")

    # ─── Vuelos (opcional, para transfers de aeropuerto) ───
    flight_number: str | None = Field(None, max_length=20, description="Número de vuelo de llegada")
    arrival_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$", description="Hora de llegada")
    arrival_airline: str | None = Field(None, max_length=100, description="Aerolínea de llegada")
    departure_flight_number: str | None = Field(
        None, max_length=20, description="Número de vuelo de salida"
    )
    departure_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$", description="Hora de salida")
    departure_airline: str | None = Field(None, max_length=100, description="Aerolínea de salida")
    departure_date: str | None = Field(
        None,
        description=(
            "Fecha ISO 8601 (YYYY-MM-DD) del vuelo/servicio de SALIDA en un round "
            "trip, cuando es distinta de booking_date (fecha de llegada). Se "
            "guarda en metadata.departureDate — no existe columna propia porque "
            "Booking solo tiene una fecha (booking_date = llegada)."
        ),
    )

    # ─── Pasajeros ───
    passengers: int = Field(default=1, ge=1, le=14, description="Cantidad de pasajeros (1-14)")

    # ─── Detalles del servicio ───
    service_type: str | None = Field(None, max_length=50, description="TRANSFER, ACTIVITY, COMBO")
    trip_type: str | None = Field(None, max_length=50, description="ONE_WAY, ROUND_TRIP")
    route: str | None = Field(None, max_length=50, description="Ruta predefinida")

    # ─── Pricing por zona (área) ───
    area_id: str | None = Field(
        None,
        description=(
            "ID del Area seleccionada (zona del hotel). Si viene presente, el "
            "servidor RECALCULA el precio del item TRANSPORTATION a partir de "
            "esta área + trip_type + passengers, ignorando el precio que haya "
            "mandado el cliente — así un cliente no puede manipular el precio "
            "desde el navegador."
        ),
    )

    # ─── Ítems de la reserva ───
    items: list[BookingItemCreate] = Field(
        default_factory=list,
        description="Servicios incluidos (transporte, actividades, addons)",
    )

    # ─── Notas ───
    notes: str | None = Field(None, description="Notas del cliente visibles para el admin")

    @field_validator("booking_date")
    @classmethod
    def validate_iso_date(cls, v: str) -> str:
        """Valida que la fecha tenga formato ISO 8601 (YYYY-MM-DD).

        No valida que sea futura aquí — eso es lógica de negocio
        que va en el servicio.
        """
        try:
            datetime.fromisoformat(v)
        except ValueError as err:
            raise ValueError(f"Fecha inválida: '{v}'. Debe ser YYYY-MM-DD (ISO 8601)") from err
        return v


class CreateManualBookingRequest(BaseModel):
    """Schema para POST /api/v1/admin/bookings — Reserva manual desde el admin.

    Es el equivalente del "Nueva Reserva / Quick Booking" del proyecto TS:
    el admin crea una reserva directamente (sin que el cliente pase por el
    formulario público), eligiendo cómo se cobra:
      - payment_method="none"   → reserva en OFFLINE_HOLD, sin email.
      - payment_method="cash"   → reserva CONFIRMED (pagada offline) + email de confirmación.
      - payment_method="stripe" → reserva PENDING_PAYMENT + email con link de pago.

    A diferencia de CreateBookingRequest (público, siempre DRAFT), aquí NO se
    valida que la fecha sea futura: el admin puede registrar servicios del mismo
    día o cargos a cuenta sin fecha de viaje.
    """

    type: BookingType = Field(default=BookingType.TRANSPORTATION)
    customer: CustomerInfo
    booking_date: str = Field(..., description="Fecha ISO 8601 (YYYY-MM-DD o datetime completo)")
    booking_time: str | None = None
    pickup_time: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    flight_number: str | None = Field(None, max_length=20)
    arrival_time: str | None = None
    arrival_airline: str | None = Field(None, max_length=100)
    departure_flight_number: str | None = Field(None, max_length=20)
    departure_time: str | None = None
    departure_airline: str | None = Field(None, max_length=100)
    departure_date: str | None = Field(
        None,
        description=(
            "Fecha ISO (YYYY-MM-DD) de SALIDA en round trip, si difiere de "
            "booking_date. Va a metadata.departureDate."
        ),
    )
    passengers: int = Field(default=1, ge=1, le=14)
    service_type: str | None = Field(None, max_length=50)
    trip_type: str | None = Field(None, max_length=50)
    notes: str | None = None
    payment_method: Literal["none", "cash", "stripe"] = "none"
    send_confirmation: bool = False
    send_payment_link: bool = False
    items: list[BookingItemCreate] = Field(default_factory=list)


class UpdateBookingRequest(BaseModel):
    """Schema para PATCH /api/v1/admin/bookings/{id} — edición de una reserva desde el admin.

    Todos los campos son opcionales: solo se actualizan los que se envían.
    `departure_date` no es columna directa — se guarda en metadata.departureDate
    (ver BookingService.update).
    """

    type: BookingType | None = None
    status: BookingStatus | None = None
    source: BookingSource | None = None
    booking_date: str | None = None
    booking_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    pickup_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    pickup_location: str | None = None
    dropoff_location: str | None = None
    flight_number: str | None = Field(None, max_length=20)
    arrival_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    arrival_airline: str | None = Field(None, max_length=100)
    departure_flight_number: str | None = Field(None, max_length=20)
    departure_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    departure_airline: str | None = Field(None, max_length=100)
    departure_date: str | None = Field(
        None,
        description=(
            "Fecha ISO (YYYY-MM-DD) de SALIDA en round trip. Se guarda en "
            "metadata.departureDate."
        ),
    )
    passengers: int | None = Field(None, ge=1, le=14)
    service_type: str | None = Field(None, max_length=50)
    trip_type: str | None = Field(None, max_length=50)
    route: str | None = Field(None, max_length=50)
    notes: str | None = None
    internal_notes: str | None = None


# ═══════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS — Lo que el servidor devuelve al cliente
# ═══════════════════════════════════════════════════════════════════


class BookingItemResponse(BaseModel):
    """Ítem de reserva en la respuesta JSON.

    Config.from_attributes = True permite crear este schema directamente
    desde un objeto SQLAlchemy: BookingItemResponse.model_validate(item_obj)
    """

    id: str
    type: str
    name: str
    slug: str | None = None
    quantity: int
    unit_price: int
    total_price: int
    # validation_alias="metadata_": el atributo en el modelo SQLAlchemy se
    # llama metadata_ (mapeado a la columna "metadata"), porque "metadata" a
    # secas ya es un atributo reservado de los modelos declarativos
    # (Base.metadata = el registro de tablas). Sin este alias, from_attributes
    # lee ese objeto MetaData en vez del JSON real y la respuesta truena con
    # un ValidationError en cuanto un item tenga metadata.
    metadata: dict | None = Field(None, validation_alias="metadata_")

    model_config = {"from_attributes": True, "populate_by_name": True}


class BookingCustomerSummary(BaseModel):
    """Datos mínimos del cliente embebidos en la respuesta de booking."""

    name: str
    email: str
    phone: str

    model_config = {"from_attributes": True}


class BookingAssignmentResponse(BaseModel):
    """Asignación de conductor/vehículo embebida en la respuesta de booking."""

    id: str
    type: BookingAssignmentType
    driver: DriverResponse | None = None
    vehicle: VehicleResponse | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class BookingResponse(BaseModel):
    """Reserva completa en la respuesta JSON.

    NUNCA incluye password_hash ni campos internos que el cliente
    no debería ver. Usa from_attributes para serializar desde SQLAlchemy.
    """

    id: str
    type: BookingType
    status: BookingStatus
    source: BookingSource
    customer_id: str
    booking_date: datetime
    booking_time: str | None = None
    pickup_time: str | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    flight_number: str | None = None
    arrival_time: str | None = None
    arrival_airline: str | None = None
    departure_flight_number: str | None = None
    departure_time: str | None = None
    departure_airline: str | None = None
    total_amount: int
    currency: str
    subtotal_amount: int | None = None
    discount_amount: int | None = None
    tax_amount: int | None = None
    passengers: int
    service_type: str | None = None
    trip_type: str | None = None
    route: str | None = None
    confirmation_code: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    # Igual que en BookingItemResponse: el atributo del modelo es
    # `metadata_` porque `metadata` es reservado por SQLAlchemy (Base.metadata).
    metadata: dict | None = Field(None, validation_alias="metadata_")
    items: list[BookingItemResponse] = []
    customer: BookingCustomerSummary | None = None
    payments: list[PaymentResponse] = []
    assignments: list[BookingAssignmentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class BookingListResponse(BaseModel):
    """Lista paginada de reservas."""

    items: list[BookingResponse]
    total: int = Field(..., ge=0, description="Total de reservas que coinciden con el filtro")
    page: int = Field(..., ge=1, description="Página actual")
    page_size: int = Field(..., ge=1, le=1000, description="Resultados por página")


class ManualBookingResponse(BaseModel):
    """Respuesta de POST /api/v1/admin/bookings (reserva manual).

    Devuelve la reserva creada + metadatos del email para que el admin sepa
    si la confirmación/link de pago salió o no (sin que un fallo de email
    tumbe la creación de la reserva).
    """

    booking: BookingResponse
    payment_method: str
    email_sent: bool = Field(..., description="True si se envió el email correspondiente")


class DashboardStatsResponse(BaseModel):
    """Métricas agregadas para la pestaña Marketing/Resumen del admin.

    Excluye CANCELLED de todos los conteos/sumas — una reserva cancelada
    no es actividad real del negocio.
    """

    total_today: int = Field(..., ge=0)
    total_month: int = Field(..., ge=0)
    revenue_today: int = Field(..., ge=0, description="Centavos de USD")
    revenue_month: int = Field(..., ge=0, description="Centavos de USD")
