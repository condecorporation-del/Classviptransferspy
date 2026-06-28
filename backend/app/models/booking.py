"""Modelo principal de reservas — Booking.

Representa cada servicio de transporte o actividad solicitado por un cliente.
Refleja exactamente el schema de Prisma del proyecto original TypeScript.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    BookingSource,
    BookingStatus,
    BookingType,
)


class Booking(Base):
    """Modelo principal de reservas."""

    __tablename__ = "bookings"

    # ─── Primary Key ───
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ─── Tipo y estado ───
    type: Mapped[BookingType] = mapped_column(
        Enum(BookingType, name="booking_type_enum"),
        nullable=False,
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status_enum"),
        default=BookingStatus.DRAFT,
        nullable=False,
    )
    source: Mapped[BookingSource] = mapped_column(
        Enum(BookingSource, name="booking_source_enum"),
        default=BookingSource.WEBSITE,
        nullable=False,
    )

    # ─── Cliente ───
    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="bookings",
    )

    # ─── Fechas ───
    booking_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Fecha del servicio",
    )
    booking_time: Mapped[str | None] = mapped_column(
        String(5),
        nullable=True,
        comment="Hora del servicio (HH:MM)",
    )
    pickup_time: Mapped[str | None] = mapped_column(
        String(5),
        nullable=True,
        comment="Hora exacta de pickup (HH:MM)",
    )

    # ─── Ubicaciones ───
    pickup_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    dropoff_location: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ─── Vuelos ───
    flight_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    arrival_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    arrival_airline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    departure_flight_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    departure_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    departure_airline: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # ─── Precios (en centavos) ───
    total_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Total en centavos (USD)",
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    subtotal_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discount_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tax_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # ─── Pasajeros ───
    passengers: Mapped[int] = mapped_column(Integer, default=1)

    # ─── Detalles del servicio ───
    service_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trip_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    route: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ─── Confirmación ───
    confirmation_code: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
    )

    # ─── Notas ───
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
    )

    # ─── Timestamps ───
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
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ─── Relaciones ───
    items: Mapped[list["BookingItem"]] = relationship(
        "BookingItem",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    pricing_overrides: Mapped[list["PricingOverride"]] = relationship(
        "PricingOverride",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    assignments: Mapped[list["BookingAssignment"]] = relationship(
        "BookingAssignment",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    email_logs: Mapped[list["EmailLog"]] = relationship(
        "EmailLog",
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    ai_conversations: Mapped[list["AIConversation"]] = relationship(
        "AIConversation",
        back_populates="booking",
    )
    account_charges: Mapped[list["AccountCharge"]] = relationship(
        "AccountCharge",
        back_populates="booking",
    )

    # ─── Índices ───
    __table_args__ = (
        Index("ix_bookings_customer_id", "customer_id"),
        Index("ix_bookings_status", "status"),
        Index("ix_bookings_booking_date", "booking_date"),
        Index("ix_bookings_created_at", "created_at"),
        Index("ix_bookings_type_status", "type", "status"),
        # confirmation_code ya tiene índice único implícito por unique=True
        # (bookings_confirmation_code_key); no se duplica con uno explícito.
    )

    def __repr__(self):
        return f"<Booking(id={self.id}, status={self.status}, amount={self.total_amount})>"
