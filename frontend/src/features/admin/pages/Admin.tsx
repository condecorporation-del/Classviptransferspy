import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, LogOut, LayoutDashboard, PlusCircle,
  Clock, AlertCircle, CheckCircle2, CreditCard, Banknote, Send,
  MoreHorizontal, User, Plane, StickyNote, X,
  Paperclip, Truck, ChevronRight,
  BarChart2, Megaphone, Users, Settings,
} from 'lucide-react';
import { Suspense, lazy, useState, useEffect } from 'react';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { getApiBaseUrl } from '@/shared/lib/api';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';
import ownerPic from '@/assets/owner-pic.png';

const PricingManager = lazy(async () => {
  const module = await import('@/features/admin/components/PricingManager');
  return { default: module.PricingManager };
});
const AdminBookings = lazy(async () => {
  const module = await import('@/features/admin/components/AdminBookings');
  return { default: module.AdminBookings };
});
const FinanzasTab = lazy(async () => {
  const module = await import('@/features/admin/components/FinanzasTab');
  return { default: module.FinanzasTab };
});
const DashboardOverviewTab = lazy(async () => {
  const module = await import('@/features/admin/components/DashboardOverviewTab');
  return { default: module.DashboardOverviewTab };
});
const MarketingTab = lazy(async () => {
  const module = await import('@/features/admin/components/MarketingTab');
  return { default: module.MarketingTab };
});
const RRHHTab = lazy(async () => {
  const module = await import('@/features/admin/components/RRHHTab');
  return { default: module.RRHHTab };
});
const TareasTab = lazy(async () => {
  const module = await import('@/features/admin/components/TareasTab');
  return { default: module.TareasTab };
});

const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

type Tab = 'dashboard' | 'bookings' | 'pricing' | 'new-booking' | 'finanzas' | 'marketing' | 'rrhh' | 'tareas';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

function DashboardTab({ refreshToken }: { refreshToken: number }) {
  return <DashboardOverviewTab refreshToken={refreshToken} />;
}
// ─── Quick Booking Form ───────────────────────────────────────────────────────

type PaymentMethod = 'none' | 'stripe' | 'cash';
type QuickBookingMode = 'oneway' | 'roundtrip' | 'account';
type QuickAccountSummary = {
  id: string;
  name: string;
  company?: string | null;
  balanceCents: number;
};
// Fila cruda (snake_case) de una cuenta tal como la devuelve el backend FastAPI.
type RawQuickAccount = {
  id: string;
  name: string;
  company?: string | null;
  balance_cents?: number;
};

function AdminTabFallback() {
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.03] p-6 text-sm text-white/30 shadow-sm">
      Loading section...
    </div>
  );
}

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}> = [
  {
    id: 'none',
    icon: <Send size={16} />,
    title: 'Save only',
    desc: 'Create the booking without sending any email.',
  },
  {
    id: 'stripe',
    icon: <CreditCard size={16} />,
    title: 'Send Stripe Link',
    desc: 'Client receives a secure payment link. Confirmed automatically when paid.',
    badge: 'Recommended',
    badgeColor: 'bg-indigo-500/15 text-indigo-300',
  },
  {
    id: 'cash',
    icon: <Banknote size={16} />,
    title: 'Paid in cash',
    desc: 'Mark as paid and send a confirmation email immediately.',
    badge: 'Cash / Manual',
    badgeColor: 'bg-emerald-500/15 text-emerald-300',
  },
];

