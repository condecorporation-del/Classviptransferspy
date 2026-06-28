"""AccountService — Cuentas por cobrar de clientes frecuentes.

Cada cuenta acumula cargos (servicios prestados, manuales o ligados a
una reserva) y pagos recibidos. balance_cents se recalcula en cada
mutación: suma de cargos no anulados menos suma de pagos.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ClassVIPError, NotFoundError
from app.models.booking import Booking
from app.models.client_account import AccountCharge, AccountPayment, ClientAccount
from app.models.enums import AccountChargeStatus
from app.schemas.account import (
    AccountBookingSummary,
    AccountDetailResponse,
    AccountSummaryResponse,
    AccountTotals,
    ChargeResponse,
    CreateAccountRequest,
    CreateChargeFromBookingRequest,
    CreateChargeRequest,
    CreatePaymentRequest,
    PaymentResponse,
    UpdateChargeRequest,
)


class AccountService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_accounts(self) -> list[AccountSummaryResponse]:
        result = await self.db.execute(
            select(ClientAccount).options(
                selectinload(ClientAccount.charges)
                .selectinload(AccountCharge.booking)
                .selectinload(Booking.customer),
                selectinload(ClientAccount.payments),
            )
        )
        accounts = result.scalars().all()
        return [
            AccountSummaryResponse(
                id=a.id,
                name=a.name,
                company=a.company,
                email=a.email,
                phone=a.phone,
                status=a.status,
                balance_cents=a.balance_cents,
                charge_count=len(a.charges),
                payment_count=len(a.payments),
                charges=[self._charge_to_response(c) for c in a.charges],
            )
            for a in accounts
        ]

    async def create_account(self, data: CreateAccountRequest) -> AccountSummaryResponse:
        account = ClientAccount(
            name=data.name,
            company=data.company,
            email=data.email,
            phone=data.phone,
            notes=data.notes,
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return AccountSummaryResponse(
            id=account.id,
            name=account.name,
            company=account.company,
            email=account.email,
            phone=account.phone,
            status=account.status,
            balance_cents=account.balance_cents,
            charge_count=0,
            payment_count=0,
        )

    async def get_detail(self, account_id: str) -> AccountDetailResponse:
        account = await self._get_with_relations(account_id)
        return self._to_detail_response(account)

    async def add_charge(self, account_id: str, data: CreateChargeRequest) -> AccountDetailResponse:
        account = await self._get_with_relations(account_id)
        charge = AccountCharge(
            account_id=account.id,
            description=data.description,
            amount_cents=data.amount_cents,
            status=data.status,
            notes=data.notes,
        )
        self.db.add(charge)
        await self._recalculate_balance(account)
        await self.db.commit()
        account = await self._get_with_relations(account_id)
        return self._to_detail_response(account)

    async def add_charge_from_booking(
        self, account_id: str, data: CreateChargeFromBookingRequest
    ) -> AccountDetailResponse:
        account = await self._get_with_relations(account_id)

        booking_result = await self.db.execute(
            select(Booking)
            .options(selectinload(Booking.customer))
            .where(Booking.id == data.booking_id)
        )
        booking = booking_result.scalar_one_or_none()
        if not booking:
            raise ClassVIPError(f"Reserva {data.booking_id} no encontrada")

        description = f"Reserva {booking.confirmation_code or booking.id[:8]}"
        charge = AccountCharge(
            account_id=account.id,
            booking_id=booking.id,
            description=description,
            service_date=booking.booking_date,
            amount_cents=booking.total_amount,
            status=AccountChargeStatus.PENDING,
        )
        self.db.add(charge)
        await self._recalculate_balance(account)
        await self.db.commit()
        account = await self._get_with_relations(account_id)
        return self._to_detail_response(account)

    async def update_charge_status(
        self, account_id: str, charge_id: str, data: UpdateChargeRequest
    ) -> AccountDetailResponse:
        account = await self._get_with_relations(account_id)
        charge = next((c for c in account.charges if c.id == charge_id), None)
        if not charge:
            raise NotFoundError("AccountCharge", charge_id)

        charge.status = data.status
        await self._recalculate_balance(account)
        await self.db.commit()
        account = await self._get_with_relations(account_id)
        return self._to_detail_response(account)

    async def add_payment(
        self, account_id: str, data: CreatePaymentRequest
    ) -> AccountDetailResponse:
        account = await self._get_with_relations(account_id)
        payment = AccountPayment(
            account_id=account.id,
            amount_cents=data.amount_cents,
            method=data.method,
            reference=data.reference,
        )
        self.db.add(payment)
        await self._recalculate_balance(account)
        await self.db.commit()
        account = await self._get_with_relations(account_id)
        return self._to_detail_response(account)

    # ─── INTERNAL ────────────────────────────────────────────

    async def _get_with_relations(self, account_id: str) -> ClientAccount:
        # populate_existing=True: sin esto, con expire_on_commit=False, una
        # segunda consulta dentro del mismo request devuelve el objeto ya
        # cacheado en la sesión con su colección `charges`/`payments` vieja
        # (de antes del commit), en vez de recargarla — el cargo/pago que
        # se acaba de crear no aparecería en la respuesta.
        result = await self.db.execute(
            select(ClientAccount)
            .options(
                selectinload(ClientAccount.charges)
                .selectinload(AccountCharge.booking)
                .selectinload(Booking.customer),
                selectinload(ClientAccount.payments),
            )
            .where(ClientAccount.id == account_id)
            .execution_options(populate_existing=True)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("ClientAccount", account_id)
        return account

    async def _recalculate_balance(self, account: ClientAccount) -> None:
        """Recalcula balance_cents tras agregar/cambiar un cargo o pago.

        balance = cargos no anulados - pagos. Consulta agregados en DB en
        vez de la colección `account.charges` en memoria: un cargo recién
        creado con `account_id=...` (en vez de `account.charges.append(...)`)
        no aparece ahí hasta que se vuelve a cargar desde la sesión —
        confiar en la colección in-memory subestima el balance real.
        flush() (no commit) para que el caller decida cuándo confirmar
        la transacción completa.
        """
        await self.db.flush()

        charges_result = await self.db.execute(
            select(func.coalesce(func.sum(AccountCharge.amount_cents), 0)).where(
                AccountCharge.account_id == account.id,
                AccountCharge.status != AccountChargeStatus.VOID,
            )
        )
        payments_result = await self.db.execute(
            select(func.coalesce(func.sum(AccountPayment.amount_cents), 0)).where(
                AccountPayment.account_id == account.id
            )
        )
        account.balance_cents = charges_result.scalar_one() - payments_result.scalar_one()

    @staticmethod
    def _charge_to_response(c: AccountCharge) -> ChargeResponse:
        return ChargeResponse(
            id=c.id,
            description=c.description,
            amount_cents=c.amount_cents,
            status=c.status,
            notes=c.notes,
            service_date=c.service_date,
            booking=(
                AccountBookingSummary(
                    id=c.booking.id,
                    confirmation_code=c.booking.confirmation_code,
                    booking_date=c.booking.booking_date,
                    booking_time=c.booking.booking_time,
                    pickup_location=c.booking.pickup_location,
                    dropoff_location=c.booking.dropoff_location,
                    notes=c.booking.notes,
                    customer_name=c.booking.customer.name if c.booking.customer else None,
                )
                if c.booking
                else None
            ),
        )

    def _to_detail_response(self, account: ClientAccount) -> AccountDetailResponse:
        charges_total = sum(
            c.amount_cents for c in account.charges if c.status != AccountChargeStatus.VOID
        )
        payments_total = sum(p.amount_cents for p in account.payments)

        charges = [self._charge_to_response(c) for c in account.charges]
        payments = [
            PaymentResponse(
                id=p.id,
                amount_cents=p.amount_cents,
                method=p.method,
                reference=p.reference,
                received_at=p.received_at,
            )
            for p in account.payments
        ]

        return AccountDetailResponse(
            id=account.id,
            name=account.name,
            company=account.company,
            email=account.email,
            phone=account.phone,
            status=account.status,
            balance_cents=account.balance_cents,
            notes=account.notes,
            credit_limit_cents=account.credit_limit_cents,
            totals=AccountTotals(charges_cents=charges_total, payments_cents=payments_total),
            charges=charges,
            payments=payments,
        )
