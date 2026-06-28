"""Endpoints de precios — hoteles, áreas, reglas y extras."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.middleware.dependencies import get_current_admin
from app.schemas.pricing import (
    AreaListResponse,
    AreaResponse,
    CreateAreaRequest,
    CreateHotelRequest,
    CreatePricingExtraRequest,
    HotelListResponse,
    HotelResponse,
    PricingExtraListResponse,
    PricingExtraResponse,
    UpdateAreaRequest,
    UpdateHotelRequest,
    UpdatePricingExtraRequest,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# HOTELES
# ═══════════════════════════════════════════════════════════════


@router.get(
    "/hotels",
    response_model=HotelListResponse,
    summary="Listar hoteles",
)
async def list_hotels(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    from app.models.pricing import Hotel

    result = await db.execute(select(Hotel).order_by(Hotel.name))
    hotels = list(result.scalars().all())
    return HotelListResponse(
        items=[HotelResponse.model_validate(h) for h in hotels],
        total=len(hotels),
        page=1,
        page_size=100,
    )


@router.post(
    "/hotels",
    response_model=HotelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear hotel",
)
async def create_hotel(
    data: CreateHotelRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from app.models.pricing import Hotel

    hotel = Hotel(name=data.name, zone=data.zone, is_active=data.is_active)
    db.add(hotel)
    await db.commit()
    await db.refresh(hotel)
    return hotel


@router.patch(
    "/hotels/{hotel_id}",
    response_model=HotelResponse,
    summary="Actualizar hotel",
)
async def update_hotel(
    hotel_id: str,
    data: UpdateHotelRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.models.pricing import Hotel

    result = await db.execute(select(Hotel).where(Hotel.id == hotel_id))
    hotel = result.scalar_one_or_none()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(hotel, key, value)
    await db.commit()
    await db.refresh(hotel)
    return hotel


# ═══════════════════════════════════════════════════════════════
# ÁREAS
# ═══════════════════════════════════════════════════════════════


@router.get("/areas", response_model=AreaListResponse, summary="Listar áreas")
async def list_areas(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    from app.models.pricing import Area

    result = await db.execute(select(Area).order_by(Area.name))
    areas = list(result.scalars().all())
    return AreaListResponse(
        items=[AreaResponse.model_validate(a) for a in areas],
        total=len(areas),
        page=1,
        page_size=100,
    )


@router.post(
    "/areas",
    response_model=AreaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear área",
)
async def create_area(
    data: CreateAreaRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from app.models.pricing import Area

    area = Area(
        name=data.name,
        one_way_price_cents=data.one_way_price_cents,
        round_trip_price_cents=data.round_trip_price_cents,
        sprinter_one_way_price_cents=data.sprinter_one_way_price_cents,
        sprinter_round_trip_price_cents=data.sprinter_round_trip_price_cents,
        is_active=data.is_active,
    )
    db.add(area)
    await db.commit()
    await db.refresh(area)
    return area


@router.patch("/areas/{area_id}", response_model=AreaResponse, summary="Actualizar área")
async def update_area(
    area_id: str,
    data: UpdateAreaRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.models.pricing import Area

    result = await db.execute(select(Area).where(Area.id == area_id))
    area = result.scalar_one_or_none()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(area, key, value)
    await db.commit()
    await db.refresh(area)
    return area


# ═══════════════════════════════════════════════════════════════
# EXTRAS
# ═══════════════════════════════════════════════════════════════


@router.get("/extras", response_model=PricingExtraListResponse, summary="Listar extras")
async def list_extras(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    from app.models.pricing import PricingExtra

    result = await db.execute(select(PricingExtra).order_by(PricingExtra.code))
    extras = list(result.scalars().all())
    return PricingExtraListResponse(
        items=[PricingExtraResponse.model_validate(e) for e in extras],
        total=len(extras),
        page=1,
        page_size=100,
    )


@router.post(
    "/extras",
    response_model=PricingExtraResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear extra",
)
async def create_extra(
    data: CreatePricingExtraRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from app.models.pricing import PricingExtra

    extra = PricingExtra(
        active=data.active,
        included=data.included,
        code=data.code,
        label=data.label,
        label_es=data.label_es,
        price_cents=data.price_cents,
        pricing_mode=data.pricing_mode,
        max_qty=data.max_qty,
        description=data.description,
    )
    db.add(extra)
    await db.commit()
    await db.refresh(extra)
    return extra


@router.patch(
    "/extras/{extra_id}",
    response_model=PricingExtraResponse,
    summary="Actualizar extra",
)
async def update_extra(
    extra_id: str,
    data: UpdatePricingExtraRequest,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    from sqlalchemy import select

    from app.models.pricing import PricingExtra

    result = await db.execute(select(PricingExtra).where(PricingExtra.id == extra_id))
    extra = result.scalar_one_or_none()
    if not extra:
        raise HTTPException(status_code=404, detail="Extra no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(extra, key, value)
    await db.commit()
    await db.refresh(extra)
    return extra
