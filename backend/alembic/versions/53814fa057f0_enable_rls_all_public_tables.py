"""enable_rls_all_public_tables

Revision ID: 53814fa057f0
Revises: 55e1faff1097
Create Date: 2026-06-23 20:26:31.534850

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53814fa057f0'
down_revision: Union[str, Sequence[str], None] = '55e1faff1097'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Activa Row Level Security (RLS) en TODAS las tablas del schema public.

    Por qué: Supabase expone automáticamente cada tabla de `public` por su API
    REST (PostgREST) usando la `anon key`. Sin RLS, cualquiera con esa key podría
    leer/escribir las tablas (admin_users, customers, bookings, payments, etc.)
    saltándose por completo el backend FastAPI y su login de admin.

    Por qué NO rompe la app: el backend se conecta como el rol `postgres`, que
    tiene `rolbypassrls = true` y además es dueño de las tablas. Ese rol IGNORA
    RLS — sus lecturas/escrituras no se ven afectadas. Verificado contra la base
    real: con RLS activado el backend sigue viendo las reservaciones igual.

    Se usa solo ENABLE (NUNCA FORCE): FORCE sometería también al dueño a RLS, lo
    que sí rompería el backend. Con ENABLE + sin policies para `anon`, la API
    pública de Supabase devuelve cero filas; el backend no se entera.
    """
    op.execute(
        """
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format(
              'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename
            );
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    """Desactiva RLS en todas las tablas del schema public (vuelve al estado previo)."""
    op.execute(
        """
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format(
              'ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename
            );
          END LOOP;
        END $$;
        """
    )
