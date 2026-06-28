"""rls_deny_policies_public_tables

Revision ID: 38eca4d0c9e6
Revises: 53814fa057f0
Create Date: 2026-06-23 20:45:13.477786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38eca4d0c9e6'
down_revision: Union[str, Sequence[str], None] = '53814fa057f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


POLICY_NAME = "deny_public_access"


def upgrade() -> None:
    """Crea una policy RESTRICTIVE de denegación en cada tabla de `public`.

    Contexto: en la Fase 23 se activó RLS en todas las tablas. El linter de
    Supabase entonces avisa `rls_enabled_no_policy` (RLS activo pero sin policies).
    Para ESTA arquitectura la intención NO es dar acceso por la API de Supabase
    (PostgREST/`anon key`) — el frontend nunca la usa, todo pasa por el backend
    FastAPI (rol `postgres`, que IGNORA RLS por `rolbypassrls=true`).

    Por eso la policy correcta es DENEGAR explícitamente, no abrir:
    - `AS RESTRICTIVE ... USING (false) WITH CHECK (false)` → ningún rol sujeto a
      RLS (anon, authenticated, etc.) puede leer ni escribir.
    - Es a prueba de futuro: una policy RESTRICTIVE se combina con AND, así que aunque
      alguien agregue después una policy PERMISSIVE por error, este deny sigue
      bloqueando a `anon`.
    - El backend (rol `postgres`, bypassrls) NO se ve afectado — sigue viendo todo.

    Resultado: el linter queda satisfecho (existe policy) y la puerta sigue cerrada.
    """
    op.execute(
        f"""
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format(
              'DROP POLICY IF EXISTS %I ON public.%I', '{POLICY_NAME}', r.tablename
            );
            EXECUTE format(
              'CREATE POLICY %I ON public.%I '
              'AS RESTRICTIVE FOR ALL TO public '
              'USING (false) WITH CHECK (false)',
              '{POLICY_NAME}', r.tablename
            );
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    """Elimina la policy de denegación de todas las tablas de `public`."""
    op.execute(
        f"""
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
          LOOP
            EXECUTE format(
              'DROP POLICY IF EXISTS %I ON public.%I', '{POLICY_NAME}', r.tablename
            );
          END LOOP;
        END $$;
        """
    )
