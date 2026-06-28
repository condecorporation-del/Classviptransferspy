"""Modelo BookingItem — Ítem dentro de una reserva."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import BookingItemType


class BookingItem(Base):
    """Ítem dentro de una reserva (transporte, actividad, addon)."""

    __tablename__ = "booking_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    booking_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
    )
    booking: Mapped["Booking"] = relationship("Booking", back_populates="items")

    type: Mapped[BookingItemType] = mapped_column(Enum(BookingItemType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    unit_price: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Precio unitario en centavos"
    )
    total_price: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="Precio total en centavos"
    )

    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_booking_items_booking_id", "booking_id"),
        Index("ix_booking_items_type", "type"),
    )

    def __repr__(self):
        return f"<BookingItem(id={self.id}, type={self.type})>"
