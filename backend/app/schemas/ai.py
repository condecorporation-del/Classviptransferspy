"""Schemas para el agente de IA público (chat + transcripción de audio)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ChatRequest(BaseModel):
    """Body de POST /api/v1/ai/chat — coincide con lo que manda ChatWidget.tsx."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    message: str = Field(min_length=1, max_length=2000)
    locale: Literal["en", "es"] = "en"
    session_id: str | None = None


class ChatResponseData(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    reply: str
    session_id: str
    next_action: Literal["ask_more", "proceed_to_payment"]


class ChatResponse(BaseModel):
    success: bool
    data: ChatResponseData


class TranscribeResponseData(BaseModel):
    text: str
    language: str


class TranscribeResponse(BaseModel):
    success: bool
    data: TranscribeResponseData
