#!/usr/bin/env python3
"""Script para cargar datos semilla en la base de datos.

Ejecutar: cd backend && python scripts/seed.py

Crea:
- Hoteles de Los Cabos
- Áreas de servicio con tarifas
- Reglas de precio
- Extras disponibles
"""

import asyncio
import sys
from pathlib import Path

# Agregar backend al path para importar app
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.enums import (
    ExtraCode,
    PricingMode,
)
from app.models.pricing import Area, Hotel, PricingExtra


async def seed():
    async with AsyncSessionLocal() as db:
        # ─── Hoteles ─────────────────────────────────────
        hotels = [
            Hotel(name="Grand Velas Los Cabos", zone="Los Cabos"),
            Hotel(name="Waldorf Astoria Los Cabos Pedregal", zone="Los Cabos"),
            Hotel(name="The Cape, a Thompson Hotel", zone="Los Cabos"),
            Hotel(name="One&Only Palmilla", zone="Los Cabos"),
            Hotel(name="Nobu Hotel Los Cabos", zone="Los Cabos"),
            Hotel(name="Hard Rock Hotel Los Cabos", zone="Los Cabos"),
            Hotel(name="Hyatt Ziva Los Cabos", zone="Los Cabos"),
            Hotel(name="Secrets Puerto Los Cabos", zone="Los Cabos"),
            Hotel(name="Marquis Los Cabos", zone="Los Cabos"),
            Hotel(name="Garza Blanca Los Cabos", zone="Los Cabos"),
            Hotel(name="Hacienda del Mar", zone="Los Cabos"),
            Hotel(name="Villa La Estancia", zone="Los Cabos"),
        ]
        db.add_all(hotels)

        # ─── Áreas ───────────────────────────────────────
        areas = [
            Area(
                name="SJD Airport",
                one_way_price_cents=12000,
                round_trip_price_cents=20000,
                sprinter_one_way_price_cents=18000,
                sprinter_round_trip_price_cents=30000,
            ),
            Area(
                name="Cabo San Lucas",
                one_way_price_cents=10000,
                round_trip_price_cents=16000,
                sprinter_one_way_price_cents=15000,
                sprinter_round_trip_price_cents=25000,
            ),
            Area(
                name="San José del Cabo",
                one_way_price_cents=8000,
                round_trip_price_cents=12000,
                sprinter_one_way_price_cents=12000,
                sprinter_round_trip_price_cents=20000,
            ),
        ]
        db.add_all(areas)

        # ─── Extras ──────────────────────────────────────
        extras = [
            PricingExtra(
                code=ExtraCode.GROCERY_STOP,
                label="Grocery Stop",
                label_es="Parada en supermercado",
                price_cents=2500,
                pricing_mode=PricingMode.PER_STOP,
                max_qty=2,
                description="30-minute stop at a grocery store",
            ),
            PricingExtra(
                code=ExtraCode.BABY_SEAT,
                label="Baby Seat",
                label_es="Silla para bebé",
                price_cents=1500,
                pricing_mode=PricingMode.PER_BOOKING,
                max_qty=3,
            ),
            PricingExtra(
                code=ExtraCode.BOOSTER,
                label="Booster Seat",
                label_es="Asiento elevador",
                price_cents=1000,
                pricing_mode=PricingMode.PER_BOOKING,
                max_qty=3,
            ),
            PricingExtra(
                code=ExtraCode.MEET_GREET,
                label="Meet & Greet",
                label_es="Recibimiento personalizado",
                price_cents=3000,
                pricing_mode=PricingMode.PER_BOOKING,
                description="Driver waits inside terminal with a sign",
            ),
            PricingExtra(
                code=ExtraCode.CHAMPAGNE,
                label="Champagne Service",
                label_es="Servicio de champagne",
                price_cents=4500,
                pricing_mode=PricingMode.PER_BOOKING,
                max_qty=2,
            ),
            PricingExtra(
                code=ExtraCode.EXTRA_STOP,
                label="Extra Stop",
                label_es="Parada adicional",
                price_cents=2000,
                pricing_mode=PricingMode.PER_STOP,
                max_qty=3,
            ),
        ]
        db.add_all(extras)

        await db.commit()

        # ─── Verificar ───────────────────────────────────
        hotel_count = (await db.execute(select(Hotel))).scalars().all()
        area_count = (await db.execute(select(Area))).scalars().all()
        extra_count = (await db.execute(select(PricingExtra))).scalars().all()

        print("Seed completado:")
        print(f"  Hoteles: {len(hotel_count)}")
        print(f"  Áreas:   {len(area_count)}")
        print(f"  Extras:  {len(extra_count)}")


if __name__ == "__main__":
    asyncio.run(seed())
