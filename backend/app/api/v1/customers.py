"""Endpoints de clientes — CRUD básico.

TODOS requieren admin autenticado. El funnel público NO usa estos endpoints:
crea/encuentra al cliente internamente vía CustomerService.find_or_create
dentro de BookingService.create_draft. Estos endpoints son operaciones del
panel admin (editar datos de un cliente desde una reserva, altas manuales).
Sin la auth, el PATCH dejaba que cualquiera modificara PII de cualquier cliente.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ClassVIPError, CustomerNotFoundError
from app.dependencies import get_db
from app.middleware.dependencies import get_current_admin
from app.schemas.customer import (
    CreateCustomerRequest,
    CustomerResponse,
    UpdateCustomerRequest,
)
from app.services.customer import CustomerService

router = APIRouter()


@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un cliente",
)
async def create_customer(
    data: CreateCustomerRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """POST /api/v1/customers — Crear cliente manualmente (requiere auth)."""
    service = CustomerService(db)
    try:
        return await service.create(data)
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Obtener un cliente por ID",
)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """GET /api/v1/customers/{customer_id} (requiere auth)."""
    service = CustomerService(db)
    try:
        return await service.get_by_id(customer_id)
    except CustomerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Actualizar un cliente",
)
async def update_customer(
    customer_id: str,
    data: UpdateCustomerRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    """PATCH /api/v1/customers/{customer_id} (requiere auth)."""
    service = CustomerService(db)
    try:
        return await service.update(customer_id, data)
    except CustomerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except ClassVIPError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
