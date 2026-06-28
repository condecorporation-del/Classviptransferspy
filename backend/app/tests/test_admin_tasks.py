"""Tests de tareas compartidas del panel de administración (admin_tasks)."""

import pytest
from httpx import AsyncClient


async def _login_as_admin(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "tasks@classvip.com", "password": "Admin123!", "role": "admin"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "tasks@classvip.com", "password": "Admin123!"},
    )
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_tasks_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/admin/tasks")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_and_list_task(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/tasks",
        json={
            "titulo": "Revisar Suburban",
            "descripcion": "Cambio de aceite",
            "fecha": "2026-07-01",
            "hora": "09:00",
            "categoria": "servicio-vehiculo",
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["titulo"] == "Revisar Suburban"
    assert created["status"] == "pendiente"
    assert created["categoria"] == "servicio-vehiculo"
    assert "creadoEn" in created

    list_resp = await client.get("/api/v1/admin/tasks")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == created["id"]


@pytest.mark.asyncio
async def test_create_task_defaults_categoria_to_operacion(client: AsyncClient):
    await _login_as_admin(client)

    resp = await client.post(
        "/api/v1/admin/tasks",
        json={"titulo": "Llamar a cliente", "fecha": "2026-07-02"},
    )
    assert resp.status_code == 201
    assert resp.json()["categoria"] == "operacion"
    assert resp.json()["descripcion"] is None
    assert resp.json()["hora"] is None


@pytest.mark.asyncio
async def test_update_task_status(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/tasks",
        json={"titulo": "Confirmar reserva", "fecha": "2026-07-03"},
    )
    task_id = create_resp.json()["id"]

    update_resp = await client.patch(
        f"/api/v1/admin/tasks/{task_id}",
        json={"status": "completada"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "completada"


@pytest.mark.asyncio
async def test_update_nonexistent_task_returns_404(client: AsyncClient):
    await _login_as_admin(client)

    resp = await client.patch(
        "/api/v1/admin/tasks/does-not-exist",
        json={"status": "cancelada"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    await _login_as_admin(client)

    create_resp = await client.post(
        "/api/v1/admin/tasks",
        json={"titulo": "Tarea temporal", "fecha": "2026-07-04"},
    )
    task_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/admin/tasks/{task_id}")
    assert delete_resp.status_code == 204

    list_resp = await client.get("/api/v1/admin/tasks")
    assert list_resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_delete_nonexistent_task_returns_404(client: AsyncClient):
    await _login_as_admin(client)

    resp = await client.delete("/api/v1/admin/tasks/does-not-exist")
    assert resp.status_code == 404
