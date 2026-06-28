"""Endpoints de administradores — CRUD (protegido con JWT)."""

import csv
import io
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    AdminNotFoundError,
    ClassVIPError,
    InvalidBookingStateError,
    NotFoundError,
    ValidationError,
)
from app.dependencies import get_db
from app.middleware.dependencies import get_current_admin
from app.models.enums import AuditAction, BookingStatus
from app.schemas.account import (
    AccountDetailResponse,
    AccountSummaryResponse,
    CreateAccountRequest,
    CreateChargeFromBookingRequest,
    CreateChargeRequest,
    CreatePaymentRequest,
    UpdateChargeRequest,
)
from app.schemas.admin import AdminListResponse, AdminResponse, UpdateAdminRequest
from app.schemas.admin_task import (
    AdminTaskListResponse,
    AdminTaskResponse,
    CreateAdminTaskRequest,
    UpdateAdminTaskStatusRequest,
)
from app.schemas.audit import AuditLogListResponse, AuditLogResponse
from app.schemas.booking import (
    AssignBookingRequest,
    BookingListResponse,
    BookingResponse,
    CancelBookingRequest,
    CreateManualBookingRequest,
    DashboardStatsResponse,
    ManualBookingResponse,
    MarkPaidRequest,
    UpdateBookingRequest,
)
from app.schemas.fleet import (
    CreateDriverRequest,
    CreateVehicleRequest,
    DriverListResponse,
    DriverResponse,
    VehicleListResponse,
    VehicleResponse,
)
from app.services.account import AccountService
from app.services.admin import AdminService
from app.services.admin_task import AdminTaskService
from app.services.audit import AuditService
from app.services.booking import BookingService
from app.services.email import EmailService
from app.services.fleet import FleetService

logger = logging.getLogger(__name__)
router = APIRouter()


async def _audit(
    db: AsyncSession,
    admin_email: str,
    action: AuditAction,
    entity_id: str,
    description: str,
    *,
    entity_type: str = "Booking",
    changes: dict | None = None,
) -> None:
    """Registra una acción del admin en el log de auditoría (best-effort).

    Un fallo al escribir el log NUNCA debe revertir ni tumbar la acción que ya
    se ejecutó con éxito (misma filosofía que los emails, T8) — se loguea como
    warning y se sigue.
    """
    try:
        await AuditService(db).log(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            user_email=admin_email,
            changes=changes,
        )
    except Exception as exc:  # noqa: BLE001 — auditoría best-effort
        logger.warning("No se pudo registrar auditoría (%s %s): %s", action, entity_id, exc)


@router.get(
    "/bookings",
    response_model=BookingListResponse,
    summary="Listar reservas (panel de administración)",
    description=(
        "Lista TODAS las reservas sin importar su estado por defecto "
        "(incluye DRAFT y PENDING_PAYMENT). El filtro de status es opcional "
        "y debe pedirse explícitamente con ?status=."
    ),
)
async def list_bookings(
    page: int = Query(1, ge=1),
    # le=1000 (no 100): el panel admin pide hasta 1000 para filtrar/ordenar
    # del lado del cliente sobre una ventana amplia de fechas sin paginar la
    # UI — es tráfico interno autenticado, no un endpoint público.
    page_size: int = Query(20, ge=1, le=1000),
    status_filter: BookingStatus | None = Query(None, alias="status"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    search: str | None = Query(
        None, description="Nombre/email del cliente o código de confirmación"
    ),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/bookings — Lista paginada de reservas (requiere auth)."""
    service = BookingService(db)
    bookings, total = await service.list_paginated(
        page=page,
        page_size=page_size,
        status=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    return BookingListResponse(
        items=[BookingResponse.model_validate(b) for b in bookings],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/bookings/export",
    summary="Exportar reservas a CSV",
)
async def export_bookings_csv(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/bookings/export — CSV de reservas (requiere auth).

    page_size=1000 — para un export de verdad con más reservas que eso
    habría que paginar internamente, pero no es el caso de uso real de
    este botón (exportar un rango de fechas acotado).
    """
    service = BookingService(db)
    bookings, _ = await service.list_paginated(
        page=1, page_size=1000, date_from=date_from, date_to=date_to
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "confirmation_code",
            "status",
            "booking_date",
            "customer_name",
            "customer_email",
            "total_amount_usd",
        ]
    )
    for b in bookings:
        writer.writerow(
            [
                b.confirmation_code or "",
                b.status.value,
                b.booking_date.date().isoformat(),
                b.customer.name if b.customer else "",
                b.customer.email if b.customer else "",
                f"{b.total_amount / 100:.2f}",
            ]
        )
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bookings.csv"},
    )


