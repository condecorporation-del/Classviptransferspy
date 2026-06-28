"""Agente de IA público: responde preguntas/precios y dirige a las formas de reservar.

No crea reservas — solo informa y, cuando el cliente quiere reservar, lo dirige a
los 4 canales (web, WhatsApp, email, iMessage). La verificación/recálculo de precio
real sigue ocurriendo en BookingService.create_draft cuando la reserva se concreta.

El historial de conversación se guarda en la tabla `ai_conversations` (modelo
AIConversation, ya existía en el schema pero no estaba conectada a ningún
endpoint) en vez de memoria del proceso — así sobrevive a reinicios/deploys.
"""

import logging
import re

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.lib.ai_knowledge import get_knowledge_for_prompt
from app.models.ai_conversation import AIConversation
from app.models.pricing import Area, PricingExtra
from app.services.booking import COMBO_PRICE_CENTS

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 6

# Saludos/acuses simples — respuesta local sin gastar tokens de OpenAI.
SIMPLE_LOCAL_REPLIES: dict[str, dict[str, str]] = {
    "hi": {
        "en": "I'm the Class VIP Transfers assistant. How can I help you?",
        "es": "Soy el asistente de Class VIP Transfers. ¿En qué puedo ayudarte?",
    },
    "hello": {
        "en": "I'm the Class VIP Transfers assistant. How can I help you?",
        "es": "Soy el asistente de Class VIP Transfers. ¿En qué puedo ayudarte?",
    },
    "hola": {
        "en": "I'm the Class VIP Transfers assistant. How can I help you?",
        "es": "Soy el asistente de Class VIP Transfers. ¿En qué puedo ayudarte?",
    },
    "gracias": {
        "en": "You're welcome! Anything else?",
        "es": "¡De nada! ¿Algo más?",
    },
    "thanks": {
        "en": "You're welcome! Anything else?",
        "es": "¡De nada! ¿Algo más?",
    },
}

BOOKING_INTENT_RE = re.compile(
    r"reserv|book|pagar|pay|checkout|comprar|agendar|confirm", re.IGNORECASE
)


class AIServiceError(Exception):
    """El servicio de IA no está configurado o falló la llamada externa."""


