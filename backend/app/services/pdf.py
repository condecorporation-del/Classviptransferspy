"""PDFService — Generación de PDFs con WeasyPrint + Jinja2."""

import base64
import io
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.services.booking_operations import build_operation_legs

templates_dir = Path(__file__).parent.parent / "templates" / "pdfs"
jinja_env = Environment(
    loader=FileSystemLoader(str(templates_dir)),
    autoescape=True,
)

# Logo: convierte WebP → PNG redimensionado para WeasyPrint
_logo_path = (
    Path(__file__).parent.parent.parent.parent
    / "frontend"
    / "src"
    / "assets"
    / "logo-class-tio.webp"
)
_LOGO_DATA_URI: str = ""
if _logo_path.exists():
    try:
        from PIL import Image

        img = Image.open(_logo_path).convert("RGBA")
        # Redimensionar a 300×300 — suficiente para PDF, mínimo para WeasyPrint
        img.thumbnail((300, 300), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        encoded = base64.b64encode(buf.getvalue()).decode()
        _LOGO_DATA_URI = f"data:image/png;base64,{encoded}"
    except Exception:  # noqa: S110 — sin logo el template usa el texto fallback; no es crítico
        _LOGO_DATA_URI = ""


class PDFService:
    """Generación de PDFs para reservas."""

    async def generate_booking_confirmation(self, booking: dict, show_prices: bool = True) -> bytes:
        template = jinja_env.get_template("booking_confirmation.html")

        def cents_to_usd(v):
            return (v or 0) / 100

        items = booking.get("items") or []
        items_usd = [
            {
                "name": it.get("name"),
                "quantity": it.get("quantity", 1),
                "unit_price": cents_to_usd(it.get("unit_price")),
                "total_price": cents_to_usd(it.get("total_price")),
            }
            for it in items
        ]

        legs = build_operation_legs(booking)

        html_content = template.render(
            booking=booking,
            confirmation_code=booking.get("confirmation_code", ""),
            show_prices=show_prices,
            legs=legs,
            items=items_usd,
            total=cents_to_usd(booking.get("total_amount")),
            subtotal=cents_to_usd(booking.get("subtotal_amount")),
            discount=cents_to_usd(booking.get("discount_amount")),
            tax=cents_to_usd(booking.get("tax_amount")),
            currency=booking.get("currency", "USD"),
            logo_data_uri=_LOGO_DATA_URI,
        )

        return HTML(string=html_content).write_pdf()