@router.patch(
    "/bookings/{booking_id}",
    response_model=BookingResponse,
    summary="Editar campos operativos de una reserva",
)
async def update_booking(
    booking_id: str,
    data: UpdateBookingRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """PATCH /api/v1/admin/bookings/{booking_id} (requiere auth)."""
    service = BookingService(db)
    try:
        booking = await service.update(booking_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    await _audit(
        db,
        admin,
        AuditAction.UPDATE,
        booking_id,
        "Editó campos de la reserva",
        changes=data.model_dump(exclude_unset=True, mode="json"),
    )
    return booking


@router.post(
    "/bookings/{booking_id}/confirm",
    response_model=BookingResponse,
    summary="Confirmar una reserva manualmente (pago offline)",
)
async def confirm_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings/{booking_id}/confirm (requiere auth)."""
    service = BookingService(db)
    try:
        booking = await service.confirm(booking_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except InvalidBookingStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    await _audit(db, admin, AuditAction.CONFIRM, booking_id, "Confirmó la reserva (offline)")
    return booking


@router.post(
    "/bookings/{booking_id}/mark-paid",
    response_model=BookingResponse,
    summary="Marcar una reserva como pagada (cobro offline)",
)
async def mark_booking_paid(
    booking_id: str,
    data: MarkPaidRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings/{booking_id}/mark-paid (requiere auth).

    Pone la reserva en PAID y registra el pago en `payments` para que aparezca
    en Finanzas. Para cobros offline hechos después de crear la reserva.
    """
    service = BookingService(db)
    try:
        booking = await service.mark_paid(booking_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except InvalidBookingStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    await _audit(
        db,
        admin,
        AuditAction.PAYMENT,
        booking_id,
        f"Marcó como pagada (método: {data.method})",
    )
    return booking


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancelar una reserva",
)
async def cancel_booking(
    booking_id: str,
    data: CancelBookingRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings/{booking_id}/cancel (requiere auth)."""
    service = BookingService(db)
    try:
        booking = await service.cancel(booking_id, reason=data.reason)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except InvalidBookingStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
    await _audit(
        db,
        admin,
        AuditAction.CANCEL,
        booking_id,
        f"Canceló la reserva. Motivo: {data.reason or '—'}",
    )
    return booking


@router.delete(
    "/bookings/{booking_id}",
    summary="Borrar una reserva permanentemente (hard delete)",
)
async def delete_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """DELETE /api/v1/admin/bookings/{booking_id} (requiere auth).

    Hard delete IRREVERSIBLE: elimina la reserva y sus hijos (items, pagos,
    asignaciones, emails) vía CASCADE en la DB. Distinto de cancelar (que solo
    cambia el status y conserva el registro). El log de auditoría se conserva
    (entity_id no es FK, no cae con el CASCADE).
    """
    service = BookingService(db)
    try:
        booking = await service.get_by_id(booking_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)

    # Auditar ANTES de borrar — capturamos el código mientras la fila existe.
    code = booking.confirmation_code or booking_id[:8]
    await _audit(
        db, admin, AuditAction.DELETE, booking_id, f"Borró la reserva {code} permanentemente"
    )
    await service.delete(booking_id)
    return {"deleted": True, "id": booking_id}


@router.post(
    "/bookings/{booking_id}/assign",
    response_model=BookingResponse,
    summary="Asignar conductor y/o vehículo a una reserva",
)
async def assign_booking(
    booking_id: str,
    data: AssignBookingRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings/{booking_id}/assign (requiere auth)."""
    service = BookingService(db)
    try:
        booking = await service.assign(booking_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    await _audit(
        db,
        admin,
        AuditAction.ASSIGN,
        booking_id,
        "Asignó conductor/vehículo a la reserva",
        changes=data.model_dump(exclude_unset=True, mode="json"),
    )
    return booking


@router.post(
    "/bookings",
    response_model=ManualBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear reserva manual (Nueva Reserva / Quick Booking)",
)
async def create_manual_booking(
    data: CreateManualBookingRequest,
    db: AsyncSession = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings (requiere auth) — el admin crea una reserva directa.

    El status depende del método de pago elegido:
      - none   → OFFLINE_HOLD (guardar sin cobrar, sin email)
      - cash   → CONFIRMED    (pagada offline) + email de confirmación
      - stripe → PENDING_PAYMENT + email con link de pago

    El email es best-effort (T8): si falla, la reserva igual se crea y se
    reporta email_sent=False — un fallo de email nunca debe tumbar la reserva.
    """
    status_map = {
        "none": BookingStatus.OFFLINE_HOLD,
        "cash": BookingStatus.CONFIRMED,
        "stripe": BookingStatus.PENDING_PAYMENT,
    }
    booking_status = status_map[data.payment_method]

    service = BookingService(db)
    try:
        booking = await service.create_manual(data, booking_status)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.message)

    # ─── Email best-effort según el método de pago ───
    email_sent = False
    wants_email = (data.payment_method == "cash" and data.send_confirmation) or (
        data.payment_method == "stripe" and data.send_payment_link
    )
    if wants_email:
        booking_dict = {
            "id": booking.id,
            "confirmation_code": booking.confirmation_code,
            "booking_date": str(booking.booking_date),
            "booking_time": booking.booking_time,
            "pickup_location": booking.pickup_location,
            "dropoff_location": booking.dropoff_location,
            "flight_number": booking.flight_number,
            "service_type": booking.service_type,
            "total_amount": booking.total_amount,
            "currency": booking.currency,
            "passengers": booking.passengers,
            "customer_name": booking.customer.name if booking.customer else "Guest",
            "customer_email": booking.customer.email if booking.customer else "",
        }
        try:
            email_service = EmailService()
            if data.payment_method == "cash":
                await email_service.send_booking_confirmation(booking_dict, payment_method="cash")
            else:
                await email_service.send_booking_pending(booking_dict)
            email_sent = True
        except Exception as exc:
            logger.warning("Email de reserva manual %s falló: %s", booking.id, exc)

    await _audit(
        db,
        admin,
        AuditAction.CREATE,
        booking.id,
        f"Creó reserva manual (pago: {data.payment_method}, status: {booking_status.value})",
    )

    return ManualBookingResponse(
        booking=BookingResponse.model_validate(booking),
        payment_method=data.payment_method,
        email_sent=email_sent,
    )


@router.post(
    "/bookings/{booking_id}/resend-confirmation",
    summary="Reenviar el email de confirmación de una reserva",
)
async def resend_booking_confirmation(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/bookings/{booking_id}/resend-confirmation (requiere auth).

    Igual que en la creación de reservas (T8): un fallo de email nunca
    debe ser un 500 — se loguea y se informa, pero no tumba el endpoint.
    """
    service = BookingService(db)
    try:
        booking = await service.get_by_id(booking_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)

    booking_dict = {
        "id": booking.id,
        "confirmation_code": booking.confirmation_code,
        "booking_date": str(booking.booking_date),
        "booking_time": booking.booking_time,
        "pickup_location": booking.pickup_location,
        "dropoff_location": booking.dropoff_location,
        "flight_number": booking.flight_number,
        "service_type": booking.service_type,
        "total_amount": booking.total_amount,
        "currency": booking.currency,
        "passengers": booking.passengers,
        "customer_name": booking.customer.name if booking.customer else "Guest",
        "customer_email": booking.customer.email if booking.customer else "",
    }

    try:
        email_service = EmailService()
        await email_service.send_booking_confirmation(booking_dict)
        return {"sent": True}
    except Exception as exc:
        logger.warning("Resend de confirmación falló para %s: %s", booking_id, exc)
        return {"sent": False, "error": str(exc)}


@router.get(
    "/dashboard",
    response_model=DashboardStatsResponse,
    summary="Métricas agregadas (pestaña Marketing/Resumen)",
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/dashboard — Reservas y revenue de hoy/mes (requiere auth)."""
    service = BookingService(db)
    return await service.get_dashboard_stats()


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="Log de auditoría de acciones administrativas",
)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    entity_id: str | None = Query(
        None, description="Filtra por la entidad afectada (ej. booking_id)"
    ),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/audit-logs — Acciones de admins, de la más reciente (requiere auth)."""
    service = AuditService(db)
    logs, total = await service.list_paginated(page=page, page_size=page_size, entity_id=entity_id)
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/tasks",
    response_model=AdminTaskListResponse,
    summary="Listar tareas compartidas del equipo",
)
async def list_admin_tasks(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/tasks — Tareas compartidas, ordenadas por fecha (requiere auth)."""
    service = AdminTaskService(db)
    tasks = await service.list_all()
    return AdminTaskListResponse(
        items=[AdminTaskResponse.model_validate(t) for t in tasks],
        total=len(tasks),
    )


@router.post(
    "/tasks",
    response_model=AdminTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear tarea compartida",
)
async def create_admin_task(
    payload: CreateAdminTaskRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/tasks — Crea una tarea visible para todo el equipo (requiere auth)."""
    service = AdminTaskService(db)
    task = await service.create(
        titulo=payload.titulo,
        descripcion=payload.descripcion,
        fecha=payload.fecha,
        hora=payload.hora,
        categoria=payload.categoria,
    )
    return AdminTaskResponse.model_validate(task)


@router.patch(
    "/tasks/{task_id}",
    response_model=AdminTaskResponse,
    summary="Actualizar el estado de una tarea",
)
async def update_admin_task_status(
    task_id: str,
    payload: UpdateAdminTaskStatusRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """PATCH /api/v1/admin/tasks/{id} — Marca una tarea como completada/cancelada/pendiente."""
    service = AdminTaskService(db)
    try:
        task = await service.update_status(task_id, payload.status)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    return AdminTaskResponse.model_validate(task)


@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una tarea",
)
async def delete_admin_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """DELETE /api/v1/admin/tasks/{id} — Elimina una tarea compartida (requiere auth)."""
    service = AdminTaskService(db)
    try:
        await service.delete(task_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get(
    "/users",
    response_model=AdminListResponse,
    summary="Listar administradores",
)
async def list_admins(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/users — Lista todos los admins (requiere auth)."""
    service = AdminService(db)
    admins = await service.list_all()
    return AdminListResponse(
        items=[AdminResponse.model_validate(a) for a in admins],
        total=len(admins),
        page=1,
        page_size=100,
    )


@router.get(
    "/users/{admin_id}",
    response_model=AdminResponse,
    summary="Obtener administrador por ID",
)
async def get_admin(
    admin_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/users/{admin_id} (requiere auth)."""
    service = AdminService(db)
    try:
        return await service.get_by_id(admin_id)
    except AdminNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch(
    "/users/{admin_id}",
    response_model=AdminResponse,
    summary="Actualizar administrador",
)
async def update_admin(
    admin_id: str,
    data: UpdateAdminRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """PATCH /api/v1/admin/users/{admin_id} (requiere auth)."""
    service = AdminService(db)
    try:
        return await service.update(admin_id, data)
    except AdminNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


# ─── Flota: conductores y vehículos (pestaña RRHH) ─────────────────────────────


@router.get(
    "/drivers",
    response_model=DriverListResponse,
    summary="Listar conductores",
)
async def list_drivers(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/drivers — Lista todos los conductores (requiere auth)."""
    service = FleetService(db)
    drivers = await service.list_drivers()
    return DriverListResponse(
        items=[DriverResponse.model_validate(d) for d in drivers],
        total=len(drivers),
    )


@router.post(
    "/drivers",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear conductor",
)
async def create_driver(
    data: CreateDriverRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/drivers — Da de alta un conductor (requiere auth)."""
    service = FleetService(db)
    return await service.create_driver(data)


@router.get(
    "/vehicles",
    response_model=VehicleListResponse,
    summary="Listar vehículos",
)
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/vehicles — Lista todos los vehículos (requiere auth)."""
    service = FleetService(db)
    vehicles = await service.list_vehicles()
    return VehicleListResponse(
        items=[VehicleResponse.model_validate(v) for v in vehicles],
        total=len(vehicles),
    )


@router.post(
    "/vehicles",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear vehículo",
)
async def create_vehicle(
    data: CreateVehicleRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/vehicles — Da de alta un vehículo (requiere auth)."""
    service = FleetService(db)
    return await service.create_vehicle(data)


# ─── Cuentas por cobrar (pestañas Finanzas/Cuentas) ────────────────────────────


@router.get(
    "/accounts",
    response_model=list[AccountSummaryResponse],
    summary="Listar cuentas de clientes frecuentes",
)
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/accounts — Lista todas las cuentas (requiere auth)."""
    service = AccountService(db)
    return await service.list_accounts()


@router.post(
    "/accounts",
    response_model=AccountSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear cuenta de cliente frecuente",
)
async def create_account(
    data: CreateAccountRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/accounts (requiere auth)."""
    service = AccountService(db)
    return await service.create_account(data)


@router.get(
    "/accounts/{account_id}",
    response_model=AccountDetailResponse,
    summary="Detalle de una cuenta (cargos y pagos)",
)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/admin/accounts/{account_id} (requiere auth)."""
    service = AccountService(db)
    try:
        return await service.get_detail(account_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post(
    "/accounts/{account_id}/charges",
    response_model=AccountDetailResponse,
    summary="Agregar cargo manual a una cuenta",
)
async def add_charge(
    account_id: str,
    data: CreateChargeRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/accounts/{account_id}/charges (requiere auth)."""
    service = AccountService(db)
    try:
        return await service.add_charge(account_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post(
    "/accounts/{account_id}/bookings",
    response_model=AccountDetailResponse,
    summary="Cargar una reserva existente a la cuenta",
)
async def add_charge_from_booking(
    account_id: str,
    data: CreateChargeFromBookingRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/accounts/{account_id}/bookings (requiere auth)."""
    service = AccountService(db)
    try:
        return await service.add_charge_from_booking(account_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.patch(
    "/accounts/{account_id}/charges/{charge_id}",
    response_model=AccountDetailResponse,
    summary="Actualizar el estado de un cargo",
)
async def update_charge(
    account_id: str,
    charge_id: str,
    data: UpdateChargeRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """PATCH /api/v1/admin/accounts/{account_id}/charges/{charge_id} (requiere auth)."""
    service = AccountService(db)
    try:
        return await service.update_charge_status(account_id, charge_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post(
    "/accounts/{account_id}/payments",
    response_model=AccountDetailResponse,
    summary="Registrar un pago recibido",
)
async def add_payment(
    account_id: str,
    data: CreatePaymentRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/admin/accounts/{account_id}/payments (requiere auth)."""
    service = AccountService(db)
    try:
        return await service.add_payment(account_id, data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
