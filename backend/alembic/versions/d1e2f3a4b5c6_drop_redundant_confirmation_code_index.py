"""drop_redundant_confirmation_code_index

Elimina el índice redundante `ix_bookings_confirmation_code`. La columna
`bookings.confirmation_code` ya tiene un índice único implícito creado por
`unique=True` (`bookings_confirmation_code_key`), así que el índice explícito
era una duplicación: ocupaba espacio y añadía costo de escritura en cada
insert/update de reserva sin aportar nada para las búsquedas (el índice único
ya sirve para los lookups por código). Ver WORKPLAN Fase 31i.

Revision ID: d1e2f3a4b5c6
Revises: c9f1a2b3d4e5
Create Date: 2026-06-27
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, Sequence[str], None] = "c9f1a2b3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF EXISTS para ser idempotente. El índice único bookings_confirmation_code_key
    # (de unique=True) NO se toca — es el que se conserva.
    op.execute("DROP INDEX IF EXISTS ix_bookings_confirmation_code")


def downgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bookings_confirmation_code "
        "ON bookings (confirmation_code)"
    )
