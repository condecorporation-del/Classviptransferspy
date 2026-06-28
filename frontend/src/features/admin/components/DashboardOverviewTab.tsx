import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CalendarCheck, CheckCircle2, Clock3, Download, Loader2, TrendingUp } from 'lucide-react';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import {
  compareOperationBookings,
  expandBookingOperations,
  type AdminOperationEvent,
} from '@/features/admin/lib/booking-operations';
import { addLocalDays, isDateWithinRange, localDateKey, monthStartKey, sameLocalDay } from '@/features/admin/lib/admin-date';
import { getApiBaseUrl } from '@/shared/lib/api';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

type Booking = {
  id: string;
  confirmationCode?: string | null;
  status: string;
  bookingDate: string;
  bookingTime?: string | null;
  pickupTime?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  flightNumber?: string | null;
  departureFlightNumber?: string | null;
  totalAmount: number;
  passengers: number;
  route?: string | null;
  tripType?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

// Fila cruda (snake_case) de una reserva tal como la devuelve el backend FastAPI.
type RawBooking = {
  id: string;
  confirmation_code?: string | null;
  status: string;
  booking_date: string;
  booking_time?: string | null;
  pickup_time?: string | null;
  arrival_time?: string | null;
  departure_time?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  flight_number?: string | null;
  departure_flight_number?: string | null;
  total_amount: number;
  passengers: number;
  route?: string | null;
  trip_type?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: { name?: string | null; email?: string | null; phone?: string | null };
};

type Tarea = {
  id: string;
  titulo: string;
  fecha: string;
  status: 'pendiente' | 'completada' | 'cancelada';
};

const statusTone: Record<string, string> = {
  DRAFT: 'bg-slate-700/50 text-slate-300 border border-slate-600/40',
  PENDING: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  PAID: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  COMPLETED: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  CANCELLED: 'bg-red-500/15 text-red-300 border border-red-500/30',
  OFFLINE_HOLD: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
};

const operationalStatuses = ['CONFIRMED', 'PAID', 'PENDING', 'PENDING_PAYMENT', 'DRAFT', 'OFFLINE_HOLD'];

function formatDay(date: string) {
  const normalized = new Date(`${date}T12:00:00`);
  const weekday = normalized.toLocaleDateString('es-MX', { weekday: 'long' });
  const dayMonth = normalized.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayMonth}`;
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DashboardOverviewTab({ refreshToken = 0 }: { refreshToken?: number }) {
  const { getAuthHeaders } = useAdminAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [expanded, setExpanded] = useState<'today' | 'tomorrow' | null>('today');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const today = localDateKey();
  const tomorrow = addLocalDays(today, 1);
  const [printDate, setPrintDate] = useState(today);

  const triggerOperationalPrint = (targetDate: string) => {
    setPrintDate(targetDate);
    window.setTimeout(() => window.print(), 80);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const dateFrom = addLocalDays(today, -120);
        const dateTo = addLocalDays(today, 120);
        const response = await fetch(
          apiUrl(`/api/v1/admin/bookings?date_from=${dateFrom}&date_to=${dateTo}&page_size=100`),
          {
            credentials: 'include',
            headers: getAuthHeaders(),
          }
        );
        const json = await response.json();
        if (!cancelled) {
          if (response.ok && Array.isArray(json.items)) {
            setBookings(
              (json.items as RawBooking[]).map((b: RawBooking) => ({
                id: b.id,
                confirmationCode: b.confirmation_code,
                status: b.status,
                bookingDate: b.booking_date,
                bookingTime: b.booking_time,
                pickupTime: b.pickup_time,
                arrivalTime: b.arrival_time,
                departureTime: b.departure_time,
                pickupLocation: b.pickup_location,
                dropoffLocation: b.dropoff_location,
                flightNumber: b.flight_number,
                departureFlightNumber: b.departure_flight_number,
                totalAmount: b.total_amount,
                passengers: b.passengers,
                route: b.route,
                tripType: b.trip_type,
                notes: b.notes,
                metadata: b.metadata,
                customer: b.customer
                  ? { name: b.customer.name, email: b.customer.email, phone: b.customer.phone }
                  : undefined,
              }))
            );
          } else {
            setBookings([]);
            setLoadError('No se pudo actualizar el dashboard operativo.');
          }
        }
      } catch {
        if (!cancelled) {
          setBookings([]);
          setLoadError('No se pudo actualizar el dashboard operativo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const storedTasks = localStorage.getItem('classvip-admin-tareas');
    if (storedTasks) {
      try {
        const parsed = JSON.parse(storedTasks);
        setTasks(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTasks([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders, refreshToken, today]);

  const operationEvents = useMemo(
    () => bookings.flatMap((booking) => expandBookingOperations(booking)),
    [bookings],
  );

  const todayBookings = useMemo(
    () =>
      operationEvents
        .filter((event) => sameLocalDay(event.serviceDate, today) && operationalStatuses.includes(event.booking.status))
        .sort(compareOperationBookings),
    [operationEvents, today],
  );

  const tomorrowBookings = useMemo(
    () =>
      operationEvents
        .filter((event) => sameLocalDay(event.serviceDate, tomorrow) && operationalStatuses.includes(event.booking.status))
        .sort(compareOperationBookings),
    [operationEvents, tomorrow],
  );

  const monthBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const serviceDate = booking.bookingDate.slice(0, 10);
        return booking.status !== 'CANCELLED' && isDateWithinRange(serviceDate, monthStartKey(), today);
      }),
    [bookings, today],
  );

  const revenueMonth = useMemo(
    () =>
      monthBookings.reduce((sum, booking) => {
        const completedPayments = (booking as Booking & {
          payments?: Array<{ amount?: number; completedAt?: string | null; createdAt?: string }>;
        }).payments || [];

        return sum + completedPayments.reduce((paymentSum, payment) => {
          const paymentDate = (payment.completedAt || payment.createdAt || '').slice(0, 10);
          if (!paymentDate || !isDateWithinRange(paymentDate, monthStartKey(), today)) {
            return paymentSum;
          }
          return paymentSum + (payment.amount || 0);
        }, 0);
      }, 0),
    [monthBookings, today],
  );

  const pendingTasks = tasks.filter((task) => task.status === 'pendiente' && task.fecha <= today);
  const pendingBookings = bookings.filter((booking) => ['PENDING', 'PENDING_PAYMENT', 'DRAFT'].includes(booking.status));
  const printableBookings = (printDate === tomorrow ? tomorrowBookings : todayBookings).sort(compareOperationBookings);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          <AlertCircle size={16} className="shrink-0" />
          {loadError}
        </div>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80">Operaciones</p>
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">Dashboard del Dia</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => triggerOperationalPrint(today)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${printDate === today ? 'bg-gold text-navy shadow-[0_0_16px_rgba(201,162,39,0.4)]' : 'border border-white/10 text-white/50 hover:border-gold/30 hover:text-white/80 hover:bg-gold/8'}`}
          >
            Imprimir hoy
          </button>
          <button
            type="button"
            onClick={() => triggerOperationalPrint(tomorrow)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${printDate === tomorrow ? 'bg-gold text-navy shadow-[0_0_16px_rgba(201,162,39,0.4)]' : 'border border-white/10 text-white/50 hover:border-gold/30 hover:text-white/80 hover:bg-gold/8'}`}
          >
            Imprimir manana
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-4 py-2 text-sm font-bold text-gold hover:bg-gold/15 hover:border-gold/35 transition-all duration-200"
          >
            <Download size={15} />
            PDF operacional
          </button>
        </div>
      </div>

      <style>{`
        @media screen {
          #operations-print-area { display: none; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #operations-print-area, #operations-print-area * { visibility: visible !important; }
          #operations-print-area {
            display: block !important;
            position: absolute;
            inset: 0 auto auto 0;
            width: 100%;
            min-height: 100vh;
            padding: 28px 32px;
            background: #ffffff;
            color: #0f172a;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
          #operations-print-area .watermark {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            opacity: 0.04;
          }
          #operations-print-area .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-bottom: 16px;
            border-bottom: 3px solid #c9973a;
            margin-bottom: 20px;
          }
          #operations-print-area .print-meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 20px;
            font-size: 11px;
          }
          #operations-print-area .print-meta-cell {
            padding: 8px 14px;
            border-right: 1px solid #e2e8f0;
            background: #f8fafc;
          }
          #operations-print-area .print-meta-cell:last-child { border-right: none; }
          #operations-print-area .print-meta-cell strong { display: block; font-size: 14px; margin-top: 2px; }
          #operations-print-area table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          #operations-print-area thead tr {
            background: #1e293b;
            color: #ffffff;
          }
          #operations-print-area th {
            padding: 9px 10px;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            text-align: left;
            border: none;
          }
          #operations-print-area tbody tr {
            border-bottom: 1px solid #e9ecef;
          }
          #operations-print-area tbody tr:nth-child(even) { background: #f8fafc; }
          #operations-print-area td {
            padding: 9px 10px;
            vertical-align: top;
            border: none;
          }
          #operations-print-area .badge-arr {
            display: inline-block;
            background: #1d4ed8;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.12em;
            padding: 3px 7px;
            border-radius: 4px;
          }
          #operations-print-area .badge-dep {
            display: inline-block;
            background: #ea580c;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.12em;
            padding: 3px 7px;
            border-radius: 4px;
          }
          #operations-print-area .badge-svc {
            display: inline-block;
            background: #64748b;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.12em;
            padding: 3px 7px;
            border-radius: 4px;
          }
          #operations-print-area .time-cell {
            font-family: 'Courier New', monospace;
            font-weight: 700;
            font-size: 13px;
            white-space: nowrap;
          }
          #operations-print-area .client-name { font-weight: 700; }
          #operations-print-area .flight-cell { font-weight: 600; white-space: nowrap; }
          #operations-print-area .notes-cell { color: #475569; font-style: italic; }
          #operations-print-area .print-footer {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
          @page { margin: 10mm 12mm; }
        }
      `}</style>

      <div id="operations-print-area">
        <div className="watermark">
          <img src={cloudinaryAssets.logo} alt="" style={{ width: 380, objectFit: 'contain' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="print-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <img src={cloudinaryAssets.logo} alt="Class VIP Transfers" style={{ height: 58, objectFit: 'contain' }} />
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9973a', fontWeight: 700 }}>
                  Class VIP Transfers — Los Cabos
                </p>
                <h1 style={{ margin: '4px 0 2px', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Hoja Operacional</h1>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Reporte de servicios del día</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha de operación</p>
              <strong style={{ fontSize: 20, display: 'block', marginTop: 4, color: '#0f172a' }}>{formatDay(printDate)}</strong>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
                {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs — impreso hoy
              </p>
            </div>
          </div>

          <div className="print-meta">
            <div className="print-meta-cell">
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700 }}>Total servicios</span>
              <strong>{printableBookings.length}</strong>
            </div>
            <div className="print-meta-cell">
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1d4ed8', fontWeight: 700 }}>&#9650; Llegadas (ARR)</span>
              <strong>{printableBookings.filter(e => e.operationType === 'arrival').length}</strong>
            </div>
            <div className="print-meta-cell">
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ea580c', fontWeight: 700 }}>&#9660; Salidas (DEP)</span>
              <strong>{printableBookings.filter(e => e.operationType === 'departure').length}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: 52 }}>Tipo</th>
                <th style={{ width: 58 }}>Hora</th>
                <th>Cliente</th>
                <th>Hotel / Ruta</th>
                <th style={{ width: 80 }}>Vuelo</th>
                <th style={{ width: 36 }}>Pax</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {printableBookings.map((event) => {
                const typeAbbr = event.operationType === 'arrival' ? 'ARR' : event.operationType === 'departure' ? 'DEP' : 'SVC';
                const badgeClass = event.operationType === 'arrival' ? 'badge-arr' : event.operationType === 'departure' ? 'badge-dep' : 'badge-svc';
                return (
                  <tr key={event.key}>
                    <td><span className={badgeClass}>{typeAbbr}</span></td>
                    <td className="time-cell">{event.serviceTime}</td>
                    <td>
                      <span className="client-name">{event.booking.customer?.name || 'Cliente'}</span>
                    </td>
                    <td>{event.hotel}</td>
                    <td className="flight-cell">{event.flight !== '---' ? `✈ ${event.flight}` : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{event.booking.passengers}</td>
                    <td className="notes-cell">{event.booking.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="print-footer">
            <span>Servicios ordenados: primero ARR (llegadas) luego DEP (salidas), por horario.</span>
            <span>Class VIP Transfers · +52 624 122 2174 · classviptransfers.com</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <OperationsCard
          title="Servicios de Hoy"
          dateLabel={formatDay(today)}
          bookings={todayBookings}
          expanded={expanded === 'today'}
          onToggle={() => setExpanded(expanded === 'today' ? null : 'today')}
        />
        <OperationsCard
          title="Servicios de Manana"
          dateLabel={formatDay(tomorrow)}
          bookings={tomorrowBookings}
          expanded={expanded === 'tomorrow'}
          onToggle={() => setExpanded(expanded === 'tomorrow' ? null : 'tomorrow')}
        />

        <div className="rounded-2xl border border-gold/10 bg-white/[0.04] backdrop-blur-sm p-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-gold/20 transition-colors duration-300">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">KPIs del Mes</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">Resumen mensual</h2>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20">
              <TrendingUp className="text-gold" size={18} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Bookings" value={monthBookings.length} />
            <Metric label="Revenue" value={money(revenueMonth)} />
            <Metric label="Promedio" value={money(monthBookings.length ? revenueMonth / monthBookings.length : 0)} />
          </div>
        </div>

        <div className="rounded-2xl border border-gold/10 bg-white/[0.04] backdrop-blur-sm p-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-gold/20 transition-colors duration-300">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Alertas / Pendientes</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">Atencion requerida</h2>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="text-amber-400" size={18} />
            </div>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Metric label="Bookings pendientes" value={pendingBookings.length} />
            <Metric label="Tareas vencen hoy" value={pendingTasks.length} />
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                <Clock3 size={14} className="text-amber-400 shrink-0" />
                <span className="truncate text-sm font-semibold text-amber-200">{task.titulo}</span>
                <span className="ml-auto text-xs text-amber-400/70 shrink-0">{task.fecha}</span>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <CheckCircle2 size={15} className="text-emerald-400" />
                Sin tareas vencidas o de hoy.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationsCard({
  title,
  dateLabel,
  bookings,
  expanded,
  onToggle,
}: {
  title: string;
  dateLabel: string;
  bookings: AdminOperationEvent<Booking>[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const arrivals = bookings.filter((event) => event.operationType === 'arrival').length;
  const departures = bookings.filter((event) => event.operationType === 'departure').length;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-2xl border border-gold/10 bg-white/[0.04] backdrop-blur-sm p-6 text-left shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:border-gold/25 hover:bg-white/[0.06] text-white transition-all duration-300 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">{title}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">{dateLabel}</h2>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 group-hover:bg-gold/15 transition-colors">
          <CalendarCheck className="text-gold" size={18} />
        </div>
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="font-display text-5xl font-bold leading-none text-white">{bookings.length}</span>
        <div className="pb-1 flex items-center gap-2">
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{arrivals} ARR</span>
          <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">{departures} DEP</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-3 border-t border-white/5 pt-4">
              {bookings.map((event) => {
                const isArr = event.operationType === 'arrival';
                const isDep = event.operationType === 'departure';
                const typeAbbr = isArr ? 'ARR' : isDep ? 'DEP' : 'SVC';
                const borderColor = isArr
                  ? 'border-l-blue-500'
                  : isDep
                    ? 'border-l-orange-500'
                    : 'border-l-slate-400';
                const abbrevBg = isArr
                  ? 'bg-blue-600 text-white'
                  : isDep
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-500 text-white';
                return (
                  <div
                    key={event.key}
                    className={`rounded-xl border border-white/5 bg-black/20 shadow-sm border-l-4 ${borderColor} overflow-hidden`}
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-black/20 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black tracking-widest ${abbrevBg}`}>
                          {typeAbbr}
                        </span>
                        <span className="font-mono text-sm font-bold text-white/90 tabular-nums">
                          {event.serviceTime}
                        </span>
                        <span className="text-[10px] text-white/55 font-medium">
                          {isArr ? 'Airport → Hotel' : isDep ? 'Hotel → Airport' : 'Servicio'}
                        </span>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusTone[event.booking.status] || 'bg-slate-700/50 text-slate-300'}`}>
                        {event.booking.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white/90 truncate">
                            {event.booking.customer?.name || 'Cliente'}
                          </p>
                          <p className="mt-0.5 text-xs text-white/65 truncate">
                            {event.hotel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {event.flight !== '---' ? (
                            <p className="text-xs font-bold text-gold/80">✈ {event.flight}</p>
                          ) : (
                            <p className="text-xs text-white/20">Sin vuelo</p>
                          )}
                          <p className="mt-0.5 text-[10px] text-white/55">
                            {event.booking.passengers} pax
                          </p>
                        </div>
                      </div>
                      {event.booking.notes && (
                        <p className="mt-2 pt-2 border-t border-white/5 text-[11px] text-white/35 truncate">
                          📝 {event.booking.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {bookings.length === 0 && (
                <p className="text-sm text-white/40 py-2">No hay servicios programados.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

