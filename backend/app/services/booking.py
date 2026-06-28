"""BookingService — Lógica de negocio principal para reservas.

Responsable de crear, consultar, cancelar y confirmar reservas.
Cada método es atómico: hace una operación y la completa.
El endpoint orquesta múltiples llamadas si necesita flujos complejos.
"""

import secrets
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import (
    BookingNotFoundError,
    InvalidBookingStateError,
    ValidationError,
)
from app.models.booking import Booking
from app.models.booking_assignment import BookingAssignment
from app.models.booking_item import BookingItem
from app.models.customer import Customer
from app.models.enums import (
    BookingAssignmentType,
    BookingSource,
    BookingStatus,
    PaymentProvider,
    PaymentStatus,
)
from app.models.payment import Payment
from app.models.pricing import Area, PricingExtra
from app.schemas.booking import (
    AssignBookingRequest,
    CreateBookingRequest,
    CreateManualBookingRequest,
    DashboardStatsResponse,
    MarkPaidRequest,
    UpdateBookingRequest,
)
from app.services.customer import CustomerService

# Catálogo server-side de combos — debe coincidir EXACTAMENTE con los
# precios hardcodeados en frontend/.../pages/Book.tsx (no hay tabla en DB
# para esto todavía). No se venden actividades individuales — el producto
# es el combo (2 actividades) o crazy combo (3 actividades), el cliente
# solo elige CUÁLES van dentro, no afecta el precio. Se usa para recalcular
# item.unit_price cuando el item manda un `code` reconocido, igual que se
# hace con Area para TRANSPORTATION y con PricingExtra para ADDON — así el
# cliente tampoco puede manipular el precio de un combo desde el navegador.
COMBO_PRICE_CENTS: dict[str, int] = {
    "COMBO": 10000,
    "CRAZY_COMBO": 12500,
}


