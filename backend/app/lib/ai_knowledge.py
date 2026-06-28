"""Base de conocimiento del agente de IA de Class VIP Transfers.

Se inyecta en el system prompt para que el modelo conteste con datos reales
de la empresa sin tener que repetirlos en cada mensaje del usuario.
"""

from typing import Literal

Locale = Literal["en", "es"]

AI_KNOWLEDGE = {
    "activities": [
        "Camel Ride",
        "ATV Adventure",
        "Horseback Riding",
        "Sky Bikes",
        "RZR",
    ],
    "activities_es": [
        "Paseo en Camello",
        "Aventura ATV",
        "Paseo a Caballo",
        "Sky Bikes",
        "RZR",
    ],
    "locations": [
        "SJD Airport",
        "Cabo San Lucas",
        "San José del Cabo",
        "Tourist Corridor (Palmilla, Punta Ballena)",
        "Puerto Los Cabos",
        "El Arco",
        "Médano Beach",
    ],
    "extras": [
        "Starlink WiFi (every unit)",
        "Welcome drinks",
        "Bilingual drivers (Spanish, English)",
        "Child seats / booster",
        "Grocery stop",
        "Champagne service",
    ],
    "extras_es": [
        "WiFi Starlink (en todas las unidades)",
        "Bebidas de bienvenida",
        "Conductores bilingües (español, inglés)",
        "Sillas infantiles / booster",
        "Parada en supermercado",
        "Servicio de champagne",
    ],
    "benefits": [
        "Brand-new, comfortable units with Starlink WiFi on every transfer.",
        "All transfers include complimentary welcome drinks.",
        "Our drivers speak Spanish and English.",
        "Flexibility: you can change times without penalty.",
    ],
    "benefits_es": [
        "Unidades nuevas y confortables con WiFi Starlink en cada traslado.",
        "Todos nuestros traslados incluyen bebidas de bienvenida.",
        "Nuestros conductores hablan español e inglés.",
        "Flexibilidad: puedes cambiar horarios sin penalidad.",
    ],
    "booking_channels": {
        "website": "/book",
        "whatsapp": "https://wa.me/5216241222174",
        "whatsapp_phone": "+52 624 122 2174",
        "email": "Armando@classviptransfers.com",
        "imessage": "+52 624 122 2174",
    },
}


def get_knowledge_for_prompt(
    locale: Locale,
    areas: list[dict],
    extras: list[dict],
    combo_price_cents: dict[str, int],
) -> str:
    """Arma el bloque de conocimiento con precios reales (centavos -> dólares)."""
    k = AI_KNOWLEDGE
    is_es = locale == "es"
    activities = ", ".join(k["activities_es"] if is_es else k["activities"])
    locations = ", ".join(k["locations"])
    extras_list = ", ".join(k["extras_es"] if is_es else k["extras"])
    benefits = " ".join(k["benefits_es"] if is_es else k["benefits"])
    channels = k["booking_channels"]

    if areas:
        one_way = ", ".join(
            f"{a['name']}: ${a['one_way_price_cents'] / 100:.0f} USD" for a in areas
        )
        round_trip = ", ".join(
            f"{a['name']}: ${a['round_trip_price_cents'] / 100:.0f} USD" for a in areas
        )
    else:
        one_way = "consultar por zona" if is_es else "quote by zone"
        round_trip = one_way

    paid_extras = [e for e in extras if e.get("price_cents", 0) > 0 and not e.get("included")]
    if paid_extras:
        extras_pricing = ", ".join(
            f"{(e.get('label_es') or e['label']) if is_es else e['label']}: "
            f"${e['price_cents'] / 100:.0f} USD"
            for e in paid_extras
        )
    else:
        extras_pricing = "consultar" if is_es else "ask"

    combo_price = combo_price_cents.get("COMBO", 10000) / 100
    crazy_combo_price = combo_price_cents.get("CRAZY_COMBO", 12500) / 100

    if is_es:
        return f"""ACTIVIDADES (elige 2 o 3 dentro de un combo, NO se venden sueltas): {activities}
UBICACIONES CLAVE: {locations}
EXTRAS: {extras_list}
PRECIOS TRANSFER (solo ida, desde/hacia SJD, por zona): {one_way}
PRECIOS TRANSFER (ida y vuelta, por zona): {round_trip}
EXTRAS DE PAGO: {extras_pricing}
COMBOS DE ACTIVIDADES (el cliente elige cuáles actividades, NO vendemos actividades individuales):
- Combo (2 actividades, 1h c/u): ${combo_price:.0f} USD/persona
- Crazy Combo (3 actividades, 1h c/u): ${crazy_combo_price:.0f} USD/persona
BENEFICIOS (menciona cuando aplique): {benefits}
FORMAS DE RESERVAR (ofrece estas 4 cuando el cliente quiera reservar):
1. Página web: {channels['website']}
2. WhatsApp: {channels['whatsapp_phone']}
3. Email: {channels['email']}
4. iMessage/SMS: {channels['imessage']}"""

    return f"""ACTIVITIES (choose 2 or 3 within a combo, NOT sold individually): {activities}
KEY LOCATIONS: {locations}
EXTRAS: {extras_list}
TRANSFER PRICES (one-way, to/from SJD, by zone): {one_way}
TRANSFER PRICES (round-trip, by zone): {round_trip}
PAID EXTRAS: {extras_pricing}
ACTIVITY COMBOS (client picks which activities, we don't sell individual activities):
- Combo (2 activities, 1hr each): ${combo_price:.0f} USD/person
- Crazy Combo (3 activities, 1hr each): ${crazy_combo_price:.0f} USD/person
BENEFITS (mention when relevant): {benefits}
WAYS TO BOOK (offer these 4 when the client wants to book):
1. Website: {channels['website']}
2. WhatsApp: {channels['whatsapp_phone']}
3. Email: {channels['email']}
4. iMessage/SMS: {channels['imessage']}"""
