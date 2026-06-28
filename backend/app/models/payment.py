"""Modelo Payment — Pago asociado a una reserva."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import PaymentProvider, PaymentStatus


class Payment(Base):
    """Pago asociado a una reserva."""

    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    booking: Mapped["Booking"] = relationship("Booking", back_populates="payments")

    provider: Mapped[PaymentProvider] = mapped_column(Enum(PaymentProvider), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False
    )

    order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capture_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    amount: Mapped[int] = mapped_column(Integer, nullable=False, comment="Monto en centavos")
    currency: Mapped[str] = mapped_column(String(3), default="USD")

    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_payments_booking_id", "booking_id"),
        Index("ix_payments_provider_status", "provider", "status"),
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_transaction_id", "transaction_id"),
    )

    def __repr__(self):
        return f"<Payment(id={self.id}, status={self.status})>"
