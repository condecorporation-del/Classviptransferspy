// Muestra las piernas (LLEGADA / SALIDA) de una reserva en las pantallas de
// confirmación, con TODOS los datos específicos: fecha, hora de pickup, ruta
// origen→destino, vuelo y aerolínea. Para round trips muestra ambas piernas
// con sus fechas DISTINTAS (llegada vs salida). Mismo contenido que el correo.
import { Plane, Clock, MapPin } from 'lucide-react';
import type { ApiBooking } from '@/features/booking/lib/booking-api';
import { buildBookingLegs } from '@/features/booking/lib/booking-legs';

export function BookingLegs({ booking, lang }: { booking: ApiBooking; lang: 'en' | 'es' }) {
  const legs = buildBookingLegs(booking);
  const es = lang === 'es';

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => {
        const isDeparture = leg.type === 'departure';
        const accent = isDeparture ? 'text-orange-500' : 'text-emerald-600';
        const border = isDeparture ? 'border-l-orange-500' : 'border-l-emerald-500';
        return (
          <div key={i} className={`rounded-xl border border-border bg-muted/30 border-l-4 ${border} p-4 text-left`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`text-xs font-bold tracking-wide ${accent}`}>
                <Plane size={12} className="inline mr-1" />{leg.label}
              </span>
              {leg.serviceDate && (
                <span className="text-sm font-bold text-foreground">{leg.serviceDate}</span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 text-gold shrink-0" />
                <span className="font-medium text-foreground">
                  {leg.origin || '—'} <span className="text-muted-foreground">→</span> {leg.destination || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-gold shrink-0" />
                <span className="text-muted-foreground">
                  {isDeparture ? (es ? 'Hora de recogida (pickup)' : 'Pickup time') : (es ? 'Hora de llegada' : 'Arrival time')}:
                </span>
                <span className="font-semibold text-foreground">{leg.serviceTime || 'TBD'}</span>
              </div>
              {leg.flight && (
                <div className="flex items-center gap-2">
                  <Plane size={13} className="text-gold shrink-0" />
                  <span className="text-muted-foreground">{es ? 'Vuelo' : 'Flight'}:</span>
                  <span className="font-semibold text-foreground">{leg.flight}</span>
                  {leg.flightTime && <span className="text-muted-foreground">· {leg.flightTime}</span>}
                  {leg.airline && <span className="text-muted-foreground">· {leg.airline}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
