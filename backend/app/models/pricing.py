"""Modelos de precios: Hotel, Area, PricingRule, PricingExtra."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import (
    ExtraCode,
    PricingMode,
)


class Hotel(Base):
    """Hotel registrado en el sistema."""

    __tablename__ = "hotels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    zone: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_hotels_zone", "zone"),
        Index("ix_hotels_is_active", "is_active"),
    )

    def __repr__(self):
        return f"<Hotel(id={self.id}, name={self.name})>"


class Area(Base):
    """Área/zona de servicio con tarifas."""

    __tablename__ = "areas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    one_way_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    round_trip_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    sprinter_one_way_price_cents: Mapped[int] = mapped_column(Integer, default=0)
    sprinter_round_trip_price_cents: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (Index("ix_areas_is_active", "is_active"),)

    def __repr__(self):
        return f"<Area(id={self.id}, name={self.name})>"


class PricingExtra(Base):
    """Extra/servicio adicional con precio."""

    __tablename__ = "pricing_extras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    included: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    code: Mapped[ExtraCode] = mapped_column(Enum(ExtraCode), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    label_es: Mapped[str | None] = mapped_column(String(255), nullable=True)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    pricing_mode: Mapped[PricingMode] = mapped_column(Enum(PricingMode), nullable=False)
    max_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_pricing_extras_active", "active"),
        Index("ix_pricing_extras_code", "code"),
        Index("ix_pricing_extras_included", "included"),
    )

    def __repr__(self):
        return f"<PricingExtra(id={self.id}, code={self.code})>"
