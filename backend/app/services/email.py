"""EmailService — Envío de correos transaccionales vía Resend.

Usa Jinja2 para templates HTML y Resend como proveedor de envío.
Mismo stack que el proyecto original TypeScript.
"""

import asyncio
from datetime import UTC, datetime
from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader

from app.core.config import get_settings
from app.services.booking_operations import build_operation_legs

settings = get_settings()

# Configurar Resend al importar el módulo
resend.api_key = settings.resend_api_key

# Configurar Jinja2 — busca templates en backend/app/templates/emails/
templates_dir = Path(__file__).parent.parent / "templates" / "emails"
jinja_env = Environment(
    loader=FileSystemLoader(str(templates_dir)),
    autoescape=True,  # Protección XSS: escapa HTML automáticamente
)

# ─── Constantes de marca (mismas que el proyecto original) ───────────────────
BRAND_NAME = "Class VIP Transfers"
CONTACT_EMAIL = "Armando@classviptransfers.com"
STRIPE_BADGE_URL = (
    "https://res.cloudinary.com/dt9iyiorn/image/upload/v1775031157/stripe_logo_kzjdiz.png"
)

# Texto del método de pago + si mostrar el badge de Stripe.
_PAYMENT_METHODS = {
    "stripe": ("Paid securely with card · Stripe", True),
    "card": ("Paid securely with card · Stripe", True),
    "pending": ("Payment pending — secure card checkout · Stripe", True),
    "cash": ("Paid in cash · Efectivo (Class VIP)", False),
    "offline": ("Confirmed by Class VIP · Confirmado", False),
    "none": ("Confirmed by Class VIP · Confirmado", False),
}

_SERVICE_LABELS = {
    "TRANSPORTATION": "Private Transfer · Traslado Privado",
    "ACTIVITY": "Activity · Actividad",
    "TOUR": "Tour",
}


def _money(cents: int | None, currency: str = "USD") -> str:
    """Formatea centavos a '$1,234.00 USD'."""
    return f"${(cents or 0) / 100:,.2f} {currency}"


def build_confirmation_context(booking: dict, payment_method: str | None = None) -> dict:
    """Construye TODAS las variables que necesita customer_confirmed.html.

    payment_method: 'stripe' | 'cash' | 'offline' | 'pending' | None.
    Si no se especifica, se usa el que venga en booking['payment_method'], y como
    último default 'stripe' (el flujo público se cobra con Stripe).
    """
    currency = booking.get("currency", "USD")
    method = (payment_method or booking.get("payment_method") or "stripe").lower()
    pm_text, show_stripe = _PAYMENT_METHODS.get(method, _PAYMENT_METHODS["stripe"])

    # Fecha legible
    raw_date = booking.get("booking_date") or ""
    formatted_date = raw_date
    try:
        formatted_date = datetime.fromisoformat(str(raw_date)).strftime("%A, %d %b %Y")
    except (ValueError, TypeError):
        pass

    # Items -> líneas de desglose
    items = []
    for it in booking.get("items", []) or []:
        qty = it.get("quantity", 1) or 1
        label = it.get("name", "Service")
        if qty > 1:
            label = f"{label} × {qty}"
        items.append({"label": label, "price_text": _money(it.get("total_price"), currency)})
    if not items:
        items.append(
            {
                "label": "Private transfer · Traslado",
                "price_text": _money(booking.get("total_amount"), currency),
            }
        )

    trip_type = (booking.get("trip_type") or "").lower()
    trip_label = {"oneway": "One Way · Sencillo", "roundtrip": "Round Trip · Redondo"}.get(
        trip_type, booking.get("trip_type") or ""
    )

    # Piernas operativas (LLEGADA aeropuerto→hotel / SALIDA hotel→aeropuerto con
    # pickup = vuelo de salida − 3h). MISMA lógica que el PDF (build_operation_legs).
    legs = build_operation_legs(booking)

    discount = booking.get("discount_amount") or 0
    tax = booking.get("tax_amount") or 0
    subtotal = booking.get("subtotal_amount") or 0

    return {
        "brand_name": BRAND_NAME,
        "contact_email": CONTACT_EMAIL,
        "logo_url": None,
        "stripe_badge_url": STRIPE_BADGE_URL,
        "confirmation_code": booking.get("confirmation_code", ""),
        "customer_name": booking.get("customer_name", "Guest"),
        "customer_email": booking.get("customer_email", ""),
        "customer_phone": booking.get("customer_phone", ""),
        "passengers": booking.get("passengers", 1),
        "service_label": _SERVICE_LABELS.get(booking.get("type"), booking.get("type") or "Service"),
        "formatted_date": formatted_date,
        "pickup_location": booking.get("pickup_location"),
        "dropoff_location": booking.get("dropoff_location"),
        "trip_type_label": trip_label,
        "legs": legs,
        "items": items,
        "show_tax_breakdown": bool(subtotal and (tax or discount)),
        "subtotal_text": _money(subtotal, currency),
        "discount_text": _money(discount, currency) if discount else "",
        "tax_text": _money(tax, currency) if tax else "",
        "total_text": _money(booking.get("total_amount"), currency),
        "payment_method_text": pm_text,
        "show_stripe_icon": show_stripe,
        "notes": booking.get("notes"),
        "issue_date": datetime.now(UTC).strftime("%d %b %Y, %H:%M UTC"),
    }


