"""FleetService — Conductores y vehículos de la flota."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.schemas.fleet import CreateDriverRequest, CreateVehicleRequest


class FleetService:
    """CRUD simple de conductores y vehículos."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_drivers(self) -> list[Driver]:
        result = await self.db.execute(select(Driver).order_by(Driver.name))
        return list(result.scalars().all())

    async def create_driver(self, data: CreateDriverRequest) -> Driver:
        driver = Driver(
            name=data.name,
            phone=data.phone,
            email=data.email,
            license_number=data.license_number,
        )
        self.db.add(driver)
        await self.db.commit()
        await self.db.refresh(driver)
        return driver

    async def list_vehicles(self) -> list[Vehicle]:
        result = await self.db.execute(select(Vehicle).order_by(Vehicle.make, Vehicle.model))
        return list(result.scalars().all())

    async def create_vehicle(self, data: CreateVehicleRequest) -> Vehicle:
        vehicle = Vehicle(
            make=data.make,
            model=data.model,
            year=data.year,
            license_plate=data.license_plate,
            capacity=data.capacity,
        )
        self.db.add(vehicle)
        await self.db.commit()
        await self.db.refresh(vehicle)
        return vehicle
