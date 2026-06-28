"""Tests del agente de IA público — chat y transcripción."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

import app.services.ai as ai_module
from app.core.config import Settings


def _fake_settings(api_key: str = "") -> Settings:
    return Settings(openai_api_key=api_key, openai_model="gpt-4o-mini")


@pytest.mark.asyncio
async def test_chat_without_api_key_returns_400(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings(""))

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "cuanto cuesta el transfer a Cabo San Lucas", "locale": "es"},
    )

    assert response.status_code == 400
    assert "OPENAI_API_KEY" in response.json()["detail"]


@pytest.mark.asyncio
async def test_chat_greeting_replies_locally_without_calling_openai(
    client: AsyncClient, monkeypatch
):
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings(""))

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "hola", "locale": "es"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["nextAction"] == "ask_more"
    assert "Class VIP" in data["reply"]
    assert data["sessionId"]


@pytest.mark.asyncio
async def test_chat_calls_openai_and_detects_booking_intent(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings("sk-test"))

    fake_completion = SimpleNamespace(
        choices=[
            SimpleNamespace(message=SimpleNamespace(content="El transfer a Cabo cuesta $110 USD."))
        ]
    )
    fake_client = SimpleNamespace(
        chat=SimpleNamespace(
            completions=SimpleNamespace(create=AsyncMock(return_value=fake_completion))
        )
    )
    monkeypatch.setattr(ai_module, "AsyncOpenAI", lambda api_key: fake_client)

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "quiero reservar mi transfer", "locale": "es"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["nextAction"] == "proceed_to_payment"
    assert "$110" in data["reply"]
    fake_client.chat.completions.create.assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_message_too_long_returns_422(client: AsyncClient):
    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "a" * 2001, "locale": "es"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_off_topic_still_routed_through_openai_with_restriction_prompt(
    client: AsyncClient, monkeypatch
):
    """No probamos el modelo real — verificamos que el system prompt que se envía
    a OpenAI contiene la restricción de tema antes de que el modelo conteste."""
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings("sk-test"))

    captured: dict = {}

    async def fake_create(**kwargs):
        captured["messages"] = kwargs["messages"]
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content="Solo puedo ayudarte con Class VIP Transfers.")
                )
            ]
        )

    fake_client = SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=AsyncMock(side_effect=fake_create)))
    )
    monkeypatch.setattr(ai_module, "AsyncOpenAI", lambda api_key: fake_client)

    response = await client.post(
        "/api/v1/ai/chat",
        json={"message": "cual es la capital de Francia", "locale": "es"},
    )

    assert response.status_code == 200
    system_prompt = captured["messages"][0]["content"]
    assert "RESTRICCIÓN ESTRICTA" in system_prompt
    assert "Los Cabos" in system_prompt


@pytest.mark.asyncio
async def test_transcribe_without_api_key_returns_400(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings(""))

    response = await client.post(
        "/api/v1/ai/transcribe",
        files={"audio": ("audio.webm", b"fake-audio-bytes", "audio/webm")},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_transcribe_with_api_key_returns_text(client: AsyncClient, monkeypatch):
    monkeypatch.setattr(ai_module, "get_settings", lambda: _fake_settings("sk-test"))

    fake_transcription = SimpleNamespace(text="hola quiero un transfer", language="es")
    fake_client = SimpleNamespace(
        audio=SimpleNamespace(
            transcriptions=SimpleNamespace(create=AsyncMock(return_value=fake_transcription))
        )
    )
    monkeypatch.setattr(ai_module, "AsyncOpenAI", lambda api_key: fake_client)

    response = await client.post(
        "/api/v1/ai/transcribe",
        files={"audio": ("audio.webm", b"fake-audio-bytes", "audio/webm")},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["text"] == "hola quiero un transfer"
    assert data["language"] == "es"
