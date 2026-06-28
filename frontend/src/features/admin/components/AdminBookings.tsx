import { useState, useEffect, useCallback } from 'react';
import {
  Mail, ChevronRight, ArrowLeft, RefreshCw, FileDown,
  Search, Edit2, X, Save, UserCheck, CheckCircle, XCircle,
  Car, Calendar, Download, Loader2, CalendarX, AlertCircle,
  Printer, ArrowRight, BadgeDollarSign, User, CreditCard, MessageSquare, Trash2,
} from 'lucide-react';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import {
  compareOperationBookings,
  expandBookingOperations,
  getOperationBadge,
  getOperationFlight,
  getOperationHotel,
  getOperationTime,
  type AdminOperationEvent,
} from '@/features/admin/lib/booking-operations';
import { addLocalDays, localDateKey, parseDateOnlyAsLocalNoon } from '@/features/admin/lib/admin-date';
import { getApiBaseUrl } from '@/shared/lib/api';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type Driver = { id: string; name: string; phone: string; email?: string; isActive: boolean };
type Vehicle = { id: string; make: string; model: string; year?: number; licensePlate: string; capacity: number; isActive: boolean };

type Assignment = {
  id: string;
  type: 'DRIVER' | 'VEHICLE';
  driver?: Driver | null;
  vehicle?: Vehicle | null;
  notes?: string | null;
};

type Payment = {
  id: string;
  provider: string;
  status: string;
  amount: number;
  orderId?: string | null;
  completedAt?: string | null;
  createdAt?: string;
};

type EmailLog = {
  id: string; type: string; status: string;
  to: string; subject: string; error: string | null;
  sentAt: string | null; createdAt: string;
};

type BookingItem = { id: string; type: string; name: string; quantity: number; unitPrice: number; totalPrice: number };

type Booking = {
  id: string;
  confirmationCode?: string | null;
  type: string; status: string; source: string;
  customerId: string;
  bookingDate: string;
  createdAt?: string;
  confirmedAt?: string | null;
  bookingTime: string | null;
  pickupTime: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  flightNumber: string | null;
  arrivalTime: string | null;
  arrivalAirline: string | null;
  departureFlightNumber: string | null;
  departureTime: string | null;
  departureAirline: string | null;
  totalAmount: number;
  passengers: number;
  serviceType: string | null;
  tripType: string | null;
  route: string | null;
  metadata?: Record<string, unknown> | null;
  notes: string | null;
  internalNotes: string | null;
  customer?: { name: string; email: string; phone: string; country?: string | null; language?: string | null };
  items: BookingItem[];
  payments?: Payment[];
  assignments?: Assignment[];
  emailLogs?: EmailLog[];
};

type BookingUpdateInput = {
  bookingDate: string;
  bookingTime: string | null;
  pickupTime: string | null;
  passengers: number;
  flightNumber: string | null;
  arrivalTime: string | null;
  departureFlightNumber: string | null;
  departureTime: string | null;
  departureDate: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  notes: string | null;
  internalNotes: string | null;
};

type CustomerUpdateInput = {
  name: string;
  email: string;
  phone: string;
  country?: string | null;
};

type BookingEditorPayload = {
  booking: BookingUpdateInput;
  customer: CustomerUpdateInput;
  paymentAction?: {
    type: 'mark_paid';
    method: 'cash' | 'bank_transfer' | 'card';
  } | { type: 'add_to_account'; accountId: string } | null;
};

type AccountOption = { id: string; name: string; balance: number };

type BookingOperationRow = AdminOperationEvent<Booking>;

type AssignmentUpdateInput = {
  driverId: string | null;
  vehicleId: string | null;
  pickupTime?: string;
  internalNotes?: string;
};

// âââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

// El backend FastAPI responde en snake_case y sin envelope {success,data}.
// Este mapper traduce esa forma real a los tipos camelCase que ya usa
// el resto de este componente (Booking, Driver, Vehicle, Assignment, Payment).
// Filas crudas (snake_case) que devuelve el backend FastAPI.
type RawDriver = { id: string; name: string; phone: string; email?: string; is_active: boolean };
type RawVehicle = { id: string; make: string; model: string; year?: number; license_plate: string; capacity: number; is_active: boolean };
type RawBookingItem = { id: string; type: string; name: string; quantity: number; unit_price: number; total_price: number };
type RawPayment = { id: string; provider: string; status: string; amount: number; order_id?: string | null; completed_at?: string | null; created_at?: string };
type RawAssignment = { id: string; type: 'DRIVER' | 'VEHICLE'; driver?: RawDriver | null; vehicle?: RawVehicle | null; notes?: string | null };
type RawBooking = {
  id: string;
  confirmation_code?: string | null;
  type: string; status: string; source: string;
  customer_id: string;
  booking_date: string;
  created_at?: string;
  confirmed_at?: string | null;
  booking_time: string | null;
  pickup_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  flight_number: string | null;
  arrival_time: string | null;
  arrival_airline?: string | null;
  departure_flight_number: string | null;
  departure_time: string | null;
  departure_airline?: string | null;
  total_amount: number;
  passengers: number;
  service_type: string | null;
  trip_type: string | null;
  route: string | null;
  metadata?: Record<string, unknown> | null;
  notes: string | null;
  internal_notes: string | null;
  customer?: { name: string; email: string; phone: string; country?: string | null; language?: string | null };
  items?: RawBookingItem[];
  payments?: RawPayment[];
  assignments?: RawAssignment[];
};
type RawAccountOption = { id: string; name: string; balance_cents?: number };

function mapDriverRaw(raw: RawDriver): Driver {
  return { id: raw.id, name: raw.name, phone: raw.phone, email: raw.email, isActive: raw.is_active };
}

function mapVehicleRaw(raw: RawVehicle): Vehicle {
  return {
    id: raw.id,
    make: raw.make,
    model: raw.model,
    year: raw.year,
    licensePlate: raw.license_plate,
    capacity: raw.capacity,
    isActive: raw.is_active,
  };
}

function mapBooking(raw: RawBooking): Booking {
  return {
    id: raw.id,
    confirmationCode: raw.confirmation_code,
    type: raw.type,
    status: raw.status,
    source: raw.source,
    customerId: raw.customer_id,
    bookingDate: raw.booking_date,
    createdAt: raw.created_at,
    confirmedAt: raw.confirmed_at,
    bookingTime: raw.booking_time,
    pickupTime: raw.pickup_time,
    pickupLocation: raw.pickup_location,
    dropoffLocation: raw.dropoff_location,
    flightNumber: raw.flight_number,
    arrivalTime: raw.arrival_time,
    arrivalAirline: raw.arrival_airline ?? null,
    departureFlightNumber: raw.departure_flight_number,
    departureTime: raw.departure_time,
    departureAirline: raw.departure_airline ?? null,
    totalAmount: raw.total_amount,
    passengers: raw.passengers,
    serviceType: raw.service_type,
    tripType: raw.trip_type,
    route: raw.route,
    metadata: raw.metadata ?? null,
    notes: raw.notes,
    internalNotes: raw.internal_notes,
    customer: raw.customer
      ? {
          name: raw.customer.name,
          email: raw.customer.email,
          phone: raw.customer.phone,
          country: raw.customer.country ?? null,
          language: raw.customer.language ?? null,
        }
      : undefined,
    items: (raw.items || []).map((i: RawBookingItem) => ({
      id: i.id,
      type: i.type,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      totalPrice: i.total_price,
    })),
    payments: (raw.payments || []).map((p: RawPayment) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      orderId: p.order_id,
      completedAt: p.completed_at,
      createdAt: p.created_at,
    })),
    assignments: (raw.assignments || []).map((a: RawAssignment) => ({
      id: a.id,
      type: a.type,
      driver: a.driver ? mapDriverRaw(a.driver) : null,
      vehicle: a.vehicle ? mapVehicleRaw(a.vehicle) : null,
      notes: a.notes,
    })),
    emailLogs: [],
  };
}

