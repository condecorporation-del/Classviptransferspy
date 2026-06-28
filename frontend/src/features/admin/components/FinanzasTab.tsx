import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpRight, CreditCard, Loader2, Printer, RefreshCw, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AccountsTab } from '@/features/admin/components/AccountsTab';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { localDateKey } from '@/features/admin/lib/admin-date';
import { getApiBaseUrl } from '@/shared/lib/api';

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

type FinanceTab = 'summary' | 'receivables' | 'accounts';

type Booking = {
  id: string;
  confirmationCode?: string | null;
  status: string;
  totalAmount: number;
  bookingDate: string;
  serviceType?: string | null;
  route?: string | null;
  tripType?: string | null;
  customer?: { name?: string | null; email?: string | null };
  payments?: Array<{
    id: string;
    provider: string;
    status: string;
    amount: number;
    completedAt?: string | null;
    createdAt?: string;
  }>;
};

type PaymentRollup = {
  completedCents: number;
  outstandingCents: number;
  completedPayments: Array<NonNullable<Booking['payments']>[number]>;
};

type AccountCharge = {
  id: string;
  description: string;
  amountCents: number;
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'VOID';
  serviceDate?: string | null;
  booking?: { confirmationCode?: string | null } | null;
};

type AccountSummary = {
  id: string;
  name: string;
  charges?: AccountCharge[];
};

const tabs: Array<{ id: FinanceTab; label: string }> = [
  { id: 'summary', label: 'Resumen Financiero' },
  { id: 'receivables', label: 'Cuentas por Cobrar' },
  { id: 'accounts', label: 'Cuentas Abiertas' },
];

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysOverdue(date: string) {
  const today = new Date();
  const bookingDate = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Math.max(0, Math.floor((today.getTime() - bookingDate.getTime()) / 86_400_000));
}

function urgencyClass(days: number) {
  if (days > 14) return 'bg-red-500/15 text-red-300 border border-red-500/30';
  if (days >= 7) return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
}

function serviceLabel(booking: Booking) {
  if (booking.route === 'airport-hotel') return 'Llegada';
  if (booking.route === 'hotel-airport') return 'Salida';
  return booking.serviceType || 'Servicio';
}

function rollupBookingPayments(booking: Booking): PaymentRollup {
  const completedPayments = (booking.payments || []).filter((payment) => payment.status === 'COMPLETED');
  const completedCents = completedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const outstandingCents = Math.max(0, booking.totalAmount - completedCents);
  return { completedCents, outstandingCents, completedPayments };
}

function receivableStatus(booking: Booking, outstandingCents: number, completedCents: number) {
  if (outstandingCents <= 0 && completedCents > 0) return 'PAID';
  if (completedCents > 0) return 'PARTIAL';
  if (booking.status === 'OFFLINE_HOLD') return 'OFFLINE_HOLD';
  if (booking.status === 'CONFIRMED') return 'CONFIRMED';
  return booking.status;
}

function receivableStatusLabel(status: string) {
  if (status === 'INVOICED') return 'Facturado';
  if (status === 'PAID') return 'Pagado';
  if (status === 'PARTIAL') return 'Parcial';
  return 'Por pagar';
}

function receivableStatusTone(status: string) {
  if (status === 'PAID') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (status === 'INVOICED') return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
  if (status === 'PARTIAL') return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
  return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
}

function dateNDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

