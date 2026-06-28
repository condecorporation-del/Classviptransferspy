"""Modelos SQLAlchemy: AdminUser."""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Index,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdminUser(Base):
    """Usuario administrador del sistema."""

    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(255),
        default="admin",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # ─── Índices ───
    __table_args__ = (Index("ix_admin_users_email", "email"),)

    def __repr__(self):
        return f"<AdminUser(id={self.id})>"
