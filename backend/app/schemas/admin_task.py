"""Schemas Pydantic para tareas compartidas del panel de administración."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.models.enums import AdminTaskCategory, AdminTaskStatus


class CreateAdminTaskRequest(BaseModel):
    """Schema para POST /api/v1/admin/tasks."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    titulo: str = Field(..., min_length=1, max_length=255)
    descripcion: str | None = Field(None, max_length=1000)
    fecha: str = Field(..., description="Fecha en formato YYYY-MM-DD")
    hora: str | None = Field(None, description="Hora en formato HH:MM")
    categoria: AdminTaskCategory = AdminTaskCategory.OPERACION


class UpdateAdminTaskStatusRequest(BaseModel):
    """Schema para PATCH /api/v1/admin/tasks/{id}."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    status: AdminTaskStatus


class AdminTaskResponse(BaseModel):
    """Una tarea en la respuesta JSON (camelCase para el frontend)."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)

    id: str
    titulo: str
    descripcion: str | None = None
    fecha: str
    hora: str | None = None
    categoria: AdminTaskCategory
    status: AdminTaskStatus
    creado_en: datetime


class AdminTaskListResponse(BaseModel):
    """Lista de tareas."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    items: list[AdminTaskResponse]
    total: int = Field(..., ge=0)
