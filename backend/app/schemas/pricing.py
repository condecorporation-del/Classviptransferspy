"""Schemas Pydantic para precios: Hotel, Area, PricingExtra.

Los precios siempre van en centavos de USD para evitar errores
de punto flotante (15000 = $150.00 USD).

Nota: el precio de un traslado se define por ÁREA (tabla areas), con dos bandas
por capacidad (1-5 y 6-11 pax). NO existe "pricing rules" — esa lógica duplicada
se eliminó (ver WORKPLAN Fase 28).
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ExtraCode, PricingMode

# ═══════════════════════════════════════════════════════════════════
# HOTEL — Request y Response
# ═══════════════════════════════════════════════════════════════════


class CreateHotelRequest(BaseModel):
    """Schema para POST /api/v1/hotels — Registrar un hotel."""

    name: str = Field(..., min_length=1, max_length=255, description="Nombre del hotel")
    zone: str = Field(
        ..., min_length=1, max_length=100, description="Zona del hotel (ej. 'Los Cabos')"
    )
    is_active: bool = Field(default=True, description="Hotel activo")


class UpdateHotelRequest(BaseModel):
    """Schema para PATCH /api/v1/hotels/{id} — Actualizar hotel."""

    name: str | None = Field(None, min_length=1, max_length=255)
    zone: str | None = Field(None, min_length=1, max_length=100)
    is_active: bool | None = None


class HotelResponse(BaseModel):
    """Hotel en respuesta JSON."""

    id: str
    name: str
    zone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
# AREA — Request y Response
# ═══════════════════════════════════════════════════════════════════


class CreateAreaRequest(BaseModel):
    """Schema para POST /api/v1/areas — Definir zona de servicio con tarifas.

    Todas las tarifas en centavos de USD.
    """

    name: str = Field(
        ..., min_length=1, max_length=100, description="Nombre del área (ej. 'SJD Airport')"
    )
    one_way_price_cents: int = Field(..., ge=0, description="Tarifa one-way en centavos")
    round_trip_price_cents: int = Field(..., ge=0, description="Tarifa round-trip en centavos")
    sprinter_one_way_price_cents: int = Field(
        default=0, ge=0, description="Tarifa one-way Sprinter en centavos"
    )
    sprinter_round_trip_price_cents: int = Field(
        default=0, ge=0, description="Tarifa round-trip Sprinter en centavos"
    )
    is_active: bool = Field(default=True, description="Área activa")


class UpdateAreaRequest(BaseModel):
    """Schema para PATCH /api/v1/areas/{id}."""

    name: str | None = Field(None, min_length=1, max_length=100)
    one_way_price_cents: int | None = Field(None, ge=0)
    round_trip_price_cents: int | None = Field(None, ge=0)
    sprinter_one_way_price_cents: int | None = Field(None, ge=0)
    sprinter_round_trip_price_cents: int | None = Field(None, ge=0)
    is_active: bool | None = None


class AreaResponse(BaseModel):
    """Área en respuesta JSON."""

    id: str
    name: str
    one_way_price_cents: int
    round_trip_price_cents: int
    sprinter_one_way_price_cents: int
    sprinter_round_trip_price_cents: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
# PRICING EXTRA — Request y Response
# ═══════════════════════════════════════════════════════════════════


class CreatePricingExtraRequest(BaseModel):
    """Schema para POST /api/v1/pricing/extras — Servicio adicional con precio.

    Ejemplos: GROCERY_STOP, BABY_SEAT, CHAMPAGNE, MEET_GREET.
    """

    active: bool = Field(default=True, description="Extra activo")
    included: bool = Field(default=False, description="¿Incluido en el precio base?")
    code: ExtraCode = Field(..., description="Código del extra (enum)")
    label: str = Field(..., min_length=1, max_length=255, description="Nombre en inglés")
    label_es: str | None = Field(None, max_length=255, description="Nombre en español")
    price_cents: int = Field(..., ge=0, description="Precio en centavos")
    pricing_mode: PricingMode = Field(..., description="PER_BOOKING, PER_STOP, PER_SEAT, PER_HOUR")
    max_qty: int | None = Field(None, ge=1, le=100, description="Cantidad máxima permitida")
    description: str | None = Field(None, max_length=500, description="Descripción del extra")


class UpdatePricingExtraRequest(BaseModel):
    """Schema para PATCH /api/v1/pricing/extras/{id}."""

    active: bool | None = None
    included: bool | None = None
    label: str | None = Field(None, min_length=1, max_length=255)
    label_es: str | None = Field(None, max_length=255)
    price_cents: int | None = Field(None, ge=0)
    pricing_mode: PricingMode | None = None
    max_qty: int | None = Field(None, ge=1, le=100)
    description: str | None = Field(None, max_length=500)


class PricingExtraResponse(BaseModel):
    """Extra en respuesta JSON."""

    id: str
    active: bool
    included: bool
    code: ExtraCode
    label: str
    label_es: str | None = None
    price_cents: int
    pricing_mode: PricingMode
    max_qty: int | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════
# RESPONSE DE LISTA
# ═══════════════════════════════════════════════════════════════════


class PricingExtraListResponse(BaseModel):
    """Lista paginada de extras."""

    items: list[PricingExtraResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)


class HotelListResponse(BaseModel):
    """Lista paginada de hoteles."""

    items: list[HotelResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)


class AreaListResponse(BaseModel):
    """Lista paginada de áreas."""

    items: list[AreaResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
