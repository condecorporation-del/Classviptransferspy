// Reconstruye las PIERNAS operativas de una reserva (LLEGADA / SALIDA) para
// mostrarlas en las pantallas de confirmación. Espejo EXACTO de
// `backend/app/services/booking_operations.py` (build_operation_legs) y del
// admin (`features/admin/lib/booking-operations.ts`), para que la pantalla
// muestre lo MISMO que el correo de confirmación.
//
// Round trip → SIEMPRE genera ambas piernas:
//   LLEGADA: Aeropuerto → Hotel (fecha de llegada, vuelo de llegada, hora).
//   SALIDA:  Hotel → Aeropuerto (fecha de SALIDA de metadata.departureDate,
//            vuelo de salida, hora de PICKUP = vuelo de salida − 3h).
import type { ApiBooking } from './booking-api';

export type BookingLeg = {
  type: 'arrival' | 'departure' | 'service';
  label: string;
  serviceDate: string; // YYYY-MM-DD
  serviceTime: string; // en salidas = hora de pickup
  origin: string;
  destination: string;
  flight: string;
  airline: string;
  flightTime: string;
};

const AIRPORT_FALLBACK = 'Aeropuerto / Airport';
const HOTEL_FALLBACK = 'Hotel / Pickup';

function cleanDate(v?: string | null): string {
  return v ? v.slice(0, 10) : '';
}
function minutesFromTime(v?: string | null): number | null {
  if (!v || v.length < 4 || !v.includes(':')) return null;
  const [h, m] = v.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function timeFromMinutes(v: number): string {
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}
function subtractThreeHours(v?: string | null): string | null {
  const m = minutesFromTime(v);
  return m === null ? null : timeFromMinutes(Math.max(0, m - 180));
}

export function buildBookingLegs(b: ApiBooking): BookingLeg[] {
  const legs: BookingLeg[] = [];
  const tripType = (b.tripType || '').toLowerCase();
  const route = b.route || null;
  const isRoundtrip = tripType === 'roundtrip';
  const arrivalDate = cleanDate(b.bookingDate);
  const departureDate = cleanDate(b.departureDate) || arrivalDate;
  const pickup = b.pickupLocation || '';
  const dropoff = b.dropoffLocation || '';

  const hasArrivalData = Boolean(b.flightNumber || b.arrivalTime || b.arrivalAirline);
  const hasDepartureData = Boolean(
    b.departureFlightNumber || b.departureTime || b.departureAirline || b.pickupTime,
  );

  const wantArrival = route === 'airport-hotel' || isRoundtrip || (route === null && hasArrivalData);
  if (wantArrival) {
    legs.push({
      type: 'arrival',
      label: 'LLEGADA · ARRIVAL',
      serviceDate: arrivalDate,
      serviceTime: b.bookingTime || b.arrivalTime || '',
      origin: pickup || AIRPORT_FALLBACK,
      destination: dropoff || HOTEL_FALLBACK,
      flight: b.flightNumber || '',
      airline: b.arrivalAirline || '',
      flightTime: b.arrivalTime || '',
    });
  }

  const departureServiceTime =
    b.pickupTime || subtractThreeHours(b.departureTime) || b.departureTime || '';
  if (isRoundtrip) {
    legs.push({
      type: 'departure',
      label: 'SALIDA · DEPARTURE',
      serviceDate: departureDate,
      serviceTime: departureServiceTime,
      origin: dropoff || HOTEL_FALLBACK,
      destination: pickup || AIRPORT_FALLBACK,
      flight: b.departureFlightNumber || '',
      airline: b.departureAirline || '',
      flightTime: b.departureTime || '',
    });
  } else if (route === 'hotel-airport' || (route === null && hasDepartureData)) {
    legs.push({
      type: 'departure',
      label: 'SALIDA · DEPARTURE',
      serviceDate: arrivalDate,
      serviceTime: departureServiceTime,
      origin: pickup || HOTEL_FALLBACK,
      destination: dropoff || AIRPORT_FALLBACK,
      flight: b.departureFlightNumber || b.flightNumber || '',
      airline: b.departureAirline || '',
      flightTime: b.departureTime || '',
    });
  }

  if (legs.length === 0) {
    legs.push({
      type: 'service',
      label: 'SERVICIO · SERVICE',
      serviceDate: arrivalDate,
      serviceTime: b.bookingTime || b.arrivalTime || b.departureTime || '',
      origin: pickup,
      destination: dropoff,
      flight: b.flightNumber || b.departureFlightNumber || '',
      airline: b.arrivalAirline || b.departureAirline || '',
      flightTime: '',
    });
  }

  return legs;
}