function sameMonth(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function sameDay(dateString: string) {
  return dateString.slice(0, 10) === localDateKey();
}

// El backend FastAPI responde en snake_case y sin envelope {success,data}.
// Estos mappers traducen esa forma real a los tipos camelCase que ya usa
// el resto de este componente.
// Filas crudas (snake_case) que devuelve el backend FastAPI.
type RawPayment = { id: string; provider: string; status: string; amount: number; completed_at?: string | null; created_at?: string };
type RawBooking = {
  id: string;
  confirmation_code?: string | null;
  status: string;
  total_amount: number;
  booking_date: string;
  service_type?: string | null;
  route?: string | null;
  trip_type?: string | null;
  customer?: { name?: string | null; email?: string | null };
  payments?: RawPayment[];
};
type RawAccountCharge = {
  id: string;
  description: string;
  amount_cents: number;
  status: string;
  service_date?: string | null;
  booking?: { confirmation_code?: string | null } | null;
};
type RawAccountSummary = { id: string; name: string; charges?: RawAccountCharge[] };

function mapBooking(raw: RawBooking): Booking {
  return {
    id: raw.id,
    confirmationCode: raw.confirmation_code,
    status: raw.status,
    totalAmount: raw.total_amount,
    bookingDate: raw.booking_date,
    serviceType: raw.service_type,
    route: raw.route,
    tripType: raw.trip_type,
    customer: raw.customer ? { name: raw.customer.name, email: raw.customer.email } : undefined,
    payments: (raw.payments || []).map((p: RawPayment) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      completedAt: p.completed_at,
      createdAt: p.created_at,
    })),
  };
}

function mapAccountChargesSummary(raw: RawAccountSummary): AccountSummary {
  return {
    id: raw.id,
    name: raw.name,
    charges: (raw.charges || []).map((c: RawAccountCharge) => ({
      id: c.id,
      description: c.description,
      amountCents: c.amount_cents,
      status: c.status as AccountCharge['status'],
      serviceDate: c.service_date,
      booking: c.booking ? { confirmationCode: c.booking.confirmation_code } : null,
    })),
  };
}

