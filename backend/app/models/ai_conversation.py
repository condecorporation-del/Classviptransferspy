"""Modelo AIConversation — Conversación con asistente AI."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AIConversation(Base):
    """Conversación con el asistente AI."""

    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    booking_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    booking: Mapped[Optional["Booking"]] = relationship(
        "Booking", back_populates="ai_conversations"
    )

    session_id: Mapped[str] = mapped_column(String(36), default=lambda: str(uuid.uuid4()))
    locale: Mapped[str] = mapped_column(String(2), default="en")

    user_message: Mapped[str] = mapped_column(String(2000), nullable=False)
    assistant_reply: Mapped[str] = mapped_column(String(4000), nullable=False)
    extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    raw_transcript: Mapped[str | None] = mapped_column(String(10000), nullable=True)

    message_type: Mapped[str] = mapped_column(String(10), default="text")
    audio_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)

    next_action: Mapped[str | None] = mapped_column(String(50), nullable=True)
    missing_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_ai_conversations_booking_id", "booking_id"),
        Index("ix_ai_conversations_session_id", "session_id"),
        Index("ix_ai_conversations_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<AIConversation(id={self.id})>"