class BookingService:
    """Lógica de negocio para reservas.

    Patrón:
    - El servicio recibe AsyncSession en __init__
    - Cada método opera sobre esa sesión
    - El caller (endpoint) es responsable de commit/rollback
      a través de la dependencia get_db()
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── CREATE ──────────────────────────────────────────────

    async def create_draft(
        self,
        data: CreateBookingRequest,
        source: BookingSource = BookingSource.WEBSITE,
    ) -> Booking:
        """Crea una reserva nueva en estado DRAFT.

        Flujo:
        1. Busca o crea el cliente
        2. Valida reglas de negocio (fecha futura, pasajeros)
        3. Crea el booking
        4. Genera código de confirmación único
        5. Crea los booking items y calcula el total
        6. Hace commit y refresca el objeto

        Raises:
            ValidationError: Si los datos no pasan reglas de negocio.
        """
        # 2. Validar pasajeros (no depende de la DB, se valida una sola vez)
        passengers = max(1, data.passengers)
        if data.type == "TRANSPORTATION" and (passengers < 1 or passengers > 14):
            raise ValidationError("Pasajeros debe ser entre 1 y 14 para transporte")

        # 3. Validar fecha futura
        booking_date = datetime.fromisoformat(data.booking_date)
        now_utc = datetime.now(UTC)
        if booking_date.replace(tzinfo=UTC).date() < now_utc.date():
            raise ValidationError("La fecha de la reserva debe ser futura")

        # 3b. Recalcular el precio del transporte desde la zona REAL en DB —
        # el formulario público manda area_id (qué zona eligió el cliente),
        # y aquí se ignora cualquier precio que el cliente haya calculado en
        # su navegador y se reemplaza por el precio server-side. Esto cierra
        # la posibilidad de que alguien manipule el total desde el navegador
        # antes de enviarlo. Si no manda area_id (reservas sin zona, p.ej.
        # solo actividades), no se recalcula nada — se confía en los items
        # como antes.
        recalculated_transport_cents: int | None = None
        if data.area_id:
            area = await self.db.get(Area, data.area_id)
            if area is None:
                raise ValidationError(f"Área de precio inválida: {data.area_id}")
            is_sprinter = passengers >= 6
            is_roundtrip = (data.trip_type or "").lower() == "roundtrip"
            if is_sprinter and area.sprinter_one_way_price_cents > 0:
                recalculated_transport_cents = (
                    area.sprinter_round_trip_price_cents
                    if is_roundtrip
                    else area.sprinter_one_way_price_cents
                )
            else:
                recalculated_transport_cents = (
                    area.round_trip_price_cents if is_roundtrip else area.one_way_price_cents
                )

        # 3c. Catálogo de extras reales (PricingExtra) — para recalcular ADDON
        # por `code` igual que se hace con el transporte por `area_id`.
        extras_by_code: dict[str, int] = {
            extra.code: extra.price_cents
            for extra in (
                await self.db.execute(select(PricingExtra).where(PricingExtra.active.is_(True)))
            )
            .scalars()
            .all()
        }

        def _recalculate_item_price(item_data) -> tuple[int, int]:
            """Recalcula (unit_price, total_price) en centavos para items con
            `code` reconocido (ADDON desde PricingExtra, ACTIVITY/COMBO desde
            el catálogo fijo). Si no hay `code` o no se reconoce, devuelve el
            precio que mandó el cliente sin tocar — mismo comportamiento que
            antes para items sin catálogo server-side."""
            code = item_data.code
            if item_data.type == "ADDON" and code and code in extras_by_code:
                cents = extras_by_code[code]
                return cents, cents * item_data.quantity
            if item_data.type in ("COMBO", "CRAZY_COMBO") and code and code in COMBO_PRICE_CENTS:
                cents = COMBO_PRICE_CENTS[code]
                return cents, cents * item_data.quantity
            return item_data.unit_price, item_data.total_price

        # El código de confirmación es aleatorio (ver _random_confirmation_code) y
        # tiene un UNIQUE constraint en DB. Una colisión es estadísticamente rara
        # (900,000 combinaciones por año) pero posible bajo tráfico concurrente —
        # por eso todo el bloque de creación se reintenta ante IntegrityError, no
        # solo la generación del código. Reintentar el bloque completo (en vez de
        # un SAVEPOINT parcial) es el patrón más simple y confiable: si la
        # colisión ocurre, se descarta TODO el intento (rollback limpio) y se
        # vuelve a construir el booking desde cero con un código nuevo —
        # find_or_create del cliente es idempotente, así que repetirlo no tiene
        # efectos secundarios.
        max_attempts = 5
        customer_service = CustomerService(self.db)

        for attempt in range(1, max_attempts + 1):
            try:
                # 1. Cliente — find-or-create
                customer = await customer_service.find_or_create(
                    name=data.customer.name,
                    email=data.customer.email,
                    phone=data.customer.phone,
                    country=data.customer.country,
                    language=data.customer.language,
                )

                # 4. Crear el booking
                booking = Booking(
                    type=data.type,
                    status=BookingStatus.DRAFT,
                    source=source,
                    customer_id=customer.id,
                    booking_date=booking_date,
                    booking_time=data.booking_time,
                    pickup_time=data.pickup_time,
                    pickup_location=data.pickup_location,
                    dropoff_location=data.dropoff_location,
                    flight_number=data.flight_number,
                    arrival_time=data.arrival_time,
                    arrival_airline=data.arrival_airline,
                    departure_flight_number=data.departure_flight_number,
                    departure_time=data.departure_time,
                    departure_airline=data.departure_airline,
                    passengers=passengers,
                    service_type=data.service_type,
                    trip_type=data.trip_type,
                    route=data.route,
                    notes=data.notes,
                    confirmation_code=self._random_confirmation_code(),
                    total_amount=0,  # Se calcula abajo desde los items
                    metadata_=self._build_metadata(data.trip_type, data.departure_date),
                )
                self.db.add(booking)
                await (
                    self.db.flush()
                )  # flush() para obtener booking.id — aquí puede tronar el UNIQUE

                # 6. Crear items y calcular total
                total = 0
                transport_overridden = False
                for item_data in data.items:
                    if (
                        recalculated_transport_cents is not None
                        and item_data.type == "TRANSPORTATION"
                        and not transport_overridden
                    ):
                        unit_price = recalculated_transport_cents
                        total_price = recalculated_transport_cents * item_data.quantity
                        transport_overridden = True  # solo el primer item de transporte
                    else:
                        unit_price, total_price = _recalculate_item_price(item_data)

                    item = BookingItem(
                        booking_id=booking.id,
                        type=item_data.type,
                        name=item_data.name,
                        slug=item_data.slug,
                        quantity=item_data.quantity,
                        unit_price=unit_price,
                        total_price=total_price,
                        metadata_=item_data.metadata,
                    )
                    self.db.add(item)
                    total += total_price

                if data.items:
                    booking.total_amount = total
                    booking.subtotal_amount = total

                await self.db.commit()
            except IntegrityError:
                await self.db.rollback()
                if attempt == max_attempts:
                    raise ValidationError(
                        "No se pudo generar un código de confirmación único, intenta de nuevo"
                    ) from None
                continue

            await self.db.refresh(
                booking, attribute_names=["items", "customer", "payments", "assignments"]
            )
            return booking

        raise AssertionError("unreachable")  # el for siempre retorna o lanza

    async def create_manual(
        self,
        data: CreateManualBookingRequest,
        status: BookingStatus,
    ) -> Booking:
        """Crea una reserva manual desde el admin con el status indicado.

        Equivalente al "Quick Booking" del TS. Misma estrategia de reintento que
        create_draft para el código de confirmación único, pero:
        - source = ADMIN (no WEBSITE)
        - status parametrizable (CONFIRMED / OFFLINE_HOLD / PENDING_PAYMENT)
        - NO valida fecha futura (el admin puede registrar servicios del mismo día)

        El envío de email lo orquesta el endpoint, no el servicio.
        """
        passengers = max(1, data.passengers)

        # El admin manda la fecha como datetime ISO completo (toISOString) o como
        # YYYY-MM-DD. fromisoformat (Py 3.11+) acepta ambos y el sufijo 'Z'; si
        # aun así falla, caemos a los primeros 10 chars (la parte de fecha).
        try:
            booking_date = datetime.fromisoformat(data.booking_date.replace("Z", "+00:00"))
        except ValueError:
            booking_date = datetime.fromisoformat(data.booking_date[:10])

        max_attempts = 5
        customer_service = CustomerService(self.db)

        for attempt in range(1, max_attempts + 1):
            try:
                customer = await customer_service.find_or_create(
                    name=data.customer.name,
                    email=data.customer.email,
                    phone=data.customer.phone,
                    country=data.customer.country,
                    language=data.customer.language,
                )

                booking = Booking(
                    type=data.type,
                    status=status,
                    source=BookingSource.ADMIN,
                    customer_id=customer.id,
                    booking_date=booking_date,
                    booking_time=data.booking_time,
                    pickup_time=data.pickup_time,
                    pickup_location=data.pickup_location,
                    dropoff_location=data.dropoff_location,
                    flight_number=data.flight_number,
                    arrival_time=data.arrival_time,
                    arrival_airline=data.arrival_airline,
                    departure_flight_number=data.departure_flight_number,
                    departure_time=data.departure_time,
                    departure_airline=data.departure_airline,
                    passengers=passengers,
                    service_type=data.service_type,
                    trip_type=data.trip_type,
                    notes=data.notes,
                    confirmation_code=self._random_confirmation_code(),
                    total_amount=0,
                    metadata_=self._build_metadata(data.trip_type, data.departure_date),
                )
                self.db.add(booking)
                await self.db.flush()

                total = 0
                for item_data in data.items:
                    item = BookingItem(
                        booking_id=booking.id,
                        type=item_data.type,
                        name=item_data.name,
                        slug=item_data.slug,
                        quantity=item_data.quantity,
                        unit_price=item_data.unit_price,
                        total_price=item_data.total_price,
                        metadata_=item_data.metadata,
                    )
                    self.db.add(item)
                    total += item_data.total_price

                if data.items:
                    booking.total_amount = total
                    booking.subtotal_amount = total

                await self.db.commit()
            except IntegrityError:
                await self.db.rollback()
                if attempt == max_attempts:
                    raise ValidationError(
                        "No se pudo generar un código de confirmación único, intenta de nuevo"
                    ) from None
                continue

            await self.db.refresh(
                booking, attribute_names=["items", "customer", "payments", "assignments"]
            )
            return booking

        raise AssertionError("unreachable")

    # ─── READ ────────────────────────────────────────────────

    async def get_by_id(self, booking_id: str) -> Booking:
        """Obtiene una reserva por ID con relaciones cargadas.

        selectinload carga customer + items en una sola query extra
        (más eficiente que N+1 queries de lazy loading).

        Raises:
            BookingNotFoundError: Si no existe.
        """
        # populate_existing=True: sin esto, con expire_on_commit=False, llamar
        # get_by_id() una segunda vez dentro del mismo request (típico después
        # de cancel/confirm/update/assign) devuelve el objeto ya cacheado en la
        # sesión con sus relaciones de ANTES del cambio — el cambio recién
        # confirmado no aparecería en la respuesta.
        result = await self.db.execute(
            select(Booking)
            .options(
                selectinload(Booking.customer),
                selectinload(Booking.items),
                selectinload(Booking.payments),
                selectinload(Booking.assignments).selectinload(BookingAssignment.driver),
                selectinload(Booking.assignments).selectinload(BookingAssignment.vehicle),
            )
            .where(Booking.id == booking_id)
            .execution_options(populate_existing=True)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise BookingNotFoundError(booking_id)
        return booking

    async def list_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        status: BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ) -> tuple[list[Booking], int]:
        """Lista reservas para el panel de administración, paginado.

        REGLA ANTI-BUG: por defecto NO se filtra por status. Si el admin
        filtrara DRAFT/PENDING_PAYMENT por defecto, una reserva recién
        creada "desaparecería" del panel hasta que alguien la confirme —
        exactamente el síntoma reportado en el proyecto TypeScript
        ("creo una reserva y no la veo en el admin"). El filtro de status
        es siempre opt-in (el caller lo pide explícitamente).

        Args:
            page: Página actual (1-indexed).
            page_size: Resultados por página.
            status: Filtro opcional por estado exacto.
            date_from: Filtro opcional — booking_date >= date_from.
            date_to: Filtro opcional — booking_date <= date_to.
            search: Filtro opcional por nombre/email del cliente o código
                de confirmación (case-insensitive, coincidencia parcial).

        Returns:
            Tupla (lista de bookings de la página actual, total que matchea el filtro).
        """
        conditions = []
        if status is not None:
            conditions.append(Booking.status == status)
        if date_from is not None:
            conditions.append(Booking.booking_date >= date_from)
        if date_to is not None:
            # booking_date es TIMESTAMP, date_to es DATE (sin hora). Comparar con
            # `<=` casteaba date_to a medianoche del día, así que CUALQUIER
            # booking_date con hora > 00:00:00 de ese día (es decir, casi todas —
            # se guardan típicamente a mediodía) quedaba excluido. Esto rompía el
            # filtro "Hoy" (date_from == date_to == hoy: solo matcheaba bookings
            # exactamente a medianoche, prácticamente ninguna). Límite superior
            # exclusivo al día siguiente evita el cast a medianoche.
            conditions.append(Booking.booking_date < date_to + timedelta(days=1))

        base_query = select(Booking)
        if search:
            base_query = base_query.join(Customer, Booking.customer_id == Customer.id)
            term = f"%{search}%"
            conditions.append(
                or_(
                    Customer.name.ilike(term),
                    Customer.email.ilike(term),
                    Booking.confirmation_code.ilike(term),
                )
            )

        for cond in conditions:
            base_query = base_query.where(cond)

        total = (
            await self.db.execute(
                select(func.count()).select_from(
                    base_query.with_only_columns(Booking.id).subquery()
                )
            )
        ).scalar() or 0

        result = await self.db.execute(
            base_query.options(
                selectinload(Booking.customer),
                selectinload(Booking.items),
                selectinload(Booking.payments),
                selectinload(Booking.assignments).selectinload(BookingAssignment.driver),
                selectinload(Booking.assignments).selectinload(BookingAssignment.vehicle),
            )
            .order_by(Booking.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        bookings = list(result.scalars().all())
        return bookings, total

    async def get_dashboard_stats(self) -> DashboardStatsResponse:
        """Métricas agregadas del día/mes actual para la pestaña Marketing.

        Usa func.date() sobre booking_date (no created_at) — lo que importa
        para el negocio es cuándo es el SERVICIO, no cuándo se registró la
        reserva en el sistema.
        """
        today = datetime.now(UTC).date()
        month_start = today.replace(day=1)
        not_cancelled = Booking.status != BookingStatus.CANCELLED

        today_result = await self.db.execute(
            select(func.count(Booking.id), func.coalesce(func.sum(Booking.total_amount), 0)).where(
                func.date(Booking.booking_date) == today, not_cancelled
            )
        )
        total_today, revenue_today = today_result.one()

        month_result = await self.db.execute(
            select(func.count(Booking.id), func.coalesce(func.sum(Booking.total_amount), 0)).where(
                func.date(Booking.booking_date) >= month_start, not_cancelled
            )
        )
        total_month, revenue_month = month_result.one()

        return DashboardStatsResponse(
            total_today=total_today,
            total_month=total_month,
            revenue_today=revenue_today,
            revenue_month=revenue_month,
        )

    # ─── CANCEL ──────────────────────────────────────────────

    async def cancel(self, booking_id: str, reason: str | None = None) -> Booking:
        """Cancela una reserva.

        Solo se puede cancelar si no está ya CANCELLED o COMPLETED.
        El motivo (si se da) se anexa a internal_notes — no hay una
        columna dedicada para esto y no vale la pena agregar una migración
        solo por un campo de texto libre opcional.

        Raises:
            InvalidBookingStateError: Si ya está cancelada o completada.
        """
        booking = await self.get_by_id(booking_id)

        if booking.status == BookingStatus.CANCELLED:
            raise InvalidBookingStateError(booking_id, "CANCELLED", "activa")
        if booking.status == BookingStatus.COMPLETED:
            raise InvalidBookingStateError(booking_id, "COMPLETED", "activa")

        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.now(UTC)
        if reason:
            note = f"Cancelada: {reason}"
            booking.internal_notes = (
                f"{booking.internal_notes}\n{note}" if booking.internal_notes else note
            )
        await self.db.commit()
        return await self.get_by_id(booking_id)

    # ─── DELETE ──────────────────────────────────────────────

    async def delete(self, booking_id: str) -> None:
        """Borra una reserva de forma permanente (hard delete).

        A diferencia de cancel() —que solo cambia el status a CANCELLED y deja
        el registro— esto ELIMINA la fila. Las filas hijas se resuelven por las
        reglas ondelete de las FK en la DB:
          - items, payments, pricing_overrides, assignments, email_logs → CASCADE
            (se borran junto con la reserva).
          - account_charges, ai_conversations → SET NULL (el registro se conserva,
            pierde el vínculo a la reserva borrada — no se pierde dinero/historial).

        Es una acción irreversible; el endpoint que la expone exige admin + audit.

        Raises:
            NotFoundError: Si la reserva no existe (vía get_by_id).
        """
        booking = await self.get_by_id(booking_id)
        await self.db.delete(booking)
        await self.db.commit()

    # ─── CONFIRM ─────────────────────────────────────────────

    async def confirm(self, booking_id: str) -> Booking:
        """Confirma una reserva manualmente desde el admin.

        A diferencia de un pago con Stripe (que deja la reserva en PAID
        vía webhook), esto es para pagos offline/efectivo: el admin marca
        como CONFIRMED directo desde PENDING_PAYMENT, OFFLINE_HOLD o PAID.

        Raises:
            InvalidBookingStateError: Si no está en un estado confirmable.
        """
        booking = await self.get_by_id(booking_id)

        confirmable_states = {
            BookingStatus.PAID,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.OFFLINE_HOLD,
        }
        if booking.status not in confirmable_states:
            raise InvalidBookingStateError(
                booking_id, booking.status.value, "PAID/PENDING_PAYMENT/OFFLINE_HOLD"
            )

        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.now(UTC)
        await self.db.commit()
        return await self.get_by_id(booking_id)

    # ─── MARK PAID ───────────────────────────────────────────

    # Mapea el método de cobro (lo que el admin elige en la UI) al enum
    # PaymentProvider del modelo. CARD se registra como MANUAL porque las
    # tarjetas online reales pasan por Stripe (otro flujo); aquí "card" es un
    # cobro manual con terminal/POS.
    _PAYMENT_PROVIDER_MAP = {
        "cash": PaymentProvider.CASH,
        "bank_transfer": PaymentProvider.BANK_TRANSFER,
        "card": PaymentProvider.MANUAL,
        "manual": PaymentProvider.MANUAL,
    }

    async def mark_paid(self, booking_id: str, data: MarkPaidRequest) -> Booking:
        """Marca una reserva como PAGADA y registra el pago en `payments`.

        Para cobros offline (efectivo, transferencia) hechos después de crear la
        reserva. Distinto de confirm(): confirm solo cambia el estado a
        CONFIRMED; esto deja la reserva en PAID y crea un Payment COMPLETED para
        que el cobro aparezca en Finanzas.

        Permitido desde DRAFT/PENDING_PAYMENT/OFFLINE_HOLD/CONFIRMED. Se rechaza
        si ya está PAID (evita registrar el pago dos veces), o si está
        CANCELLED/COMPLETED.

        Raises:
            InvalidBookingStateError: Si no está en un estado cobrable.
        """
        booking = await self.get_by_id(booking_id)

        payable_states = {
            BookingStatus.DRAFT,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.OFFLINE_HOLD,
            BookingStatus.CONFIRMED,
        }
        if booking.status not in payable_states:
            raise InvalidBookingStateError(
                booking_id,
                booking.status.value,
                "DRAFT/PENDING_PAYMENT/OFFLINE_HOLD/CONFIRMED",
            )

        amount = data.amount_cents if data.amount_cents is not None else booking.total_amount
        now = datetime.now(UTC)

        payment = Payment(
            booking_id=booking.id,
            provider=self._PAYMENT_PROVIDER_MAP[data.method],
            status=PaymentStatus.COMPLETED,
            amount=amount,
            currency=booking.currency,
            notes=data.notes,
            transaction_id=data.reference,
            completed_at=now,
        )
        self.db.add(payment)

        booking.status = BookingStatus.PAID
        await self.db.commit()
        return await self.get_by_id(booking_id)

    # ─── UPDATE ──────────────────────────────────────────────

    async def update(self, booking_id: str, data: UpdateBookingRequest) -> Booking:
        """Edita los campos operativos de una reserva (no status ni total).

        Solo aplica los campos que el admin mandó (exclude_unset) — un
        PATCH parcial no debe borrar lo que no se tocó.
        """
        booking = await self.get_by_id(booking_id)

        updates = data.model_dump(exclude_unset=True)
        if "booking_date" in updates and updates["booking_date"] is not None:
            updates["booking_date"] = datetime.fromisoformat(updates["booking_date"])

        # departure_date no es una columna propia de Booking — solo existe
        # como metadata.departureDate (ver _build_metadata). Se saca del dict
        # genérico de setattr y se mergea aparte para no perder el resto de
        # metadata_ que ya tuviera la reserva.
        departure_date = updates.pop("departure_date", None)

        for field, value in updates.items():
            setattr(booking, field, value)

        if departure_date is not None:
            meta = dict(booking.metadata_ or {})
            meta["departureDate"] = departure_date[:10]
            booking.metadata_ = meta

        await self.db.commit()
        return await self.get_by_id(booking_id)

    # ─── ASSIGN ──────────────────────────────────────────────

    async def assign(self, booking_id: str, data: AssignBookingRequest) -> Booking:
        """Asigna conductor y/o vehículo a una reserva.

        Upsert: si ya existe una asignación de ese tipo (DRIVER/VEHICLE)
        para esta reserva, la actualiza; si no, crea una nueva. Así
        reasignar no acumula filas viejas de asignaciones reemplazadas.
        """
        # Valida que la reserva exista (lanza NotFoundError → 404) antes de asignar.
        await self.get_by_id(booking_id)

        if data.driver_id is not None:
            await self._upsert_assignment(
                booking_id, BookingAssignmentType.DRIVER, driver_id=data.driver_id, notes=data.notes
            )
        if data.vehicle_id is not None:
            await self._upsert_assignment(
                booking_id,
                BookingAssignmentType.VEHICLE,
                vehicle_id=data.vehicle_id,
                notes=data.notes,
            )

        await self.db.commit()
        return await self.get_by_id(booking_id)

    async def _upsert_assignment(
        self,
        booking_id: str,
        assignment_type: BookingAssignmentType,
        driver_id: str | None = None,
        vehicle_id: str | None = None,
        notes: str | None = None,
    ) -> None:
        result = await self.db.execute(
            select(BookingAssignment).where(
                BookingAssignment.booking_id == booking_id,
                BookingAssignment.type == assignment_type,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.driver_id = driver_id if driver_id is not None else existing.driver_id
            existing.vehicle_id = vehicle_id if vehicle_id is not None else existing.vehicle_id
            existing.notes = notes
        else:
            self.db.add(
                BookingAssignment(
                    booking_id=booking_id,
                    type=assignment_type,
                    driver_id=driver_id,
                    vehicle_id=vehicle_id,
                    notes=notes,
                )
            )

    # ─── INTERNAL ────────────────────────────────────────────

    @staticmethod
    def _build_metadata(trip_type: str | None, departure_date: str | None) -> dict | None:
        """Construye metadata_ con la fecha de SALIDA de un round trip.

        Booking solo tiene una fecha propia (booking_date = llegada); la fecha
        de salida de un round trip vive en metadata.departureDate porque no
        hay columna dedicada. build_operation_legs() (Python) y
        expandBookingOperations() (TS) leen esta misma clave para decidir en
        qué fecha mostrar la pierna de SALIDA.
        """
        if (trip_type or "").lower() != "roundtrip" or not departure_date:
            return None
        return {"departureDate": departure_date[:10]}

    @staticmethod
    def _random_confirmation_code() -> str:
        """Genera un candidato CLASS<year><6 dígitos aleatorios>.

        No consulta la DB — es solo un candidato. La unicidad real la
        garantiza el constraint UNIQUE de la columna + el reintento del
        bloque completo de creación en create_draft() ante IntegrityError.

        Por qué no "COUNT(*) + 1": dos reservas creadas al mismo instante
        pueden leer el mismo COUNT antes de que ninguna haga commit, generar
        el mismo candidato, y una de las dos truena en el INSERT — una
        condición de carrera real bajo tráfico concurrente, no solo teórica.
        """
        year = datetime.now(UTC).year
        suffix = secrets.randbelow(900_000) + 100_000  # 6 dígitos: 100000-999999
        return f"CLASS{year}{suffix}"
