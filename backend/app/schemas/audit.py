"""Schemas Pydantic para el log de auditoría administrativa."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AuditAction


class AuditLogResponse(BaseModel):
    """Una entrada del log de auditoría en la respuesta JSON."""

    id: str
    action: AuditAction
    entity_type: str
    entity_id: str
    user_email: str | None = None
    description: str
    changes: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Lista paginada de entradas de auditoría."""

    items: list[AuditLogResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=200)
