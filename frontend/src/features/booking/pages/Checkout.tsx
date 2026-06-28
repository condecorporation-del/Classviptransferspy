import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  CreditCard,
  Shield,
  Lock,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { getApiBaseUrl } from '@/shared/lib/api';
import { getErrorMessage } from '@/shared/lib/errors';
import { fetchBooking, type ApiBooking } from '@/features/booking/lib/booking-api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

const checkoutCopy = {
  validationError: { en: 'Validation error', es: 'Error de validación' },
  paymentFailed: { en: 'Payment failed', es: 'El pago falló' },
  paymentIncomplete: {
    en: 'Payment was not completed. Please try again.',
    es: 'El pago no se completó. Inténtalo de nuevo.',
  },
  paidTitle: { en: 'Payment Successful!', es: '¡Pago Exitoso!' },
  paidBody: {
    en: 'Your booking is confirmed. You will receive a confirmation email with all details shortly.',
    es: 'Tu reservación está confirmada. Recibirás un correo con todos los detalles en breve.',
  },
  backHome: { en: 'Back to Home', es: 'Volver al Inicio' },
  loadingLabel: { en: 'Secure payment', es: 'Pago seguro' },
  loadingTitle: { en: 'Preparing your secure payment', es: 'Preparando tu pago seguro' },
  loadingBody: {
    en: 'We are loading your booking summary and initializing Stripe.',
    es: 'Estamos cargando tu resumen de reserva e inicializando Stripe.',
  },
  missingBookingId: { en: 'Booking ID not found', es: 'No se encontró el ID de la reserva' },
  loadFailure: { en: 'Failed to load checkout', es: 'No se pudo cargar el checkout' },
  bookingNotFound: { en: 'Booking not found', es: 'No se encontró la reserva' },
  tryAgain: { en: 'Try Again', es: 'Intentar de Nuevo' },
  backToBooking: { en: 'Back to Booking', es: 'Volver a Reservar' },
  summary: { en: 'Booking Summary', es: 'Resumen de Reserva' },
  paymentInfo: { en: 'Payment Information', es: 'Información de Pago' },
  totalDue: { en: 'Total Due Now', es: 'Total a Pagar' },
  confirmationSent: { en: 'Confirmation sent to', es: 'Confirmación enviada a' },
  supportTitle: { en: 'Need help before paying?', es: '¿Necesitas ayuda antes de pagar?' },
  supportBody: {
    en: 'Our team can confirm details or assist with special requests before you complete payment.',
    es: 'Nuestro equipo puede confirmar detalles o ayudarte con solicitudes especiales antes de completar el pago.',
  },
  contactSupport: { en: 'Contact on WhatsApp', es: 'Contactar por WhatsApp' },
};

function StripeBadgeStrip({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-2"
      style={{ background: '#071524', borderTop: '1px solid rgba(212,175,55,0.18)' }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.5 8.5h-1v-4h1v4zm0-5h-1V2.5h1V3.5z" fill="#635BFF" opacity="0.9" />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(212,175,55,0.55)', letterSpacing: '0.03em' }}>
        {lang === 'es' ? 'Protegido por' : 'Secured by'}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, fontStyle: 'italic', color: '#635BFF', letterSpacing: '-0.3px' }}>
        stripe
      </span>
    </div>
  );
}

