import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Loader2, MessageCircle, Phone } from 'lucide-react';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { fetchBooking, type ApiBooking } from '@/features/booking/lib/booking-api';
import { BookingLegs } from '@/features/booking/components/BookingLegs';

type ConfirmationBooking = ApiBooking;

const PHONE = '+52 624 122 2174';
const WHATSAPP_LINK = 'https://wa.me/5216241222174';

const STATUS_LABELS: Record<string, { en: string; es: string }> = {
  CONFIRMED:       { en: 'Confirmed',       es: 'Confirmado' },
  PAID:            { en: 'Paid',            es: 'Pagado' },
  PENDING_PAYMENT: { en: 'Pending Payment', es: 'Pago Pendiente' },
  COMPLETED:       { en: 'Completed',       es: 'Completado' },
  CANCELLED:       { en: 'Cancelled',       es: 'Cancelado' },
  OFFLINE_HOLD:    { en: 'Hold',            es: 'En Espera' },
  DRAFT:           { en: 'Draft',           es: 'Borrador' },
};

const Confirmation = () => {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<ConfirmationBooking | null>(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const loadBooking = async () => {
      try {
        const bookingToken = sessionStorage.getItem(`bt_${bookingId}`) || searchParams.get('bt') || '';
        setBooking(await fetchBooking(bookingId, bookingToken));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void loadBooking();
  }, [bookingId, searchParams]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-32">
        <Loader2 size={48} className="animate-spin text-gold" />
      </div>
    );
  }

  if (error || (!booking && bookingId)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-32">
        <div className="glass-card rounded-2xl p-10 max-w-lg text-center w-full border border-border">
          <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">
            {lang === 'es' ? 'Reserva no encontrada' : 'Booking not found'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {lang === 'es'
              ? 'No pudimos encontrar los detalles de tu reserva. Contacta a nuestro equipo para más información.'
              : 'We could not find your booking details. Contact our team for more information.'}
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-[#25D366] text-white font-bold text-sm hover:bg-[#20bd5a] transition-colors mb-3"
          >
            <MessageCircle size={18} />
            {lang === 'es' ? 'Contactar por WhatsApp' : 'Contact via WhatsApp'}
          </a>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('confirm.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  const bookingDate = booking?.bookingDate ? format(new Date(booking.bookingDate), 'PPP') : null;
  const reference = booking?.confirmationCode || (booking?.id ? `#CVT-${booking.id.slice(-8).toUpperCase()}` : null);
  const status = booking?.status || 'CONFIRMED';
  const totalCents = booking?.totalAmountCents ?? booking?.totalAmount ?? 0;
  const total = (totalCents / 100).toFixed(2);
  const taxCents = booking?.taxAmount ?? 0;
  const subtotalCents = booking?.subtotalAmount ?? totalCents;
  const ivaPct = subtotalCents > 0 ? Math.round((taxCents / subtotalCents) * 100) : 16;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-10 max-w-lg text-center w-full border border-border"
      >
        <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-navy" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">{t('confirm.title')}</h1>
        <p className="text-muted-foreground mb-6">{t('confirm.subtitle')}</p>

        {booking ? (
          <div className="glass-card rounded-xl p-5 mb-6 text-left space-y-3 border border-border">
            <h3 className="font-semibold text-sm text-gold">{t('confirm.summary')}</h3>
            <div className="text-sm text-foreground/80 space-y-1">
              {reference && (
                <p>
                  {t('confirm.reference')}: <span className="font-medium text-gold">{reference}</span>
                </p>
              )}
              <p>
                {t('confirm.service')}: <span className="font-medium">{booking.type || t('confirm.serviceValue')}</span>
              </p>
              {bookingDate && (
                <p>
                  {t('confirm.date')}: <span className="font-medium">{bookingDate}</span>
                </p>
              )}
              {/* Piernas del servicio: para round trips muestra LLEGADA y SALIDA con
                  sus fechas distintas, vuelos, hora de pickup y ruta origen→destino.
                  Reemplaza las líneas sueltas de pickup/dropoff. */}
              <div className="pt-2">
                <BookingLegs booking={booking} lang={lang === 'es' ? 'es' : 'en'} />
              </div>
              {/* Conceptos: traslado, extras y actividades, cada uno especificado */}
              {booking.items.length > 0 && (
                <div className="pt-1 space-y-0.5">
                  {booking.items.map((it, idx) => (
                    <p key={idx} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{it.name}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</span>
                      <span className="font-medium">${((it.totalPrice ?? 0) / 100).toFixed(2)}</span>
                    </p>
                  ))}
                </div>
              )}
              {taxCents > 0 && (
                <>
                  <p>
                    Subtotal: <span className="font-medium">${(subtotalCents / 100).toFixed(2)} USD</span>
                  </p>
                  <p>
                    {lang === 'es' ? `IVA (${ivaPct}%)` : `Tax · IVA (${ivaPct}%)`}: <span className="font-medium">${(taxCents / 100).toFixed(2)} USD</span>
                  </p>
                </>
              )}
              {totalCents > 0 && (
                <p>
                  Total: <span className="font-medium text-gold">${total} USD</span>
                </p>
              )}
              <p>
                {lang === 'es' ? 'Estado' : 'Status'}:{' '}
                <span className="font-medium">
                  {STATUS_LABELS[status]?.[lang === 'es' ? 'es' : 'en'] || status}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-xl p-5 mb-6 text-left border border-border">
            <p className="text-sm text-muted-foreground">
              {lang === 'es'
                ? 'Tu reserva ha sido registrada exitosamente. Recibirás un email de confirmación.'
                : 'Your booking has been successfully registered. You will receive a confirmation email.'}
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-semibold">{t('confirm.needHelp')}</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <a
              href={`tel:${PHONE.replace(/\s/g, '')}`}
              className="flex items-center gap-2 justify-center hover:text-foreground transition-colors"
            >
              <Phone size={14} /> {PHONE}
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center hover:text-foreground transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>

        <Link
          to="/"
          className="gold-gradient text-navy px-6 py-3 rounded-full text-sm font-bold inline-flex hover:brightness-110 transition-all gold-glow"
        >
          {t('confirm.backHome')}
        </Link>
      </motion.div>
    </div>
  );
};

export default Confirmation;
