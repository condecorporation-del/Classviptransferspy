"""drop_pricing_rules_table

Elimina la tabla pricing_rules y su lógica duplicada. El precio de un traslado se
define por ÁREA (tabla areas) con dos bandas de capacidad (1-5 y 6-11 pax); las
"pricing rules" (SUV/SPRINTER por zona) eran legacy, NO las usaba el flujo de
booking ni el `PricingService` (que también se eliminó). Mantenerlas era código y
lógica duplicada que confundía al sistema. Ver WORKPLAN Fase 28.

Revision ID: c9f1a2b3d4e5
Revises: b7c4d9e1a2f3
Create Date: 2026-06-26
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9f1a2b3d4e5"
down_revision: Union[str, Sequence[str], None] = "b7c4d9e1a2f3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF EXISTS para ser idempotente aunque la tabla ya no esté.
    op.execute("DROP TABLE IF EXISTS pricing_rules CASCADE")


def downgrade() -> None:
    # Recrea la estructura (sin datos). Solo por reversibilidad del historial;
    # el sistema ya no usa esta tabla.
    op.create_table(
        "pricing_rules",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("service_type", sa.Enum(name="servicetype"), nullable=False),
        sa.Column("trip_type", sa.Enum(name="triptype"), nullable=False),
        sa.Column("zone_from", sa.String(length=100), nullable=False),
        sa.Column("zone_to", sa.String(length=100), nullable=False),
        sa.Column("vehicle_class", sa.Enum(name="vehicleclass"), nullable=False),
        sa.Column("base_price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("passengers_min", sa.Integer(), nullable=True),
        sa.Column("passengers_max", sa.Integer(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