export function FinanzasTab({ refreshToken = 0 }: { refreshToken?: number }) {
  const { getAuthHeaders } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<FinanceTab>('summary');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [accountReceivables, setAccountReceivables] = useState<Array<{
    id: string;
    source: 'account';
    accountId: string;
    accountName: string;
    description: string;
    status: string;
    amountCents: number;
    date: string;
    reference?: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (targetTab: FinanceTab = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      const bookingsResponse = await fetch(
        apiUrl(`/api/v1/admin/bookings?page_size=200&date_from=${dateNDaysAgo(90)}`),
        {
          credentials: 'include',
          headers: getAuthHeaders(),
        }
      );

      const bookingsJson = await bookingsResponse.json();

      if (!bookingsResponse.ok) {
        throw new Error(bookingsJson?.detail || 'No se pudieron cargar las reservaciones financieras.');
      }

      setBookings((bookingsJson.items || []).map(mapBooking));

      if (targetTab === 'summary') {
        setAccountReceivables([]);
        return;
      }

      const accountsResponse = await fetch(apiUrl('/api/v1/admin/accounts'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      const accountsJson = await accountsResponse.json();

      if (!accountsResponse.ok) {
        throw new Error(accountsJson?.detail || 'No se pudieron cargar las cuentas abiertas.');
      }

      const charges = (accountsJson as RawAccountSummary[])
        .map(mapAccountChargesSummary)
        .flatMap((account) =>
          (account.charges || [])
            .filter((charge) => charge.status === 'PENDING' || charge.status === 'INVOICED')
            .map((charge) => ({
              id: charge.id,
              source: 'account' as const,
              accountId: account.id,
              accountName: account.name,
              description: charge.description,
              status: charge.status,
              amountCents: charge.amountCents,
              date: (charge.serviceDate || new Date().toISOString()).slice(0, 10),
              reference: charge.booking?.confirmationCode || null,
            }))
        );
      setAccountReceivables(charges);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la informacion financiera.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  useEffect(() => {
    if (activeTab === 'receivables' || activeTab === 'accounts') {
      void fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const bookingReceivables = useMemo(
    () =>
      bookings
        .map((booking) => {
          const { completedCents, outstandingCents } = rollupBookingPayments(booking);
          return {
            booking,
            completedCents,
            outstandingCents,
            state: receivableStatus(booking, outstandingCents, completedCents),
          };
        })
        .filter(({ booking, outstandingCents }) =>
          booking.totalAmount > 0 &&
          booking.status !== 'CANCELLED' &&
          outstandingCents > 0
        )
        .sort((a, b) => a.booking.bookingDate.localeCompare(b.booking.bookingDate)),
    [bookings],
  );

  const collectedReservations = useMemo(
    () =>
      bookings
        .flatMap((booking) => {
          const { completedPayments } = rollupBookingPayments(booking);
          return completedPayments.map((payment) => ({
            id: payment.id,
            bookingId: booking.id,
            confirmationCode: booking.confirmationCode || null,
            customer: booking.customer?.name || 'Cliente',
            amountCents: payment.amount || 0,
            provider: payment.provider,
            completedAt: payment.completedAt || payment.createdAt || booking.bookingDate,
            service: serviceLabel(booking),
          }));
        })
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [bookings],
  );

  const receivables = useMemo(
    () => [
      ...bookingReceivables.map(({ booking, outstandingCents, state, completedCents }) => ({
        id: booking.id,
        source: 'booking' as const,
        customer: booking.customer?.name || 'Cliente',
        service: serviceLabel(booking),
        amountCents: outstandingCents,
        originalAmountCents: booking.totalAmount,
        collectedAmountCents: completedCents,
        date: booking.bookingDate.slice(0, 10),
        status: state,
        reference: booking.confirmationCode || null,
      })),
      ...accountReceivables.map((charge) => ({
        id: charge.id,
        source: 'account' as const,
        customer: charge.accountName,
        service: charge.description,
        amountCents: charge.amountCents,
        originalAmountCents: charge.amountCents,
        collectedAmountCents: 0,
        date: charge.date,
        status: charge.status,
        reference: charge.reference,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date)),
    [accountReceivables, bookingReceivables],
  );

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      days[date.toISOString().slice(0, 10)] = 0;
    }

    collectedReservations.forEach((payment) => {
      const day = payment.completedAt.slice(0, 10);
      if (day in days) {
        days[day] += payment.amountCents;
      }
    });

    return Object.entries(days).map(([date, cents]) => ({
      date: new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      revenue: Math.round(cents / 100),
    }));
  }, [collectedReservations]);

  const receivableTotal = receivables.reduce((sum, item) => sum + item.amountCents, 0);
  const collectedThisMonth = collectedReservations.filter((payment) => sameMonth(payment.completedAt));
  const collectedToday = collectedReservations.filter((payment) => sameDay(payment.completedAt));
  const collectedMonthTotal = collectedThisMonth.reduce((sum, payment) => sum + payment.amountCents, 0);
  const collectedTodayTotal = collectedToday.reduce((sum, payment) => sum + payment.amountCents, 0);
  const displayedRevenueMonth = collectedMonthTotal;
  const displayedRevenueToday = collectedTodayTotal;
  const averageTicket = collectedThisMonth.length
    ? collectedMonthTotal / collectedThisMonth.length
    : 0;

  const printSummary = () => {
    const now = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const dateRange = `Últimos 90 días — ${new Date(Date.now() - 90 * 86_400_000).toLocaleDateString('es-MX')} al ${new Date().toLocaleDateString('es-MX')}`;

    // Desglose por tipo de servicio
    const byService: Record<string, { count: number; cents: number }> = {};
    collectedReservations.forEach((p) => {
      const key = p.service || 'Otro';
      if (!byService[key]) byService[key] = { count: 0, cents: 0 };
      byService[key].count += 1;
      byService[key].cents += p.amountCents;
    });

    // Desglose por método de pago
    const byProvider: Record<string, { count: number; cents: number }> = {};
    collectedReservations.forEach((p) => {
      const key = p.provider || 'Desconocido';
      if (!byProvider[key]) byProvider[key] = { count: 0, cents: 0 };
      byProvider[key].count += 1;
      byProvider[key].cents += p.amountCents;
    });

    const totalCollected = collectedReservations.reduce((s, p) => s + p.amountCents, 0);

    const serviceRows = Object.entries(byService)
      .sort((a, b) => b[1].cents - a[1].cents)
      .map(([svc, data]) => {
        const pct = totalCollected > 0 ? ((data.cents / totalCollected) * 100).toFixed(1) : '0.0';
        return `<tr><td>${svc}</td><td style="text-align:center">${data.count}</td><td style="text-align:right">${usd(data.cents)}</td><td style="text-align:right">${pct}%</td></tr>`;
      })
      .join('');

    const providerRows = Object.entries(byProvider)
      .sort((a, b) => b[1].cents - a[1].cents)
      .map(([prov, data]) => {
        const pct = totalCollected > 0 ? ((data.cents / totalCollected) * 100).toFixed(1) : '0.0';
        return `<tr><td>${prov}</td><td style="text-align:center">${data.count}</td><td style="text-align:right">${usd(data.cents)}</td><td style="text-align:right">${pct}%</td></tr>`;
      })
      .join('');

    const collectedRows = collectedReservations
      .map(
        (p) =>
          `<tr>
            <td>${new Date(p.completedAt).toLocaleDateString('es-MX')}</td>
            <td>${p.customer}</td>
            <td>${p.confirmationCode ?? '—'}</td>
            <td>${p.service}</td>
            <td>${p.provider}</td>
            <td style="text-align:right;font-weight:700;color:#166534">${usd(p.amountCents)}</td>
          </tr>`,
      )
      .join('');

    const receivableRows = receivables
      .map((item) => {
        const days = daysOverdue(item.date);
        const statusLabel = receivableStatusLabel(item.status);
        const urgencyColor = days > 14 ? '#b91c1c' : days >= 7 ? '#b45309' : '#065f46';
        return `<tr>
          <td>${item.date}</td>
          <td>${item.customer}</td>
          <td>${item.reference ?? '—'}</td>
          <td>${item.service}</td>
          <td style="text-align:center;color:${urgencyColor};font-weight:700">${days}d</td>
          <td style="text-align:center">${statusLabel}</td>
          <td style="text-align:right;font-weight:700;color:#b45309">${usd(item.amountCents)}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Reporte Financiero - Class VIP Transfers</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:system-ui,-apple-system,sans-serif;padding:32px;color:#111;font-size:13px;line-height:1.5}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111}
        .header h1{font-size:22px;font-weight:900;letter-spacing:-.02em}
        .header .meta{text-align:right;font-size:11px;color:#555}
        .section{margin-bottom:28px}
        .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#555;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:14px;background:#fafafa}
        .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777}
        .kpi-value{font-size:22px;font-weight:900;margin-top:6px;color:#111}
        .kpi-sub{font-size:11px;color:#777;margin-top:2px}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#555;border-bottom:2px solid #e5e7eb;padding:7px 6px;background:#f9fafb}
        td{padding:7px 6px;border-bottom:1px solid #f3f4f6;vertical-align:top}
        tr:last-child td{border-bottom:none}
        .total-row td{font-weight:900;border-top:2px solid #111;background:#f9fafb;font-size:13px}
        .empty{color:#777;font-size:12px;padding:12px 0}
        .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#aaa;text-align:center}
        @media print{
          body{padding:16px;font-size:11px}
          .kpi-value{font-size:18px}
          .section{margin-bottom:20px}
          @page{margin:1.5cm}
        }
      </style></head><body>

      <div class="header">
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#777;margin-bottom:4px">Class VIP Transfers</div>
          <h1>Reporte Financiero</h1>
          <div style="font-size:12px;color:#555;margin-top:4px">${dateRange}</div>
        </div>
        <div class="meta">
          <div style="font-weight:700">Generado</div>
          <div>${now}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Indicadores clave</div>
        <div class="kpi-grid">
          <div class="kpi">
            <div class="kpi-label">Cobrado este mes</div>
            <div class="kpi-value">${usd(displayedRevenueMonth)}</div>
            <div class="kpi-sub">${collectedThisMonth.length} pagos aplicados</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Cobrado hoy</div>
            <div class="kpi-value">${usd(displayedRevenueToday)}</div>
            <div class="kpi-sub">${collectedToday.length} ingresos registrados</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Por cobrar</div>
            <div class="kpi-value" style="color:#b45309">${usd(receivableTotal)}</div>
            <div class="kpi-sub">${receivables.length} cuentas pendientes</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Ticket promedio</div>
            <div class="kpi-value">${usd(averageTicket)}</div>
            <div class="kpi-sub">por reservacion cobrada</div>
          </div>
        </div>
      </div>

      <div class="two-col section">
        <div>
          <div class="section-title">Ingresos por tipo de servicio</div>
          ${serviceRows ? `<table>
            <thead><tr><th>Servicio</th><th style="text-align:center">Trips</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
            <tbody>
              ${serviceRows}
              <tr class="total-row"><td>TOTAL</td><td style="text-align:center">${collectedReservations.length}</td><td style="text-align:right">${usd(totalCollected)}</td><td style="text-align:right">100%</td></tr>
            </tbody>
          </table>` : '<p class="empty">Sin ingresos registrados.</p>'}
        </div>
        <div>
          <div class="section-title">Ingresos por método de pago</div>
          ${providerRows ? `<table>
            <thead><tr><th>Método</th><th style="text-align:center">Pagos</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
            <tbody>
              ${providerRows}
              <tr class="total-row"><td>TOTAL</td><td style="text-align:center">${collectedReservations.length}</td><td style="text-align:right">${usd(totalCollected)}</td><td style="text-align:right">100%</td></tr>
            </tbody>
          </table>` : '<p class="empty">Sin ingresos registrados.</p>'}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Detalle de ingresos cobrados (${collectedReservations.length})</div>
        ${collectedRows ? `<table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Referencia</th><th>Servicio</th><th>Método</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>
            ${collectedRows}
            <tr class="total-row"><td colspan="5">TOTAL COBRADO</td><td style="text-align:right;color:#166534">${usd(totalCollected)}</td></tr>
          </tbody>
        </table>` : '<p class="empty">Sin ingresos cobrados en el período.</p>'}
      </div>

      <div class="section">
        <div class="section-title">Cuentas por cobrar pendientes (${receivables.length})</div>
        ${receivableRows ? `<table>
          <thead><tr><th>Fecha</th><th>Cliente</th><th>Referencia</th><th>Servicio</th><th style="text-align:center">Dias</th><th style="text-align:center">Estado</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody>
            ${receivableRows}
            <tr class="total-row"><td colspan="6">TOTAL POR COBRAR</td><td style="text-align:right;color:#b45309">${usd(receivableTotal)}</td></tr>
          </tbody>
        </table>` : '<p class="empty">No hay cuentas por cobrar pendientes.</p>'}
      </div>

      <div class="footer">Class VIP Transfers &nbsp;·&nbsp; Los Cabos, B.C.S. &nbsp;·&nbsp; Reporte generado el ${now}</div>

      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-28 text-white/55">
        <Loader2 className="animate-spin text-gold" size={24} />
        <p className="text-sm font-semibold">Cargando finanzas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => void fetchData()} className="mt-3 inline-flex items-center gap-2 text-sm font-bold">
          <RefreshCw size={14} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Finanzas</p>
          <h2 className="font-serif text-2xl font-bold text-white">Control financiero</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-white/[0.06]/40 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab.id ? 'bg-gold text-navy' : 'text-white/55 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'summary' && (
            <button
              type="button"
              onClick={printSummary}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:border-gold/40 hover:bg-gold/10"
            >
              <Printer size={14} />
              Imprimir
            </button>
          )}
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:border-gold/40 hover:bg-gold/10"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Cobrado Mes', usd(displayedRevenueMonth), `${collectedThisMonth.length} pagos aplicados`],
              ['Cobrado Hoy', usd(displayedRevenueToday), `${collectedToday.length} ingresos registrados`],
              ['Por Cobrar', usd(receivableTotal), `${receivables.length} cuentas`],
              ['Ticket Promedio', usd(averageTicket), 'por reservacion cobrada'],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">{label}</p>
                <p className="mt-3 text-2xl font-black text-white">{value}</p>
                <p className="mt-1 text-xs text-white/55">{sub}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Tendencia</p>
                <h3 className="text-lg font-bold text-white">Revenue ultimos 30 dias</h3>
              </div>
              <ArrowUpRight className="text-gold" size={18} />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="financeGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D9AE5F" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#D9AE5F" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    contentStyle={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 12 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}
                    cursor={{ stroke: 'rgba(217,174,95,0.3)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#D9AE5F" strokeWidth={2} fill="url(#financeGold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Ingresos recientes</p>
                <h3 className="text-lg font-bold text-white">Reservaciones cobradas</h3>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
                <CreditCard size={18} />
              </div>
            </div>

            <div className="space-y-3">
              {collectedReservations.slice(0, 8).map((payment) => (
                <div key={payment.id} className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {payment.customer}
                      {payment.confirmationCode && (
                        <span className="ml-2 text-xs font-bold uppercase tracking-[0.08em] text-white/55">
                          {payment.confirmationCode}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-white/55">{payment.service}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {new Date(payment.completedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} | {payment.provider}
                    </p>
                  </div>
                  <span className="text-lg font-black text-emerald-300">{usd(payment.amountCents)}</span>
                </div>
              ))}
              {collectedReservations.length === 0 && (
                <p className="text-sm text-white/55">Todavia no hay ingresos cobrados registrados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'receivables' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Cobranza</p>
              <h3 className="text-lg font-bold text-white">Cuentas por cobrar</h3>
            </div>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
              {usd(receivableTotal)}
            </span>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {receivables.map((item) => {
              const days = daysOverdue(item.date);
              return (
                <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{item.customer}</p>
                      {item.reference && <p className="mt-1 text-xs text-white/55">{item.reference}</p>}
                    </div>
                    <p className="text-sm font-bold text-white">{usd(item.amountCents)}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-white/55">{item.service}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/55">
                        {item.source === 'account' ? 'Cuenta abierta' : 'Reserva'}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${urgencyClass(days)}`}>
                        {days} dias
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${receivableStatusTone(item.status)}`}>
                        {receivableStatusLabel(item.status)}
                      </span>
                    </div>
                    {item.source === 'booking' && item.collectedAmountCents > 0 && (
                      <p className="text-xs text-white/55">
                        Cobrado: {usd(item.collectedAmountCents)} de {usd(item.originalAmountCents)}
                      </p>
                    )}
                    <div className="pt-2 text-xs text-white/55">
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {['Fecha', 'Cliente', 'Servicio', 'Monto', 'Dias vencido'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {receivables.map((item) => {
                  const days = daysOverdue(item.date);
                  return (
                    <tr key={item.id} className="hover:bg-gold/5">
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-semibold">
                        <div>{item.customer}</div>
                        {item.reference && <div className="text-xs text-white/55">{item.reference}</div>}
                      </td>
                      <td className="px-4 py-3 text-white/55">
                        <div>{item.service}</div>
                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
                          {item.source === 'account' ? 'Cuenta abierta' : 'Reserva'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">{usd(item.amountCents)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${urgencyClass(days)}`}>
                          {days} dias
                        </span>
                        <div className="mt-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${receivableStatusTone(item.status)}`}>
                            {receivableStatusLabel(item.status)}
                          </span>
                        </div>
                        {item.source === 'booking' && item.collectedAmountCents > 0 && (
                          <div className="mt-2 text-xs text-white/55">
                            Cobrado: {usd(item.collectedAmountCents)} de {usd(item.originalAmountCents)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {receivables.length === 0 && (
            <div className="p-10 text-center text-sm text-white/55">No hay cuentas por cobrar pendientes.</div>
          )}
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gold/10 p-3 text-gold">
                <WalletCards size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Cuentas abiertas</p>
                <h3 className="text-lg font-bold text-white">Clientes con credito abierto y saldo por liquidar</h3>
              </div>
            </div>
          </div>
          <AccountsTab onDataChange={fetchData} />
        </div>
      )}
    </div>
  );
}