function calcPickupTime(depTime: string): string {
  if (!depTime) return '';
  const match = depTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  let mins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) - 180;
  if (mins < 0) mins += 1440;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function QuickBookingTab({
  onBookingCreated,
}: {
  onBookingCreated?: (created?: { bookingId: string; confirmationCode?: string }) => void;
}) {
  const { getAuthHeaders } = useAdminAuth();
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    tripType: 'oneway' as QuickBookingMode,
    hotelName: '',
    passengers: '1',
    priceUsd: '',
    arrivalDate: '',
    arrivalTime: '',
    arrivalFlight: '',
    departureDate: '',
    departureTime: '',
    departureFlight: '',
    notes: '',
    serviceDescription: '',
    accountId: '',
  });
  const [accounts, setAccounts] = useState<QuickAccountSummary[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showDepartureInfo, setShowDepartureInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; code?: string; detail?: string } | null>(null);

  const f = (key: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [key]: v }));
  const computedPickupTime = calcPickupTime(form.departureTime);
  const isAccountService = form.tripType === 'account';

  useEffect(() => {
    let cancelled = false;

    const loadAccounts = async () => {
      setAccountsLoading(true);
      try {
        const response = await fetch(apiUrl('/api/v1/admin/accounts'), {
          credentials: 'include',
          headers: getAuthHeaders(),
        });
        const json = await response.json();
        // El backend Python devuelve un array directo (sin envoltorio {success,data})
        // y en snake_case: mapeamos balance_cents → balanceCents.
        if (!cancelled && Array.isArray(json)) {
          setAccounts(
            (json as RawQuickAccount[]).map((a: RawQuickAccount) => ({
              id: a.id,
              name: a.name,
              company: a.company,
              balanceCents: a.balance_cents ?? 0,
            }))
          );
        }
      } catch {
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    };

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.customerName?.trim();
    const email = form.customerEmail?.trim();
    const phone = form.customerPhone?.trim();
    const hotel = form.hotelName?.trim();

    if (!name || !email || !phone) {
      setResult({ success: false, message: 'Required: customer name, email, and phone.' });
      return;
    }
    if (!isAccountService && (!form.arrivalDate || !hotel)) {
      setResult({ success: false, message: 'Required: arrival date and hotel / destination.' });
      return;
    }
    if (isAccountService && !form.accountId) {
      setResult({ success: false, message: 'Select the existing account that should carry this service.' });
      return;
    }
    if (isAccountService && !form.serviceDescription?.trim()) {
      setResult({ success: false, message: 'Required: service description for the account service.' });
      return;
    }
    setSubmitting(true);
    setResult(null);

    try {
      const priceCents = Math.round((parseFloat(form.priceUsd) || 0) * 100);
      const tripLabel = isAccountService ? 'Account Service' : form.tripType === 'roundtrip' ? 'Round Trip' : 'One Way';
      const itemName = isAccountService
        ? (form.serviceDescription?.trim() || 'Account Service')
        : `Private Transfer — ${hotel} (${tripLabel})`;
      // Contrato del backend Python (FastAPI): snake_case, precios en centavos,
      // payment_method en vez de status, y respuesta {booking, email_sent} sin
      // envoltorio {success,data}.
      const body = {
        type: 'TRANSPORTATION',
        customer: { name: name!, email: email!, phone: phone!, language: 'en' },
        booking_date: isAccountService
          ? new Date().toISOString()
          : new Date(form.arrivalDate + 'T12:00:00').toISOString(),
        booking_time: form.arrivalTime || undefined,
        flight_number: form.arrivalFlight?.trim() || undefined,
        arrival_time: form.arrivalTime?.trim() || undefined,
        departure_flight_number: form.departureFlight?.trim() || undefined,
        departure_time: form.departureTime?.trim() || undefined,
        // Solo aplica en round trip: la fecha de salida, si difiere de
        // arrivalDate (booking_date) — el backend la guarda en
        // metadata.departureDate porque Booking no tiene columna propia.
        departure_date: !isAccountService && form.tripType === 'roundtrip' && form.departureDate
          ? form.departureDate
          : undefined,
        pickup_location: isAccountService ? undefined : 'SJD Airport',
        dropoff_location: isAccountService ? undefined : hotel!,
        passengers: parseInt(form.passengers) || 1,
        service_type: 'private',
        trip_type: isAccountService ? 'oneway' : form.tripType,
        notes: isAccountService
          ? `[ACCOUNT SERVICE] ${form.serviceDescription?.trim()}\n${form.notes?.trim() || ''}`
          : (form.notes?.trim() || undefined),
        // Servicio a cuenta: sin pago online (queda en hold y se carga al ledger).
        payment_method: isAccountService ? 'none' : paymentMethod,
        send_confirmation: !isAccountService && paymentMethod === 'cash',
        send_payment_link: !isAccountService && paymentMethod === 'stripe',
        items: [{
          type: 'TRANSPORTATION' as const,
          name: itemName,
          quantity: 1,
          unit_price: priceCents,
          total_price: priceCents,
        }],
      };

      const res = await fetch(apiUrl('/api/v1/admin/bookings'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok) {
        const created = json.booking;
        if (isAccountService && form.accountId && created?.id) {
          await fetch(apiUrl(`/api/v1/admin/accounts/${form.accountId}/bookings`), {
            method: 'POST',
            credentials: 'include',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: created.id }),
          });
        }

        const code = created?.confirmation_code || created?.id?.slice(0, 8).toUpperCase();
        const emailSent = json.email_sent === true;
        const emailMsg =
          paymentMethod === 'stripe'
            ? (emailSent
                ? 'Stripe payment link sent to client email.'
                : 'Booking created, but payment email could not be sent. Check email provider configuration.')
            : paymentMethod === 'cash'
              ? (emailSent
                  ? 'Confirmation email sent to client.'
                  : 'Booking created, but confirmation email could not be sent. Check email provider configuration.')
            :
          'Booking saved (no email sent).';
        setResult({
          success: true,
          message: isAccountService ? `Service added to account: ${code}` : `Booking created: ${code}`,
          detail: isAccountService ? 'The service was linked to the selected open account.' : emailMsg,
          code,
        });
        setForm({
          customerName: '', customerEmail: '', customerPhone: '',
          tripType: 'oneway', hotelName: '', passengers: '1', priceUsd: '',
          arrivalDate: '', arrivalTime: '', arrivalFlight: '',
          departureDate: '', departureTime: '', departureFlight: '', notes: '',
          serviceDescription: '',
          accountId: '',
        });
        setShowDepartureInfo(false);
        setAttachedFile(null);
        setPaymentMethod('stripe');
        onBookingCreated?.({
          bookingId: created.id,
          confirmationCode: code,
        });
      } else {
        setResult({ success: false, message: json.detail || 'Failed to create booking.' });
      }
    } catch {
      setResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel =
    isAccountService
      ? 'Create Service & Add to Account'
      : paymentMethod === 'stripe' ? 'Create & Send Stripe Link' :
      paymentMethod === 'cash'   ? 'Create & Send Confirmation' :
      'Save Booking';

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-stretch">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold mb-1">New Reservation</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Quick Booking</h1>

        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:w-[560px]">
          <QuickBookingStatCard
            title="Booking Mode"
            value={isAccountService ? 'Account Service' : form.tripType === 'roundtrip' ? 'Round Trip' : 'One Way'}
            detail={isAccountService ? 'Open balance workflow' : 'Direct reservation flow'}
          />
          <QuickBookingStatCard
            title="Payment"
            value={isAccountService ? 'On Account' : paymentMethod === 'stripe' ? 'Stripe Link' : paymentMethod === 'cash' ? 'Cash' : 'Save Only'}
            detail={isAccountService ? 'Settled later' : paymentMethod === 'stripe' ? 'Client pays remotely' : paymentMethod === 'cash' ? 'Confirmed immediately' : 'No email automation'}
          />
          <QuickBookingStatCard
            title="Amount"
            value={form.priceUsd ? `$${Number(form.priceUsd || 0).toFixed(2)}` : '$0.00'}
            detail={isAccountService ? 'Added to ledger' : 'Current booking value'}
          />
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border ${
              result.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            {result.success
              ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
              : <AlertCircle size={18} className="mt.0.5 shrink-0 text-red-400" />}
            <div>
              <p className="font-semibold text-sm">{result.message}</p>
              {result.detail && <p className="text-xs mt-0.5 opacity-75">{result.detail}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Customer ── */}
        <FormSection title="Customer" icon={<User size={14} />}>
          <div className="grid sm:grid-cols-3 gap-3">
            <QField label="Full Name *" value={form.customerName} onChange={f('customerName')} placeholder="John Smith" />
            <QField label="Email *" type="email" value={form.customerEmail} onChange={f('customerEmail')} placeholder="john@email.com" />
            <QField label="Phone *" value={form.customerPhone} onChange={f('customerPhone')} placeholder="+1 555 000 0000" />
          </div>
        </FormSection>

        {/* ── Service ── */}
        <FormSection title="Service Type" icon={<Truck size={14} />}>
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Service Type *</p>
            <div className="grid md:grid-cols-3 gap-3">
              {([
                { id: 'oneway', label: 'One Way', desc: 'Single transfer service for arrivals or departures.', badge: 'Transfer' },
                { id: 'roundtrip', label: 'Round Trip', desc: 'Arrival and departure booked together.', badge: 'Transfer' },
                { id: 'account', label: 'Add to Account', desc: 'Dinner, errands, private driver, or any service carried on credit.', badge: 'Account' },
              ] as const).map(t => (
                <button key={t.id} type="button"
                  onClick={() => setForm(p => ({ ...p, tripType: t.id }))}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    form.tripType === t.id
                      ? 'border-gold bg-[hsl(var(--navy))] text-white shadow-[0_10px_30px_rgba(10,22,40,0.12)]'
                      : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-gold/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-bold ${form.tripType === t.id ? 'text-gold' : 'text-white'}`}>{t.label}</p>
                      <p className={`mt-1 text-xs leading-5 ${form.tripType === t.id ? 'text-white/70' : 'text-white/45'}`}>{t.desc}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      form.tripType === t.id ? 'bg-gold/15 text-gold' : 'bg-white/8 text-white/40'
                    }`}>
                      {t.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!isAccountService && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <QField label="Hotel / Property / Destination *" value={form.hotelName} onChange={f('hotelName')} placeholder="Pueblo Bonito, Villa Serena…" />
                <QField label="Passengers" type="number" value={form.passengers} onChange={f('passengers')} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Price (USD)</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">$</span>
                  <input type="number" value={form.priceUsd} onChange={e => setForm(p => ({ ...p, priceUsd: e.target.value }))}
                    placeholder="0.00" min="0" step="0.01"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all" />
                </div>
              </div>
            </>
          )}

          {isAccountService && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-300 mb-1">Account Workflow</p>
                <p className="text-sm text-blue-200/80">Use this when the guest or villa keeps an open balance and settles later.</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Existing Open Account *</p>
                <select
                  value={form.accountId}
                  onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a1628] text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all"
                >
                  <option value="">{accountsLoading ? 'Loading accounts...' : 'Select an open account'}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}{account.company ? ` - ${account.company}` : ''} ({`$${(account.balanceCents / 100).toFixed(2)}`})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Service Description *</p>
                <textarea
                  value={form.serviceDescription}
                  onChange={e => setForm(p => ({ ...p, serviceDescription: e.target.value }))}
                  rows={4}
                  placeholder="Example: Dinner transfer to Flora Farms, private driver 4 hours, airport errand, grocery stop..."
                  className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Amount (USD) *</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">$</span>
                    <input type="number" value={form.priceUsd} onChange={e => setForm(p => ({ ...p, priceUsd: e.target.value }))}
                      placeholder="0.00" min="0" step="0.01"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all" />
                  </div>
                </div>
                <QField label="Passengers / Group size" type="number" value={form.passengers} onChange={f('passengers')} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">Attach file (optional)</p>
                <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.04] cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-all">
                  <Paperclip size={14} className="text-white/40 shrink-0" />
                  <span className="text-sm text-white/50 truncate">
                    {attachedFile ? attachedFile.name : 'PDF, image, or document…'}
                  </span>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={e => setAttachedFile(e.target.files?.[0] || null)} />
                  {attachedFile && (
                    <button type="button" onClick={(e) => { e.preventDefault(); setAttachedFile(null); }}
                      className="ml-auto text-white/40 hover:text-white/80">
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>
            </div>
          )}
        </FormSection>

        {/* ── Arrival ── */}
        {!isAccountService && (
          <FormSection title="Arrival" icon={<Plane size={14} className="rotate-[-45deg]" />}>
            <div className="grid sm:grid-cols-3 gap-3">
              <QField label="Arrival Date *" type="date" value={form.arrivalDate} onChange={f('arrivalDate')} />
              <QField label="Arrival Time" type="time" value={form.arrivalTime} onChange={f('arrivalTime')} />
              <QField label="Flight Number" value={form.arrivalFlight} onChange={f('arrivalFlight')} placeholder="AA 1234" />
            </div>
          </FormSection>
        )}

        {/* ── Departure ── */}
        {!isAccountService && (form.tripType === 'roundtrip' || showDepartureInfo || form.departureTime || form.departureFlight) && (
          <FormSection title="Departure" icon={<Plane size={14} className="rotate-45" />}>
            <div className="grid sm:grid-cols-3 gap-3">
              {form.tripType === 'roundtrip' && (
                <QField label="Departure Date" type="date" value={form.departureDate} onChange={f('departureDate')} />
              )}
              <QField label="Departure Flight" value={form.departureFlight} onChange={f('departureFlight')} placeholder="AA 5678" />
              <QField label="Departure Flight Time" type="time" value={form.departureTime} onChange={f('departureTime')} />
            </div>
            {computedPickupTime && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15">
                  <Clock size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Pickup time (3h before)</p>
                  <p className="text-lg font-display font-bold text-amber-200">{computedPickupTime}</p>
                </div>
                <p className="text-xs text-amber-300/70 ml-auto">Flight at {form.departureTime}</p>
              </div>
            )}
          </FormSection>
        )}

        {!isAccountService && form.tripType === 'oneway' && !showDepartureInfo && !form.departureTime && !form.departureFlight && (
          <button
            type="button"
            onClick={() => setShowDepartureInfo(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-gold transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">+</span>
            Add departure flight info
          </button>
        )}

        {/* ── Notes ── */}
        <FormSection title="Notes" icon={<StickyNote size={14} />}>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Special requests, internal notes…"
            className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all"
          />
        </FormSection>

        {/* ── Payment Method ── */}
        <FormSection title="Payment Method" icon={<CreditCard size={14} />}>
          <div className="grid sm:grid-cols-3 gap-3">
            {PAYMENT_OPTIONS.map(opt => {
              const active = paymentMethod === opt.id;
              const disabled = isAccountService && opt.id === 'stripe';
              return (
                <button key={opt.id} type="button" onClick={() => !disabled && setPaymentMethod(opt.id)}
                  disabled={disabled}
                  className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    active
                      ? 'border-gold bg-[hsl(var(--navy))] shadow-md'
                      : 'border-white/10 bg-white/[0.03] hover:border-gold/30 hover:bg-white/[0.06]'
                  } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                >
                  <div className={`flex items-center gap-2 ${active ? 'text-gold' : 'text-white/55'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${active ? 'border-gold bg-gold' : 'border-white/30'}`}>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-navy" />}
                    </span>
                    <span className={active ? 'text-gold' : 'text-white/50'}>{opt.icon}</span>
                    <span className={`font-bold text-xs uppercase tracking-wide ${active ? 'text-gold' : 'text-white/80'}`}>{opt.title}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${active ? 'text-white/60' : 'text-white/45'}`}>{opt.desc}</p>
                  {opt.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-gold/20 text-gold' : 'bg-white/10 text-white/50'}`}>{opt.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {isAccountService && (
            <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs">
              <CreditCard size={13} className="mt-0.5 shrink-0" />
              <span>Account services should remain on the client ledger. Use Save Only or Paid in Cash, then settle from Cuentas Abiertas.</span>
            </div>
          )}
          {!isAccountService && paymentMethod === 'stripe' && (
            <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs">
              <CreditCard size={13} className="mt-0.5 shrink-0" />
              <span>Client receives a Stripe payment link by email. Booking confirmed automatically when payment is completed.</span>
            </div>
          )}
          {!isAccountService && paymentMethod === 'stripe' && (!form.priceUsd || parseFloat(form.priceUsd) <= 0) && (
            <div className="mt-2 flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>A price greater than $0 is required to generate a Stripe payment link.</span>
            </div>
          )}
          {paymentMethod === 'cash' && (
            <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
              <Banknote size={13} className="mt-0.5 shrink-0" />
              <span>Booking marked as Confirmed. Client receives confirmation email + PDF voucher immediately.</span>
            </div>
          )}
        </FormSection>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            submitting ||
            !form.customerName?.trim() ||
            !form.customerEmail?.trim() ||
            !form.customerPhone?.trim() ||
            (!isAccountService && (!form.hotelName?.trim() || !form.arrivalDate)) ||
            (isAccountService && (!form.serviceDescription?.trim() || !form.accountId))
          }
          className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 hover:shadow-[0_6px_24px_rgba(212,175,55,0.35)]"
          style={{ background: 'linear-gradient(135deg, #c9a227, #f0c040, #c9a227)', color: '#0A1628' }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
              Creating booking…
            </span>
          ) : submitLabel}
        </button>
      </form>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gold/10 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5 bg-black/20">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-gold/10 text-gold">
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">{title}</span>
      </div>
      <div className="p-4 bg-white/[0.03]">{children}</div>
    </div>
  );
}

function QuickBookingStatCard({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-gold/10 bg-white/[0.05] px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold/80 mb-1">{title}</p>
      <p className="text-lg font-display font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-white/55 mt-1">{detail}</p>
    </div>
  );
}

function QField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60 mb-2">{label}</p>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/40 transition-all placeholder:text-white/25"
      />
    </div>
  );
}

// ─── Admin Shell ──────────────────────────────────────────────────────────────

const Admin = () => {
  const { email, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [bookingSearchSeed, setBookingSearchSeed] = useState('');
  const [showOwnerPhoto, setShowOwnerPhoto] = useState(false);

  const notifyAdminDataChanged = (created?: { bookingId: string; confirmationCode?: string }) => {
    setRefreshToken((current) => current + 1);
    if (created?.confirmationCode || created?.bookingId) {
      setBookingSearchSeed(created.confirmationCode || created.bookingId);
      setActiveTab('bookings');
    }
  };

  const sidebarItems: Array<{ id: Tab; label: string; icon: React.ReactNode; mobileLabel?: string; group?: string }> = [
    { id: 'dashboard',   label: 'Dashboard',         icon: <LayoutDashboard size={17} />, mobileLabel: 'Home',    group: 'OPERACIONES' },
    { id: 'bookings',    label: 'Reservaciones',      icon: <CalendarCheck size={17} />,   mobileLabel: 'Res.',    group: 'OPERACIONES' },
    { id: 'new-booking', label: 'Nueva Reserva',      icon: <PlusCircle size={17} />,      mobileLabel: 'Nueva',   group: 'OPERACIONES' },
    { id: 'tareas',      label: 'Tareas',             icon: <CheckCircle2 size={17} />,    mobileLabel: 'Tareas',  group: 'OPERACIONES' },
    { id: 'finanzas',    label: 'Finanzas',           icon: <BarChart2 size={17} />,       mobileLabel: 'Fin.',    group: 'ANALYTICS' },
    { id: 'marketing',   label: 'Marketing',          icon: <Megaphone size={17} />,       mobileLabel: 'Mkt.',    group: 'ANALYTICS' },
    { id: 'rrhh',        label: 'Recursos Humanos',   icon: <Users size={17} />,           mobileLabel: 'RRHH',    group: 'EQUIPO' },
    { id: 'pricing',     label: 'Configuración',      icon: <Settings size={17} />,        mobileLabel: 'Config',  group: 'EQUIPO' },
  ];

  const activeLabel = sidebarItems.find(s => s.id === activeTab)?.label || 'Admin';

  return (
    <div className="admin-panel min-h-[100dvh] flex flex-col md:flex-row" style={{ background: 'linear-gradient(160deg, #07112e 0%, #0c1c3d 55%, #07112e 100%)', backgroundAttachment: 'fixed' }}>

      {/* ═══ Mobile: Top header ═══ */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gold/10 bg-[#07112e]/90 backdrop-blur-xl"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowOwnerPhoto(true)} className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/50 shrink-0 hover:border-gold transition-all">
            <img src={ownerPic} alt="Owner" className="w-full h-full object-cover" />
          </button>
          <h2 className="text-sm font-bold text-white/80">{activeLabel}</h2>
        </div>
        <button onClick={() => setMobileMenu(true)}
          className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* ═══ Mobile: Bottom navigation ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gold/10 bg-[#07112e]/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-[58px]">
          {(['dashboard', 'bookings', 'new-booking', 'tareas', 'finanzas'] as Tab[]).map(tabId => {
            const item = sidebarItems.find(s => s.id === tabId)!;
            return (
              <button key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                  activeTab === item.id ? 'text-gold' : 'text-white/60'
                }`}
              >
                <span className={`p-1 rounded-lg transition-all ${activeTab === item.id ? 'bg-gold/10' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wide ${activeTab === item.id ? 'text-gold' : 'text-white/50'}`}>
                  {item.mobileLabel || item.label}
                </span>
              </button>
            );
          })}
          <button onClick={() => setMobileMenu(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-white/60">
            <span className={`p-1 rounded-lg transition-all ${(['marketing', 'pricing', 'rrhh'].includes(activeTab)) ? 'bg-gold/10' : ''}`}>
              <MoreHorizontal size={17} className={['marketing', 'pricing', 'rrhh'].includes(activeTab) ? 'text-gold' : ''} />
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${['marketing', 'pricing', 'rrhh'].includes(activeTab) ? 'text-gold' : 'text-white/50'}`}>
              {['marketing', 'pricing', 'rrhh'].includes(activeTab) ? sidebarItems.find(s => s.id === activeTab)?.mobileLabel : 'Mas'}
            </span>
          </button>
        </div>
      </nav>

      {/* ═══ Mobile: "More" slide-up sheet ═══ */}
      <AnimatePresence>
        {mobileMenu && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden"
              style={{ background: 'hsl(var(--navy))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <button type="button" onClick={() => { setShowOwnerPhoto(true); setMobileMenu(false); }} className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gold/50 shadow-lg shrink-0 hover:border-gold transition-all">
                  <img src={ownerPic} alt="Owner" className="w-full h-full object-cover" />
                </button>
                <div>
                  <p className="text-sm font-bold text-white">{email || 'Admin'}</p>
                  <p className="text-xs text-white/40">Administrator</p>
                </div>
              </div>
              <div className="p-3 space-y-1">
                {sidebarItems.map(item => (
                  <button key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                      activeTab === item.id
                        ? 'bg-gold/15 text-gold'
                        : 'text-white/70 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <span className={activeTab === item.id ? 'text-gold' : 'text-white/40'}>{item.icon}</span>
                    {item.label}
                    {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-gold/60" />}
                  </button>
                ))}
              </div>
              <div className="p-3 pt-0">
                <button onClick={() => { logout(); setMobileMenu(false); }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ Desktop: Sidebar ═══ */}
      <aside className="w-64 hidden md:flex md:flex-col flex-shrink-0 border-r border-white/5"
        style={{ background: 'linear-gradient(180deg, #0b1427 0%, #102240 60%, #0b1427 100%)' }}>

        {/* Branding */}
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <img
            src={cloudinaryAssets.logo}
            alt="Class VIP Transfers"
            className="h-10 w-auto object-contain"
          />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Panel de Administración</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {(['OPERACIONES', 'ANALYTICS', 'EQUIPO'] as const).map((group) => {
            const groupItems = sidebarItems.filter(i => i.group === group);
            return (
              <div key={group} className="mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 px-3 pt-3 pb-2">{group}</p>
                <div className="space-y-0.5">
                  {groupItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                        activeTab === item.id
                          ? 'text-gold'
                          : 'text-white/50 hover:text-white hover:bg-white/6'
                      }`}
                      style={activeTab === item.id ? {
                        background: 'linear-gradient(to right, rgba(212,175,55,0.12), rgba(212,175,55,0.04))',
                        borderLeft: '2px solid hsl(42 78% 50%)',
                        paddingLeft: '10px',
                      } : undefined}
                    >
                      <span className={`transition-colors ${activeTab === item.id ? 'text-gold' : 'text-white/30 group-hover:text-white/60'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {activeTab === item.id && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        {email && (
          <div className="p-3 border-t border-white/8">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-all group">
              <button type="button" onClick={() => setShowOwnerPhoto(true)} className="w-11 h-11 rounded-xl overflow-hidden border-2 border-gold/40 shadow flex-shrink-0 hover:border-gold transition-all">
                <img src={ownerPic} alt="Owner" className="w-full h-full object-cover" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{email}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wide">Administrator</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="text-white/50 hover:text-red-400 transition-colors ml-auto flex-shrink-0"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ═══ Main content ═══ */}
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        {/* Desktop content header bar */}
        <div className="hidden md:block sticky top-0 z-20 px-8 pt-3 pb-3" style={{ background: 'linear-gradient(180deg, #07112e 0%, #07112e 60%, transparent 100%)' }}>
          <div className="flex items-center justify-between rounded-2xl border border-gold/10 bg-white/[0.04] backdrop-blur-md px-5 py-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/50 font-medium">Class VIP</span>
              <ChevronRight size={13} className="text-white/30" />
              <span className="font-semibold text-white/90">{activeLabel}</span>
            </div>
            <span className="text-xs font-semibold tracking-wide text-gold/60 bg-gold/5 border border-gold/10 px-3 py-1 rounded-full">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-5 md:p-8"
        >
          <Suspense fallback={<AdminTabFallback />}>
            {activeTab === 'dashboard' && <DashboardTab refreshToken={refreshToken} />}

            {activeTab === 'bookings' && (
              <div>
                <div className="mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-1">Management</p>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Bookings</h1>
                </div>
                <AdminBookings onDataChanged={notifyAdminDataChanged} initialSearchQ={bookingSearchSeed} />
              </div>
            )}

            {activeTab === 'new-booking' && <QuickBookingTab onBookingCreated={notifyAdminDataChanged} />}

            {activeTab === 'pricing' && (
              <div>
                <div className="mb-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-1">Configuration</p>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Pricing</h1>
                </div>
                <PricingManager />
              </div>
            )}

            {activeTab === 'finanzas' && <FinanzasTab refreshToken={refreshToken} />}

            {activeTab === 'tareas' && <TareasTab />}

            {activeTab === 'marketing' && <MarketingTab />}

            {activeTab === 'rrhh' && <RRHHTab />}
          </Suspense>
        </motion.div>
      </div>
      {/* ═══ Owner photo lightbox ═══ */}
      <AnimatePresence>
        {showOwnerPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowOwnerPhoto(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative"
            >
              <img
                src={ownerPic}
                alt="Owner"
                className="w-72 h-72 md:w-96 md:h-96 rounded-3xl object-cover border-2 border-gold/60 shadow-[0_0_60px_rgba(201,162,39,0.25)]"
              />
              <button
                type="button"
                onClick={() => setShowOwnerPhoto(false)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                <X size={15} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Admin;


