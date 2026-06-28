import { getApiBaseUrl } from '@/shared/lib/api';

/**
 * Cliente de la reserva pública (GET /api/v1/bookings/{id}).
 *
 * El backend Python (FastAPI) responde en **snake_case** y **sin** el envoltorio
 * `{success, data}` que usaba el backend TypeScript viejo. Las páginas públicas
 * (Confirmation, Checkout, CheckoutSuccess) fueron escritas para ese backend
 * viejo, así que aquí se normaliza la respuesta a camelCase en UN solo lugar
 * — mismo patrón que los `mapBooking` del admin.
 */

export type ApiBookingItem = {
  id: string;
  type: string;
  name: string;
  slug?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type ApiBooking = {
  id: string;
  type?: string;
  status: string;
  confirmationCode?: string | null;
  bookingDate?: string;
  bookingTime?: string | null;
  pickupTime?: string | null;
  pickupLocation?: string;
  dropoffLocation?: string;
  totalAmount: number;
  /** Alias de totalAmount (centavos) — algunas páginas leen este nombre. */
  totalAmountCents: number;
  /** Subtotal en centavos (antes de IVA). */
  subtotalAmount: number;
  /** IVA en centavos. */
  taxAmount: number;
  passengers?: number;
  customer?: { name: string; email: string; phone: string } | null;
  items: ApiBookingItem[];
};

/** Fila cruda (snake_case) de un item tal como la devuelve el backend. */
interface RawBookingItem {
  id?: string;
  type?: string;
  name?: string;
  slug?: string | null;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
}

/** Respuesta cruda (snake_case) de una reserva tal como la devuelve el backend. */
interface RawBooking {
  id?: string;
  type?: string;
  status?: string;
  confirmation_code?: string | null;
  booking_date?: string;
  booking_time?: string | null;
  pickup_time?: string | null;
  pickup_location?: string;
  dropoff_location?: string;
  total_amount?: number;
  subtotal_amount?: number | null;
  tax_amount?: number | null;
  passengers?: number;
  customer?: { name: string; email: string; phone: string } | null;
  items?: RawBookingItem[];
}

/** Convierte la respuesta snake_case del backend a la forma camelCase que esperan las páginas. */
export function mapBookingResponse(raw: RawBooking): ApiBooking {
  const totalCents = raw?.total_amount ?? 0;
  // Si el backend no manda subtotal (reservas viejas), cae al total para no romper.
  const subtotalCents = raw?.subtotal_amount ?? totalCents;
  const taxCents = raw?.tax_amount ?? 0;
  return {
    id: raw?.id ?? '',
    type: raw?.type,
    status: raw?.status ?? '',
    confirmationCode: raw?.confirmation_code ?? null,
    bookingDate: raw?.booking_date,
    bookingTime: raw?.booking_time ?? null,
    pickupTime: raw?.pickup_time ?? null,
    pickupLocation: raw?.pickup_location ?? '',
    dropoffLocation: raw?.dropoff_location ?? '',
    totalAmount: totalCents,
    totalAmountCents: totalCents,
    subtotalAmount: subtotalCents,
    taxAmount: taxCents,
    passengers: raw?.passengers,
    customer: raw?.customer ?? null,
    items: (raw?.items ?? []).map((it: RawBookingItem) => ({
      id: it?.id ?? '',
      type: it?.type ?? '',
      name: it?.name ?? '',
      slug: it?.slug ?? null,
      quantity: it?.quantity ?? 1,
      unitPrice: it?.unit_price ?? 0,
      totalPrice: it?.total_price ?? 0,
    })),
  };
}

/** GET de una reserva por ID, ya normalizada. Lanza si la respuesta no es 2xx. */
export async function fetchBooking(bookingId: string, token?: string): Promise<ApiBooking> {
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  const res = await fetch(`${getApiBaseUrl()}/api/v1/bookings/${bookingId}${query}`);
  if (!res.ok) {
    throw new Error('Booking not found');
  }
  return mapBookingResponse(await res.json());
}
