"""Modelo AdminTask — Tareas compartidas del panel de administración."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import AdminTaskCategory, AdminTaskStatus


class AdminTask(Base):
    """Tarea pendiente del equipo, visible y editable por cualquier admin."""

    __tablename__ = "admin_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    fecha: Mapped[str] = mapped_column(String(10), nullable=False)
    hora: Mapped[str | None] = mapped_column(String(5), nullable=True)
    categoria: Mapped[AdminTaskCategory] = mapped_column(
        Enum(AdminTaskCategory), nullable=False, default=AdminTaskCategory.OPERACION
    )
    status: Mapped[AdminTaskStatus] = mapped_column(
        Enum(AdminTaskStatus), nullable=False, default=AdminTaskStatus.PENDIENTE
    )

    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_admin_tasks_fecha", "fecha"),
        Index("ix_admin_tasks_status", "status"),
    )

    def __repr__(self):
        return f"<AdminTask(id={self.id}, titulo={self.titulo!r}, status={self.status})>"
