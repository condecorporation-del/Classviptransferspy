"""Modelo Customer — Cliente que realiza reservas."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Customer(Base):
    """Cliente que realiza reservas."""

    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language: Mapped[str] = mapped_column(String(2), default="en")

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

    # ─── Relaciones ───
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    accounts: Mapped[list["ClientAccount"]] = relationship(
        "ClientAccount",
        back_populates="customer",
        cascade="all, delete-orphan",
    )

    # ─── Índices ───
    __table_args__ = (
        Index("ix_customers_email", "email"),
        Index("ix_customers_phone", "phone"),
    )

    def __repr__(self):
        return f"<Customer(id={self.id}, name={self.name})>"
