"""Modelos de cuentas por cobrar: ClientAccount, AccountCharge, AccountPayment."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import (
    AccountChargeStatus,
    AccountPaymentMethod,
    ClientAccountStatus,
)


class ClientAccount(Base):
    """Cuenta por cobrar de cliente frecuente."""

    __tablename__ = "client_accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    customer_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="accounts")

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    status: Mapped[ClientAccountStatus] = mapped_column(
        Enum(ClientAccountStatus), default=ClientAccountStatus.OPEN, nullable=False
    )
    credit_limit_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    charges: Mapped[list["AccountCharge"]] = relationship(
        "AccountCharge", back_populates="account", cascade="all, delete-orphan"
    )
    payments: Mapped[list["AccountPayment"]] = relationship(
        "AccountPayment", back_populates="account", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_client_accounts_customer_id", "customer_id"),
        Index("ix_client_accounts_status", "status"),
        Index("ix_client_accounts_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<ClientAccount(id={self.id}, name={self.name})>"


class AccountCharge(Base):
    """Cargo a cuenta de cliente."""

    __tablename__ = "account_charges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("client_accounts.id", ondelete="CASCADE"), nullable=False
    )
    account: Mapped["ClientAccount"] = relationship("ClientAccount", back_populates="charges")

    booking_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    booking: Mapped[Optional["Booking"]] = relationship("Booking", back_populates="account_charges")

    description: Mapped[str] = mapped_column(String(500), nullable=False)
    service_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[AccountChargeStatus] = mapped_column(
        Enum(AccountChargeStatus), default=AccountChargeStatus.PENDING, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_account_charges_account_status", "account_id", "status"),
        Index("ix_account_charges_booking_id", "booking_id"),
        Index("ix_account_charges_service_date", "service_date"),
    )

    def __repr__(self):
        return f"<AccountCharge(id={self.id}, amount={self.amount_cents})>"


class AccountPayment(Base):
    """Pago recibido de cuenta de cliente."""

    __tablename__ = "account_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("client_accounts.id", ondelete="CASCADE"), nullable=False
    )
    account: Mapped["ClientAccount"] = relationship("ClientAccount", back_populates="payments")

    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    method: Mapped[AccountPaymentMethod] = mapped_column(
        Enum(AccountPaymentMethod), default=AccountPaymentMethod.MANUAL, nullable=False
    )
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("ix_account_payments_account_id", "account_id"),
        Index("ix_account_payments_received_at", "received_at"),
    )

    def __repr__(self):
        return f"<AccountPayment(id={self.id}, amount={self.amount_cents})>"
