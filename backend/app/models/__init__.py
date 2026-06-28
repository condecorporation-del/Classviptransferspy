"""Modelos SQLAlchemy — Tablas de la base de datos.

Importar todos los modelos aquí para que SQLAlchemy los registre
en Base.metadata. Sin esto, create_all() no crea las tablas.
"""

from app.models.admin import AdminUser
from app.models.admin_task import AdminTask
from app.models.ai_conversation import AIConversation
from app.models.audit import AdminAuditLog
from app.models.booking import Booking
from app.models.booking_assignment import BookingAssignment
from app.models.booking_item import BookingItem
from app.models.client_account import AccountCharge, AccountPayment, ClientAccount
from app.models.customer import Customer
from app.models.driver import Driver
from app.models.email_log import EmailLog
from app.models.enums import (
    AccountChargeStatus,
    AccountPaymentMethod,
    AdminTaskCategory,
    AdminTaskStatus,
    AuditAction,
    BookingAssignmentType,
    BookingItemType,
    BookingSource,
    BookingStatus,
    BookingType,
    ClientAccountStatus,
    EmailStatus,
    EmailType,
    ExtraCode,
    PaymentProvider,
    PaymentStatus,
    PricingMode,
    ServiceType,
    TripType,
    VehicleClass,
)
from app.models.payment import Payment
from app.models.pricing import Area, Hotel, PricingExtra
from app.models.pricing_override import PricingOverride
from app.models.vehicle import Vehicle

__all__ = [
    "AccountCharge",
    "AccountPayment",
    "AdminAuditLog",
    "AdminTask",
    "AdminUser",
    "AIConversation",
    "Area",
    "Booking",
    "BookingAssignment",
    "BookingItem",
    "ClientAccount",
    "Customer",
    "Driver",
    "EmailLog",
    "Hotel",
    "Payment",
    "PricingExtra",
    "PricingOverride",
    "Vehicle",
]
