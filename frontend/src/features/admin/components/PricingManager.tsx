import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, Loader2, Save, X, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import { getApiBaseUrl } from '@/shared/lib/api';
import { includesNormalized } from '@/shared/lib/text';

const getAdminUrl = (path: string) => {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
};

// El backend Python (FastAPI) vive en /api/v1/pricing/* y responde en snake_case,
// sin envoltorio {success,data}. Las listas vienen como {items,total,page,page_size}
// y los errores como {detail}. Estos helpers + mappers traducen ambos lados para que
// el resto del componente siga trabajando en camelCase como antes.
const PRICING_BASE = '/api/v1/pricing';

// Filas crudas (snake_case) que devuelve el backend FastAPI.
interface RawArea {
  id: string;
  name: string;
  one_way_price_cents: number;
  round_trip_price_cents: number;
  sprinter_one_way_price_cents: number;
  sprinter_round_trip_price_cents: number;
  is_active: boolean;
}
interface RawExtra {
  id: string;
  active: boolean;
  code: string;
  label: string;
  price_cents: number;
  pricing_mode: string;
  max_qty?: number | null;
  description?: string | null;
}
interface RawHotel {
  id: string;
  name: string;
  zone: string;
  is_active: boolean;
}

const mapArea = (a: RawArea): Area => ({
  id: a.id,
  name: a.name,
  oneWayPriceCents: a.one_way_price_cents,
  roundTripPriceCents: a.round_trip_price_cents,
  sprinterOneWayPriceCents: a.sprinter_one_way_price_cents,
  sprinterRoundTripPriceCents: a.sprinter_round_trip_price_cents,
  isActive: a.is_active,
});

const mapExtra = (e: RawExtra): PricingExtra => ({
  id: e.id,
  active: e.active,
  code: e.code,
  label: e.label,
  priceCents: e.price_cents,
  pricingMode: e.pricing_mode,
  maxQty: e.max_qty ?? undefined,
  description: e.description ?? undefined,
});

const mapHotel = (h: RawHotel): Hotel => ({
  id: h.id,
  name: h.name,
  zone: h.zone,
  isActive: h.is_active,
});

// Lee una lista FastAPI ({items:[...]}) y mapea cada elemento a camelCase.
async function readList<T, R>(
  response: Response,
  mapItem: (raw: R) => T,
  fallbackMessage: string
): Promise<T[]> {
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.detail || fallbackMessage);
  }
  const items: R[] = Array.isArray(json) ? json : (json?.items ?? []);
  return items.map(mapItem);
}

// Confirma que un POST/PATCH salió bien (objeto directo), o lanza el {detail}.
async function ensureOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.ok) return;
  const json = await response.json().catch(() => null);
  throw new Error(json?.detail || fallbackMessage);
}

interface PricingExtra {
  id: string;
  active: boolean;
  code: string;
  label: string;
  priceCents: number;
  pricingMode: string;
  maxQty?: number;
  description?: string;
}

interface Area {
  id: string;
  name: string;
  oneWayPriceCents: number;
  roundTripPriceCents: number;
  sprinterOneWayPriceCents: number;
  sprinterRoundTripPriceCents: number;
  isActive: boolean;
}

interface Hotel {
  id: string;
  name: string;
  zone: string;
  isActive: boolean;
}

