"""Modelo EmailLog — Registro de emails enviados."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import EmailStatus, EmailType


class EmailLog(Base):
    """Registro de emails enviados."""

    __tablename__ = "email_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    booking_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    booking: Mapped["Booking"] = relationship("Booking", back_populates="email_logs")

    type: Mapped[EmailType] = mapped_column(Enum(EmailType), nullable=False)
    status: Mapped[EmailStatus] = mapped_column(
        Enum(EmailStatus), default=EmailStatus.PENDING, nullable=False
    )

    to: Mapped[str] = mapped_column(String(255), nullable=False)
    bcc: Mapped[str | None] = mapped_column(String(255), nullable=True)
    from_: Mapped[str | None] = mapped_column("from", String(255), nullable=True)

    provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)

    subject: Mapped[str] = mapped_column(String(500), nullable=False)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_email_logs_booking_id", "booking_id"),
        Index("ix_email_logs_type_status", "type", "status"),
        Index("ix_email_logs_sent_at", "sent_at"),
        Index("ix_email_logs_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<EmailLog(id={self.id}, type={self.type})>"