class EmailService:
    """Servicio de envío de correos transaccionales."""

    async def send_booking_confirmation(
        self, booking: dict, payment_method: str | None = None
    ) -> dict:
        """Envía confirmación de reserva al cliente, con TODOS los datos.

        Incluye: datos del cliente (nombre, correo, teléfono), servicio, hotel/pickup,
        hora de recogida, vuelos, desglose de precio y método de pago (Stripe por
        defecto, con su badge). Ver `build_confirmation_context`.

        Args:
            booking: Dict de `_booking_to_dict`.
            payment_method: 'stripe' (default) | 'cash' | 'offline' | 'pending'.
        """
        template = jinja_env.get_template("customer_confirmed.html")
        context = build_confirmation_context(booking, payment_method)
        html_content = template.render(**context)

        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [booking.get("customer_email", "")],
            "subject": (
                "Booking Confirmed · Reservación Confirmada — "
                f"{booking.get('confirmation_code', '')}"
            ),
            "html": html_content,
        }

        if settings.email_bcc:
            params["bcc"] = [settings.email_bcc]

        # resend.Emails.send() es síncrono (bloqueante) — llamarlo directo
        # dentro de un endpoint async congela el event loop completo
        # mientras Resend responde. asyncio.to_thread lo mueve a un hilo
        # aparte para no bloquear otros requests del servidor.
        return await asyncio.to_thread(resend.Emails.send, params)

    async def send_booking_pending(self, booking: dict) -> dict:
        """Envía confirmación de reserva pendiente de pago.

        Incluye un link de pago a la página pública de checkout
        (`{FRONTEND_URL}/checkout?bookingId=...`), que ejecuta el cobro real
        con Stripe Elements + /confirm-payment. Es el "link de Stripe" que el
        admin envía con la opción "Send Stripe Link" del Quick Booking.
        """
        template = jinja_env.get_template("customer_pending.html")

        booking_id = booking.get("id", "")
        payment_url = (
            f"{settings.frontend_url.rstrip('/')}/checkout?bookingId={booking_id}"
            if booking_id
            else ""
        )

        context = build_confirmation_context(booking, payment_method="pending")
        context["payment_url"] = payment_url
        html_content = template.render(**context)

        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [booking.get("customer_email", "")],
            "subject": (
                "Booking Received · Pago Pendiente — " f"{booking.get('confirmation_code', '')}"
            ),
            "html": html_content,
        }

        if settings.email_bcc:
            params["bcc"] = [settings.email_bcc]

        # resend.Emails.send() es síncrono (bloqueante) — llamarlo directo
        # dentro de un endpoint async congela el event loop completo
        # mientras Resend responde. asyncio.to_thread lo mueve a un hilo
        # aparte para no bloquear otros requests del servidor.
        return await asyncio.to_thread(resend.Emails.send, params)

    async def send_booking_cancelled(self, booking: dict) -> dict:
        """Envía notificación de cancelación al cliente, con todos los datos."""
        template = jinja_env.get_template("customer_cancelled.html")
        context = build_confirmation_context(booking, payment_method="offline")
        html_content = template.render(**context)

        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [booking.get("customer_email", "")],
            "subject": (
                "Booking Cancelled · Reservación Cancelada — "
                f"{booking.get('confirmation_code', '')}"
            ),
            "html": html_content,
        }

        # resend.Emails.send() es síncrono (bloqueante) — llamarlo directo
        # dentro de un endpoint async congela el event loop completo
        # mientras Resend responde. asyncio.to_thread lo mueve a un hilo
        # aparte para no bloquear otros requests del servidor.
        return await asyncio.to_thread(resend.Emails.send, params)

    async def send_company_notification(
        self, booking: dict, payment_method: str | None = None
    ) -> dict:
        """Notifica a operaciones sobre una nueva reserva (con todos los datos)."""
        template = jinja_env.get_template("company_notification.html")

        context = build_confirmation_context(booking, payment_method or "pending")
        html_content = template.render(**context)

        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [settings.email_bcc or settings.admin_email],
            "subject": f"New Booking · Nueva Reserva — {booking.get('confirmation_code', '')}",
            "html": html_content,
        }

        # resend.Emails.send() es síncrono (bloqueante) — llamarlo directo
        # dentro de un endpoint async congela el event loop completo
        # mientras Resend responde. asyncio.to_thread lo mueve a un hilo
        # aparte para no bloquear otros requests del servidor.
        return await asyncio.to_thread(resend.Emails.send, params)
