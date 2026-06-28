"""AuditService — Registro de acciones administrativas.

Cada acción de un admin (crear, cancelar, modificar, asignar)
queda registrada en admin_audit_logs para trazabilidad y cumplimiento.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AdminAuditLog
from app.models.enums import AuditAction


class AuditService:
    """Registro de auditoría para todas las acciones de administradores."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: AuditAction,
        entity_type: str,
        entity_id: str,
        description: str,
        user_id: str | None = None,
        user_email: str | None = None,
        changes: dict | None = None,
    ) -> AdminAuditLog:
        """Registra una acción administrativa en el log de auditoría.

        Args:
            action: CREATE, UPDATE, DELETE, CONFIRM, CANCEL, ASSIGN, PAYMENT, etc.
            entity_type: Tipo de entidad (Booking, Payment, AdminUser, PricingRule, etc.)
            entity_id: ID de la entidad afectada
            description: Descripción legible de lo que se hizo
            user_id: ID del admin que realizó la acción
            user_email: Email del admin (redundante para búsquedas rápidas sin JOIN)
            changes: Dict con before/after de los campos modificados

        Returns:
            La entrada de auditoría creada
        """
        log_entry = AdminAuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            user_id=user_id,
            user_email=user_email,
            changes=changes,
        )
        self.db.add(log_entry)
        await self.db.commit()
        return log_entry

    async def list_paginated(
        self,
        page: int = 1,
        page_size: int = 50,
        entity_id: str | None = None,
    ) -> tuple[list[AdminAuditLog], int]:
        """Lista entradas de auditoría, de la más reciente a la más antigua."""
        conditions = []
        if entity_id:
            conditions.append(AdminAuditLog.entity_id == entity_id)

        count_q = select(func.count()).select_from(AdminAuditLog)
        list_q = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
        for c in conditions:
            count_q = count_q.where(c)
            list_q = list_q.where(c)

        total = (await self.db.execute(count_q)).scalar_one()
        list_q = list_q.offset((page - 1) * page_size).limit(page_size)
        rows = list((await self.db.execute(list_q)).scalars().all())
        return rows, total
