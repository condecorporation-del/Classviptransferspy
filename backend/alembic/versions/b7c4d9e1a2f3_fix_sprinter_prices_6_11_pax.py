"""fix_sprinter_prices_6_11_pax

Copia los precios establecidos de 6-11 pasajeros (banda "sprinter") a los campos
sprinter_* de la tabla areas, que es la fuente real que usa el flujo de booking.

Contexto: el negocio tiene 6 zonas y UNA sola regla de capacidad:
  - 1 a 5 pasajeros  -> un precio (campos one_way / round_trip, ya correctos)
  - 6 a 11 pasajeros -> otro precio (campos sprinter_*, estaban en $0 == BUG)

Los precios de 6-11 ya estaban establecidos en pricing_rules (reglas SPRINTER),
pero nunca se copiaron a areas.sprinter_*; por eso un grupo de 6+ caía al precio
de 1-5. Aquí se fija la banda 6-11 en areas. El cliente NO elige vehículo: el
backend cambia de banda solo por número de pasajeros (booking.py: passengers >= 6).

Redondo = ida x 1.8, misma convención que ya usa areas para la banda 1-5.

Revision ID: b7c4d9e1a2f3
Revises: 38eca4d0c9e6
Create Date: 2026-06-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c4d9e1a2f3"
down_revision: Union[str, Sequence[str], None] = "38eca4d0c9e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Precio de ida 6-11 pax por zona (en dólares). Redondo = ida * 1.8.
# Fuente: pricing_rules (reglas SPRINTER 6-14) ya establecidas en el proyecto.
SPRINTER_ONE_WAY_USD = {
    "Tourist Corridor": 145,
    "Cabo San Lucas": 155,
    "San Jose del Cabo": 130,
    "Port Los Cabos": 135,
    "Cabo Pacific Area": 175,
    "Pacific & East Cape": 205,
}

_UPDATE = sa.text(
    "UPDATE areas SET sprinter_one_way_price_cents = :ow, "
    "sprinter_round_trip_price_cents = :rt WHERE name = :name"
)


def upgrade() -> None:
    conn = op.get_bind()
    for name, ow in SPRINTER_ONE_WAY_USD.items():
        rt = int(round(ow * 1.8))
        conn.execute(_UPDATE, {"ow": ow * 100, "rt": rt * 100, "name": name})


def downgrade() -> None:
    # Revertir la banda 6-11 a $0 (estado previo a esta migración).
    conn = op.get_bind()
    for name in SPRINTER_ONE_WAY_USD:
        conn.execute(_UPDATE, {"ow": 0, "rt": 0, "name": name})
