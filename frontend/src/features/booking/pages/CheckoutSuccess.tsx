import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { fetchBooking, type ApiBooking } from '@/features/booking/lib/booking-api';

type BookingSummary = ApiBooking;

const STATUS_LABELS: Record<string, { en: string; es: string }> = {
  CONFIRMED:       { en: 'Confirmed',       es: 'Confirmado' },
  PAID:            { en: 'Paid',            es: 'Pagado' },
  PENDING_PAYMENT: { en: 'Pending Payment', es: 'Pago Pendiente' },
  COMPLETED:       { en: 'Completed',       es: 'Completado' },
  CANCELLED:       { en: 'Cancelled',       es: 'Cancelado' },
  OFFLINE_HOLD:    { en: 'Hold',            es: 'En Espera' },
  DRAFT:           { en: 'Draft',           es: 'Borrador' },
};

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const bookingId = searchParams.get('bookingId');

  const [loading, setLoading] = useState(Boolean(bookingId));
  const [booking, setBooking] = useState<BookingSummary | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const bookingToken = sessionStorage.getItem(`bt_${bookingId}`) || searchParams.get('bt') || '';

    fetchBooking(bookingId, bookingToken)
      .then((b) => setBooking(b))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 size={42} className="animate-spin text-gold mx-auto" />
          <p className="text-lg font-semibold">
            {lang === 'es' ? 'Preparando tu confirmación...' : 'Preparing your confirmation...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-lg w-full rounded-[28px] border border-gold/15 bg-card/95 shadow-[0_24px_90px_rgba(10,22,40,0.18)] p-8 md:p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/12 ring-8 ring-emerald-500/5">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          {lang === 'es' ? 'Reserva confirmada' : 'Booking Confirmed'}
        </h1>

        <p className="text-muted-foreground leading-relaxed mb-6">
          {lang === 'es'
            ? 'Tu pago fue recibido correctamente. En breve recibirás tu confirmación por correo con todos los detalles del servicio.'
            : 'Your payment was received successfully. You will receive your confirmation email with all service details shortly.'}
        </p>

        {booking && (
          <div className="mb-8 rounded-2xl border border-border bg-muted/35 p-4 text-left space-y-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{lang === 'es' ? 'Referencia' : 'Reference'}</span>
              <span className="font-mono font-semibold text-foreground">
                {booking.confirmationCode || `#${booking.id.slice(0, 8).toUpperCase()}`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{lang === 'es' ? 'Estado' : 'Status'}</span>
              <span className="font-semibold text-emerald-600">
                {STATUS_LABELS[booking.status]?.[lang === 'es' ? 'es' : 'en'] || booking.status}
              </span>
            </div>

            {/* Desglose de precio con IVA */}
            {booking.taxAmount > 0 && (
              <>
                <div className="flex items-center justify-between gap-4 text-sm pt-3 border-t border-border">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${(booking.subtotalAmount / 100).toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {lang === 'es'
                      ? `IVA (${Math.round((booking.taxAmount / booking.subtotalAmount) * 100)}%)`
                      : `Tax · IVA (${Math.round((booking.taxAmount / booking.subtotalAmount) * 100)}%)`}
                  </span>
                  <span className="text-foreground">${(booking.taxAmount / 100).toFixed(2)} USD</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-border">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-gold">${(booking.totalAmount / 100).toFixed(2)} USD</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full gold-gradient text-secondary-foreground px-6 py-3.5 rounded-xl font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {lang === 'es' ? 'Volver al inicio' : 'Back to Home'}
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="w-full px-6 py-3 rounded-xl font-semibold bg-muted text-foreground hover:bg-muted/80 transition-all"
          >
            {lang === 'es' ? 'Contactar soporte' : 'Contact support'}
          </button>
        </div>
      </div>
    </div>
  );
}
