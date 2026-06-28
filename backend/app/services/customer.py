"""CustomerService — Lógica de negocio para clientes.

El patrón find-or-create es clave: cuando se crea una reserva,
buscamos al cliente por email. Si existe, actualizamos sus datos.
Si no, lo creamos. Esto evita duplicados y mantiene datos frescos.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CustomerNotFoundError, DuplicateEntityError
from app.models.customer import Customer
from app.schemas.customer import CreateCustomerRequest, UpdateCustomerRequest


class CustomerService:
    """Gestión de clientes: find-or-create y CRUD básico."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_or_create(
        self,
        name: str,
        email: str,
        phone: str,
        country: str | None = None,
        language: str = "en",
    ) -> Customer:
        """Busca un cliente por email. Si no existe, lo crea.

        Si ya existe, actualiza nombre y teléfono con los datos
        más recientes de la reserva.
        """
        email = email.lower().strip()
        result = await self.db.execute(select(Customer).where(Customer.email == email))
        customer = result.scalar_one_or_none()

        if customer:
            # Actualizar datos con la info más reciente
            customer.name = name
            customer.phone = phone
            if country is not None:
                customer.country = country
            if language:
                customer.language = language
            return customer

        # Cliente nuevo
        customer = Customer(
            name=name,
            email=email,
            phone=phone,
            country=country,
            language=language,
        )
        self.db.add(customer)
        await self.db.flush()  # flush() para obtener el ID sin commit
        return customer

    async def get_by_id(self, customer_id: str) -> Customer:
        """Obtiene un cliente por ID.

        Raises:
            CustomerNotFoundError: Si no existe.
        """
        result = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        customer = result.scalar_one_or_none()
        if not customer:
            raise CustomerNotFoundError(customer_id)
        return customer

    async def get_by_email(self, email: str) -> Customer | None:
        """Busca cliente por email. Devuelve None si no existe."""
        email = email.lower().strip()
        result = await self.db.execute(select(Customer).where(Customer.email == email))
        return result.scalar_one_or_none()

    async def create(self, data: CreateCustomerRequest) -> Customer:
        """Crea un cliente nuevo manualmente.

        Raises:
            DuplicateEntityError: Si el email ya está registrado.
        """
        existing = await self.get_by_email(data.email)
        if existing:
            raise DuplicateEntityError("Customer", "email", data.email)

        customer = Customer(
            name=data.name,
            email=data.email,
            phone=data.phone,
            country=data.country,
            language=data.language,
        )
        self.db.add(customer)
        await self.db.flush()
        return customer

    async def update(self, customer_id: str, data: UpdateCustomerRequest) -> Customer:
        """Actualiza datos de un cliente existente.

        Solo actualiza los campos enviados (exclude_unset=True).
        """
        customer = await self.get_by_id(customer_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(customer, key, value)
        await self.db.flush()
        return customer
