"""AdminTaskService — Tareas compartidas del panel de administración.

Reemplaza el almacenamiento en localStorage de TareasTab.tsx: ahora las
tareas viven en la base de datos y son visibles para cualquier admin.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.admin_task import AdminTask
from app.models.enums import AdminTaskCategory, AdminTaskStatus


class AdminTaskService:
    """CRUD de tareas compartidas (listar/crear/actualizar estado/borrar)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(self) -> list[AdminTask]:
        result = await self.db.execute(
            select(AdminTask).order_by(AdminTask.fecha.asc(), AdminTask.hora.asc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        *,
        titulo: str,
        descripcion: str | None,
        fecha: str,
        hora: str | None,
        categoria: AdminTaskCategory,
    ) -> AdminTask:
        task = AdminTask(
            titulo=titulo,
            descripcion=descripcion,
            fecha=fecha,
            hora=hora,
            categoria=categoria,
            status=AdminTaskStatus.PENDIENTE,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_status(self, task_id: str, status: AdminTaskStatus) -> AdminTask:
        task = await self.db.get(AdminTask, task_id)
        if not task:
            raise NotFoundError("AdminTask", task_id)
        task.status = status
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task_id: str) -> None:
        task = await self.db.get(AdminTask, task_id)
        if not task:
            raise NotFoundError("AdminTask", task_id)
        await self.db.delete(task)
        await self.db.commit()
