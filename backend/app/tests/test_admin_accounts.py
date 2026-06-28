"""Tests de cuentas por cobrar (pestañas Finanzas/Cuentas del admin)."""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "accounts@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "accounts@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


async def _create_booking(client: AsyncClient, email: str) -> dict:
    payload = {
        "type": "TRANSPORTATION",
        "customer": {"name": "Cliente Cuenta", "email": email, "phone": "6240001111"},
        "booking_date": "2026-12-25",
        "passengers": 2,
        "items": [
            {
                "type": "TRANSPORTATION",
                "name": "Aeropuerto - Hotel",
                "quantity": 1,
                "unit_price": 5000,
                "total_price": 5000,
            }
        ],
    }
    resp = await client.post("/api/v1/bookings/", json=payload)
    assert resp.status_code == 201
    return resp.json()


@pytest.mark.asyncio
async def test_accounts_require_auth(client: AsyncClient):
    response = await client.get("/api/v1/admin/accounts")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_account_and_manual_charge_and_payment(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/accounts",
        json={"name": "Hotel Riu", "company": "Riu Group", "email": "ap@riu.com"},
    )
    assert create_resp.status_code == 201
    account = create_resp.json()
    assert account["balance_cents"] == 0

    charge_resp = await client.post(
        f"/api/v1/admin/accounts/{account['id']}/charges",
        json={"description": "Transfer manual", "amount_cents": 3000},
    )
    assert charge_resp.status_code == 200
    detail = charge_resp.json()
    assert detail["balance_cents"] == 3000
    assert detail["totals"]["charges_cents"] == 3000
    charge_id = detail["charges"][0]["id"]

    payment_resp = await client.post(
        f"/api/v1/admin/accounts/{account['id']}/payments",
        json={"amount_cents": 1000, "method": "CASH"},
    )
    assert payment_resp.status_code == 200
    after_payment = payment_resp.json()
    assert after_payment["balance_cents"] == 2000

    void_resp = await client.patch(
        f"/api/v1/admin/accounts/{account['id']}/charges/{charge_id}",
        json={"status": "VOID"},
    )
    assert void_resp.status_code == 200
    after_void = void_resp.json()
    # El cargo anulado ya no cuenta en el balance: 0 cargos - 1000 pago = -1000
    assert after_void["balance_cents"] == -1000


@pytest.mark.asyncio
async def test_charge_from_existing_booking(client: AsyncClient):
    await _login_as_admin(client)
    booking = await _create_booking(client, "cuenta-booking@example.com")

    account_resp = await client.post("/api/v1/admin/accounts", json={"name": "Cliente Frecuente"})
    account_id = account_resp.json()["id"]

    charge_resp = await client.post(
        f"/api/v1/admin/accounts/{account_id}/bookings",
        json={"booking_id": booking["id"]},
    )
    assert charge_resp.status_code == 200
    detail = charge_resp.json()
    assert detail["balance_cents"] == booking["total_amount"]
    assert detail["charges"][0]["booking"]["id"] == booking["id"]
    assert detail["charges"][0]["booking"]["customer_name"] == "Cliente Cuenta"


@pytest.mark.asyncio
async def test_account_list_shows_counts(client: AsyncClient):
    await _login_as_admin(client)
    account_resp = await client.post("/api/v1/admin/accounts", json={"name": "Cuenta Lista"})
    account_id = account_resp.json()["id"]

    await client.post(
        f"/api/v1/admin/accounts/{account_id}/charges",
        json={"description": "Cargo 1", "amount_cents": 1000},
    )

    list_resp = await client.get("/api/v1/admin/accounts")
    assert list_resp.status_code == 200
    accounts = list_resp.json()
    target = next(a for a in accounts if a["id"] == account_id)
    assert target["charge_count"] == 1
    assert target["payment_count"] == 0


@pytest.mark.asyncio
async def test_get_account_not_found(client: AsyncClient):
    await _login_as_admin(client)
    response = await client.get("/api/v1/admin/accounts/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_open_credit_full_flow_booking_to_settled(client: AsyncClient):
    """Flujo COMPLETO de crédito abierto (F13.2), validado de punta a punta:
    reserva → cargo a cuenta → saldo sube → abono parcial → saldo baja →
    abono del resto → saldo 0 → el cargo se puede marcar PAID.

    Es el caso real del cliente que viaja a crédito y paga al final del mes.
    """
    await _login_as_admin(client)

    # 1) Cuenta del cliente frecuente, arranca en 0.
    account_id = (
        await client.post(
            "/api/v1/admin/accounts", json={"name": "Hotel Solaris", "company": "Solaris SA"}
        )
    ).json()["id"]

    # 2) Dos servicios del mes, cargados desde reservas reales.
    booking1 = await _create_booking(client, "credito-1@example.com")  # total 5000
    booking2 = await _create_booking(client, "credito-2@example.com")  # total 5000

    after1 = await client.post(
        f"/api/v1/admin/accounts/{account_id}/bookings", json={"booking_id": booking1["id"]}
    )
    assert after1.json()["balance_cents"] == 5000

    after2 = await client.post(
        f"/api/v1/admin/accounts/{account_id}/bookings", json={"booking_id": booking2["id"]}
    )
    detail = after2.json()
    assert detail["balance_cents"] == 10000
    assert detail["totals"]["charges_cents"] == 10000

    # 3) Fin de mes: abono parcial.
    after_partial = await client.post(
        f"/api/v1/admin/accounts/{account_id}/payments",
        json={"amount_cents": 4000, "method": "BANK_TRANSFER", "reference": "SPEI-001"},
    )
    assert after_partial.json()["balance_cents"] == 6000

    # 4) Abono del resto → saldo 0.
    after_full = await client.post(
        f"/api/v1/admin/accounts/{account_id}/payments",
        json={"amount_cents": 6000, "method": "BANK_TRANSFER", "reference": "SPEI-002"},
    )
    settled = after_full.json()
    assert settled["balance_cents"] == 0
    assert settled["totals"]["payments_cents"] == 10000
    assert len(settled["payments"]) == 2

    # 5) Los cargos cobrados se pueden marcar PAID (sin alterar el balance, que
    #    ya es 0: PAID sigue contando como cargo, solo VOID lo saca).
    charge_id = settled["charges"][0]["id"]
    after_mark = await client.patch(
        f"/api/v1/admin/accounts/{account_id}/charges/{charge_id}",
        json={"status": "PAID"},
    )
    marked = after_mark.json()
    assert marked["balance_cents"] == 0
    target = next(c for c in marked["charges"] if c["id"] == charge_id)
    assert target["status"] == "PAID"
