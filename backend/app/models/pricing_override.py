"""Modelo PricingOverride — Anulación manual de precio."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PricingOverride(Base):
    """Anulación manual de precio en una reserva."""

    __tablename__ = "pricing_overrides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    booking: Mapped["Booking"] = relationship("Booking", back_populates="pricing_overrides")

    original_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    override_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)

    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    __table_args__ = (Index("ix_pricing_overrides_booking_id", "booking_id"),)

    def __repr__(self):
        return f"<PricingOverride(id={self.id})>"
