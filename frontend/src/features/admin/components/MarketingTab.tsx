import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart2,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Star,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { socialReputationCards } from '@/features/admin/lib/social-reputation';
import { getApiBaseUrl } from '@/shared/lib/api';

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

const GOLD = '#D9AE5F';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const BLUE = '#60a5fa';

type Booking = {
  id: string;
  status: string;
  totalAmount: number;
  bookingDate: string;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
};

// Fila cruda (snake_case) de una reserva tal como la devuelve el backend FastAPI.
type RawBooking = {
  id: string;
  status: string;
  total_amount: number;
  booking_date: string;
  pickup_location?: string | null;
  dropoff_location?: string | null;
};

type DashboardData = {
  totalToday: number;
  totalMonth: number;
  revenueToday: number;
  revenueMonth: number;
};

type TooltipPayload = {
  value: number;
  name?: string;
  color?: string;
  payload?: { label?: string };
};

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function truncate(str: string, max: number) {
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

function extractZone(location: string | null | undefined) {
  if (!location) return 'Desconocido';
  const zones = [
    'Cabo San Lucas',
    'San Jose del Cabo',
    'Los Cabos',
    'La Paz',
    'Todos Santos',
    'Airport',
    'Hotel Zone',
    'Marina',
    'Palmilla',
    'Corridor',
    'Corredor',
  ];

  for (const zone of zones) {
    if (location.toLowerCase().includes(zone.toLowerCase())) return zone;
  }

  return location.split(',')[0]?.trim() || 'Desconocido';
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }

    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(animate);
    };

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function TooltipCount({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 text-sm shadow-2xl"
      style={{
        background: 'rgba(6,15,30,0.95)',
        border: '1px solid rgba(212,175,55,0.3)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="mb-0.5 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </p>
      <p className="text-sm font-black" style={{ color: GOLD }}>
        {payload[0].value} reservacion{payload[0].value !== 1 ? 'es' : ''}
      </p>
    </div>
  );
}

function TooltipStatus({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 text-sm shadow-2xl"
      style={{
        background: 'rgba(6,15,30,0.95)',
        border: '1px solid rgba(212,175,55,0.3)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="mb-1.5 text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </p>
      {payload.map((item) => (
        <p key={item.name} className="mb-0.5 text-xs font-bold" style={{ color: item.color || GOLD }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

export function MarketingTab() {
  const { getAuthHeaders } = useAdminAuth();
  const marketingQuery = useQuery({
    queryKey: ['admin', 'marketing'],
    queryFn: async () => {
      const dashboardRes = await fetch(apiUrl('/api/v1/admin/dashboard'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const bookingsRes = await fetch(apiUrl('/api/v1/admin/bookings?page_size=100'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      const dashboardJson = await dashboardRes.json();
      const bookingsJson = await bookingsRes.json();

      if (!dashboardRes.ok) {
        throw new Error(dashboardJson?.detail || 'No se pudo cargar el dashboard de marketing.');
      }
      if (!bookingsRes.ok) {
        throw new Error(bookingsJson?.detail || 'No se pudieron cargar las reservaciones de marketing.');
      }

      return {
        dashboard: {
          totalToday: dashboardJson.total_today,
          totalMonth: dashboardJson.total_month,
          revenueToday: dashboardJson.revenue_today,
          revenueMonth: dashboardJson.revenue_month,
        } as DashboardData,
        bookings: ((bookingsJson.items || []) as RawBooking[]).map((b: RawBooking) => ({
          id: b.id,
          status: b.status,
          totalAmount: b.total_amount,
          bookingDate: b.booking_date,
          pickupLocation: b.pickup_location,
          dropoffLocation: b.dropoff_location,
        })) as Booking[],
      };
    },
    staleTime: 60 * 1000,
  });

  const dashboard = marketingQuery.data?.dashboard ?? null;
  const bookings = useMemo(() => marketingQuery.data?.bookings ?? [], [marketingQuery.data?.bookings]);
  const loading = marketingQuery.isLoading;
  const error = marketingQuery.isError ? 'No se pudo cargar la informacion de marketing.' : null;

  const relevantBookings = useMemo(
    () => bookings.filter((booking) => ['CONFIRMED', 'PENDING_PAYMENT', 'OFFLINE_HOLD'].includes(booking.status)),
    [bookings],
  );

  const conversionRate = useMemo(() => {
    if (!relevantBookings.length) return 0;
    const confirmed = relevantBookings.filter((booking) => booking.status === 'CONFIRMED').length;
    return Math.round((confirmed / relevantBookings.length) * 100);
  }, [relevantBookings]);

  const avgBookingValue = useMemo(() => {
    const totalMonth = dashboard?.totalMonth ?? 0;
    if (!totalMonth) return 0;
    return Math.round((dashboard?.revenueMonth ?? 0) / totalMonth);
  }, [dashboard]);

  const bookingsByDay = useMemo(() => {
    const cutoff = dateNDaysAgo(29);
    const byDay: Record<string, number> = {};

    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }

    bookings.forEach((booking) => {
      const day = booking.bookingDate.slice(0, 10);
      if (day >= cutoff && day in byDay) byDay[day] += 1;
    });

    return Object.entries(byDay).map(([date, count]) => ({
      date,
      count,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
    }));
  }, [bookings]);

  const zoneData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((booking) => {
      const zone = extractZone(booking.dropoffLocation || booking.pickupLocation);
      counts[zone] = (counts[zone] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([zone, count]) => ({ zone: truncate(zone, 18), count }));
  }, [bookings]);

  const statusGroupedData = useMemo(() => {
    return Array.from({ length: 3 }, (_, offset) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (2 - offset));

      const inMonth = bookings.filter((booking) => {
        const bookingDate = new Date(booking.bookingDate);
        return bookingDate.getFullYear() === d.getFullYear() && bookingDate.getMonth() === d.getMonth();
      });

      return {
        month: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        Confirmadas: inMonth.filter((booking) => booking.status === 'CONFIRMED').length,
        Pendientes: inMonth.filter((booking) => ['PENDING_PAYMENT', 'OFFLINE_HOLD'].includes(booking.status)).length,
      };
    });
  }, [bookings]);

  const topDayOfWeek = useMemo(() => {
    const counts = Array(7).fill(0);
    bookings.forEach((booking) => {
      counts[new Date(booking.bookingDate).getDay()] += 1;
    });
    const maxIndex = counts.indexOf(Math.max(...counts));
    return counts[maxIndex] === 0 ? 'N/A' : dayNames[maxIndex];
  }, [bookings]);

  const topZone = useMemo(() => zoneData[0]?.zone ?? 'N/A', [zoneData]);

  const kpis = [
    {
      label: 'Reservaciones del Mes',
      value: useCountUp(dashboard?.totalMonth ?? 0),
      icon: CalendarDays,
      accent: 'rgba(212,175,55,0.06)',
      border: 'rgba(212,175,55,0.2)',
      color: GOLD,
      suffix: '',
      prefix: '',
    },
    {
      label: 'Reservaciones Hoy',
      value: useCountUp(dashboard?.totalToday ?? 0),
      icon: TrendingUp,
      accent: 'rgba(59,130,246,0.06)',
      border: 'rgba(59,130,246,0.2)',
      color: BLUE,
      suffix: '',
      prefix: '',
    },
    {
      label: 'Tasa de Conversion',
      value: useCountUp(conversionRate),
      icon: BarChart2,
      accent: 'rgba(16,185,129,0.06)',
      border: 'rgba(16,185,129,0.2)',
      color: GREEN,
      suffix: '%',
      prefix: '',
    },
    {
      label: 'Valor Promedio',
      value: useCountUp(Math.round(avgBookingValue / 100)),
      icon: Star,
      accent: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.2)',
      color: AMBER,
      suffix: '',
      prefix: '$',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-36">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full" style={{ border: '2px solid rgba(217,174,95,0.25)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        </div>
        <p className="text-sm font-medium text-white/55">Cargando datos de marketing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{error}</p>
          <button
            onClick={() => void marketingQuery.refetch()}
            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-400 transition-colors hover:text-red-200"
          >
            <RefreshCw size={11} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl px-6 py-5 md:px-8 md:py-6"
        style={{
          background: 'linear-gradient(135deg, #060f1e 0%, #0c1829 60%, #050d1a 100%)',
          border: '1px solid rgba(212,175,55,0.18)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22), inset 0 1px 0 rgba(212,175,55,0.06)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-16 right-0 h-72 w-72"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 65%)' }}
        />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: 'rgba(212,175,55,0.45)' }}>
              Class VIP · Marketing
            </p>
            <p className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-black leading-none text-white">
              Analisis de Demanda
            </p>
            <p className="mt-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Ultimas 200 reservaciones · {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => void marketingQuery.refetch()}
            className="self-start rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 sm:self-auto"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: GOLD }}
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw size={10} />
              Actualizar
            </span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.07 }}
            className="rounded-2xl p-5"
            style={{ background: kpi.accent, border: `1px solid ${kpi.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] leading-tight text-white/55">
                {kpi.label}
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${kpi.color}15` }}>
                <kpi.icon size={14} style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="font-display text-3xl font-black leading-none text-white">
              {kpi.prefix}
              {kpi.value.toLocaleString('en-US')}
              {kpi.suffix}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
        className="rounded-2xl bg-white p-5 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              Volumen Diario
            </p>
            <p className="text-sm font-bold text-white">Reservaciones por dia - Ultimos 30 dias</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bookingsByDay} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
            <Tooltip content={<TooltipCount />} cursor={{ fill: 'rgba(217,174,95,0.06)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {bookingsByDay.map((entry) => (
                <Cell key={entry.date} fill={GOLD} fillOpacity={entry.count > 0 ? 1 : 0.25} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.24 }}
          className="rounded-2xl bg-white p-5 shadow-sm"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="mb-5">
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              Geografico
            </p>
            <p className="text-sm font-bold text-white">Reservaciones por zona</p>
          </div>
          {zoneData.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-white/55">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={zoneData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="zone" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.45)', fontWeight: 600 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<TooltipCount />} cursor={{ fill: 'rgba(217,174,95,0.06)' }} />
                <Bar dataKey="count" fill={GOLD} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-2xl bg-white p-5 shadow-sm"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="mb-5">
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              Calidad
            </p>
            <p className="text-sm font-bold text-white">Confirmadas vs pendientes - 3 meses</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusGroupedData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.45)', fontWeight: 700 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
              <Tooltip content={<TooltipStatus />} cursor={{ fill: 'rgba(217,174,95,0.06)' }} />
              <Bar dataKey="Confirmadas" fill={GREEN} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pendientes" fill={AMBER} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-5">
            {[
              { color: GREEN, label: 'Confirmadas' },
              { color: AMBER, label: 'Pendientes' },
            ].map((legend) => (
              <div key={legend.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: legend.color }} />
                <span className="text-xs font-medium text-white/55">{legend.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.34 }}
        className="rounded-2xl bg-white p-5 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              Reputacion Social
            </p>
            <p className="text-sm font-bold text-white">Tripadvisor, Google, Facebook e Instagram</p>
          </div>
          <button
            type="button"
            onClick={() => void marketingQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:border-gold/40 hover:bg-gold/10"
          >
            <RefreshCw size={11} />
            Actualizar
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {socialReputationCards.map((card) => (
            <a
              key={card.id}
              href={card.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">{card.platform}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{card.handle}</p>
                </div>
                <ExternalLink size={14} className="text-white/55 transition-colors group-hover:text-gold" />
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">{card.metricLabel}</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {card.rating ? `${card.rating.toFixed(1)} ★` : 'Pendiente'}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {card.reviews ? `${card.reviews} reseñas visibles` : card.note}
                </p>
              </div>

              <div className="mt-4 h-1.5 rounded-full" style={{ background: `${card.accent}22` }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: card.rating ? `${Math.min(card.rating / 5, 1) * 100}%` : '24%',
                    background: card.accent,
                  }}
                />
              </div>
            </a>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Dia de mayor demanda', value: topDayOfWeek, icon: CalendarDays, color: GOLD },
          { label: 'Zona mas reservada', value: topZone, icon: MapPin, color: BLUE },
          {
            label: 'Ingreso del mes',
            value: dashboard ? `$${Math.round(dashboard.revenueMonth / 100).toLocaleString('en-US')}` : '$0',
            icon: TrendingUp,
            color: GREEN,
          },
        ].map((insight, index) => (
          <motion.div
            key={insight.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 + index * 0.07 }}
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #060f1e 0%, #0c1829 100%)',
              border: `1px solid ${insight.color}25`,
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full"
              style={{ background: `radial-gradient(circle, ${insight.color}12 0%, transparent 70%)` }}
            />
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${insight.color}12`, border: `1px solid ${insight.color}25` }}
              >
                <insight.icon size={18} style={{ color: insight.color }} />
              </div>
              <div className="min-w-0">
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: `${insight.color}60` }}>
                  {insight.label}
                </p>
                <p className="truncate text-sm font-bold text-white">{insight.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