export function PricingManager() {
  const { getAuthHeaders } = useAdminAuth();
  const [extras, setExtras] = useState<PricingExtra[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extras' | 'areas' | 'hotels'>('areas');
  const [editingExtra, setEditingExtra] = useState<PricingExtra | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [addToZone, setAddToZone] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [extrasRes, areasRes, hotelsRes] = await Promise.all([
        fetch(getAdminUrl(`${PRICING_BASE}/extras`), { credentials: 'include', headers: getAuthHeaders() }),
        fetch(getAdminUrl(`${PRICING_BASE}/areas`), { credentials: 'include', headers: getAuthHeaders() }),
        fetch(getAdminUrl(`${PRICING_BASE}/hotels`), { credentials: 'include', headers: getAuthHeaders() }),
      ]);

      const [extrasData, areasData, hotelsData] = await Promise.all([
        readList(extrasRes, mapExtra, 'No se pudieron cargar los extras.'),
        readList(areasRes, mapArea, 'No se pudieron cargar las areas.'),
        readList(hotelsRes, mapHotel, 'No se pudieron cargar los hoteles.'),
      ]);

      setExtras(extrasData);
      setAreas(areasData);
      setHotels(hotelsData);
    } catch (caughtError) {
      console.error('Failed to fetch pricing data:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la configuracion de pricing.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteExtra = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extra?')) return;

    try {
      setError(null);
      const res = await fetch(getAdminUrl(`${PRICING_BASE}/extras/${id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });

      await ensureOk(res, 'No se pudo desactivar el extra.');
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to delete extra:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar el extra.');
    }
  };

  const handleSaveExtra = async (extra: Partial<PricingExtra>) => {
    try {
      setError(null);
      const url = editingExtra
        ? getAdminUrl(`${PRICING_BASE}/extras/${editingExtra.id}`)
        : getAdminUrl(`${PRICING_BASE}/extras`);
      const method = editingExtra ? 'PATCH' : 'POST';

      const payload = {
        active: extra.active,
        code: extra.code,
        label: extra.label,
        price_cents: extra.priceCents,
        pricing_mode: extra.pricingMode,
        max_qty: extra.maxQty ?? null,
        description: extra.description || null,
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await ensureOk(res, 'No se pudo guardar el extra.');
      setShowExtraForm(false);
      setEditingExtra(null);
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to save extra:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el extra.');
    }
  };

  const handleSaveArea = async (area: { name?: string; oneWayPriceCents?: number; roundTripPriceCents?: number; sprinterOneWayPriceCents?: number; sprinterRoundTripPriceCents?: number }) => {
    try {
      setError(null);
      const url = editingArea
        ? getAdminUrl(`${PRICING_BASE}/areas/${editingArea.id}`)
        : getAdminUrl(`${PRICING_BASE}/areas`);
      const method = editingArea ? 'PATCH' : 'POST';

      const payload = {
        name: area.name,
        one_way_price_cents: area.oneWayPriceCents,
        round_trip_price_cents: area.roundTripPriceCents,
        sprinter_one_way_price_cents: area.sprinterOneWayPriceCents,
        sprinter_round_trip_price_cents: area.sprinterRoundTripPriceCents,
      };

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await ensureOk(res, 'No se pudo guardar el area.');
      setShowAreaForm(false);
      setEditingArea(null);
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to save area:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el area.');
    }
  };

  const handleDeactivateArea = async (id: string) => {
    if (!confirm('Deactivate this area? It will no longer appear in the booking form.')) return;
    try {
      setError(null);
      const res = await fetch(getAdminUrl(`${PRICING_BASE}/areas/${id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      await ensureOk(res, 'No se pudo desactivar el area.');
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to deactivate area:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar el area.');
    }
  };

  const handleSaveHotel = async (hotel: { name?: string; zone?: string; isActive?: boolean }) => {
    try {
      setError(null);
      const url = editingHotel
        ? getAdminUrl(`${PRICING_BASE}/hotels/${editingHotel.id}`)
        : getAdminUrl(`${PRICING_BASE}/hotels`);
      const method = editingHotel ? 'PATCH' : 'POST';
      const payload = {
        name: hotel.name,
        zone: hotel.zone,
        is_active: hotel.isActive,
      };
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await ensureOk(res, 'No se pudo guardar el hotel.');
      setShowHotelForm(false);
      setEditingHotel(null);
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to save hotel:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el hotel.');
    }
  };

  const handleDeactivateHotel = async (id: string) => {
    if (!confirm('Deactivate this hotel?')) return;
    try {
      setError(null);
      const res = await fetch(getAdminUrl(`${PRICING_BASE}/hotels/${id}`), {
        credentials: 'include',
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      await ensureOk(res, 'No se pudo desactivar el hotel.');
      await fetchData();
    } catch (caughtError) {
      console.error('Failed to deactivate hotel:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar el hotel.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-14 text-white/55">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
        <p className="text-sm font-medium">Loading pricing data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={16} />
            {error}
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="mt-3 inline-flex items-center gap-2 text-sm font-bold"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.05] rounded-xl p-1 w-fit overflow-x-auto">
        {(['areas', 'extras', 'hotels'] as const).map((tab) => {
          const labels: Record<string, string> = { areas: 'Areas', extras: 'Extras', hotels: 'Hotels' };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gold text-navy shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Areas Tab */}
      {activeTab === 'areas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-white">
              {areas.length} area{areas.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setEditingArea(null); setShowAreaForm(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Add Area
            </button>
          </div>

          {showAreaForm && (
            <AreaForm
              area={editingArea}
              onSave={handleSaveArea}
              onCancel={() => { setShowAreaForm(false); setEditingArea(null); }}
            />
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10/80 bg-white/[0.05]">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">SUV 1–5 pax</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">SUV Round-trip</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Sprinter 6+ pax</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Sprinter Round-trip</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {areas.map((area) => (
                  <tr key={area.id} className={`hover:bg-white/[0.06]/20 transition-colors ${!area.isActive ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{area.name}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">${(area.oneWayPriceCents / 100).toFixed(0)}</td>
                    <td className="px-4 py-3.5 text-sm font-medium">${(area.roundTripPriceCents / 100).toFixed(0)}</td>
                    <td className="px-4 py-3.5 text-sm text-white/55">{area.sprinterOneWayPriceCents > 0 ? `$${(area.sprinterOneWayPriceCents / 100).toFixed(0)}` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-white/55">{area.sprinterRoundTripPriceCents > 0 ? `$${(area.sprinterRoundTripPriceCents / 100).toFixed(0)}` : '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${area.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                        {area.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setEditingArea(area); setShowAreaForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/55 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        {area.isActive && (
                          <button
                            onClick={() => handleDeactivateArea(area.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/55 hover:text-red-300 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extras Tab */}
      {activeTab === 'extras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {extras.length} extra{extras.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setEditingExtra(null); setShowExtraForm(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Add Extra
            </button>
          </div>

          {showExtraForm && (
            <ExtraForm
              extra={editingExtra}
              onSave={handleSaveExtra}
              onCancel={() => { setShowExtraForm(false); setEditingExtra(null); }}
            />
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10/80 bg-white/[0.05]">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Code</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Label</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Price</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Mode</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-white/55">Max Qty</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {extras.map((extra) => (
                  <tr key={extra.id} className={`hover:bg-white/[0.06]/20 transition-colors ${!extra.active ? 'opacity-40' : ''}`}>
                    <td className="px-4 py-3.5 text-xs font-mono font-semibold text-white/55">{extra.code}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-white">{extra.label}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-white">
                      ${(extra.priceCents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/55 capitalize">{extra.pricingMode.toLowerCase()}</td>
                    <td className="px-4 py-3.5 text-sm text-white/55">{extra.maxQty || '∞'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setEditingExtra(extra); setShowExtraForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/55 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExtra(extra.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/55 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hotels Tab */}
      {activeTab === 'hotels' && (
        <HotelsTab
          hotels={hotels}
          areas={areas}
          showHotelForm={showHotelForm}
          editingHotel={editingHotel}
          addToZone={addToZone}
          zones={[...new Set([...areas.filter(a => a.isActive).map(a => a.name), ...hotels.map(h => h.zone)])].sort()}
          onShowForm={(hotel, zone) => {
            setEditingHotel(hotel);
            setAddToZone(zone ?? null);
            setShowHotelForm(true);
          }}
          onHideForm={() => {
            setShowHotelForm(false);
            setEditingHotel(null);
            setAddToZone(null);
          }}
          onSave={handleSaveHotel}
          onDeactivate={handleDeactivateHotel}
        />
      )}
    </div>
  );
}

function HotelsTab({
  hotels,
  areas,
  showHotelForm,
  editingHotel,
  addToZone,
  zones,
  onShowForm,
  onHideForm,
  onSave,
  onDeactivate,
}: {
  hotels: Hotel[];
  areas: Area[];
  showHotelForm: boolean;
  editingHotel: Hotel | null;
  addToZone: string | null;
  zones: string[];
  onShowForm: (hotel: Hotel | null, zone?: string) => void;
  onHideForm: () => void;
  onSave: (data: { name?: string; zone?: string; isActive?: boolean }) => void;
  onDeactivate: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const activeHotels = hotels.filter(h => h.isActive);

  const filteredHotels = useMemo(() => {
    if (!search.trim()) return hotels;
    return hotels.filter(
      (hotel) => includesNormalized(hotel.name, search) || includesNormalized(hotel.zone, search)
    );
  }, [hotels, search]);

  const hotelsByZone = useMemo(() => {
    const byZone: Record<string, Hotel[]> = {};
    for (const h of filteredHotels) {
      if (!byZone[h.zone]) byZone[h.zone] = [];
      byZone[h.zone].push(h);
    }
    for (const z of zones) {
      if (!byZone[z]) byZone[z] = [];
    }
    return byZone;
  }, [filteredHotels, zones]);

  const zoneOrder = zones;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm font-semibold text-white">{activeHotels.length} active hotels</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/55" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hotel or zone…"
              className="pl-9 pr-4 py-2 border border-white/10 rounded-xl w-full sm:w-56 text-sm bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50 transition-all"
            />
          </div>
          <button
            onClick={() => onShowForm(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gold text-navy text-sm font-bold rounded-xl hover:bg-gold/90 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={15} />
            Add Hotel
          </button>
        </div>
      </div>

      {showHotelForm && (
        <HotelForm
          hotel={editingHotel}
          initialZone={addToZone ?? undefined}
          zones={zones}
          onSave={onSave}
          onCancel={onHideForm}
        />
      )}

      <div className="grid gap-4">
        {zoneOrder.map((zone) => {
          const zoneHotels = (hotelsByZone[zone] || []).sort((a, b) => a.name.localeCompare(b.name));
          const area = areas.find(a => a.name === zone);
          const priceInfo = area
            ? `SUV $${(area.oneWayPriceCents / 100).toFixed(0)} · RT $${(area.roundTripPriceCents / 100).toFixed(0)}`
            : 'No pricing configured';

          return (
            <div key={zone} className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white/[0.05] border-b border-white/10/60">
                <div>
                  <p className="font-bold text-sm text-white">{zone}</p>
                  <p className="text-xs text-white/55 mt-0.5">{priceInfo} · {zoneHotels.filter(h => h.isActive).length} active hotels</p>
                </div>
                <button
                  onClick={() => onShowForm(null, zone)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/90 text-navy rounded-xl hover:bg-gold text-xs font-bold transition-colors"
                >
                  <Plus size={13} />
                  Add Hotel
                </button>
              </div>
              <div className="divide-y divide-white/[0.08]">
                {zoneHotels.length === 0 ? (
                  <div className="px-5 py-5 text-center text-sm text-white/40 italic">
                    No hotels in this zone yet.
                  </div>
                ) : (
                  zoneHotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      className={`flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.06]/20 transition-colors ${!hotel.isActive ? 'opacity-40' : ''}`}
                    >
                      <span className="text-sm font-medium text-white">{hotel.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${hotel.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                          {hotel.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => onShowForm(hotel)}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/55 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                        {hotel.isActive && (
                          <button
                            onClick={() => onDeactivate(hotel.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/55 hover:text-red-300 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HotelForm({
  hotel,
  initialZone,
  zones,
  onSave,
  onCancel,
}: {
  hotel: Hotel | null;
  initialZone?: string;
  zones: string[];
  onSave: (data: { name?: string; zone?: string; isActive?: boolean }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: hotel?.name || '',
    zone: hotel?.zone || initialZone || '',
    isActive: hotel?.isActive ?? true,
  });

  useEffect(() => {
    setFormData({
      name: hotel?.name || '',
      zone: hotel?.zone || initialZone || '',
      isActive: hotel?.isActive ?? true,
    });
  }, [hotel?.id, hotel?.name, hotel?.zone, hotel?.isActive, initialZone]);

  return (
    <div className="rounded-2xl border border-gold/30 bg-white/[0.04] p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><Edit size={14} className="text-gold" />{hotel ? 'Edit Hotel' : 'Add Hotel'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Hotel, Airbnb, propiedad..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Zone</label>
          <select
            value={formData.zone}
            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg bg-white/[0.05]"
          >
            <option value="">— Select zone —</option>
            {[...new Set([...zones, formData.zone].filter(Boolean))].sort().map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          disabled={!formData.name || !formData.zone}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-lg hover:bg-gold/90 disabled:opacity-50"
        >
          <Save size={16} />
          {hotel ? 'Save' : 'Add'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-white/[0.06] text-white/75">
          <X size={16} />
          Cancel
        </button>
      </div>
    </div>
  );
}

function AreaForm({
  area,
  onSave,
  onCancel,
}: {
  area: Area | null;
  onSave: (area: { name?: string; oneWayPriceCents?: number; roundTripPriceCents?: number; sprinterOneWayPriceCents?: number; sprinterRoundTripPriceCents?: number }) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: area?.name || '',
    oneWayPrice: area ? area.oneWayPriceCents / 100 : 0,
    roundTripPrice: area ? area.roundTripPriceCents / 100 : 0,
    sprinterOneWayPrice: area ? area.sprinterOneWayPriceCents / 100 : 0,
    sprinterRoundTripPrice: area ? area.sprinterRoundTripPriceCents / 100 : 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name.trim(),
      oneWayPriceCents: Math.round(formData.oneWayPrice * 100),
      roundTripPriceCents: Math.round(formData.roundTripPrice * 100),
      sprinterOneWayPriceCents: Math.round(formData.sprinterOneWayPrice * 100),
      sprinterRoundTripPriceCents: Math.round(formData.sprinterRoundTripPrice * 100),
    });
  };

  return (
    <div className="rounded-2xl border border-gold/30 bg-white/[0.04] p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><Edit size={14} className="text-gold" />{area ? 'Edit Area' : 'New Area'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g. Cabo San Lucas"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">1–5 pax · One-way (USD)</label>
          <input
            type="number"
            min={0}
            step={1}
            required
            value={formData.oneWayPrice || ''}
            onChange={(e) => setFormData({ ...formData, oneWayPrice: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">1–5 pax · Round-trip (USD)</label>
          <input
            type="number"
            min={0}
            step={1}
            required
            value={formData.roundTripPrice || ''}
            onChange={(e) => setFormData({ ...formData, roundTripPrice: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">6+ pax · One-way (USD)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={formData.sprinterOneWayPrice || ''}
            onChange={(e) => setFormData({ ...formData, sprinterOneWayPrice: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="0 = same as 1–5 pax"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">6+ pax · Round-trip (USD)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={formData.sprinterRoundTripPrice || ''}
            onChange={(e) => setFormData({ ...formData, sprinterRoundTripPrice: Number(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="0 = same as 1–5 pax"
          />
        </div>
        <div className="sm:col-span-3 flex gap-2">
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-lg hover:bg-gold/90">
            <Save size={16} />
            {area ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={onCancel} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-white/[0.06] text-white/75">
            <X size={16} />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ExtraForm({
  extra,
  onSave,
  onCancel,
}: {
  extra: PricingExtra | null;
  onSave: (extra: Partial<PricingExtra>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    active: extra?.active ?? true,
    code: extra?.code || 'GROCERY_STOP',
    label: extra?.label || '',
    priceCents: extra ? extra.priceCents / 100 : 0,
    pricingMode: extra?.pricingMode || 'PER_BOOKING',
    maxQty: extra?.maxQty || undefined,
    description: extra?.description || '',
  });

  return (
    <div className="rounded-2xl border border-gold/30 bg-white/[0.04] p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2"><Edit size={14} className="text-gold" />{extra ? 'Edit Extra' : 'New Extra'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <select
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="GROCERY_STOP">Grocery Stop</option>
            <option value="EXTRA_STOP">Extra Stop</option>
            <option value="BABY_SEAT">Baby Seat</option>
            <option value="BOOSTER">Booster</option>
            <option value="SPECIAL_ASSISTANCE">Special Assistance</option>
            <option value="OVERSIZE_LUGGAGE">Oversize Luggage</option>
            <option value="CHAMPAGNE">Champagne</option>
            <option value="CHAMPAGNE_UPGRADE">Champagne (Moët)</option>
            <option value="LUXURY_WELCOME">Luxury Welcome</option>
            <option value="ROMANTIC_KIT">Romantic Kit</option>
            <option value="BIRTHDAY_KIT">Birthday Kit</option>
            <option value="DELUXE_ARRIVAL_KIT">Deluxe Arrival Kit</option>
            <option value="INCLUDED_BASIC_KIT">Included Basic Kit</option>
            <option value="WAIT_TIME">Wait Time</option>
            <option value="LATE_NIGHT">Late Night</option>
            <option value="EARLY_MORNING">Early Morning</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price (USD)</label>
          <input
            type="number"
            step="0.01"
            value={formData.priceCents}
            onChange={(e) => setFormData({ ...formData, priceCents: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pricing Mode</label>
          <select
            value={formData.pricingMode}
            onChange={(e) => setFormData({ ...formData, pricingMode: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="PER_BOOKING">Per Booking</option>
            <option value="PER_STOP">Per Stop</option>
            <option value="PER_SEAT">Per Seat</option>
            <option value="PER_HOUR">Per Hour</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Quantity</label>
          <input
            type="number"
            value={formData.maxQty || ''}
            onChange={(e) =>
              setFormData({ ...formData, maxQty: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ ...formData, priceCents: Math.round(formData.priceCents * 100) })}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-lg hover:bg-gold/90"
        >
          <Save size={16} />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-white/[0.06] text-white/75"
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </div>
  );
}

