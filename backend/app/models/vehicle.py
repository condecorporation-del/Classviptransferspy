"""Modelo Vehicle — Vehículo de la flota."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vehicle(Base):
    """Vehículo de la flota."""

    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    license_plate: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    assignments: Mapped[list["BookingAssignment"]] = relationship(
        "BookingAssignment", back_populates="vehicle"
    )

    __table_args__ = (
        Index("ix_vehicles_is_active", "is_active"),
        Index("ix_vehicles_license_plate", "license_plate"),
    )

    def __repr__(self):
        return f"<Vehicle(id={self.id}, model={self.model})>"