function StripePaymentForm({
  bookingId,
  bookingToken,
  clientSecret,
  customerEmail,
  customerName,
  totalDollars,
  lang,
  onSuccess,
}: {
  bookingId: string;
  bookingToken: string;
  clientSecret: string;
  customerEmail: string;
  customerName: string;
  totalDollars: string;
  lang: 'en' | 'es';
  onSuccess: (bookingToken: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError(checkoutCopy.loadFailure[lang]);
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: customerName,
          email: customerEmail,
        },
      },
    });
    

    if (confirmErr) {
      setError(confirmErr.message || checkoutCopy.paymentFailed[lang]);
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/stripe/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paymentIntentId: paymentIntent.id, bookingToken }),
        });
        if (!response.ok) {
          throw new Error('Server-side payment confirmation failed');
        }
      } catch {
        // Webhook can still finalize the booking state if this follow-up fails.
      }
      onSuccess(bookingToken);
      return;
    }

    setError(checkoutCopy.paymentIncomplete[lang]);
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
        <CardElement
          options={{
            style: {
              base: {
                color: '#1e293b',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '16px',
                '::placeholder': {
                  color: '#94a3b8',
                },
              },
              invalid: {
                color: '#dc2626',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full overflow-hidden rounded-xl transition-shadow hover:shadow-[0_16px_48px_rgba(212,175,55,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"
        style={{ boxShadow: '0 8px 28px rgba(212,175,55,0.28)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F5C842 60%, #D4AF37 100%)' }}
        >
          <div className="flex items-center gap-3">
            {processing ? (
              <Loader2 size={20} className="animate-spin" style={{ color: '#0A1628' }} />
            ) : (
              <Lock size={20} style={{ color: '#0A1628' }} />
            )}
            <span className="text-lg font-bold tracking-wide" style={{ color: '#0A1628' }}>
              {processing ? (lang === 'es' ? 'Procesando...' : 'Processing...') : (lang === 'es' ? 'Pagar Ahora' : 'Pay Now')}
            </span>
          </div>
          <span className="font-display text-xl font-bold" style={{ color: '#0A1628' }}>
            ${totalDollars} USD
          </span>
        </div>
        <StripeBadgeStrip lang={lang} />
      </button>

      <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield size={11} className="text-gold/60" />
          256-bit SSL
        </span>
        <span className="text-gold/20">•</span>
        <span className="flex items-center gap-1.5">
          <CreditCard size={11} className="text-gold/60" />
          {lang === 'es' ? 'Datos cifrados' : 'Encrypted data'}
        </span>
        <span className="text-gold/20">•</span>
        <span className="flex items-center gap-1.5">
          <Lock size={11} className="text-gold/60" />
          PCI DSS
        </span>
      </div>
    </form>
  );
}

function LoadingState({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <div className="rounded-2xl border border-gold/15 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
            <Loader2 size={28} className="animate-spin text-gold" />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold/80">{checkoutCopy.loadingLabel[lang]}</p>
          <h1 className="font-display text-2xl font-bold text-foreground">{checkoutCopy.loadingTitle[lang]}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{checkoutCopy.loadingBody[lang]}</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="mb-4 h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-3 gap-3 border-b border-border/50 pb-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-14 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  lang,
  error,
  onRetry,
}: {
  lang: 'en' | 'es';
  error: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <CreditCard size={26} className="text-red-500" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">{checkoutCopy.bookingNotFound[lang]}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{error}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onRetry}
            className="flex-1 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            {checkoutCopy.tryAgain[lang]}
          </button>
          <button
            onClick={() => navigate('/book')}
            className="flex-1 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-navy transition-shadow hover:shadow-lg"
          >
            {checkoutCopy.backToBooking[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const bookingId = searchParams.get('bookingId');
  const normalizedLang = lang === 'es' ? 'es' : 'en';
  const bookingToken = useMemo(
    () => (bookingId ? sessionStorage.getItem(`bt_${bookingId}`) || searchParams.get('bt') || '' : ''),
    [bookingId, searchParams]
  );

  const [booking, setBooking] = useState<ApiBooking | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookingAndIntent = useCallback(async () => {
    if (!bookingId) {
      setError(checkoutCopy.missingBookingId[normalizedLang]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setBooking(await fetchBooking(bookingId, bookingToken));

      const intentRes = await fetch(`${getApiBaseUrl()}/api/v1/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, bookingToken }),
      });

      if (!intentRes.ok) {
        const intentError = await intentRes.json().catch(() => ({}));
        throw new Error(intentError.error || checkoutCopy.loadFailure[normalizedLang]);
      }

      // El backend devuelve { client_secret, payment_intent_id } DIRECTO,
      // sin envoltorio `.data` (mismo criterio que el resto de la API).
      const intentData = await intentRes.json();
      setClientSecret(intentData.client_secret);
    } catch (loadError) {
      setError(getErrorMessage(loadError, checkoutCopy.loadFailure[normalizedLang]));
    } finally {
      setLoading(false);
    }
  }, [bookingId, bookingToken, normalizedLang]);

  useEffect(() => {
    void loadBookingAndIntent();
  }, [loadBookingAndIntent]);

  if (loading) {
    return <LoadingState lang={normalizedLang} />;
  }

  if (error || !booking || !clientSecret) {
    return <ErrorState lang={normalizedLang} error={error || checkoutCopy.bookingNotFound[normalizedLang]} onRetry={() => void loadBookingAndIntent()} />;
  }

  const totalDollars = (booking.totalAmount / 100).toFixed(2);
  // % de IVA derivado de los montos reales del backend (no hardcodeado) para que
  // siempre coincida con lo cobrado, aunque cambie la tasa.
  const ivaPct = booking.subtotalAmount > 0
    ? Math.round((booking.taxAmount / booking.subtotalAmount) * 100)
    : 16;

  const stripeAppearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#D4AF37',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="space-y-1 pb-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold/80">{checkoutCopy.loadingLabel[normalizedLang]}</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {normalizedLang === 'es' ? 'Finalizar Reserva' : 'Complete Your Booking'}
          </h1>
          {booking.confirmationCode && (
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">#{booking.confirmationCode}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gold/20 bg-card">
          <div
            className="flex items-center gap-2 border-b border-gold/15 px-5 py-3"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))' }}
          >
            <CreditCard size={15} className="text-gold" />
            <span className="text-xs font-bold uppercase tracking-widest text-gold/80">{checkoutCopy.summary[normalizedLang]}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-b border-border/50 px-5 py-4 text-xs">
            {booking.bookingDate && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar size={10} /> {normalizedLang === 'es' ? 'Fecha' : 'Date'}
                </span>
                <span className="font-semibold text-foreground">
                  {new Date(booking.bookingDate).toLocaleDateString(normalizedLang === 'es' ? 'es-MX' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {booking.passengers && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users size={10} /> {normalizedLang === 'es' ? 'Pasajeros' : 'Passengers'}
                </span>
                <span className="font-semibold text-foreground">{booking.passengers}</span>
              </div>
            )}
            {booking.pickupLocation && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin size={10} /> {normalizedLang === 'es' ? 'Recogida' : 'Pickup'}
                </span>
                <span className="truncate font-semibold text-foreground">{booking.pickupLocation}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5 px-5 py-4">
            {booking.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                <span className="font-semibold text-foreground">${((item.totalPrice ?? 0) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Desglose de IVA: solo si el backend mandó impuesto (> 0). */}
          {booking.taxAmount > 0 && (
            <div className="space-y-2 border-t border-border/40 px-5 py-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${(booking.subtotalAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{normalizedLang === 'es' ? `IVA (${ivaPct}%)` : `Tax · IVA (${ivaPct}%)`}</span>
                <span>${(booking.taxAmount / 100).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div
            className="flex items-center justify-between border-t border-gold/20 px-5 py-4"
            style={{ background: 'rgba(212,175,55,0.04)' }}
          >
            <span className="text-sm font-bold text-foreground">{checkoutCopy.totalDue[normalizedLang]}</span>
            <span className="font-display text-2xl font-bold text-gold">${totalDollars} USD</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gold/20 bg-card">
          <div
            className="flex items-center gap-2 border-b border-gold/15 px-5 py-3"
            style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))' }}
          >
            <Lock size={15} className="text-gold" />
            <span className="text-xs font-bold uppercase tracking-widest text-gold/80">{checkoutCopy.paymentInfo[normalizedLang]}</span>
          </div>

          <div className="p-5">
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: stripeAppearance, locale: normalizedLang === 'es' ? 'es' : 'en' }}
            >
              <StripePaymentForm
                bookingId={bookingId!}
                bookingToken={bookingToken}
                clientSecret={clientSecret}
                customerEmail={booking.customer?.email ?? ''}
                customerName={booking.customer?.name ?? ''}
                totalDollars={totalDollars}
                lang={normalizedLang}
                onSuccess={(bookingToken) => {
                  const params = new URLSearchParams({ bookingId: bookingId! });
                  if (bookingToken) {
                    params.set('bt', bookingToken);
                  }
                  navigate(`/checkout/success?${params.toString()}`, { replace: true });
                }}
              />
            </Elements>
          </div>
        </div>

        <div className="pb-1 text-center text-xs text-muted-foreground">
          {checkoutCopy.confirmationSent[normalizedLang]} <span className="font-semibold text-foreground">{booking.customer?.email}</span>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-center">
          <p className="text-sm font-semibold text-foreground">{checkoutCopy.supportTitle[normalizedLang]}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{checkoutCopy.supportBody[normalizedLang]}</p>
          <a
            href="https://wa.me/5216241222174?text=Hello%2C%20I%20need%20help%20with%20my%20booking%20payment."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-xl border border-gold/20 bg-gold/5 px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
          >
            {checkoutCopy.contactSupport[normalizedLang]}
          </a>
        </div>
      </div>
    </div>
  );
}
