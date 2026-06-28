export type AdminOperationBooking = {
  id?: string;
  bookingDate: string;
  bookingTime?: string | null;
  pickupTime?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  flightNumber?: string | null;
  arrivalAirline?: string | null;
  departureFlightNumber?: string | null;
  departureAirline?: string | null;
  route?: string | null;
  tripType?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  passengers?: number;
  status?: string;
};

export type OperationType = 'arrival' | 'departure' | 'other';

export type AdminOperationEvent<T extends AdminOperationBooking = AdminOperationBooking> = {
  key: string;
  booking: T;
  operationType: OperationType;
  serviceDate: string;
  serviceTime: string;
  flight: string;
  airline: string;
  hotel: string;
  routeLabel: string;
  origin: string;
  destination: string;
};

// Mismos fallbacks que `booking_operations.py` (backend) — deben coincidir.
const AIRPORT_FALLBACK = 'Aeropuerto';
const HOTEL_FALLBACK = 'Hotel / Pickup';

function cleanDate(value?: string | null) {
  if (!value) return '';
  if (value.includes('T')) return value.slice(0, 10);
  return value.slice(0, 10);
}

function minutesFromTime(value?: string | null) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function timeFromMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function subtractThreeHours(value?: string | null) {
  const minutes = minutesFromTime(value);
  if (minutes === null) return null;
  return timeFromMinutes(Math.max(0, minutes - 180));
}

function departureDateFromMetadata(booking: AdminOperationBooking) {
  const raw = booking.metadata && typeof booking.metadata === 'object'
    ? booking.metadata.departureDate
    : null;

  if (typeof raw !== 'string') return '';
  return cleanDate(raw);
}

export function getOperationType(booking: AdminOperationBooking): OperationType {
  if (booking.route === 'airport-hotel') return 'arrival';
  if (booking.route === 'hotel-airport') return 'departure';
  return 'other';
}

export function getOperationBadge(input: AdminOperationBooking | AdminOperationEvent) {
  const type = 'operationType' in input ? input.operationType : getOperationType(input);
  if (type === 'arrival') return { label: 'LLEGADA', className: 'bg-blue-500/15 text-blue-300' };
  if (type === 'departure') return { label: 'SALIDA', className: 'bg-orange-100 text-orange-700' };
  return { label: 'SERVICIO', className: 'bg-white/10 text-white/60' };
}

export function getOperationHotel(input: AdminOperationBooking | AdminOperationEvent) {
  if ('hotel' in input) return input.hotel;
  return getOperationType(input) === 'departure'
    ? input.pickupLocation || 'Pickup pending'
    : input.dropoffLocation || 'Destination pending';
}

export function getOperationFlight(input: AdminOperationBooking | AdminOperationEvent) {
  if ('flight' in input) return input.flight;
  return getOperationType(input) === 'departure'
    ? input.departureFlightNumber || input.flightNumber || '---'
    : input.flightNumber || input.departureFlightNumber || '---';
}

export function getOperationTime(input: AdminOperationBooking | AdminOperationEvent) {
  if ('serviceTime' in input) return input.serviceTime;

  if (getOperationType(input) === 'departure') {
    return input.pickupTime || subtractThreeHours(input.departureTime) || input.departureTime || input.bookingTime || '99:99';
  }

  return input.bookingTime || input.arrivalTime || input.departureTime || '99:99';
}

function operationPriority(input: AdminOperationBooking | AdminOperationEvent) {
  const type = 'operationType' in input ? input.operationType : getOperationType(input);
  if (type === 'arrival') return 0;
  if (type === 'departure') return 1;
  return 2;
}

export function compareOperationBookings<T extends AdminOperationBooking | AdminOperationEvent>(a: T, b: T) {
  const dateA = 'serviceDate' in a ? a.serviceDate : cleanDate(a.bookingDate);
  const dateB = 'serviceDate' in b ? b.serviceDate : cleanDate(b.bookingDate);
  const dateDiff = dateA.localeCompare(dateB);
  if (dateDiff !== 0) return dateDiff;

  const opDiff = operationPriority(a) - operationPriority(b);
  if (opDiff !== 0) return opDiff;

  return getOperationTime(a).localeCompare(getOperationTime(b));
}

