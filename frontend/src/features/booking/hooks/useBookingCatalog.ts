import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/shared/lib/api";
import type { HotelOption } from "@/features/booking/hooks/useBookingForm";

export interface AreaPublic {
  id: string;
  name: string;
  oneWayPriceCents: number;
  roundTripPriceCents: number;
  sprinterOneWayPriceCents: number;
  sprinterRoundTripPriceCents: number;
}

export interface PricingExtraPublic {
  code: string;
  label: string;
  labelEs?: string;
  priceCents: number;
  included: boolean;
}

// Fallback usado solo si el backend no responde (p.ej. sin conexión).
const FALLBACK_HOTELS: HotelOption[] = [
  { id: "f-1", name: "Hyatt Ziva Los Cabos", zone: "San Jose del Cabo" },
  { id: "f-2", name: "JW Marriott Los Cabos", zone: "Port Los Cabos" },
  { id: "f-3", name: "Hilton Los Cabos", zone: "Tourist Corridor" },
];

const PRICING_BASE = "/api/v1/pricing";

// Filas crudas (snake_case) tal como las devuelve el backend FastAPI.
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
  code: string;
  label: string;
  label_es?: string | null;
  price_cents: number;
  included: boolean;
  active: boolean;
}
interface RawHotel {
  id: string;
  name: string;
  zone: string;
  is_active: boolean;
}

async function fetchJson<T>(path: string): Promise<T[]> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);
  if (!response.ok) throw new Error(`Failed to fetch ${path}`);
  const json = await response.json();
  return Array.isArray(json) ? json : (json?.items ?? []);
}

async function fetchAreas(): Promise<AreaPublic[]> {
  const items = await fetchJson<RawArea>(`${PRICING_BASE}/areas`);
  return items
    .filter((a) => a.is_active)
    .map((a) => ({
      id: a.id,
      name: a.name,
      oneWayPriceCents: a.one_way_price_cents,
      roundTripPriceCents: a.round_trip_price_cents,
      sprinterOneWayPriceCents: a.sprinter_one_way_price_cents,
      sprinterRoundTripPriceCents: a.sprinter_round_trip_price_cents,
    }));
}

async function fetchExtras(): Promise<PricingExtraPublic[]> {
  const items = await fetchJson<RawExtra>(`${PRICING_BASE}/extras`);
  return items
    .filter((e) => e.active)
    .map((e) => ({
      code: e.code,
      label: e.label,
      labelEs: e.label_es ?? undefined,
      priceCents: e.price_cents,
      included: e.included,
    }));
}

async function fetchHotels(): Promise<{ hotels: HotelOption[]; usedFallback: boolean }> {
  try {
    const items = await fetchJson<RawHotel>(`${PRICING_BASE}/hotels`);
    const hotels = items
      .filter((h) => h.is_active)
      .map((h) => ({ id: h.id, name: h.name, zone: h.zone }));
    if (hotels.length > 0) return { hotels, usedFallback: false };
    return { hotels: FALLBACK_HOTELS, usedFallback: true };
  } catch {
    return { hotels: FALLBACK_HOTELS, usedFallback: true };
  }
}

export function useBookingCatalog() {
  const extrasQuery = useQuery({
    queryKey: ["booking", "extras"],
    queryFn: fetchExtras,
    staleTime: 5 * 60 * 1000,
  });

  const areasQuery = useQuery({
    queryKey: ["booking", "areas"],
    queryFn: fetchAreas,
    staleTime: 5 * 60 * 1000,
  });

  const hotelsQuery = useQuery({
    queryKey: ["booking", "hotels"],
    queryFn: fetchHotels,
    staleTime: 5 * 60 * 1000,
  });

  return {
    pricingExtras: extrasQuery.data ?? [],
    areas: areasQuery.data ?? [],
    hotels: hotelsQuery.data?.hotels ?? [],
    hotelsError: hotelsQuery.data?.usedFallback ?? false,
    hotelsLoading: hotelsQuery.isLoading,
    quoteLoading: extrasQuery.isLoading || areasQuery.isLoading,
  };
}
