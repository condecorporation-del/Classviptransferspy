"""Endpoints del agente de IA público — POST /ai/chat, POST /ai/transcribe."""

import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import limiter
from app.dependencies import get_db
from app.schemas.ai import ChatRequest, ChatResponse, TranscribeResponse
from app.services.ai import AIService, AIServiceError

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_AUDIO_BYTES = 10 * 1024 * 1024


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat con el agente de IA público",
    description=(
        "Responde preguntas sobre la empresa, precios y el destino Los Cabos. "
        "No crea reservas — cuando el cliente quiere reservar, lo dirige a los "
        "canales disponibles (web, WhatsApp, email, iMessage)."
    ),
)
@limiter.limit("20/minute")
async def chat(
    request: Request,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/ai/chat"""
    session_id = data.session_id or str(uuid4())
    service = AIService(db)
    try:
        result = await service.chat(data.message, session_id, data.locale)
    except AIServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ChatResponse(success=True, data=result)


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribir audio a texto (mensajes de voz del chat)",
)
@limiter.limit("10/minute")
async def transcribe(
    request: Request,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """POST /api/v1/ai/transcribe"""
    contents = await audio.read()
    if len(contents) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo de audio excede el máximo de 10MB",
        )
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Audio vacío")

    service = AIService(db)
    try:
        result = await service.transcribe(contents, audio.filename or "audio.webm")
    except AIServiceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return TranscribeResponse(success=True, data=result)
