"""Modelo BookingAssignment — Asignación de conductor/vehículo."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import BookingAssignmentType


class BookingAssignment(Base):
    """Asignación de conductor/vehículo a una reserva."""

    __tablename__ = "booking_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    booking: Mapped["Booking"] = relationship("Booking", back_populates="assignments")

    type: Mapped[BookingAssignmentType] = mapped_column(Enum(BookingAssignmentType), nullable=False)

    driver_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True
    )
    driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="assignments")

    vehicle_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle", back_populates="assignments")

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    assigned_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_booking_assignments_booking_id", "booking_id"),
        Index("ix_booking_assignments_driver_id", "driver_id"),
        Index("ix_booking_assignments_vehicle_id", "vehicle_id"),
    )

    def __repr__(self):
        return f"<BookingAssignment(id={self.id}, type={self.type})>"