// IMPORTANTE: usar parseDateOnlyAsLocalNoon, no `new Date(d)` directo — un
// string solo-fecha ("2026-06-23") se parsea como medianoche UTC y, en
// zonas detrás de UTC (México), toLocaleDateString lo muestra un día antes
// (22 en vez de 23). Ver admin-date.ts para el detalle del bug.
const fmt = (d: string) =>
  (parseDateOnlyAsLocalNoon(d) ?? new Date(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const STATUS_COLORS: Record<string, string> = {
  DRAFT:           'bg-slate-700/60 text-slate-200 border border-slate-600/40',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  PAID:            'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  CONFIRMED:       'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  CANCELLED:       'bg-red-500/15 text-red-300 border border-red-500/30',
  COMPLETED:       'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  OFFLINE_HOLD:    'bg-purple-500/15 text-purple-300 border border-purple-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT:           'Draft',
  PENDING_PAYMENT: 'Pending Payment',
  PAID:            'Paid',
  CONFIRMED:       'Confirmed',
  CANCELLED:       'Cancelled',
  COMPLETED:       'Completed',
  OFFLINE_HOLD:    'Hold',
};

// Estilo por tipo de servicio operativo — debe verse igual que en el PDF
// (booking_confirmation.html): azul para llegada, naranja para salida.
const LEG_STYLES: Record<string, { border: string; head: string }> = {
  arrival: { border: 'border-l-blue-400', head: 'bg-blue-500/10 border-b border-blue-500/20' },
  departure: { border: 'border-l-orange-400', head: 'bg-orange-500/10 border-b border-orange-500/20' },
  other: { border: 'border-l-slate-500', head: 'bg-white/5 border-b border-white/5' },
};

const SERVICE_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'arrival', label: 'Llegada' },
  { value: 'departure', label: 'Salida' },
] as const;

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING_PAYMENT', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'COMPLETED', label: 'Completado' },
] as const;

function today() { return localDateKey(); }
function addDays(dateStr: string, n: number) { return addLocalDays(dateStr, n); }

