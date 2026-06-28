"""Enumeraciones compartidas para modelos y schemas.

Cada enum representa una columna que solo acepta valores específicos.
Son idénticos al schema de Prisma del proyecto original TypeScript.
"""

import enum


class BookingType(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACTIVITY = "ACTIVITY"
    COMBO = "COMBO"
    CRAZY_COMBO = "CRAZY_COMBO"


class BookingStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAID = "PAID"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    OFFLINE_HOLD = "OFFLINE_HOLD"


class BookingSource(str, enum.Enum):
    WEBSITE = "WEBSITE"
    PHONE = "PHONE"
    WHATSAPP = "WHATSAPP"
    ADMIN = "ADMIN"
    AI_CHAT = "AI_CHAT"


class BookingItemType(str, enum.Enum):
    TRANSPORTATION = "TRANSPORTATION"
    ACTIVITY = "ACTIVITY"
    ADDON = "ADDON"
    PARK_ENTRANCE = "PARK_ENTRANCE"
    COMBO = "COMBO"
    CRAZY_COMBO = "CRAZY_COMBO"


class PaymentProvider(str, enum.Enum):
    STRIPE = "STRIPE"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    MANUAL = "MANUAL"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class ServiceType(str, enum.Enum):
    TRANSFER = "TRANSFER"
    ACTIVITY = "ACTIVITY"
    COMBO = "COMBO"


class TripType(str, enum.Enum):
    ONE_WAY = "ONE_WAY"
    ROUND_TRIP = "ROUND_TRIP"


class VehicleClass(str, enum.Enum):
    SUV = "SUV"
    SUBURBAN = "SUBURBAN"
    SPRINTER = "SPRINTER"
    VAN = "VAN"
    SEDAN = "SEDAN"
    LUXURY = "LUXURY"


class ExtraCode(str, enum.Enum):
    INCLUDED_BASIC_KIT = "INCLUDED_BASIC_KIT"
    GROCERY_STOP = "GROCERY_STOP"
    EXTRA_STOP = "EXTRA_STOP"
    BABY_SEAT = "BABY_SEAT"
    BOOSTER = "BOOSTER"
    MEET_GREET = "MEET_GREET"
    SPECIAL_ASSISTANCE = "SPECIAL_ASSISTANCE"
    OVERSIZE_LUGGAGE = "OVERSIZE_LUGGAGE"
    WAIT_TIME = "WAIT_TIME"
    LATE_NIGHT = "LATE_NIGHT"
    EARLY_MORNING = "EARLY_MORNING"
    CHAMPAGNE = "CHAMPAGNE"
    CHAMPAGNE_UPGRADE = "CHAMPAGNE_UPGRADE"
    LUXURY_WELCOME = "LUXURY_WELCOME"
    ROMANTIC_KIT = "ROMANTIC_KIT"
    BIRTHDAY_KIT = "BIRTHDAY_KIT"
    DELUXE_ARRIVAL_KIT = "DELUXE_ARRIVAL_KIT"


class PricingMode(str, enum.Enum):
    PER_BOOKING = "PER_BOOKING"
    PER_STOP = "PER_STOP"
    PER_SEAT = "PER_SEAT"
    PER_HOUR = "PER_HOUR"


class ClientAccountStatus(str, enum.Enum):
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    SETTLED = "SETTLED"
    CLOSED = "CLOSED"


class AccountChargeStatus(str, enum.Enum):
    PENDING = "PENDING"
    INVOICED = "INVOICED"
    PAID = "PAID"
    VOID = "VOID"


class AccountPaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CARD = "CARD"
    MANUAL = "MANUAL"


class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    CONFIRM = "CONFIRM"
    CANCEL = "CANCEL"
    ASSIGN = "ASSIGN"
    PAYMENT = "PAYMENT"
    PRICING_OVERRIDE = "PRICING_OVERRIDE"


class EmailType(str, enum.Enum):
    CUSTOMER_CONFIRMATION = "CUSTOMER_CONFIRMATION"
    COMPANY_NOTIFICATION = "COMPANY_NOTIFICATION"
    ADMIN_RESEND = "ADMIN_RESEND"
    BOOKING_RECEIVED = "BOOKING_RECEIVED"
    MANUAL_CONFIRMED = "MANUAL_CONFIRMED"
    CANCELLED = "CANCELLED"


class EmailStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class BookingAssignmentType(str, enum.Enum):
    DRIVER = "DRIVER"
    VEHICLE = "VEHICLE"


class AdminTaskCategory(str, enum.Enum):
    SERVICIO_VEHICULO = "servicio-vehiculo"
    OPERACION = "operacion"
    ADMIN = "admin"
    OTRO = "otro"


class AdminTaskStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"
