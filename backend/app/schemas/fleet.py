"""Schemas Pydantic para la flota: Driver y Vehicle.

CRUD simple usado por el panel admin (pestaña RRHH) para dar de alta
conductores y vehículos que luego se asignan a reservas.
"""

from datetime import datetime

from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════
# Driver
# ═══════════════════════════════════════════════════════════════════


class CreateDriverRequest(BaseModel):
    """Schema para POST /api/v1/admin/drivers."""

    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=7, max_length=20)
    email: str | None = Field(None, max_length=255)
    license_number: str | None = Field(None, max_length=50)


class DriverResponse(BaseModel):
    """Conductor en respuesta JSON."""

    id: str
    name: str
    phone: str
    email: str | None = None
    license_number: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DriverListResponse(BaseModel):
    """Lista de conductores (sin paginación — la flota es chica)."""

    items: list[DriverResponse]
    total: int = Field(..., ge=0)


# ═══════════════════════════════════════════════════════════════════
# Vehicle
# ═══════════════════════════════════════════════════════════════════


class CreateVehicleRequest(BaseModel):
    """Schema para POST /api/v1/admin/vehicles."""

    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    year: int | None = Field(None, ge=1990, le=2100)
    license_plate: str = Field(..., min_length=1, max_length=20)
    capacity: int = Field(..., ge=1, le=100)


class VehicleResponse(BaseModel):
    """Vehículo en respuesta JSON."""

    id: str
    make: str
    model: str
    year: int | None = None
    license_plate: str
    capacity: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleListResponse(BaseModel):
    """Lista de vehículos (sin paginación — la flota es chica)."""

    items: list[VehicleResponse]
    total: int = Field(..., ge=0)