// âââ Main Component âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const AdminBookings = ({
  onDataChanged,
  initialSearchQ,
}: {
  onDataChanged?: () => void;
  initialSearchQ?: string;
}) => {
  const { getAuthHeaders } = useAdminAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  // Default 'month': una empresa de transfers opera SIEMPRE a futuro — al abrir
  // el panel hay que ver las operaciones próximas, no solo las de hoy. Con
  // 'today' las reservas futuras (lo normal) no aparecían y el dueño "no las
  // encontraba" (bug reportado por Marlon).
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState(today());
  const [customTo, setCustomTo] = useState(today());
  const [dateFilter, setDateFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  // Detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookingDetail, setBookingDetail] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Computed date range from period.
  // Week/Month son rodantes HACIA ADELANTE desde hoy (próximos 7 / 30 días),
  // no la semana/mes de calendario: lo que importa operativamente es ver los
  // servicios que vienen, no los que ya pasaron este mes. 'today' = solo hoy.
  const getDateRange = useCallback(() => {
    const base = today();
    if (period === 'today') return { dateFrom: base, dateTo: base };
    if (period === 'week') return { dateFrom: base, dateTo: addDays(base, 6) };
    if (period === 'month') return { dateFrom: base, dateTo: addDays(base, 30) };
    return { dateFrom: customFrom, dateTo: customTo };
  }, [period, customFrom, customTo]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({
        page_size: searchQ.trim() ? '1000' : '800',
      });
      if (searchQ.trim()) {
        qs.set('search', searchQ.trim());
      } else {
        const { dateFrom, dateTo } = getDateRange();
        // dateFilter es el date-picker con el que el admin busca un día
        // específico, independiente del period (Hoy/Semana/Mes/Custom). Si esa
        // fecha cae fuera del rango que el period habría pedido al servidor
        // (p.ej. el admin busca una reserva del futuro mientras period sigue en
        // "Hoy"), había que ampliar la ventana pedida al backend para incluirla
        // — si no, la reserva nunca llegaba al cliente y el filtro mostraba 0
        // resultados aunque la reserva sí existiera (bug reportado por Marlon:
        // "no las encuentro en sus fechas... el filtrador no funciona").
        const effectiveFrom = dateFilter && dateFilter < dateFrom ? dateFilter : dateFrom;
        const effectiveTo = dateFilter && dateFilter > dateTo ? dateFilter : dateTo;
        const sourceFrom = addDays(effectiveFrom, -120);
        qs.set('date_from', sourceFrom);
        qs.set('date_to', effectiveTo);
      }
      const res = await fetch(apiUrl(`/api/v1/admin/bookings?${qs}`), {
        credentials: 'include', headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok && json.items) {
        const mapped = json.items.map(mapBooking);
        setBookings(mapped);
        setTotal(json.total ?? mapped.length);
      } else {
        setLoadError(json.detail || 'No se pudieron cargar las reservaciones.');
        setBookings([]);
        setTotal(0);
      }
    } catch {
      setLoadError('No se pudieron cargar las reservaciones.');
      setBookings([]);
      setTotal(0);
    }
    finally { setLoading(false); }
  }, [getDateRange, getAuthHeaders, searchQ, dateFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBookings();
    }, searchQ.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchBookings, searchQ]);

  useEffect(() => {
    if (!initialSearchQ?.trim()) return;
    setSearchQ(initialSearchQ.trim());
  }, [initialSearchQ]);

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    setSelectedId(id);
    try {
      const res = await fetch(apiUrl(`/api/v1/bookings/${id}`), {
        credentials: 'include', headers: getAuthHeaders(),
      });
      const json = await res.json();
      setBookingDetail(res.ok ? mapBooking(json) : null);
    } catch { setBookingDetail(null); }
    finally { setDetailLoading(false); }
  };

  const exportCSV = () => {
    const { dateFrom, dateTo } = getDateRange();
    window.open(apiUrl(`/api/v1/admin/bookings/export?date_from=${dateFrom}&date_to=${dateTo}`), '_blank');
  };

  const refreshAdminData = async () => {
    await fetchBookings();
    onDataChanged?.();
  };

  // Search on Enter
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fetchBookings();
  };

  const operationRows: BookingOperationRow[] = bookings.flatMap((booking) => expandBookingOperations(booking));

  const { dateFrom: rangeFrom, dateTo: rangeTo } = getDateRange();
  const filteredBookings = operationRows
    .filter((event) => {
      const booking = event.booking;
      // El date-picker (un día exacto) tiene prioridad; si está vacío se acota
      // por el rango del period (Hoy/Semana/Mes/Custom) según la fecha de
      // SERVICIO de cada pierna — así una salida cae en su propio día (30) y la
      // llegada en el suyo (23), cada una visible cuando su fecha está en rango.
      const dateMatches = dateFilter
        ? event.serviceDate === dateFilter
        : event.serviceDate >= rangeFrom && event.serviceDate <= rangeTo;
      const type = event.operationType;
      const serviceMatches = !serviceFilter || type === serviceFilter;
      const statusMatches = !statusFilter || booking.status === statusFilter;
      const q = normalizeText(searchQ.trim());
      const searchMatches =
        !q ||
        normalizeText(booking.customer?.name).includes(q) ||
        normalizeText(booking.confirmationCode).includes(q) ||
        normalizeText(booking.customer?.email).includes(q) ||
        normalizeText(booking.customer?.phone).includes(q) ||
        normalizeText(booking.pickupLocation).includes(q) ||
        normalizeText(booking.dropoffLocation).includes(q) ||
        normalizeText(booking.flightNumber).includes(q) ||
        normalizeText(booking.departureFlightNumber).includes(q) ||
        normalizeText(booking.notes).includes(q) ||
        normalizeText(booking.internalNotes).includes(q) ||
        normalizeText(booking.id).includes(q);
      return dateMatches && serviceMatches && statusMatches && searchMatches;
    })
    .sort(compareOperationBookings);

  const printBookings = [...filteredBookings].sort(compareOperationBookings);
  const operationalSummary = {
    total: filteredBookings.length,
    arrivals: filteredBookings.filter((event) => event.operationType === 'arrival').length,
    departures: filteredBookings.filter((event) => event.operationType === 'departure').length,
    pending: filteredBookings.filter((event) => ['DRAFT', 'PENDING_PAYMENT', 'OFFLINE_HOLD'].includes(event.booking.status)).length,
  };

  if (selectedId) {
    return (
      <div>
        <button
          onClick={() => { setSelectedId(null); setBookingDetail(null); }}
          className="flex items-center gap-2 text-sm font-semibold text-gold hover:text-gold/80 transition-colors mb-6"
        >
          <ArrowLeft size={15} /> Back to bookings
        </button>
        {detailLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-12 flex flex-col items-center justify-center gap-3 text-white/55">
            <Loader2 size={22} className="animate-spin text-gold" />
            <p className="text-sm font-medium text-white/70">Loading booking...</p>
          </div>
        ) : bookingDetail ? (
          <BookingDetailView
            booking={bookingDetail}
            onRefresh={refreshAdminData}
            onRefetchDetail={() => fetchDetail(selectedId)}
            onClose={() => { setSelectedId(null); setBookingDetail(null); }}
          />
        ) : (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-10 text-center text-red-300 text-sm font-medium">
            Booking not found or could not be loaded.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          <AlertCircle size={16} className="shrink-0" />
          {loadError}
        </div>
      )}
      {/* ââ Toolbar ââ */}
      <div className="space-y-2.5">
        {/* Row 1: period + actions */}
        <div className="flex items-center gap-2">
          {/* Period: scrollable on mobile */}
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 bg-black/20 border border-white/[0.08] rounded-xl p-1 w-max min-w-full">
              {(['today', 'week', 'month', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs md:text-sm font-semibold whitespace-nowrap transition-colors ${
                    period === p ? 'bg-gold text-navy shadow-[0_0_12px_rgba(201,162,39,0.3)]' : 'text-white/65 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold/20 bg-gold/10 text-gold hover:bg-gold/20 text-xs font-bold shrink-0 transition-all"
            title="Refresh"
          >
            <RefreshCw size={13} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-white/65 hover:text-white hover:bg-white/10 text-xs font-bold shrink-0 transition-all"
            title="Export CSV"
          >
            <Download size={13} /><span className="hidden sm:inline">CSV</span>
          </button>
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date" value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm flex-1 min-w-[130px] focus:outline-none focus:border-gold/40"
            />
            <span className="text-white/50 text-sm font-bold">→</span>
            <input
              type="date" value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm flex-1 min-w-[130px] focus:outline-none focus:border-gold/40"
            />
            <button
              onClick={fetchBookings}
              className="px-3 py-1.5 rounded-xl bg-gold/15 border border-gold/25 text-gold hover:bg-gold/25 text-sm font-bold transition-all"
            >
              Apply
            </button>
          </div>
        )}

      </div>

      {/* ââ Table ââ */}
      <div className="grid gap-2 rounded-2xl border border-gold/10 bg-white/[0.04] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.3)] md:grid-cols-[160px_150px_170px_minmax(180px,1fr)_auto_auto]">
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.05] text-white px-3 py-2 text-sm focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <select
          value={serviceFilter}
          onChange={(event) => setServiceFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.05] text-white px-3 py-2 text-sm focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20"
        >
          {SERVICE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.05] text-white px-3 py-2 text-sm focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Cliente, email o codigo..."
            value={searchQ}
            onChange={(event) => setSearchQ(event.target.value)}
            onKeyDown={handleSearchKey}
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] text-white py-2 pl-8 pr-3 text-sm focus:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-white/25"
          />
        </div>
        <button
          type="button"
          onClick={() => setDateFilter(today())}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white/75 hover:border-gold/30 hover:text-white hover:bg-gold/[0.08] transition-all"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-bold text-gold hover:bg-gold/20 transition-all"
        >
          <Printer size={15} />
          Imprimir
        </button>
      </div>

      <style>{`
        @media screen {
          #print-area { display: none; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 28px;
            background: #fff;
            color: #111827;
            font-family: Georgia, "Times New Roman", serif;
          }
          #print-area table { width: 100%; border-collapse: collapse; font-size: 12px; }
          #print-area th, #print-area td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          #print-area th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div id="print-area">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <img src={cloudinaryAssets.logo} alt="Class VIP Transfers" style={{ height: 54, objectFit: 'contain' }} />
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Servicios del Dia</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{dateFilter || today()}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Hotel</th>
              <th>Pasajeros</th>
              <th>Vuelo</th>
              <th>Notas</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {printBookings.map((event) => (
              <tr key={event.key}>
                <td>{getOperationTime(event)}</td>
                <td>{getOperationBadge(event).label}</td>
                <td>{event.booking.customer?.name || '--'}</td>
                <td>{getOperationHotel(event)}</td>
                <td>{event.booking.passengers}</td>
                <td>{getOperationFlight(event)}</td>
                <td>{event.booking.notes || event.booking.internalNotes || '--'}</td>
                <td>{STATUS_LABELS[event.booking.status] || event.booking.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 20, fontSize: 12 }}>Class VIP Transfers · +52 624 122 2174</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gold/10 bg-white/4 p-14 flex flex-col items-center justify-center gap-3 text-white/55">
          <Loader2 size={22} className="animate-spin text-gold" />
          <p className="text-sm font-medium text-white/70">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-gold/10 bg-white/4 p-14 flex flex-col items-center justify-center gap-3 text-white/55">
          <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/8 flex items-center justify-center">
            <CalendarX size={22} className="text-white/35" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">No bookings found</p>
            <p className="text-xs text-white/55 mt-0.5">Try a different date range or search term</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Servicios</p>
              <p className="mt-2 font-display text-2xl font-bold text-white">{operationalSummary.total}</p>
            </div>
            <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-300">Llegadas</p>
              <p className="mt-2 font-display text-2xl font-bold text-blue-200">{operationalSummary.arrivals}</p>
            </div>
            <div className="rounded-xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-orange-300">Salidas</p>
              <p className="mt-2 font-display text-2xl font-bold text-orange-200">{operationalSummary.departures}</p>
            </div>
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-amber-300">Pendientes</p>
              <p className="mt-2 font-display text-2xl font-bold text-amber-200">{operationalSummary.pending}</p>
            </div>
          </div>
          <p className="text-xs text-white/55">
            {filteredBookings.length} servicio{filteredBookings.length !== 1 ? 's' : ''} operativo{filteredBookings.length !== 1 ? 's' : ''} encontrado{filteredBookings.length !== 1 ? 's' : ''} de {total}
          </p>
            {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {filteredBookings.map((event) => {
              const b = event.booking;
              const op = getOperationBadge(event);
              return (
              <button
                key={event.key}
                type="button"
                onClick={() => fetchDetail(b.id)}
                className="w-full text-left rounded-2xl border border-gold/10 bg-white/4 p-4 hover:border-gold/25 hover:bg-white/7 active:scale-[0.99] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span className="font-mono text-sm font-bold text-gold">
                    {b.confirmationCode || b.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${STATUS_COLORS[b.status] || 'bg-white/10 text-white/70'}`}>
                    {STATUS_LABELS[b.status] || b.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-white leading-tight">{b.customer?.name || '--'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${op.className}`}>{op.label}</span>
                </div>
                <p className="text-xs text-white/55 mt-0.5">{b.customer?.email}</p>
                <div className="mb-3 mt-1 flex items-center gap-1.5 text-xs font-medium text-white">
                  <span className="truncate text-white/90">{event.origin}</span>
                  <ArrowRight size={11} className="text-gold shrink-0" />
                  <span className="truncate text-white/90">{event.destination}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <span>{fmt(event.serviceDate)}</span>
                    {(b.arrivalTime || b.bookingTime || b.departureTime || b.pickupTime) && (
                      <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded">{getOperationTime(event)}</span>
                    )}
                    {(b.flightNumber || b.departureFlightNumber) && <span className="font-mono">{getOperationFlight(event)}</span>}
                  </div>
                  <span className="font-bold text-sm text-white">{fmtCents(b.totalAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                  <span>{b.passengers} pax</span>
                  <span className="truncate pl-3">{b.notes || b.internalNotes || 'Sin notas'}</span>
                </div>
              </button>
            );})}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-2xl border border-gold/10 bg-white/4 overflow-hidden overflow-x-auto shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="border-b border-white/5 bg-black/30">
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Confirmation</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Hora</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Vuelo</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Ruta</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Notas</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Total</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBookings.map((event) => {
                  const b = event.booking;
                  const op = getOperationBadge(event);
                  return (
                  <tr
                    key={event.key}
                    onClick={() => fetchDetail(b.id)}
                    className="hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-gold">
                      {b.confirmationCode || b.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/55 whitespace-nowrap">{fmt(event.serviceDate)}</td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-mono font-semibold text-white">{getOperationTime(event)}</p>
                      <p className="mt-0.5 text-white/55">{b.passengers} pax</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white leading-tight">{b.customer?.name || '--'}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${op.className}`}>{op.label}</span>
                      </div>
                      <p className="text-xs text-white/55 mt-0.5">{b.customer?.email || '--'}</p>
                      <p className="text-xs text-white/55">{b.customer?.phone || '--'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-mono font-semibold text-white">{getOperationFlight(event)}</p>
                      <p className="text-white/55 mt-0.5">{event.routeLabel}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span className="truncate max-w-[110px]">{event.origin}</span>
                        <ArrowRight size={11} className="text-gold shrink-0" />
                        <span className="truncate max-w-[110px]">{event.destination}</span>
                      </div>
                      {event.airline && <p className="mt-0.5 text-white/55">{event.airline}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/55">
                      <div className="max-w-[220px] truncate">{b.notes || b.internalNotes || 'Sin notas'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold leading-none ${STATUS_COLORS[b.status] || 'bg-white/10 text-white/70'}`}>
                        {STATUS_LABELS[b.status] || b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-sm text-white">{fmtCents(b.totalAmount)}</td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={15} className="text-white/25 group-hover:text-gold transition-colors" />
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// âââ Detail View ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function BookingDetailView({
  booking,
  onRefresh,
  onRefetchDetail,
  onClose,
}: {
  booking: Booking;
  onRefresh: () => void;
  onRefetchDetail: () => void;
  onClose: () => void;
}) {
  const { getAuthHeaders } = useAdminAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flash = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 3500);
  };

  const doPost = async (path: string, body?: object) => {
    const res = await fetch(apiUrl(path), {
      method: 'POST', credentials: 'include',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, data, error: data?.detail };
  };

  const doPatch = async (path: string, body: object) => {
    const res = await fetch(apiUrl(path), {
      method: 'PATCH', credentials: 'include',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data, error: data?.detail };
  };

  const doDelete = async (path: string) => {
    const res = await fetch(apiUrl(path), {
      method: 'DELETE', credentials: 'include',
      headers: { ...getAuthHeaders() },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, error: data?.detail };
  };

  const getPrintableHtml = () => {
    const operationRows = expandBookingOperations(booking).map((event) => {
      const badge = getOperationBadge(event);
      return `
        <tr>
          <td>${fmt(event.serviceDate)}</td>
          <td>${getOperationTime(event)}</td>
          <td>${badge.label}</td>
          <td>${event.routeLabel}</td>
          <td>${event.hotel}</td>
          <td>${event.flight}</td>
        </tr>
      `;
    }).join('');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Reservation ${booking.confirmationCode || booking.id.slice(0, 8).toUpperCase()}</title>
    <style>
      body { margin: 0; padding: 32px; background: #fff; color: #0f172a; font-family: Georgia, "Times New Roman", serif; }
      .sheet { position: relative; }
      .watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.05; pointer-events: none; }
      .header { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 24px; }
      .brand { display: flex; align-items: center; gap: 16px; }
      .eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #8a6a2f; }
      h1 { margin: 6px 0 0; font-size: 28px; }
      .card { position: relative; z-index: 1; border: 1px solid #d4d4d8; border-radius: 18px; padding: 18px 20px; margin-bottom: 18px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .label { display: block; margin-bottom: 4px; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
      .value { font-size: 14px; line-height: 1.45; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #d4d4d8; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; }
      .footer { margin-top: 18px; color: #64748b; font-size: 11px; text-align: center; }
      @page { margin: 12mm; }
    </style>
  </head>
  <body>
    <div class="watermark"><img src="${cloudinaryAssets.logo}" alt="" style="width:340px;object-fit:contain;" /></div>
    <div class="sheet">
      <div class="header">
        <div class="brand">
          <img src="${cloudinaryAssets.logo}" alt="Class VIP Transfers" style="height:58px;object-fit:contain;" />
          <div>
            <p class="eyebrow">Class VIP Transfers</p>
            <h1>Reservation Dossier</h1>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:13px;">Confirmation</p>
          <strong style="font-size:18px;">${booking.confirmationCode || booking.id.slice(0, 8).toUpperCase()}</strong>
        </div>
      </div>
      <div class="card">
        <div class="grid">
          <div><span class="label">Guest</span><div class="value">${booking.customer?.name || '-'}</div></div>
          <div><span class="label">Email</span><div class="value">${booking.customer?.email || '-'}</div></div>
          <div><span class="label">Phone</span><div class="value">${booking.customer?.phone || '-'}</div></div>
          <div><span class="label">Status</span><div class="value">${paymentState}</div></div>
          <div><span class="label">Service Date</span><div class="value">${fmt(booking.bookingDate)}</div></div>
          <div><span class="label">Passengers</span><div class="value">${booking.passengers}</div></div>
          <div><span class="label">Pickup</span><div class="value">${booking.pickupLocation || '-'}</div></div>
          <div><span class="label">Dropoff</span><div class="value">${booking.dropoffLocation || '-'}</div></div>
        </div>
      </div>
      <div class="card">
        <p class="eyebrow" style="margin-bottom:12px;">Operational Timeline</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Operation</th>
              <th>Route</th>
              <th>Hotel</th>
              <th>Flight</th>
            </tr>
          </thead>
          <tbody>${operationRows}</tbody>
        </table>
      </div>
      <div class="card">
        <span class="label">Customer Notes</span>
        <div class="value">${booking.notes || '-'}</div>
        <div style="height:12px;"></div>
        <span class="label">Internal Notes</span>
        <div class="value">${booking.internalNotes || '-'}</div>
      </div>
      <div class="footer">Class VIP Transfers · +52 624 122 2174</div>
    </div>
  </body>
</html>`;
  };

  const openPrintableReservationView = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(getPrintableHtml());
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // withPrices=true  → confirmación para el cliente (con precios).
  // withPrices=false → orden de servicio para subcontratar a otra empresa
  //                    (todos los datos del servicio, SIN ningún precio).
  const downloadPdf = async (withPrices: boolean = true) => {
    setBusy(withPrices ? 'pdf' : 'pdf-noprice');
    try {
      const path = withPrices
        ? `/api/v1/bookings/${booking.id}/pdf`
        : `/api/v1/bookings/${booking.id}/pdf?precios=false`;
      const res = await fetch(apiUrl(path), {
        credentials: 'include', headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('server-pdf-failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const code = (booking.confirmationCode || booking.id.slice(0, 8)).toUpperCase();
      a.download = withPrices
        ? `reservation-${code}.pdf`
        : `orden-servicio-${code}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      openPrintableReservationView();
      flash('Opened professional print view. Use "Save as PDF" in the print dialog.');
    }
    finally { setBusy(null); }
  };

  const resendEmails = async () => {
    setBusy('resend');
    try {
      const { ok, data, error } = await doPost(`/api/v1/admin/bookings/${booking.id}/resend-confirmation`);
      if (ok && data.sent) { flash('Confirmation emails re-sent'); onRefetchDetail(); }
      else flash(error || data?.error || 'Failed to resend', true);
    } finally { setBusy(null); }
  };

  const confirmBooking = async () => {
    if (!confirm('Mark this booking as CONFIRMED (paid offline)?')) return;
    setBusy('confirm');
    try {
      const { ok, error } = await doPost(`/api/v1/admin/bookings/${booking.id}/confirm`);
      if (ok) { flash('Booking confirmed'); onRefresh(); onRefetchDetail(); }
      else flash(error || 'Failed to confirm', true);
    } finally { setBusy(null); }
  };

  const cancelBooking = async () => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    setBusy('cancel');
    try {
      const { ok, error } = await doPost(`/api/v1/admin/bookings/${booking.id}/cancel`, { reason: reason || undefined });
      if (ok) { flash('Booking cancelled'); onRefresh(); onRefetchDetail(); }
      else flash(error || 'Failed to cancel', true);
    } finally { setBusy(null); }
  };

  const deleteBooking = async () => {
    // Borrado PERMANENTE e irreversible: doble confirmación con el código de la
    // reserva para evitar borrados accidentales. Distinto de Cancelar (que conserva
    // el registro). Tras borrar, se cierra el detalle (la reserva ya no existe;
    // refrescarla daría 404) y se refresca la lista.
    const code = booking.confirmationCode || booking.id.slice(0, 8).toUpperCase();
    if (!confirm(`¿BORRAR permanentemente la reserva ${code}?\n\nEsto NO se puede deshacer. Si solo quieres anularla, usa "Cancel".`)) return;
    setBusy('delete');
    try {
      const { ok, error } = await doDelete(`/api/v1/admin/bookings/${booking.id}`);
      if (ok) { flash('Reserva borrada'); onRefresh(); onClose(); }
      else flash(error || 'No se pudo borrar la reserva', true);
    } finally { setBusy(null); }
  };

  const markPaid = async () => {
    // Se pregunta el método de cobro para que el pago quede bien clasificado en
    // Finanzas. El monto registrado es el total de la reserva (caso normal).
    const choice = window.prompt(
      'Marcar como PAGADO — método de cobro:\n\n  1 = Efectivo\n  2 = Transferencia\n  3 = Tarjeta / Terminal\n\nEscribe 1, 2 o 3:',
      '1',
    );
    if (choice === null) return;
    const methodMap: Record<string, string> = { '1': 'cash', '2': 'bank_transfer', '3': 'card' };
    const method = methodMap[choice.trim()] || 'cash';
    setBusy('markpaid');
    try {
      const { ok, error } = await doPost(`/api/v1/admin/bookings/${booking.id}/mark-paid`, { method });
      if (ok) { flash('Reserva marcada como PAGADA'); onRefresh(); onRefetchDetail(); }
      else flash(error || 'No se pudo marcar como pagada', true);
    } finally { setBusy(null); }
  };

  const loadDriversVehicles = async () => {
    const [dRes, vRes] = await Promise.all([
      fetch(apiUrl('/api/v1/admin/drivers'), { credentials: 'include', headers: getAuthHeaders() }),
      fetch(apiUrl('/api/v1/admin/vehicles'), { credentials: 'include', headers: getAuthHeaders() }),
    ]);
    const dJson = await dRes.json();
    const vJson = await vRes.json();
    if (dRes.ok) setDrivers((dJson.items || []).map(mapDriverRaw).filter((d: Driver) => d.isActive));
    if (vRes.ok) setVehicles((vJson.items || []).map(mapVehicleRaw).filter((v: Vehicle) => v.isActive));
  };

  const openAssignForm = () => { loadDriversVehicles(); setShowAssignForm(true); };

  const currentDriver = booking.assignments?.find(a => a.type === 'DRIVER')?.driver;
  const currentVehicle = booking.assignments?.find(a => a.type === 'VEHICLE')?.vehicle;
  const lastPayment = booking.payments?.[0];
  const paymentState = lastPayment?.status === 'COMPLETED'
    ? 'Pagado'
    : booking.status === 'PENDING_PAYMENT'
      ? 'Pendiente de cobro'
      : booking.status === 'OFFLINE_HOLD'
        ? 'Por cobrar'
        : booking.status === 'CONFIRMED'
          ? 'Confirmada'
          : booking.status.replace(/_/g, ' ');
  const operationEvents = expandBookingOperations(booking);
  const serviceDescriptor = [booking.serviceType, booking.tripType?.replace('_', ' ')].filter(Boolean).join(' · ') || 'Service pending';

  return (
    <div className="space-y-4 max-w-4xl text-white">
      <style>{`
        @media screen {
          #booking-print-area { display: none; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #booking-print-area, #booking-print-area * { visibility: visible !important; }
          #booking-print-area {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            padding: 28px;
            background: #fff;
            color: #0f172a;
            font-family: Georgia, "Times New Roman", serif;
          }
          #booking-print-area .watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.05;
            pointer-events: none;
          }
          #booking-print-area table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          #booking-print-area th, #booking-print-area td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
            vertical-align: top;
          }
          #booking-print-area th {
            background: #f8fafc;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.08em;
          }
          @page { margin: 12mm; }
        }
      `}</style>

      <div id="booking-print-area">
        <div className="watermark">
          <img src={cloudinaryAssets.logo} alt="" style={{ width: 340, objectFit: 'contain' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={cloudinaryAssets.logo} alt="Class VIP Transfers" style={{ height: 58, objectFit: 'contain' }} />
              <div>
                <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a6a2f' }}>Class VIP Transfers</p>
                <h1 style={{ margin: '6px 0 0', fontSize: 26 }}>Reservation Dossier</h1>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 13 }}>Confirmation</p>
              <strong style={{ fontSize: 18 }}>{booking.confirmationCode || booking.id.slice(0, 8).toUpperCase()}</strong>
            </div>
          </div>

          <table>
            <tbody>
              <tr>
                <th>Cliente</th>
                <td>{booking.customer?.name || '-'}</td>
                <th>Email</th>
                <td>{booking.customer?.email || '-'}</td>
              </tr>
              <tr>
                <th>Telefono</th>
                <td>{booking.customer?.phone || '-'}</td>
                <th>Estado</th>
                <td>{paymentState}</td>
              </tr>
              <tr>
                <th>Fecha servicio</th>
                <td>{fmt(booking.bookingDate)}</td>
                <th>Hora</th>
                <td>{booking.bookingTime || booking.arrivalTime || booking.pickupTime || '-'}</td>
              </tr>
              <tr>
                <th>Pickup</th>
                <td>{booking.pickupLocation || '-'}</td>
                <th>Dropoff</th>
                <td>{booking.dropoffLocation || '-'}</td>
              </tr>
              <tr>
                <th>Vuelo llegada</th>
                <td>{booking.flightNumber || '-'}</td>
                <th>Vuelo salida</th>
                <td>{booking.departureFlightNumber || '-'}</td>
              </tr>
              <tr>
                <th>Pasajeros</th>
                <td>{booking.passengers}</td>
                <th>Total</th>
                <td>{fmtCents(booking.totalAmount)}</td>
              </tr>
              <tr>
                <th>Notas cliente</th>
                <td colSpan={3}>{booking.notes || '-'}</td>
              </tr>
              <tr>
                <th>Notas internas</th>
                <td colSpan={3}>{booking.internalNotes || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm font-medium">
          <XCircle size={15} className="shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-medium">
          <CheckCircle size={15} className="shrink-0" />{success}
        </div>
      )}

      {/* ââ Header ââ */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55 mb-1.5">Reservation</p>
            <h2 className="font-display text-2xl font-bold text-gold leading-none">
              {booking.confirmationCode || booking.id.slice(0, 8).toUpperCase()}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[booking.status] || ''}`}>
                {STATUS_LABELS[booking.status] || booking.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-white/40 capitalize">{booking.source}</span>
              <span className="text-xs text-white/40 capitalize">{booking.type.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!['CANCELLED', 'COMPLETED'].includes(booking.status) && (
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/80 text-sm font-medium transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {booking.status === 'PENDING_PAYMENT' && (
              <button
                onClick={confirmBooking}
                disabled={busy === 'confirm'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <CheckCircle size={13} /> {busy === 'confirm' ? 'Confirming...' : 'Confirm (offline)'}
              </button>
            )}
            {!['PAID', 'CANCELLED', 'COMPLETED'].includes(booking.status) && (
              <button
                onClick={markPaid}
                disabled={busy === 'markpaid'}
                title="Registrar cobro offline (efectivo/transferencia) y dejar la reserva como PAGADA"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold text-navy hover:opacity-90 disabled:opacity-50 text-sm font-semibold transition-colors"
              >
                <BadgeDollarSign size={13} /> {busy === 'markpaid' ? 'Guardando...' : 'Marcar pagado'}
              </button>
            )}
            {!['CANCELLED', 'COMPLETED'].includes(booking.status) && (
              <button
                onClick={cancelBooking}
                disabled={busy === 'cancel'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50 text-sm font-medium border border-red-500/25 transition-colors"
              >
                <XCircle size={13} /> {busy === 'cancel' ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
            <button
              onClick={openAssignForm}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/80 text-sm font-medium transition-colors"
            >
              <UserCheck size={13} /> Assign Driver
            </button>
            <button
              onClick={deleteBooking}
              disabled={busy === 'delete'}
              title="Borrar la reserva permanentemente (irreversible). Para anular sin borrar, usa Cancel."
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              <Trash2 size={13} /> {busy === 'delete' ? 'Borrando...' : 'Borrar'}
            </button>
            <button
              onClick={resendEmails}
              disabled={busy === 'resend'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/80 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Mail size={13} /> {busy === 'resend' ? 'Sending...' : 'Resend'}
            </button>
            <button
              onClick={() => downloadPdf(true)}
              disabled={busy === 'pdf'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--navy))] text-white hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-all"
            >
              <FileDown size={13} /> {busy === 'pdf' ? 'Generating...' : 'PDF / Print'}
            </button>
            <button
              onClick={() => downloadPdf(false)}
              disabled={busy === 'pdf-noprice'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/[0.06] text-white/80 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <FileDown size={13} /> {busy === 'pdf-noprice' ? 'Generating...' : 'PDF sin precio'}
            </button>
          </div>
        </div>
      </div>

      {/* ââ Edit Form ââ */}
      {showEditForm && (
        <EditBookingForm
          booking={booking}
          onSave={async ({ booking: bookingData, customer, paymentAction }) => {
            setBusy('save');
            try {
              const bookingPatch = {
                booking_date: bookingData.bookingDate,
                booking_time: bookingData.bookingTime,
                pickup_time: bookingData.pickupTime,
                passengers: bookingData.passengers,
                flight_number: bookingData.flightNumber,
                arrival_time: bookingData.arrivalTime,
                departure_flight_number: bookingData.departureFlightNumber,
                departure_time: bookingData.departureTime,
                departure_date: bookingData.departureDate,
                pickup_location: bookingData.pickupLocation,
                dropoff_location: bookingData.dropoffLocation,
                notes: bookingData.notes,
                internal_notes: bookingData.internalNotes,
              };
              const [bookingRes, customerRes] = await Promise.all([
                doPatch(`/api/v1/admin/bookings/${booking.id}`, bookingPatch),
                doPatch(`/api/v1/customers/${booking.customerId}`, customer),
              ]);
              if (bookingRes.ok && customerRes.ok) {
                if (paymentAction?.type === 'mark_paid') {
                  const { ok: pOk, error: pErr } = await doPost(`/api/v1/admin/bookings/${booking.id}/mark-paid`, { method: paymentAction.method });
                  if (!pOk) { flash(pErr || 'Guardado, pero no se pudo marcar como pagado', true); onRefresh(); onRefetchDetail(); return; }
                } else if (paymentAction?.type === 'add_to_account') {
                  const { ok: aOk, error: aErr } = await doPost(`/api/v1/admin/accounts/${paymentAction.accountId}/bookings`, { booking_id: booking.id });
                  if (!aOk) { flash(aErr || 'Guardado, pero no se pudo agregar a la cuenta', true); onRefresh(); onRefetchDetail(); return; }
                }
                setShowEditForm(false);
                flash(paymentAction?.type === 'mark_paid' ? 'Reserva guardada y marcada como PAGADA' : paymentAction?.type === 'add_to_account' ? 'Reserva guardada y agregada a la cuenta' : 'Booking updated');
                onRefresh();
                onRefetchDetail();
              }
              else {
                flash(bookingRes.error || customerRes.error || 'Failed to update', true);
              }
            } finally { setBusy(null); }
          }}
          onCancel={() => setShowEditForm(false)}
          saving={busy === 'save'}
        />
      )}

      {/* ââ Assign Driver Form ââ */}
      {showAssignForm && (
        <AssignDriverForm
          booking={booking}
          drivers={drivers}
          vehicles={vehicles}
          onSave={async (data) => {
            setBusy('assign');
            try {
              const assignPayload = {
                driver_id: data.driverId,
                vehicle_id: data.vehicleId,
                notes: data.internalNotes,
              };
              const calls = [doPost(`/api/v1/admin/bookings/${booking.id}/assign`, assignPayload)];
              if (data.pickupTime) {
                calls.push(doPatch(`/api/v1/admin/bookings/${booking.id}`, { pickup_time: data.pickupTime }));
              }
              const results = await Promise.all(calls);
              if (results.every((r) => r.ok)) {
                setShowAssignForm(false);
                flash('Driver/vehicle assigned');
                onRefresh();
                onRefetchDetail();
              } else {
                flash(results.find((r) => !r.ok)?.error || 'Failed to assign', true);
              }
            } finally { setBusy(null); }
          }}
          onCancel={() => setShowAssignForm(false)}
          saving={busy === 'assign'}
        />
      )}

      {/* ââ Main Info ââ */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 flex items-center gap-1.5">
            <Calendar size={10} className="shrink-0" /> Timeline de Servicio
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {operationEvents.map((event) => {
            const badge = getOperationBadge(event);
            const style = LEG_STYLES[event.operationType] || LEG_STYLES.other;
            const isDeparture = event.operationType === 'departure';
            return (
              <div key={event.key} className={`rounded-xl border border-white/[0.08] ${style.border} border-l-4 bg-white/[0.04] overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${style.head}`}>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs font-semibold text-white/55">{fmt(event.serviceDate)}</span>
                </div>
                <div className="bg-navy px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {isDeparture ? 'Pickup' : 'Hora de llegada'}
                  </p>
                  <p className="font-display text-2xl font-bold text-gold mt-0.5 leading-none">{event.serviceTime}</p>
                </div>
                <div className="px-4 py-3 flex items-center gap-2 text-sm font-semibold text-white border-b border-white/[0.08]">
                  <span className="truncate text-white/90">{event.origin}</span>
                  <ArrowRight size={14} className="text-gold shrink-0" />
                  <span className="truncate text-white/90">{event.destination}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-white/55">Vuelo</p>
                    <p className="font-mono font-semibold text-white mt-0.5">{event.flight !== '---' ? event.flight : '--'}</p>
                  </div>
                  <div>
                    <p className="text-white/55">Aerolinea</p>
                    <p className="font-semibold text-white mt-0.5">{event.airline || '--'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Ficha de reservación ═══ */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-sm">

        {/* ── Cliente ── */}
        <div className="px-6 py-5 border-b border-white/[0.08]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 mb-4 flex items-center gap-1.5">
            <User size={10} className="shrink-0" /> Datos del Cliente
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Nombre</p>
              <p className="text-sm font-bold text-white leading-snug">{booking.customer?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Email</p>
              <p className="text-sm text-white/80 break-all leading-snug">{booking.customer?.email || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Teléfono</p>
              <p className="text-sm text-white/80 leading-snug">{booking.customer?.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">País</p>
              <p className="text-sm text-white/80 leading-snug">{booking.customer?.country || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Servicio ── */}
        <div className="px-6 py-5 border-b border-white/[0.08]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 mb-4 flex items-center gap-1.5">
            <Car size={10} className="shrink-0" /> Datos del Servicio
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Fecha</p>
              <p className="text-sm font-bold text-white">{fmt(booking.bookingDate)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Pasajeros</p>
              <p className="text-sm font-bold text-white">{booking.passengers} <span className="text-white/50 font-normal text-xs">pax</span></p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Tipo de servicio</p>
              <p className="text-sm font-semibold text-white capitalize">{serviceDescriptor}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Origen</p>
              <p className="text-sm text-white/75 uppercase">{booking.source || '—'}</p>
            </div>
          </div>
        </div>

        {/* ── Pago ── */}
        <div className="px-6 py-5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 mb-4 flex items-center gap-1.5">
            <CreditCard size={10} className="shrink-0" /> Método de Pago
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Total a cobrar</p>
              <p className="text-2xl font-black text-gold leading-none">{fmtCents(booking.totalAmount)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Estado</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_COLORS[booking.status] || 'bg-white/10 text-white/60'}`}>
                {paymentState}
              </span>
            </div>
            {lastPayment && (
              <>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Proveedor</p>
                  <p className="text-sm font-medium text-white/80">{lastPayment.provider}</p>
                </div>
                {lastPayment.completedAt && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5">Completado</p>
                    <p className="text-sm text-white/70">{fmtDateTime(lastPayment.completedAt)}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Concepto del Servicio */}
      {booking.items && booking.items.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80">Concepto del Servicio</p>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {booking.items.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-white/45">Qty: {item.quantity}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide bg-white/[0.06] text-white/50 px-2 py-0.5 rounded-full">{item.type}</span>
                  </div>
                </div>
                <p className="text-base font-black text-gold shrink-0 tabular-nums">{fmtCents(item.totalPrice)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ââ Assignment ââ */}
      {(currentDriver || currentVehicle) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55 mb-3 flex items-center gap-1.5">
            <Car size={13} />Assignment
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {currentDriver && (
              <div className="p-3 rounded-lg bg-white/[0.06]/30 text-white">
                <p className="font-semibold">{currentDriver.name}</p>
                <p className="text-white/55">{currentDriver.phone}</p>
                {currentDriver.email && <p className="text-white/55">{currentDriver.email}</p>}
              </div>
            )}
            {currentVehicle && (
              <div className="p-3 rounded-lg bg-white/[0.06]/30 text-white">
                <p className="font-semibold">{currentVehicle.make} {currentVehicle.model} {currentVehicle.year || ''}</p>
                <p className="text-white/55">{currentVehicle.licensePlate} · {currentVehicle.capacity} pax</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notas */}
      {(booking.notes || booking.internalNotes) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gold/80 flex items-center gap-1.5">
              <MessageSquare size={10} className="shrink-0" /> Notas
            </p>
          </div>
          {booking.notes && (
            <div className={`px-6 py-4 ${booking.internalNotes ? 'border-b border-white/[0.06]' : ''}`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35 mb-2">Notas del cliente</p>
              <p className="text-sm text-white/85 leading-relaxed">{booking.notes}</p>
            </div>
          )}
          {booking.internalNotes && (
            <div className="px-6 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400/60 mb-2">Notas internas</p>
              <p className="text-sm text-amber-300/90 leading-relaxed">{booking.internalNotes}</p>
            </div>
          )}
        </div>
      )}


      {/* ââ Email Log ââ */}
      {booking.emailLogs && booking.emailLogs.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/55 mb-3 flex items-center gap-1.5">
            <Mail size={13} /> Email Log
          </p>
          <div className="space-y-2">
            {booking.emailLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/[0.06]/30 text-xs">
                <span className="font-medium text-white/90">{log.type.replace(/_/g, ' ')}</span>
                <span className="text-white/55">to {log.to}</span>
                <span className={`px-2 py-0.5 rounded font-medium ${log.status === 'SENT' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                  {log.status}
                </span>
                {log.sentAt && <span className="text-white/55">{fmtDateTime(log.sentAt)}</span>}
                {log.error && <span className="text-red-300 truncate max-w-[200px]" title={log.error}>{log.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// âââ Edit Form ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function EditBookingForm({
  booking, onSave, onCancel, saving,
}: {
  booking: Booking;
  onSave: (data: BookingEditorPayload) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    customerName: booking.customer?.name || '',
    customerEmail: booking.customer?.email || '',
    customerPhone: booking.customer?.phone || '',
    customerCountry: booking.customer?.country || '',
    bookingDate: booking.bookingDate.slice(0, 10),
    bookingTime: booking.bookingTime || '',
    pickupTime: booking.pickupTime || '',
    passengers: String(booking.passengers),
    flightNumber: booking.flightNumber || '',
    arrivalTime: booking.arrivalTime || '',
    departureFlightNumber: booking.departureFlightNumber || '',
    departureTime: booking.departureTime || '',
    departureDate: (() => {
      const raw = booking.metadata && typeof booking.metadata === 'object'
        ? (booking.metadata as Record<string, unknown>).departureDate
        : null;
      return typeof raw === 'string' ? raw.slice(0, 10) : '';
    })(),
    pickupLocation: booking.pickupLocation || '',
    dropoffLocation: booking.dropoffLocation || '',
    notes: booking.notes || '',
    internalNotes: booking.internalNotes || '',
  });

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const { getAuthHeaders } = useAdminAuth();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [paymentType, setPaymentType] = useState<'' | 'mark_paid' | 'add_to_account'>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [selectedAccount, setSelectedAccount] = useState('');

  useEffect(() => {
    fetch(apiUrl('/api/v1/admin/accounts'), { credentials: 'include', headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: RawAccountOption[]) => {
        if (Array.isArray(data)) setAccounts(data.map((a: RawAccountOption) => ({ id: a.id, name: a.name, balance: a.balance_cents ?? 0 })));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRoundTrip = booking.tripType === 'roundtrip';
  const isArrivalBooking = booking.route === 'airport-hotel' || isRoundTrip;
  const isDepartureBooking = booking.route === 'hotel-airport' || isRoundTrip;
  const autoPickupTime = getOperationalPickupTime(form.departureTime);
  const activePickupTime = form.pickupTime || autoPickupTime;
  const serviceDateLabel = form.bookingDate ? fmt(form.bookingDate) : '--';
  const bookingSummaryItems = [
    { label: 'Servicio', value: [booking.serviceType, booking.tripType].filter(Boolean).join(' | ') || 'Pendiente' },
    { label: 'Ruta', value: booking.route === 'airport-hotel' ? 'Airport -> Hotel' : booking.route === 'hotel-airport' ? 'Hotel -> Airport' : isRoundTrip ? 'Round trip' : 'Servicio' },
    { label: 'Fecha', value: serviceDateLabel },
    { label: 'Pickup operativo', value: activePickupTime || '--' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAction: BookingEditorPayload['paymentAction'] =
      paymentType === 'mark_paid' ? { type: 'mark_paid', method: paymentMethod } :
      paymentType === 'add_to_account' && selectedAccount ? { type: 'add_to_account', accountId: selectedAccount } :
      null;
    onSave({
      booking: {
        bookingDate: form.bookingDate,
        passengers: parseInt(form.passengers) || 1,
        bookingTime: emptyToNull(form.bookingTime),
        pickupTime: emptyToNull(form.pickupTime || autoPickupTime),
        flightNumber: emptyToNull(form.flightNumber),
        arrivalTime: emptyToNull(form.arrivalTime),
        departureFlightNumber: emptyToNull(form.departureFlightNumber),
        departureTime: emptyToNull(form.departureTime),
        departureDate: emptyToNull(form.departureDate),
        pickupLocation: emptyToNull(form.pickupLocation),
        dropoffLocation: emptyToNull(form.dropoffLocation),
        notes: emptyToNull(form.notes),
        internalNotes: emptyToNull(form.internalNotes),
      },
      customer: {
        name: form.customerName.trim(),
        email: form.customerEmail.trim(),
        phone: form.customerPhone.trim(),
        country: form.customerCountry.trim() || null,
      },
      paymentAction,
    });
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-white/[0.04] p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Edit2 size={15} className="text-gold" /> Edit Booking</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.06]/20 p-3 text-sm sm:grid-cols-4">
          {bookingSummaryItems.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">{item.label}</p>
              <p className="mt-1 font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 text-sm">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.06]/20 p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Customer profile</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={form.customerName} onChange={(v) => setField('customerName', v)} />
            <Field label="Email" type="email" value={form.customerEmail} onChange={(v) => setField('customerEmail', v)} />
            <Field label="Phone" value={form.customerPhone} onChange={(v) => setField('customerPhone', v)} />
            <Field label="Country" value={form.customerCountry} onChange={(v) => setField('customerCountry', v)} />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.06]/20 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Service details</p>
              <p className="mt-1 text-xs text-white/55">Fecha, pasajeros y horas operativas principales.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDepartureBooking && (
                <button
                  type="button"
                  onClick={() => setField('pickupTime', autoPickupTime)}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white hover:border-gold/40 hover:bg-gold/10"
                >
                  Pickup -3h
                </button>
              )}
              {isArrivalBooking && form.arrivalTime && !form.bookingTime && (
                <button
                  type="button"
                  onClick={() => setField('bookingTime', form.arrivalTime)}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white hover:border-gold/40 hover:bg-gold/10"
                >
                  Usar hora llegada
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date" type="date" value={form.bookingDate} onChange={(v) => setField('bookingDate', v)} />
            <Field label="Booking time" type="time" value={form.bookingTime} onChange={(v) => setField('bookingTime', v)} />
            <Field label="Pickup time" type="time" value={form.pickupTime} onChange={(v) => setField('pickupTime', v)} hint={isDepartureBooking && autoPickupTime ? `Sugerido: ${autoPickupTime}` : undefined} />
            <Field label="Passengers" type="number" value={form.passengers} onChange={(v) => setField('passengers', v)} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-300">Arrival leg</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Arrival flight" value={form.flightNumber} onChange={(v) => setField('flightNumber', v)} />
              <Field label="Arrival time" value={form.arrivalTime} onChange={(v) => setField('arrivalTime', v)} placeholder="HH:MM" />
              <Field label="Pickup location" value={form.pickupLocation} onChange={(v) => setField('pickupLocation', v)} />
              <Field label="Dropoff location" value={form.dropoffLocation} onChange={(v) => setField('dropoffLocation', v)} />
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-300">Departure leg</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Departure flight" value={form.departureFlightNumber} onChange={(v) => setField('departureFlightNumber', v)} />
              <Field label="Departure time" value={form.departureTime} onChange={(v) => setField('departureTime', v)} placeholder="HH:MM" />
              {isRoundTrip && (
                <Field
                  label="Departure date"
                  type="date"
                  value={form.departureDate}
                  onChange={(v) => setField('departureDate', v)}
                />
              )}
              <Field label="Pickup location" value={form.pickupLocation} onChange={(v) => setField('pickupLocation', v)} />
              <Field label="Dropoff location" value={form.dropoffLocation} onChange={(v) => setField('dropoffLocation', v)} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Customer notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-sm text-white resize-none"
          />
          </div>
          <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Internal notes (admin only)</label>
          <textarea
            value={form.internalNotes}
            onChange={(e) => setField('internalNotes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-sm text-white resize-none"
          />
          </div>
        </div>


        {/* Cobro / Cuenta Abierta */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.06]/20 p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Cobro / Cuenta</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {([
              { value: '' as const, label: 'Sin cambios' },
              { value: 'mark_paid' as const, label: 'Marcar como Pagado' },
              { value: 'add_to_account' as const, label: 'Agregar a Cuenta Abierta' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentType(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  paymentType === value
                    ? 'bg-gold/20 border-gold/50 text-gold'
                    : 'border-white/10 text-white/55 hover:border-white/25 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {paymentType === 'mark_paid' && (
            <div>
              <p className="text-xs text-white/55 mb-2">Método de cobro</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'cash' as const, label: 'Efectivo' },
                  { value: 'bank_transfer' as const, label: 'Transferencia' },
                  { value: 'card' as const, label: 'Tarjeta / Terminal' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      paymentMethod === value
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'border-white/10 text-white/55 hover:border-white/25'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {paymentType === 'add_to_account' && (
            <div>
              <p className="text-xs text-white/55 mb-2">Seleccionar cuenta abierta</p>
              {accounts.length === 0 ? (
                <p className="text-xs text-white/40">No hay cuentas abiertas disponibles</p>
              ) : (
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-sm text-white"
                >
                  <option value="">— Seleccionar cuenta —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.balance !== 0 ? ` · Saldo: $${(Math.abs(a.balance) / 100).toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.06]/20 p-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-navy font-medium disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/[0.06] text-white/75">
            <X size={14} /> Cancel
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// âââ Assign Driver Form âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function AssignDriverForm({
  booking, drivers, vehicles, onSave, onCancel, saving,
}: {
  booking: Booking;
  drivers: Driver[];
  vehicles: Vehicle[];
  onSave: (data: AssignmentUpdateInput) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const currentDriver = booking.assignments?.find(a => a.type === 'DRIVER')?.driver;
  const currentVehicle = booking.assignments?.find(a => a.type === 'VEHICLE')?.vehicle;

  const [driverId, setDriverId] = useState(currentDriver?.id || '');
  const [vehicleId, setVehicleId] = useState(currentVehicle?.id || '');
  const [pickupTime, setPickupTime] = useState(booking.pickupTime || '');
  const [internalNotes, setInternalNotes] = useState('');

  return (
    <div className="rounded-2xl border border-gold/30 bg-white/[0.04] p-5 shadow-sm">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><UserCheck size={15} className="text-gold" /> Assign Driver / Vehicle</h3>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Driver</label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05]"
          >
            <option value="">— Unassigned —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.phone}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Vehicle</label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05]"
          >
            <option value="">— Unassigned —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} · {v.licensePlate} ({v.capacity} pax)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Pickup time</label>
          <input
            type="time" value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/55 mb-1">Notes</label>
          <input
            type="text" value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Optional notes"
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05]"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2 pt-1">
          <button
            onClick={() => onSave({
              driverId: driverId || null,
              vehicleId: vehicleId || null,
              pickupTime: pickupTime || undefined,
              internalNotes: internalNotes || undefined,
            })}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-navy font-medium disabled:opacity-50"
          >
            <UserCheck size={14} /> {saving ? 'Saving...' : 'Assign'}
          </button>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/[0.06] text-white/75">
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// âââ Small helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function Field({
  label, value, onChange, type = 'text', placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-white/55">{label}</label>
        {hint && <span className="text-[11px] font-medium text-gold">{hint}</span>}
      </div>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-sm"
      />
    </div>
  );
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

function getOperationalPickupTime(departureTime: string | null | undefined) {
  if (!departureTime || !/^\d{1,2}:\d{2}$/.test(departureTime)) return '';
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes - 180;
  const normalized = totalMinutes < 0 ? totalMinutes + 1440 : totalMinutes;
  const pickupHours = Math.floor(normalized / 60) % 24;
  const pickupMinutes = normalized % 60;
  return `${String(pickupHours).padStart(2, '0')}:${String(pickupMinutes).padStart(2, '0')}`;
}

