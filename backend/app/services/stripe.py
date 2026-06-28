"""StripeService — Integración con Stripe para pagos con tarjeta.

Maneja PaymentIntents (creación) y webhooks (verificación de firma).
Los montos siempre en centavos de USD.
"""

import stripe

from app.core.config import get_settings

settings = get_settings()

# Configurar Stripe globalmente al importar el módulo
stripe.api_key = settings.stripe_secret_key


class StripeService:
    """Servicio para interactuar con la API de Stripe.

    No usa AsyncSession porque Stripe es HTTP externo.
    Los resultados se persisten en DB desde el endpoint que llama al servicio.
    """

    async def create_payment_intent(
        self,
        amount_cents: int,
        currency: str = "usd",
        booking_id: str = "",
        customer_email: str = "",
        description: str = "",
    ) -> dict:
        """Crea un PaymentIntent en Stripe.

        Un PaymentIntent representa la INTENCIÓN de cobrar.
        NO se cobra hasta que el frontend confirma con confirmCardPayment().

        Args:
            amount_cents: Monto en centavos (ej: 5000 = $50.00 USD)
            currency: Código de moneda (usd, mxn, eur...)
            booking_id: ID de la reserva para reconciliación vía webhook
            customer_email: Email para el recibo de Stripe
            description: Descripción en el estado de cuenta del cliente

        Returns:
            Dict con client_secret (el frontend lo necesita para Stripe.js)
        """
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata={
                "booking_id": booking_id,
            },
            receipt_email=customer_email if customer_email else None,
            description=description,
            automatic_payment_methods={"enabled": True},
        )

        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status,
        }

    async def retrieve_payment_intent(self, payment_intent_id: str) -> dict:
        """Recupera un PaymentIntent de Stripe para verificar su estado REAL.

        Se usa en /confirm-payment: NUNCA se confía en que el cliente diga
        "el pago tuvo éxito" — se consulta a Stripe directamente. Devuelve
        también el booking_id guardado en metadata para validar que el pago
        corresponde a la reserva que el cliente dice.
        """
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "payment_intent_id": intent.id,
            "status": intent.status,
            "amount": intent.amount,
            "currency": intent.currency,
            "booking_id": (intent.metadata or {}).get("booking_id", ""),
        }

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> dict:
        """Verifica que un webhook realmente viene de Stripe.

        CRÍTICO para seguridad: cualquiera puede hacer POST al endpoint
        de webhook. La firma criptográfica (HMAC-SHA256) prueba que
        el mensaje fue enviado por Stripe usando tu webhook_secret.

        Args:
            payload: Body crudo del request (bytes, NO dict)
            signature: Valor del header 'stripe-signature'

        Returns:
            El evento verificado como dict

        Raises:
            ValueError: Si la firma es inválida (no es de Stripe)
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                settings.stripe_webhook_secret,
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Firma de webhook inválida: {e}") from e