export function expandBookingOperations<T extends AdminOperationBooking>(booking: T): AdminOperationEvent<T>[] {
  const events: AdminOperationEvent<T>[] = [];
  const arrivalDate = cleanDate(booking.bookingDate);
  const departureDate = departureDateFromMetadata(booking);
  const isRoundTrip = booking.tripType === 'roundtrip';

  if (booking.route === 'airport-hotel' || isRoundTrip) {
    events.push({
      key: `${booking.id || arrivalDate}-arrival`,
      booking,
      operationType: 'arrival',
      serviceDate: arrivalDate,
      serviceTime: booking.bookingTime || booking.arrivalTime || '99:99',
      flight: booking.flightNumber || '---',
      airline: booking.arrivalAirline || '',
      hotel: booking.dropoffLocation || 'Hotel pending',
      routeLabel: 'Airport -> Hotel',
      origin: booking.pickupLocation || AIRPORT_FALLBACK,
      destination: booking.dropoffLocation || HOTEL_FALLBACK,
    });
  }

  if (booking.route === 'hotel-airport') {
    events.push({
      key: `${booking.id || arrivalDate}-departure`,
      booking,
      operationType: 'departure',
      serviceDate: arrivalDate,
      serviceTime: booking.pickupTime || subtractThreeHours(booking.departureTime) || booking.departureTime || booking.bookingTime || '99:99',
      flight: booking.departureFlightNumber || booking.flightNumber || '---',
      airline: booking.departureAirline || '',
      hotel: booking.pickupLocation || 'Pickup pending',
      routeLabel: 'Hotel -> Airport',
      origin: booking.pickupLocation || HOTEL_FALLBACK,
      destination: booking.dropoffLocation || AIRPORT_FALLBACK,
    });
  } else if (isRoundTrip) {
    // Si la reserva no trae metadata.departureDate (reservas viejas creadas
    // antes de este fix, o el admin no la llenó), cae a arrivalDate — igual
    // que build_operation_legs() en el backend — para que la pierna de
    // SALIDA siempre aparezca, aunque sea con la fecha equivocada en vez de
    // desaparecer por completo.
    const effectiveDepartureDate = departureDate || arrivalDate;
    events.push({
      key: `${booking.id || effectiveDepartureDate}-departure`,
      booking,
      operationType: 'departure',
      serviceDate: effectiveDepartureDate,
      serviceTime: booking.pickupTime || subtractThreeHours(booking.departureTime) || booking.departureTime || '99:99',
      flight: booking.departureFlightNumber || '---',
      airline: booking.departureAirline || '',
      hotel: booking.dropoffLocation || booking.pickupLocation || 'Hotel pending',
      routeLabel: 'Hotel -> Airport',
      // Round trip: la salida es la ruta inversa de la llegada (hotel -> aeropuerto).
      origin: booking.dropoffLocation || HOTEL_FALLBACK,
      destination: booking.pickupLocation || AIRPORT_FALLBACK,
    });
  }

  if (events.length === 0) {
    events.push({
      key: `${booking.id || arrivalDate}-service`,
      booking,
      operationType: 'other',
      serviceDate: arrivalDate,
      serviceTime: booking.bookingTime || booking.arrivalTime || booking.departureTime || '99:99',
      flight: booking.flightNumber || booking.departureFlightNumber || '---',
      airline: booking.arrivalAirline || booking.departureAirline || '',
      hotel: booking.dropoffLocation || booking.pickupLocation || 'Pending',
      routeLabel: 'Service',
      origin: booking.pickupLocation || '',
      destination: booking.dropoffLocation || '',
    });
  }

  return events.sort(compareOperationBookings);
}