class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        settings = get_settings()
        self._api_key = settings.openai_api_key
        self._model = settings.openai_model
        self._whisper_model = settings.openai_whisper_model
        self._temperature = settings.openai_temperature
        self._max_tokens = settings.openai_max_tokens
        self._client: AsyncOpenAI | None = (
            AsyncOpenAI(api_key=self._api_key) if self._api_key else None
        )

    def _require_client(self) -> AsyncOpenAI:
        if not self._client:
            raise AIServiceError("OPENAI_API_KEY no configurada — el chat de IA está deshabilitado")
        return self._client

    async def _get_history(self, session_id: str) -> list[dict]:
        result = await self.db.execute(
            select(AIConversation)
            .where(AIConversation.session_id == session_id)
            .order_by(AIConversation.created_at.desc())
            .limit(MAX_HISTORY_TURNS)
        )
        rows = list(reversed(result.scalars().all()))
        history: list[dict] = []
        for row in rows:
            history.append({"role": "user", "content": row.user_message})
            history.append({"role": "assistant", "content": row.assistant_reply})
        return history

    async def _save_turn(
        self,
        session_id: str,
        locale: str,
        user_message: str,
        assistant_reply: str,
        next_action: str,
        message_type: str = "text",
    ) -> None:
        self.db.add(
            AIConversation(
                session_id=session_id,
                locale=locale,
                user_message=user_message,
                assistant_reply=assistant_reply,
                next_action=next_action,
                message_type=message_type,
            )
        )
        await self.db.flush()

    async def _load_pricing_context(self) -> tuple[list[dict], list[dict]]:
        areas_result = await self.db.execute(select(Area).where(Area.is_active.is_(True)))
        areas = [
            {
                "name": a.name,
                "one_way_price_cents": a.one_way_price_cents,
                "round_trip_price_cents": a.round_trip_price_cents,
            }
            for a in areas_result.scalars().all()
        ]

        extras_result = await self.db.execute(
            select(PricingExtra).where(PricingExtra.active.is_(True))
        )
        extras = [
            {
                "label": e.label,
                "label_es": e.label_es,
                "price_cents": e.price_cents,
                "included": e.included,
            }
            for e in extras_result.scalars().all()
        ]
        return areas, extras

    def _system_prompt(self, locale: str, areas: list[dict], extras: list[dict]) -> str:
        is_es = locale == "es"
        knowledge = get_knowledge_for_prompt(
            "es" if is_es else "en", areas, extras, COMBO_PRICE_CENTS
        )

        if is_es:
            return f"""Eres el asistente virtual de Class VIP Transfers, \
transportación de lujo en Los Cabos.

RESTRICCIÓN ESTRICTA: SOLO respondes preguntas sobre Class VIP Transfers (servicios, precios, \
actividades, políticas) y sobre el destino Los Cabos (clima, lugares, recomendaciones turísticas \
relacionadas con un viaje a Los Cabos). Si preguntan algo completamente ajeno (otros países, \
política, recetas, programación, otra empresa, etc.), responde ÚNICAMENTE: "Solo puedo ayudarte \
con información sobre Class VIP Transfers y el destino Los Cabos. ¿En qué más puedo ayudarte?" \
No expliques por qué, dilo una vez y ofrece ayuda relevante.

ESTILO: respuestas cortas (1–3 oraciones), sin párrafos largos. Responde siempre en el idioma del \
usuario.

NUNCA tomes la reserva tú mismo ni digas que la reserva quedó "confirmada". Cuando el cliente \
quiera reservar, dile que puede hacerlo de 4 formas (página web, WhatsApp, email o iMessage/SMS) \
y anímalo a elegir una.

CONOCIMIENTO Y PRECIOS REALES:
{knowledge}"""

        return f"""You are the virtual assistant for Class VIP Transfers, luxury transportation in \
Los Cabos.

STRICT RESTRICTION: You ONLY answer questions about Class VIP Transfers (services, prices, \
activities, policies) and about the Los Cabos destination (weather, places, travel tips related \
to a trip to Los Cabos). If asked about anything unrelated (other countries, politics, recipes, \
coding, another company, etc.), respond ONLY with: "I can only help you with information about \
Class VIP Transfers and the Los Cabos destination. How else can I help you?" Don't explain \
further, say it once and offer relevant help.

STYLE: short replies (1-3 sentences), no long paragraphs. Always reply in the user's language.

NEVER take the booking yourself or say it's "confirmed". When the client wants to book, tell them \
they can do it 4 ways (website, WhatsApp, email or iMessage/SMS) and encourage them to pick one.

KNOWLEDGE AND REAL PRICES:
{knowledge}"""

    async def chat(self, message: str, session_id: str, locale: str = "en") -> dict:
        message = (message or "").strip()
        if not message:
            return {
                "reply": "Please type a message so I can help you."
                if locale != "es"
                else "Por favor escribe un mensaje para ayudarte.",
                "session_id": session_id,
                "next_action": "ask_more",
            }

        history = await self._get_history(session_id)
        normalized = message.lower().strip()
        if not history and normalized in SIMPLE_LOCAL_REPLIES:
            reply = SIMPLE_LOCAL_REPLIES[normalized]["es" if locale == "es" else "en"]
            await self._save_turn(session_id, locale, message, reply, "ask_more")
            return {"reply": reply, "session_id": session_id, "next_action": "ask_more"}

        client = self._require_client()
        areas, extras = await self._load_pricing_context()

        messages = [{"role": "system", "content": self._system_prompt(locale, areas, extras)}]
        messages.extend(history)
        messages.append({"role": "user", "content": message})

        try:
            completion = await client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=self._temperature,
                max_tokens=self._max_tokens,
            )
        except Exception as exc:
            logger.error("OpenAI chat error: %s", exc)
            raise AIServiceError(f"Fallo al contactar al proveedor de IA: {exc}") from exc

        reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            reply = (
                "Lo siento, no pude procesar tu mensaje. ¿Puedes intentar de nuevo?"
                if locale == "es"
                else "Sorry, I couldn't process that. Could you try again?"
            )

        wants_to_book = bool(BOOKING_INTENT_RE.search(message))
        next_action = "proceed_to_payment" if wants_to_book else "ask_more"

        await self._save_turn(session_id, locale, message, reply, next_action)

        return {"reply": reply, "session_id": session_id, "next_action": next_action}

    async def transcribe(self, audio_bytes: bytes, filename: str) -> dict:
        client = self._require_client()
        try:
            transcription = await client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model=self._whisper_model,
                response_format="verbose_json",
            )
        except Exception as exc:
            logger.error("OpenAI transcription error: %s", exc)
            raise AIServiceError(f"Fallo al transcribir audio: {exc}") from exc

        return {
            "text": transcription.text,
            "language": getattr(transcription, "language", None) or "en",
        }
