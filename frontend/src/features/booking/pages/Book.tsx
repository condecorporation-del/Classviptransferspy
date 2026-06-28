import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Car, Minus, Plus, Plane, MessageCircle, CalendarDays, Clock, MapPin, Sparkles, Shield, ChevronUp, AlertCircle, User, Mail, Phone as PhoneIcon, Lock, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/shared/lib/utils';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { LuxurySpinner } from '@/shared/ui/luxury-spinner';
import { getApiBaseUrl } from '@/shared/lib/api';
import { SEO } from '@/features/marketing/components/SEO';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';
import { getErrorMessage } from '@/shared/lib/errors';
import { includesNormalized } from '@/shared/lib/text';
import { useBookingCatalog } from '@/features/booking/hooks/useBookingCatalog';
import { BOOKING_STEPS, SJD_AIRPORT, useBookingForm, type HotelOption } from '@/features/booking/hooks/useBookingForm';

// Mapeo área → zona de hoteles (areas y hotels usan nombres distintos en algunos casos)
// Puerto Los Cabos / Port Los Cabos: mismo lugar, NO traducir. Ambas normalizan a misma zona.
const AREA_TO_HOTEL_ZONE: Record<string, string> = {
  'Corredor Turistico': 'Tourist Corridor',
  'Tourist Corridor': 'Tourist Corridor',
  'East Cape': 'Pacific & East Cape',
  'Pacific & East Cape': 'Pacific & East Cape',
  'Port Los Cabos': 'Port Los Cabos',
  'Puerto Los Cabos': 'Port Los Cabos',
};
// Zonas que son equivalentes (ej. Puerto Los Cabos = Port Los Cabos, no traducir)
const ZONE_MATCHES = (zoneA: string, zoneB: string) =>
  zoneA === zoneB || (
    (zoneA === 'Port Los Cabos' || zoneA === 'Puerto Los Cabos') &&
    (zoneB === 'Port Los Cabos' || zoneB === 'Puerto Los Cabos')
  );

type UpsellActivity = { id: string; key: string; emoji: string; duration: string; price: number; photo: string };
const upsellActivities: UpsellActivity[] = [
  { id: 'camel',      key: 'activity.camel',      emoji: '🐫', duration: '2h', price: 120, photo: cloudinaryAssets.activities.camel },
  { id: 'horseback',  key: 'activity.horseback',  emoji: '🐎', duration: '2h', price: 120, photo: cloudinaryAssets.activities.horseback },
  { id: 'atv',        key: 'activity.atv',        emoji: '🏍️', duration: '2h', price: 120, photo: cloudinaryAssets.activities.atv },
  { id: 'skyBikes',   key: 'activity.skyBikes',   emoji: '🚲', duration: '2h', price: 96,  photo: cloudinaryAssets.activities.skybikes },
  { id: 'rzr',        key: 'activity.rzr',        emoji: '🏎️', duration: '2h', price: 205, photo: cloudinaryAssets.activities.utv },
];

// 4-photo collage used in activity CTA and combo cards
const ACTIVITY_COLLAGE = [
  cloudinaryAssets.activities.atv,
  cloudinaryAssets.activities.utv,
  cloudinaryAssets.activities.camel,
  cloudinaryAssets.activities.skybikes,
];

// unitPrice/totalPrice van en CENTAVOS de USD — el backend los guarda y
// los recalcula así (igual que Stripe). El resto de la UI muestra dólares.
type BookingLineItem = {
  type: 'TRANSPORTATION' | 'ACTIVITY' | 'COMBO' | 'CRAZY_COMBO' | 'ADDON';
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // code identifica el item en el catálogo server-side (activity id /
  // PricingExtra.code) — el backend lo usa para recalcular el precio real
  // e ignorar unitPrice/totalPrice si reconoce el código.
  code?: string;
};

// Backend codes: BOOSTER, OVERSIZE_LUGGAGE, LUXURY_WELCOME, etc.
const ADDON_META: Record<string, { emoji: string; en: string; es: string; detailEn?: string; detailEs?: string; photo?: string }> = {
  GROCERY_STOP: {
    emoji: '🛒',
    en: 'Grocery Stop', es: 'Parada en Supermercado',
    detailEn: 'Quick stop at Walmart, Costco or Fresko on the way to your hotel.',
    detailEs: 'Parada en Walmart, Costco o Fresko camino a tu hotel.',
    photo: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774146253/Logos_de_Costco_Fre_zjdvpj.png',
  },
  BABY_SEAT: {
    emoji: '',
    en: 'Baby Seat', es: 'Asiento de Bebé',
    detailEn: 'Certified infant safety seat, properly installed.',
    detailEs: 'Silla de seguridad certificada para bebé, correctamente instalada.',
    photo: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774146122/Asiento_de_beb%C3%A9_qcngcw.png',
  },
  BOOSTER: {
    emoji: '',
    en: 'Booster Seat', es: 'Asiento Elevador (Booster)',
    detailEn: 'Certified booster safety seat for toddlers, properly installed.',
    detailEs: 'Silla elevadora certificada para niños, correctamente instalada.',
    photo: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774146402/Booster_seat_para_ni_fe3ctx.png',
  },
  OVERSIZE_LUGGAGE: {
    emoji: '',
    en: 'Oversize / Large Luggage', es: 'Equipaje Grande / Sobredimensionado',
    detailEn: 'Golf clubs, surfboards, extra bags or oversized items.',
    detailEs: 'Palos de golf, tablas de surf, maletas extra o artículos sobredimensionados.',
    photo: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774146748/Maleta_profesional_d_rrzjez.png',
  },
  LUXURY_WELCOME: {
    emoji: '🥂',
    en: 'Premium Welcome Kit — $100', es: 'Kit de Bienvenida Premium — $100',
    detailEn: 'Champagne · Artisan cheese board · Celebration detail (birthday: balloon & cake for 2; anniversary: decoration).',
    detailEs: 'Champagne · Tabla de quesos · Detalle personalizado (cumpleaños: globo y pastelito para 2; aniversario: decoración).',
    photo: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774148344/Combo_luxury_welcome_bcewtn.png',
  },
  CHAMPAGNE: {
    emoji: '🍾',
    en: 'Champagne Welcome', es: 'Bienvenida con Champagne',
    detailEn: 'Chilled bottle of champagne waiting on arrival.',
    detailEs: 'Botella de champagne fría lista a tu llegada.',
    photo: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=160&h=110&fit=crop&auto=format&q=80',
  },
};

const Book = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const {
    current,
    setCurrent,
    step0Attempted,
    data,
    setData,
    dateStepErrors,
    next,
    prev,
    handleNext,
  } = useBookingForm(t);
  const { pricingExtras, areas, hotels, hotelsError, hotelsLoading } = useBookingCatalog();
  const [hotelSearch, setHotelSearch] = useState('');
  const [selectedZoneForHotel, setSelectedZoneForHotel] = useState<string | null>(null);
  const [showActivityOptions, setShowActivityOptions] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'' | 'birthday' | 'anniversary' | 'other'>('');

  // Set airport zone when route changes (SJD = airport)
  useEffect(() => {
    if (data.route === 'airport-hotel') {
      setData((d) => ({ ...d, zoneFrom: 'SJD', zoneTo: d.selectedHotel?.zone || '' }));
    } else if (data.route === 'hotel-airport') {
      setData((d) => ({ ...d, zoneTo: 'SJD', zoneFrom: d.selectedHotel?.zone || '' }));
    }
  }, [data.route, setData]);

  // When hotel selected: set zone, pickup/dropoff, and areaId for pricing (area name matches zone)
  const selectHotel = (hotel: HotelOption) => {
    setData((d) => {
      const next = { ...d, selectedHotel: hotel };
      if (d.route === 'airport-hotel') {
        next.zoneFrom = 'SJD';
        next.zoneTo = hotel.zone;
        next.pickup = SJD_AIRPORT;
        next.dropoff = hotel.name;
      } else if (d.route === 'hotel-airport') {
        next.zoneFrom = hotel.zone;
        next.zoneTo = 'SJD';
        next.pickup = hotel.name;
        next.dropoff = SJD_AIRPORT;
      }
      const zoneForPricing = hotel.zone;
      const area = areas.find((a) => a.name === zoneForPricing || a.name.toLowerCase() === zoneForPricing.toLowerCase());
      if (area) next.areaId = area.id;
      return next;
    });
  };

  // Default first hotel when route set and none selected (one-time); set areaId from zone
  useEffect(() => {
    if (!data.route || data.selectedHotel || hotels.length === 0) return;
    const needZone = data.route === 'airport-hotel' ? !data.zoneTo : !data.zoneFrom;
    if (!needZone) return;
    const first = hotels[0];
    setData((d) => {
      const next = { ...d, selectedHotel: first };
      if (d.route === 'airport-hotel') {
        next.zoneFrom = 'SJD';
        next.zoneTo = first.zone;
        next.pickup = SJD_AIRPORT;
        next.dropoff = first.name;
      } else {
        next.zoneFrom = first.zone;
        next.zoneTo = 'SJD';
        next.pickup = first.name;
        next.dropoff = SJD_AIRPORT;
      }
      const area = areas.find((a) => a.name === first.zone || a.name.toLowerCase() === first.zone.toLowerCase());
      if (area) next.areaId = area.id;
      return next;
    });
  }, [data.route, data.selectedHotel, data.zoneFrom, data.zoneTo, hotels, areas, setData]);

  // When areas load and we already have a selected hotel/zone, set areaId if missing
  useEffect(() => {
    if (areas.length === 0 || data.areaId) return;
    const zone = data.route === 'airport-hotel' ? data.zoneTo : data.route === 'hotel-airport' ? data.zoneFrom : '';
    if (!zone) return;
    const area = areas.find((a) => a.name === zone || a.name.toLowerCase() === zone.toLowerCase());
    if (area) setData((d) => ({ ...d, areaId: area.id }));
  }, [areas, data.route, data.zoneFrom, data.zoneTo, data.areaId, setData]);

  const selectedArea = areas.find((a) => a.id === data.areaId);

  const toggleExtra = (code: string) => {
    setData(d => ({ ...d, extras: d.extras.includes(code) ? d.extras.filter((v) => v !== code) : [...d.extras, code] }));
  };
  const toggleActivity = (val: string) => {
    setData(d => {
      const has = d.activities.includes(val);
      if (has) return { ...d, activities: d.activities.filter(v => v !== val) };
      const max = d.comboMode === 'combo' ? 2 : d.comboMode === 'crazy' ? 3 : 0;
      if (d.activities.length >= max) return d;
      return { ...d, activities: [...d.activities, val] };
    });
  };

  // Transport price from selected area + trip type
  // 1-5 passengers use the standard private rate; 6+ uses the larger-group rate.
  const transferPrice = useMemo(() => {
    if (!data.serviceType || !data.areaId || !data.tripType || !selectedArea) return 0;
    const isSprinter = data.passengers >= 6;
    let cents: number;
    if (isSprinter && selectedArea.sprinterOneWayPriceCents > 0) {
      cents = data.tripType === 'roundtrip' ? selectedArea.sprinterRoundTripPriceCents : selectedArea.sprinterOneWayPriceCents;
    } else {
      cents = data.tripType === 'roundtrip' ? selectedArea.roundTripPriceCents : selectedArea.oneWayPriceCents;
    }
    return cents / 100;
  }, [data.serviceType, data.areaId, data.tripType, data.passengers, selectedArea]);

  const activitiesPrice = useMemo(() => {
    if (data.activities.length === 0) return 0;
    if (data.comboMode === 'combo') return 100 * data.passengers;
    if (data.comboMode === 'crazy') return 125 * data.passengers;
    return 0;
  }, [data.activities, data.comboMode, data.passengers]);

  const extrasPrice = useMemo(() => {
    return data.extras.reduce((acc, code) => {
      const ex = pricingExtras.find(e => e.code === code);
      const cents = ex?.priceCents ?? 0;
      return acc + cents / 100;
    }, 0);
  }, [data.extras, pricingExtras]);

  const total = transferPrice + activitiesPrice + extrasPrice;

  // Create booking and continue to Stripe checkout
  const handleStripeCheckout = async () => {
    if (!reviewValidation.valid && reviewValidation.firstInvalidStepIndex !== null) {
      const sectionKey = `book.step.${BOOKING_STEPS[reviewValidation.firstInvalidStepIndex]}`;
      setBookingError(`${t('book.validation.incomplete')} ${t(sectionKey)}`);
      setCurrent(reviewValidation.firstInvalidStepIndex);
      return;
    }setCreatingBooking(true);
    setBookingError(null);

    try {
      // Determine booking type
      let bookingType: 'TRANSPORTATION' | 'ACTIVITY' | 'COMBO' | 'CRAZY_COMBO' = 'TRANSPORTATION';
      if (data.activities.length > 0) {
        if (data.comboMode === 'crazy') bookingType = 'CRAZY_COMBO';
        else if (data.comboMode === 'combo') bookingType = 'COMBO';
        else bookingType = 'ACTIVITY';
      }

      // Build items: el servidor RECALCULA el precio de TRANSPORTATION desde
      // areaId + tripType + passengers (ver BookingService.create_draft) —
      // el unitPrice que mandamos aquí es solo para mostrar algo razonable
      // si por alguna razón el servidor no pudiera recalcular; nunca es la
      // fuente de verdad del precio final cobrado.
      const items: BookingLineItem[] = [];
      const useAreaPricing = data.serviceType && data.areaId && data.tripType && selectedArea;
      const transferCents = Math.round(transferPrice * 100);

      items.push({
        type: 'TRANSPORTATION',
        name: useAreaPricing
          ? `Transfer: ${selectedArea.name} (${data.tripType === 'roundtrip' ? 'Round trip' : 'One way'})`
          : `${data.serviceType} ${data.tripType} transfer`,
        quantity: 1,
        unitPrice: transferCents,
        totalPrice: transferCents,
      });

      // Add combo item — no se venden actividades sueltas, solo combos de 2
      // (comboMode='combo') o 3 (comboMode='crazy') actividades elegidas por
      // el cliente. data.activities solo se llena cuando hay comboMode (ver
      // toggleActivity más arriba), así que esto siempre cae en uno de los dos.
      if (data.activities.length > 0 && (data.comboMode === 'combo' || data.comboMode === 'crazy')) {
        const comboCode = data.comboMode === 'crazy' ? 'CRAZY_COMBO' : 'COMBO';
        const unitCents = data.comboMode === 'crazy' ? 12500 : 10000;
        const chosenNames = data.activities
          .map(id => upsellActivities.find(a => a.id === id)?.key)
          .filter(Boolean)
          .join(', ');
        items.push({
          type: comboCode,
          name: `${data.comboMode === 'crazy' ? 'Crazy Combo' : 'Combo'}: ${chosenNames}`,
          quantity: data.passengers,
          unitPrice: unitCents,
          totalPrice: unitCents * data.passengers,
          code: comboCode,
        });
      }

      // Add extras as line items
      if (data.extras.length > 0) {
        data.extras.forEach(code => {
          const ex = pricingExtras.find(e => e.code === code);
          if (ex && ex.priceCents > 0) {
            items.push({
              type: 'ADDON',
              name: ex.label,
              code: ex.code,
              quantity: 1,
              unitPrice: ex.priceCents,
              totalPrice: ex.priceCents,
            });
          }
        });
      }

      // Create booking payload (strip undefined to avoid validation issues)
      // Draft customer placeholder; real name/email/phone collected at Checkout
      const bookingPayload: Record<string, unknown> = {
        type: bookingType,
        customer: {
          name: data.customerName || 'Guest',
          email: data.customerEmail || 'guest@example.com',
          phone: data.customerPhone || '+1234567890',
          country: 'US',
          language: lang,
        },
        bookingDate: (data.arrivalDate || new Date()).toISOString(),
        bookingTime: data.arrivalTime || '10:00',
        pickupLocation: data.pickup || '',
        dropoffLocation: data.dropoff || '',
        passengers: data.passengers,
        serviceType: data.serviceType,
        tripType: data.tripType,
        route: data.route,
        items,
      };
      if (useAreaPricing) {
        bookingPayload.areaId = data.areaId;
        bookingPayload.tripType = data.tripType;
      }
      if (data.flightNumber) bookingPayload.flightNumber = data.flightNumber;
      if (data.arrivalTime) bookingPayload.arrivalTime = data.arrivalTime;
      if (data.tripType === 'roundtrip' && data.departureDate) bookingPayload.departureDate = data.departureDate.toISOString();
      if (data.departureFlightNumber) bookingPayload.departureFlightNumber = data.departureFlightNumber;
      if (data.departureTime) bookingPayload.departureTime = data.departureTime;
      if (data.tripType === 'roundtrip' && data.pickupTime) bookingPayload.pickupTime = data.pickupTime;
      const notesParts: string[] = [];
      if (data.extras.length > 0) notesParts.push(`Extras: ${data.extras.map(getExtraLabel).join(', ')}`);
      if (celebrationType) {
        const celebrationLabels: Record<string, string> = { birthday: 'Birthday', anniversary: 'Anniversary', other: 'Special occasion' };
        notesParts.push(`Celebration: ${celebrationLabels[celebrationType] ?? celebrationType}`);
      }
      if (data.specialNote.trim()) notesParts.push(`Note: ${data.specialNote.trim()}`);
      if (notesParts.length > 0) bookingPayload.notes = notesParts.join(' | ');

      // Create booking. OJO: el endpoint es `POST /api/v1/bookings/` CON slash
      // final (la ruta del backend es @router.post("/")). Si se pega sin slash,
      // FastAPI responde 307 redirect al slash; en producción ese redirect
      // cross-origin de un POST con preflight CORS rompe en el navegador
      // (en dev no, porque el proxy de Vite lo absorbe). Con el slash exacto
      // no hay redirect.
      const apiUrl = `${getApiBaseUrl()}/api/v1/bookings/`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() || 'Failed to create booking' };
        }
        
        // Better error messages
        if (response.status === 0 || response.status === 500) {
          throw new Error(lang === 'es' 
            ? 'No se pudo conectar con el servidor. Verifica tu conexión o contacta soporte.' 
            : 'Could not connect to server. Check your connection or contact support.');
        }
        
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to create booking`);
      }

      const result = await response.json();
      // El backend devuelve el booking DIRECTO (BookingResponse), sin envoltorio
      // `.data`. El GET de reservas es público, así que no hay lookupToken en este
      // backend — se deja opcional por compatibilidad (queda undefined sin romper).
      const bookingId = result.id;
      const lookupToken = result.lookupToken;

      if (!bookingId) {
        throw new Error('No booking ID returned');
      }

      if (lookupToken) {
        sessionStorage.setItem(`bt_${bookingId}`, lookupToken);
      }

      const checkoutParams = new URLSearchParams({ bookingId });
      if (lookupToken) {
        checkoutParams.set('bt', lookupToken);
      }

      navigate(`/checkout?${checkoutParams.toString()}`);

    } catch (err) {
      console.error('Error creating booking:', err);
      const message = getErrorMessage(err, lang === 'es' ? 'Error al crear la reserva' : 'Error creating booking');

      // Network errors
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setBookingError(lang === 'es' 
          ? 'Error de conexión. Verifica que el backend esté corriendo o contacta soporte.' 
          : 'Connection error. Verify the backend is running or contact support.');
      } else {
        setBookingError(message);
      }

      setCreatingBooking(false);
    }
  };

  const includedExtras = pricingExtras.filter((e) => e.included);
  const excludedExtras = ['EXTRA_STOP', 'WAIT_TIME', 'LATE_NIGHT', 'EARLY_MORNING', 'SPECIAL_ASSISTANCE'];
  const arrivalUpgradeCodes = ['CHAMPAGNE', 'CHAMPAGNE_UPGRADE', 'BIRTHDAY_KIT', 'ROMANTIC_KIT', 'DELUXE_ARRIVAL_KIT'];
  const paidExtras = pricingExtras.filter((e) => !e.included && !arrivalUpgradeCodes.includes(e.code) && !excludedExtras.includes(e.code));
  const getExtraLabel = (code: string) => {
    const e = pricingExtras.find((x) => x.code === code);
    if (!e) return code;
    return (lang === 'es' && e.labelEs ? e.labelEs : e.label) || code;
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- deps completas y verificadas; el array refleja todos los valores reactivos usados.
  const reviewValidation = useMemo(() => {
    if (!data.customerName.trim() || !data.customerEmail.trim() || !data.customerPhone.trim()) return { valid: false, firstInvalidStepIndex: 0 };
    if (!data.tripType || !data.route || !data.areaId) return { valid: false, firstInvalidStepIndex: 0 };
    const isDep = data.route === 'hotel-airport' && data.tripType !== 'roundtrip';
    const dateOk = isDep ? !!data.departureDate : !!data.arrivalDate;
    if (!dateOk || Object.values(dateStepErrors).some(Boolean)) return { valid: false, firstInvalidStepIndex: 1 };
    if (data.tripType === 'roundtrip') {
      if (!data.departureDate || !data.departureTime?.trim() || !data.pickupTime?.trim()) return { valid: false, firstInvalidStepIndex: 1 };
    }
    if (!data.pickup?.trim() || !data.dropoff?.trim()) return { valid: false, firstInvalidStepIndex: 1 };
    return { valid: true, firstInvalidStepIndex: null as number | null };
  }, [
    data.customerName,
    data.customerEmail,
    data.customerPhone,
    data.tripType,
    data.route,
    data.areaId,
    data.arrivalDate,
    data.departureDate,
    data.departureTime,
    data.pickupTime,
    data.pickup,
    data.dropoff,
    dateStepErrors,
  ]);

  const renderStep = () => {
    switch (BOOKING_STEPS[current]) {
      case 'info': {
        const zonesOrdered = areas.length > 0 ? areas.map((a) => a.name) : [...new Set(hotels.map((h) => h.zone))].sort();
        const zoneSelected = selectedZoneForHotel ?? data.selectedHotel?.zone ?? null;
        const hotelZone = zoneSelected ? (AREA_TO_HOTEL_ZONE[zoneSelected] || zoneSelected) : '';
        const hotelsInZone = hotelZone ? hotels.filter((h) => ZONE_MATCHES(h.zone, hotelZone)) : [];
        const filteredHotels = hotelsInZone.filter(
          (hotel) => includesNormalized(hotel.name, hotelSearch)
        );
        return (
          <div className="space-y-7">
            {/* Header */}
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {lang === 'es' ? 'Información y ruta' : 'Info & Route'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {lang === 'es' ? 'Completa tus datos y selecciona tu hotel.' : 'Enter your contact details and select your hotel.'}
              </p>
            </div>

            {/* Contact Information — clean labels above inputs */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                {lang === 'es' ? 'Tus datos de contacto' : 'Your contact details'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                    {lang === 'es' ? 'Nombre completo *' : 'Full name *'}
                  </label>
                  <div className="relative">
                    <User size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none", step0Attempted && !data.customerName.trim() ? "text-red-400/70" : "text-muted-foreground/50")} />
                    <input type="text"
                      placeholder={lang === 'es' ? 'Ej: John Smith' : 'E.g.: John Smith'}
                      value={data.customerName}
                      onChange={e => setData({ ...data, customerName: e.target.value })}
                      className={cn(
                        "w-full bg-background border-2 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                        step0Attempted && !data.customerName.trim()
                          ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                          : "border-border focus:border-gold/60 focus:ring-gold/20"
                      )}
                    />
                  </div>
                  {step0Attempted && !data.customerName.trim() && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={11} />
                      {lang === 'es' ? 'Este campo es obligatorio' : 'This field is required'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">Email *</label>
                    <div className="relative">
                      <Mail size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none", step0Attempted && !data.customerEmail.trim() ? "text-red-400/70" : "text-muted-foreground/50")} />
                      <input type="email"
                        placeholder="your@email.com"
                        value={data.customerEmail}
                        onChange={e => setData({ ...data, customerEmail: e.target.value })}
                        className={cn(
                          "w-full bg-background border-2 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                          step0Attempted && !data.customerEmail.trim()
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                            : "border-border focus:border-gold/60 focus:ring-gold/20"
                        )}
                      />
                    </div>
                    {step0Attempted && !data.customerEmail.trim() && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} />
                        {lang === 'es' ? 'Este campo es obligatorio' : 'This field is required'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide">
                      {lang === 'es' ? 'Teléfono / WhatsApp *' : 'Phone / WhatsApp *'}
                    </label>
                    <div className="relative">
                      <PhoneIcon size={15} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none", step0Attempted && !data.customerPhone.trim() ? "text-red-400/70" : "text-muted-foreground/50")} />
                      <input type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={data.customerPhone}
                        onChange={e => setData({ ...data, customerPhone: e.target.value })}
                        className={cn(
                          "w-full bg-background border-2 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground/50",
                          step0Attempted && !data.customerPhone.trim()
                            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                            : "border-border focus:border-gold/60 focus:ring-gold/20"
                        )}
                      />
                    </div>
                    {step0Attempted && !data.customerPhone.trim() && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} />
                        {lang === 'es' ? 'Este campo es obligatorio' : 'This field is required'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip type + Route — side by side */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                {lang === 'es' ? 'Tipo de servicio' : 'Service type'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'oneway' as const, label: lang === 'es' ? 'Solo Ida' : 'One Way', sub: lang === 'es' ? 'Un solo trayecto' : 'Single trip' },
                  { id: 'roundtrip' as const, label: lang === 'es' ? 'Ida y Vuelta' : 'Round Trip', sub: lang === 'es' ? 'Aeropuerto ↔ Hotel' : 'Airport ↔ Hotel' },
                ].map(s => (
                  <button key={s.id} type="button"
                    onClick={() => setData({ ...data, tripType: s.id })}
                    className={cn(
                      'rounded-xl p-4 text-left border-2 transition-all',
                      data.tripType === s.id
                        ? 'border-gold bg-gold/5'
                        : 'border-border hover:border-gold/40 bg-background'
                    )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                      </div>
                      {data.tripType === s.id && (
                        <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={11} className="text-navy" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {step0Attempted && !data.tripType && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {lang === 'es' ? 'Selecciona el tipo de viaje' : 'Please select a trip type'}
                </p>
              )}

              {/* Route direction */}
              {data.tripType && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'airport-hotel' as const,
                      label: lang === 'es' ? 'Aeropuerto → Hotel' : 'Airport → Hotel',
                      sub: lang === 'es' ? 'Llegada a destino' : 'Arrival transfer',
                    },
                    {
                      id: 'hotel-airport' as const,
                      label: lang === 'es' ? 'Hotel → Aeropuerto' : 'Hotel → Airport',
                      sub: lang === 'es' ? 'Salida al aeropuerto' : 'Departure transfer',
                    },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setData({ ...data, route: s.id }); setSelectedZoneForHotel(null); }}
                      className={cn(
                        'rounded-2xl p-4 text-left border-2 transition-all duration-200',
                        'shadow-sm hover:shadow-md',
                        data.route === s.id
                          ? 'border-gold/60 bg-gradient-to-br from-[hsl(var(--navy))/9] via-[hsl(var(--navy))/5] to-gold/10 shadow-[0_8px_24px_rgba(7,26,43,0.10)]'
                          : 'border-border/70 hover:border-gold/40 bg-gradient-to-br from-white to-[hsl(var(--sand-light))/70]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={cn(
                            'inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0',
                            data.route === s.id ? 'bg-gold/20 text-gold' : 'bg-[hsl(var(--navy))/8] text-[hsl(var(--navy))/70]'
                          )}>
                            <Plane size={15} />
                          </span>
                          <div>
                            <p className="font-semibold text-sm text-foreground leading-tight">{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                          </div>
                        </div>
                        {data.route === s.id && (
                          <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={11} className="text-navy" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {step0Attempted && data.tripType && !data.route && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} />
                  {lang === 'es' ? 'Selecciona la dirección del traslado' : 'Please select a transfer direction'}
                </p>
              )}
            </div>

            {/* Hotel Selection */}
            {data.route && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  {lang === 'es' ? 'Tu hotel' : 'Your hotel'}
                </h3>

                {!zoneSelected ? (
                  /* Zone selection */
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {lang === 'es' ? 'Selecciona la zona donde está tu hotel:' : 'Select the zone where your hotel is:'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {zonesOrdered.map((zone) => {
                        const hz = AREA_TO_HOTEL_ZONE[zone] || zone;
                        const count = hotels.filter((hotel) => ZONE_MATCHES(hotel.zone, hz)).length;
                        return (
                          <button key={zone} type="button"
                            onClick={() => setSelectedZoneForHotel(zone)}
                            className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-border hover:border-gold/60 bg-background hover:bg-gold/5 transition-all text-left group">
                            <span className="font-semibold text-sm text-foreground group-hover:text-gold transition-colors">{zone}</span>
                            <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                    {hotelsLoading && (
                      <p className="text-sm text-muted-foreground text-center py-2">{t('book.locations.loadingHotels')}</p>
                    )}
                  </div>
                ) : (
                  /* Hotel list inside selected zone */
                  <div className="space-y-3">
                    {/* Zone header + change button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {lang === 'es' ? 'Zona' : 'Zone'}
                        </p>
                        <p className="font-bold text-base text-foreground mt-0.5">{zoneSelected}</p>
                      </div>
                      <button type="button"
                        onClick={() => { setSelectedZoneForHotel(null); setData((d) => ({ ...d, selectedHotel: null })); }}
                        className="inline-flex items-center gap-2 text-sm font-bold text-navy bg-gold hover:bg-gold/90 rounded-xl px-4 py-2 shadow-sm shadow-gold/30 transition-all active:scale-95">
                        <ArrowLeft size={14} />
                        {lang === 'es' ? 'Cambiar zona' : 'Change zone'}
                      </button>
                    </div>

                    {/* Search */}
                    <input type="text"
                      placeholder={lang === 'es' ? 'Buscar hotel...' : 'Search hotel...'}
                      value={hotelSearch}
                      onChange={(e) => setHotelSearch(e.target.value)}
                      className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-muted-foreground/50"
                    />

                    {/* Hotel list */}
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {filteredHotels.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-4 py-3">{t('book.locations.noHotel')}</p>
                      ) : filteredHotels.map((hotel) => {
                        const isSelected = data.selectedHotel?.id === hotel.id;
                        return (
                          <button key={hotel.id} type="button"
                            onClick={() => selectHotel(hotel)}
                            className={cn(
                              'w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between',
                              isSelected
                                ? 'bg-gold/10 text-foreground font-semibold'
                                : 'text-foreground hover:bg-muted/40'
                            )}>
                            <span>{hotel.name}</span>
                            {isSelected && <Check size={14} className="text-gold shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* WhatsApp if hotel not listed */}
                    <a href={`https://wa.me/5216241222174?text=${encodeURIComponent(lang === 'es' ? 'Hola, mi hotel no aparece en la lista. ¿Me pueden ayudar?' : 'Hi, my hotel is not listed. Can you help me?')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-[#25D366] font-medium hover:underline">
                      <MessageCircle size={14} />
                      {lang === 'es' ? '¿No ves tu hotel? Contáctanos' : "Don't see your hotel? Contact us"}
                    </a>
                  </div>
                )}

                {!hotelsLoading && hotelsError && (
                  <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {lang === 'es' ? 'No pudimos cargar hoteles. ' : 'Could not load hotels. '}
                      <a href="https://wa.me/5216241222174" target="_blank" rel="noopener noreferrer" className="text-[#25D366] font-medium hover:underline">WhatsApp</a>
                    </p>
                  </div>
                )}

                {/* Confirmation chip when hotel selected */}
                {data.selectedHotel && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-gold/5 border border-gold/30 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center shrink-0">
                      <Check size={14} className="text-navy" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {lang === 'es' ? 'Hotel seleccionado' : 'Selected hotel'}
                      </p>
                      <p className="font-semibold text-foreground text-sm">{data.selectedHotel.name}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        );
      }
      case 'details': {
        const isDep = data.route === 'hotel-airport' && data.tripType !== 'roundtrip';
        return (
          <div className="space-y-7">
            {/* Header */}
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {lang === 'es' ? 'Fecha & Detalles' : 'Date & Details'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {lang === 'es' ? 'Elige fecha, hora de vuelo y número de pasajeros.' : 'Choose date, flight time, and number of passengers.'}
              </p>
            </div>

            {/* Arrival section — only for airport-hotel or roundtrip */}
            {!isDep && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl border-2 border-border bg-background p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                  <Plane size={14} className="text-gold" />
                </div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  {lang === 'es' ? 'Llegada' : 'Arrival'}
                </h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {/* Arrival date */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                    {lang === 'es' ? 'Fecha' : 'Date'}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "w-full flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 text-sm text-left transition-all hover:border-gold/50 focus:outline-none focus:border-gold/60",
                        !data.arrivalDate && "text-muted-foreground",
                        dateStepErrors.arrivalDate && "border-destructive"
                      )}>
                        <CalendarDays size={16} className="text-gold shrink-0" />
                        <span className={data.arrivalDate ? 'text-foreground font-medium' : ''}>
                          {data.arrivalDate ? format(data.arrivalDate, 'MMM d, yyyy') : (lang === 'es' ? 'Selecciona' : 'Select')}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={data.arrivalDate ?? undefined}
                        onSelect={(d) => d && setData({ ...data, arrivalDate: d })}
                        disabled={(d) => d < new Date()}
                        autoFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  {dateStepErrors.arrivalDate && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle size={11} /> {dateStepErrors.arrivalDate}
                    </p>
                  )}
                </div>

                {/* Arrival time */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                    {lang === 'es' ? 'Hora llegada' : 'Arrival time'}
                  </label>
                  <div className="flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 focus-within:border-gold/60 transition-all">
                    <Clock size={16} className="text-gold shrink-0" />
                    <input type="time" value={data.arrivalTime}
                      onChange={e => setData({ ...data, arrivalTime: e.target.value })}
                      className="bg-transparent text-sm text-foreground font-medium w-full focus:outline-none" />
                  </div>
                </div>

                {/* Flight number */}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                    {lang === 'es' ? 'N° de vuelo' : 'Flight no.'}
                  </label>
                  <div className={cn(
                    "flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 focus-within:border-gold/60 transition-all",
                    dateStepErrors.flightNumber && "border-destructive"
                  )}>
                    <Plane size={16} className="text-gold shrink-0" />
                    <input type="text" placeholder="AA 1234" value={data.flightNumber}
                      onChange={e => setData({ ...data, flightNumber: e.target.value })}
                      className="bg-transparent text-sm text-foreground font-medium w-full focus:outline-none placeholder:text-muted-foreground/50" />
                  </div>
                  {dateStepErrors.flightNumber && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle size={11} /> {dateStepErrors.flightNumber}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
            )}

            {/* Departure section — for hotel-airport oneway OR roundtrip */}
            {(isDep || data.tripType === 'roundtrip') && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl border-2 border-border bg-background p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                    <Plane size={14} className="text-gold rotate-180" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                    {isDep
                      ? (lang === 'es' ? 'Vuelo de Salida' : 'Departure Flight')
                      : (lang === 'es' ? 'Salida' : 'Departure')}
                  </h3>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Departure date */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                      {lang === 'es' ? 'Fecha' : 'Date'}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className={cn(
                          "w-full flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 text-sm text-left transition-all hover:border-gold/50",
                          !data.departureDate && "text-muted-foreground",
                          dateStepErrors.departureDate && "border-destructive"
                        )}>
                          <CalendarDays size={16} className="text-gold shrink-0" />
                          <span className={data.departureDate ? 'text-foreground font-medium' : ''}>
                            {data.departureDate ? format(data.departureDate, 'MMM d, yyyy') : (lang === 'es' ? 'Selecciona' : 'Select')}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={data.departureDate ?? undefined}
                          onSelect={(d) => d && setData({ ...data, departureDate: d, ...(isDep ? { arrivalDate: d } : {}) })}
                          disabled={(d) => d < (isDep ? new Date() : (data.arrivalDate ?? new Date()))}
                          autoFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {dateStepErrors.departureDate && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle size={11} /> {dateStepErrors.departureDate}
                      </p>
                    )}
                  </div>

                  {/* Departure flight number */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                      {lang === 'es' ? 'N° vuelo' : 'Flight no.'}
                    </label>
                    <div className={cn(
                      "flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 focus-within:border-gold/60 transition-all",
                      dateStepErrors.departureFlightNumber && "border-destructive"
                    )}>
                      <Plane size={16} className="text-gold shrink-0 rotate-180" />
                      <input type="text" placeholder="AA 1234" value={data.departureFlightNumber}
                        onChange={e => setData({ ...data, departureFlightNumber: e.target.value })}
                        className="bg-transparent text-sm text-foreground font-medium w-full focus:outline-none placeholder:text-muted-foreground/50" />
                    </div>
                    {dateStepErrors.departureFlightNumber && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle size={11} /> {dateStepErrors.departureFlightNumber}
                      </p>
                    )}
                  </div>

                  {/* Departure time (flight departure time) */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                      {isDep
                        ? (lang === 'es' ? 'Hora de vuelo' : 'Flight departure time')
                        : (lang === 'es' ? 'Hora vuelo' : 'Flight time')}
                    </label>
                    <div className="flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 focus-within:border-gold/60 transition-all">
                      <Clock size={16} className="text-gold shrink-0" />
                      <input type="time" value={data.departureTime}
                        onChange={e => setData({ ...data, departureTime: e.target.value })}
                        className="bg-transparent text-sm text-foreground font-medium w-full focus:outline-none" />
                    </div>
                  </div>
                </div>

                {/* Pickup hint — for hotel-airport oneway: read-only auto-calculated */}
                {isDep && data.departureTime && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div className="flex items-center gap-3 bg-gold/5 border border-gold/25 rounded-xl px-4 py-3">
                      <Clock size={14} className="text-gold shrink-0" />
                      <p className="text-sm text-foreground/80">
                        {lang === 'es'
                          ? `Recogida en hotel a las ${data.arrivalTime || '—'} (3 horas antes de tu vuelo)`
                          : `Hotel pickup at ${data.arrivalTime || '—'} (3 hours before your flight)`}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Pickup time — roundtrip only: editable */}
                {!isDep && data.departureTime && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div className="flex items-center gap-3 bg-gold/5 border border-gold/25 rounded-xl px-4 py-3 mb-3">
                      <Plane size={14} className="text-gold shrink-0" />
                      <p className="text-sm text-foreground/80">{t('book.date.pickupNote')}</p>
                    </div>
                    <div className="sm:max-w-[200px]">
                      <label className="block text-xs font-semibold text-foreground/60 mb-2 uppercase tracking-wide">
                        {lang === 'es' ? 'Hora de recogida' : 'Pickup time'}
                      </label>
                      <div className={cn(
                        "flex items-center gap-2 bg-muted/40 border-2 border-border rounded-xl px-3 py-3 focus-within:border-gold/60 transition-all",
                        dateStepErrors.pickupTime && "border-destructive"
                      )}>
                        <Clock size={16} className="text-gold shrink-0" />
                        <input type="time" value={data.pickupTime}
                          onChange={e => setData({ ...data, pickupTime: e.target.value })}
                          className="bg-transparent text-sm text-foreground font-medium w-full focus:outline-none" />
                      </div>
                      {dateStepErrors.pickupTime && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle size={11} /> {dateStepErrors.pickupTime}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{t('book.date.pickupSuggestion')}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Passengers & Vehicle */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border-2 border-border bg-background p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center">
                  <Car size={14} className="text-gold" />
                </div>
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  {lang === 'es' ? 'Pasajeros' : 'Passengers'}
                </h3>
              </div>

              {/* Passenger counter */}
              <div>
                <label className="block text-xs font-semibold text-foreground/60 mb-3 uppercase tracking-wide">
                  {t('book.date.passengers')}
                </label>
                <div className="flex items-center gap-4">
                  <motion.button type="button"
                    onClick={() => setData((d) => {
                      return { ...d, passengers: Math.max(1, d.passengers - 1) };
                    })}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="w-11 h-11 rounded-xl border-2 border-border bg-muted/40 flex items-center justify-center hover:border-gold/60 hover:bg-gold/5 transition-all font-bold">
                    <Minus size={16} />
                  </motion.button>
                  <div className="text-center min-w-[56px]">
                    <motion.span
                      key={data.passengers}
                      initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="block text-4xl font-bold text-foreground leading-none">
                      {data.passengers}
                    </motion.span>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {data.passengers === 1 ? (lang === 'es' ? 'pasajero' : 'passenger') : (lang === 'es' ? 'pasajeros' : 'passengers')}
                    </span>
                  </div>
                  <motion.button type="button"
                    onClick={() => setData((d) => {
                      return { ...d, passengers: Math.min(14, d.passengers + 1) };
                    })}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="w-11 h-11 rounded-xl border-2 border-border bg-muted/40 flex items-center justify-center hover:border-gold/60 hover:bg-gold/5 transition-all font-bold">
                    <Plus size={16} />
                  </motion.button>
                </div>
              </div>

            </motion.div>

            {/* Transfer Points — minimal, only show if no hotel auto-filled */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                {lang === 'es' ? 'Puntos de traslado' : 'Transfer points'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {lang === 'es' ? 'Llenados automáticamente desde tu hotel. Puedes editarlos si es necesario.' : 'Auto-filled from your hotel. Edit if needed.'}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin size={12} className="text-gold" />
                    {lang === 'es' ? 'Recogida' : 'Pickup'}
                  </label>
                  <input type="text" placeholder={t('book.locations.placeholder')} value={data.pickup}
                    onChange={e => setData({ ...data, pickup: e.target.value })}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-muted-foreground/50" />
                  {!data.pickup && (
                    <button type="button" onClick={() => setData(d => ({ ...d, pickup: SJD_AIRPORT }))}
                      className="mt-1.5 text-xs text-gold font-semibold hover:underline">
                      → {lang === 'es' ? 'Usar Aeropuerto SJD' : 'Use SJD Airport'}
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin size={12} className="text-gold" />
                    {lang === 'es' ? 'Destino' : 'Dropoff'}
                  </label>
                  <input type="text" placeholder={t('book.locations.placeholder')} value={data.dropoff}
                    onChange={e => setData({ ...data, dropoff: e.target.value })}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-all placeholder:text-muted-foreground/50" />
                  {!data.dropoff && (
                    <button type="button" onClick={() => setData(d => ({ ...d, dropoff: SJD_AIRPORT }))}
                      className="mt-1.5 text-xs text-gold font-semibold hover:underline">
                      → {lang === 'es' ? 'Usar Aeropuerto SJD' : 'Use SJD Airport'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
      case 'extras':
        return (
          <div className="space-y-7">
            {/* Header */}
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {lang === 'es' ? 'Extras & Actividades' : 'Extras & Activities'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {lang === 'es' ? 'Complementos de bienvenida, sillas de bebé, aventuras y más.' : 'Welcome upgrades, baby seats, adventures, and more.'}
              </p>
            </div>

            {/* Included strip */}
            {includedExtras.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="text-base">💧</span><span className="text-base">🍺</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                    {lang === 'es' ? 'Incluido sin costo' : 'Complimentary'}
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    {includedExtras.map((e) => (lang === 'es' && e.labelEs ? e.labelEs : e.label)).join(' · ')}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Add-ons — professional photo cards */}
            {paidExtras.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">
                    {lang === 'es' ? 'Complementos opcionales' : 'Optional add-ons'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === 'es' ? 'Mejora tu experiencia con estos extras' : 'Enhance your experience with these add-ons'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {paidExtras.map((ex, i) => {
                    const selected = data.extras.includes(ex.code);
                    const meta = ADDON_META[ex.code];
                    return (
                      <motion.button key={ex.code} type="button"
                        onClick={() => toggleExtra(ex.code)}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
                        className={cn(
                          'w-full rounded-xl text-left overflow-hidden border-2 transition-all duration-200',
                          'bg-card shadow-sm hover:shadow-md',
                          selected ? 'border-gold ring-2 ring-gold/30 shadow-gold/10' : 'border-border hover:border-gold/60'
                        )}>
                        <div className="flex min-h-[100px]">
                          {/* Photo */}
                          <div className="w-28 sm:w-32 shrink-0 relative bg-muted/30 flex items-center justify-center overflow-hidden">
                            {meta?.photo ? (
                              <img src={meta.photo} alt={meta.en}
                                loading="lazy"
                                className="w-full h-full object-contain p-2"
                                onError={e => { const el = e.currentTarget; el.onerror = null; el.style.display = 'none'; }}
                              />
                            ) : null}
                            <span className={cn('text-3xl', meta?.photo ? 'absolute inset-0 flex items-center justify-center' : '')}>{meta?.emoji ?? '✨'}</span>
                            {selected && (
                              <div className="absolute inset-0 bg-gold/25 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center shadow-lg">
                                  <Check size={16} className="text-navy" strokeWidth={3} />
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Content */}
                          <div className={cn(
                            'flex-1 p-4 flex flex-col justify-between min-w-0',
                            selected ? 'bg-gold/5' : ''
                          )}>
                            <div>
                              <p className="font-semibold text-foreground text-sm leading-tight">
                                {lang === 'es' && ex.labelEs ? ex.labelEs : ex.label}
                              </p>
                              {meta && (
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                                  {lang === 'es' ? (meta.detailEs ?? meta.es) : (meta.detailEn ?? meta.en)}
                                </p>
                              )}
                            </div>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {lang === 'es' ? 'Precio' : 'Price'}
                              </span>
                              <span className="font-bold text-gold text-base">
                                ${(ex.priceCents / 100).toFixed(0)}
                                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">USD</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Welcome Package celebration picker — only when PREMIUM_WELCOME selected */}
            {data.extras.includes('LUXURY_WELCOME') && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-gold/40 bg-gold/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥂</span>
                  <div>
                    <p className="font-bold text-sm text-foreground">
                      {lang === 'es' ? '¿Cuál es la ocasión?' : "What's the occasion?"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'es' ? 'Personalizamos tu paquete según la celebración' : 'We customize your package for the celebration'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['birthday', 'anniversary', 'other'] as const).map(type => {
                    const labels = {
                      birthday:    { es: '🎂 Cumpleaños', en: '🎂 Birthday' },
                      anniversary: { es: '💍 Aniversario', en: '💍 Anniversary' },
                      other:       { es: '🎉 Otra',        en: '🎉 Other' },
                    };
                    return (
                      <button key={type} type="button"
                        onClick={() => setCelebrationType(celebrationType === type ? '' : type)}
                        className={cn(
                          'rounded-xl py-3 px-2 text-center text-xs font-semibold border-2 transition-all',
                          celebrationType === type
                            ? 'border-gold bg-gold/15 text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-gold/40'
                        )}>
                        {lang === 'es' ? labels[type].es : labels[type].en}
                      </button>
                    );
                  })}
                </div>
                {celebrationType === 'birthday' && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground bg-background rounded-xl px-4 py-3 border border-border">
                    🎂 {lang === 'es'
                      ? 'Incluye: tabla de quesos + pastelito simbólico para 2 personas + champagne + globo de cumpleaños.'
                      : 'Includes: cheese board · symbolic cake for 2 · champagne · birthday balloon.'}
                  </motion.p>
                )}
                {celebrationType === 'anniversary' && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground bg-background rounded-xl px-4 py-3 border border-border">
                    💍 {lang === 'es'
                      ? 'Incluye: champagne + tabla de quesos artesanales.'
                      : 'Includes: champagne · artisan cheese board.'}
                  </motion.p>
                )}
                <div>
                  <label className="block text-xs font-semibold text-foreground/60 uppercase tracking-wide mb-1.5">
                    📝 {lang === 'es' ? 'Nota adicional (opcional)' : 'Additional note (optional)'}
                  </label>
                  <textarea rows={2}
                    placeholder={lang === 'es'
                      ? 'Ej: nombre del festejado, algún detalle especial...'
                      : 'E.g.: name of the guest of honor, any special detail...'}
                    value={data.specialNote}
                    onChange={e => setData({ ...data, specialNote: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/60 transition-all resize-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </motion.div>
            )}

            {/* Activities — expandable with photo grid */}
            <div className="pt-4 border-t border-border space-y-4">
              {!showActivityOptions && !data.comboMode ? (
                <motion.button type="button" onClick={() => setShowActivityOptions(true)}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="w-full rounded-2xl overflow-hidden border-2 border-gold/40 hover:border-gold transition-all relative group h-20">
                  {/* 4-photo horizontal strip */}
                  <div className="absolute inset-0 flex">
                    {ACTIVITY_COLLAGE.map((src, i) => (
                      <div key={i} className="flex-1 overflow-hidden relative">
                        <img src={src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        {/* thin divider between photos */}
                        {i < 3 && <div className="absolute right-0 inset-y-0 w-px bg-black/30" />}
                      </div>
                    ))}
                  </div>
                  {/* Dark overlay + text */}
                  <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/50 to-navy/30" />
                  <div className="relative z-10 flex items-center gap-3 px-5 h-full">
                    <Sparkles size={18} className="text-gold shrink-0" />
                    <div className="text-left">
                      <p className="font-bold text-base text-white leading-tight">
                        {lang === 'es' ? 'Agregar actividades' : 'Add activities'}
                      </p>
                      <p className="text-xs text-white/60">
                        ATV · RZR · Camellos · Sky Bikes · {lang === 'es' ? 'más' : 'more'}
                      </p>
                    </div>
                    <span className="ml-auto text-gold font-bold text-sm shrink-0">
                      {lang === 'es' ? 'desde $100/persona' : 'from $100/person'}
                    </span>
                  </div>
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      {lang === 'es' ? 'Elige tu combo' : 'Choose your combo'}
                    </p>
                    {!data.comboMode && (
                      <button type="button" onClick={() => { setShowActivityOptions(false); setData(d => ({ ...d, comboMode: '', activities: [] })); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline">
                        {lang === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                    )}
                  </div>

                  {/* Combo cards — 2×2 photo collage */}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      {
                        mode: 'combo', count: 2, price: 100, label: 'Combo',
                        // Combo: 2 activities — show ATV + Camel
                        collage: [ACTIVITY_COLLAGE[0], ACTIVITY_COLLAGE[2], ACTIVITY_COLLAGE[3], ACTIVITY_COLLAGE[1]],
                      },
                      {
                        mode: 'crazy', count: 3, price: 125, label: 'Crazy Combo',
                        // Crazy: all 4 quadrants
                        collage: ACTIVITY_COLLAGE,
                      },
                    ] as const).map(opt => (
                      <button key={opt.mode} type="button"
                        onClick={() => setData(d => ({ ...d, comboMode: opt.mode, activities: d.activities.slice(0, opt.count) }))}
                        className={cn(
                          'rounded-2xl border-2 text-left transition-all relative overflow-hidden h-44',
                          data.comboMode === opt.mode ? 'border-gold shadow-lg shadow-gold/20' : 'border-border hover:border-gold/50'
                        )}>
                        {/* 2×2 photo collage */}
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                          {opt.collage.map((src, i) => (
                            <div key={i} className="overflow-hidden relative">
                              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                              {/* thin grid lines */}
                              {(i === 0 || i === 2) && <div className="absolute right-0 inset-y-0 w-px bg-black/40" />}
                              {(i === 0 || i === 1) && <div className="absolute bottom-0 inset-x-0 h-px bg-black/40" />}
                            </div>
                          ))}
                        </div>
                        {/* Bottom gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/40 to-black/10" />
                        {/* Top label badge */}
                        {data.comboMode === opt.mode && (
                          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full gold-gradient flex items-center justify-center shadow">
                            <Check size={13} className="text-navy" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="font-display font-bold text-base text-white">{opt.label}</p>
                          <p className="text-white/70 text-xs">{opt.count} {lang === 'es' ? 'actividades a elegir' : 'activities to pick'}</p>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-gold font-bold text-xl">${opt.price}</span>
                            <span className="text-white/60 text-[10px]">/{lang === 'es' ? 'persona' : 'person'}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Activity photo grid */}
                  {data.comboMode && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-foreground">
                          {lang === 'es' ? 'Selecciona tus actividades' : 'Select your activities'}
                        </p>
                        <span className={cn(
                          'text-xs font-bold px-3 py-1 rounded-full',
                          data.activities.length === (data.comboMode === 'combo' ? 2 : 3)
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            : 'bg-gold/10 text-gold'
                        )}>
                          {data.activities.length}/{data.comboMode === 'combo' ? 2 : 3}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {upsellActivities.map(act => {
                          const selected = data.activities.includes(act.id);
                          const maxReached = (data.comboMode === 'combo' && data.activities.length >= 2) ||
                                             (data.comboMode === 'crazy' && data.activities.length >= 3);
                          const disabled = !selected && maxReached;
                          return (
                            <button key={act.id} type="button"
                              onClick={() => !disabled && toggleActivity(act.id)} disabled={disabled}
                              className={cn(
                                'rounded-xl overflow-hidden border-2 relative h-28 text-left transition-all',
                                selected ? 'border-gold shadow-md shadow-gold/20' : disabled ? 'opacity-40 cursor-not-allowed border-border/50' : 'border-border hover:border-gold/50'
                              )}>
                              {act.photo ? (
                                <img src={act.photo} alt={t(act.key)} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 bg-muted flex items-center justify-center text-4xl">{act.emoji}</div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2.5">
                                <p className="font-bold text-xs text-white leading-tight">{t(act.key)}</p>
                              </div>
                              {selected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full gold-gradient flex items-center justify-center">
                                  <Check size={11} className="text-navy" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 border border-border">
                        <Shield size={13} className="text-gold flex-shrink-0 mt-0.5" />
                        <span>{lang === 'es' ? 'Incluye transporte, equipo y guía bilingüe. Entrada al parque $25/persona en sitio.' : 'Includes transport, equipment & bilingual guide. Park fee $25/person on-site.'}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-5">
            {/* Mobile back link — review step has no bottom nav bar */}
            <button
              type="button"
              onClick={prev}
              className="lg:hidden flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -mt-1 mb-1"
            >
              <ArrowLeft size={15} /> {lang === 'es' ? 'Volver' : 'Back'}
            </button>

            {/* Header */}
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {lang === 'es' ? 'Resumen y Pago' : 'Review & Pay'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {lang === 'es' ? 'Revisa los detalles y procede al pago seguro.' : 'Confirm your details and proceed to secure payment.'}
              </p>
            </div>

            {/* Validation alert */}
            {!reviewValidation.valid && reviewValidation.firstInvalidStepIndex !== null && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t('book.validation.incomplete')}{' '}
                    <span className="font-bold">{stepLabels[BOOKING_STEPS[reviewValidation.firstInvalidStepIndex]]}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setCurrent(reviewValidation.firstInvalidStepIndex!)}
                  className="shrink-0 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 inline-flex items-center gap-1.5">
                  {t('book.validation.goTo')} <ArrowRight size={14} />
                </button>
              </motion.div>
            )}

            {/* ── Section 1: Customer ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-muted/40 border-b border-border">
                <User size={14} className="text-foreground/50" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {lang === 'es' ? 'Tus datos' : 'Your details'}
                </h3>
                {data.customerName && (
                  <button type="button" onClick={() => setCurrent(0)}
                    className="ml-auto text-xs text-gold font-semibold hover:underline">
                    {lang === 'es' ? 'Editar' : 'Edit'}
                  </button>
                )}
              </div>
              <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <ReviewRow label={lang === 'es' ? 'Nombre' : 'Name'} value={data.customerName || '—'} />
                <ReviewRow label="Email" value={data.customerEmail || '—'} />
                <ReviewRow label={lang === 'es' ? 'Teléfono' : 'Phone'} value={data.customerPhone || '—'} />
                <ReviewRow label={lang === 'es' ? 'Pasajeros' : 'Passengers'} value={`${data.passengers} ${data.passengers === 1 ? (lang === 'es' ? 'persona' : 'person') : (lang === 'es' ? 'personas' : 'people')}`} />
              </div>
            </motion.div>

            {/* ── Section 2: Trip details ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-muted/40 border-b border-border">
                <Plane size={14} className="text-foreground/50" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {lang === 'es' ? 'Tu traslado' : 'Your transfer'}
                </h3>
                {(data.tripType || data.route || data.selectedHotel) && (
                  <button type="button" onClick={() => setCurrent(0)}
                    className="ml-auto text-xs text-gold font-semibold hover:underline">
                    {lang === 'es' ? 'Editar' : 'Edit'}
                  </button>
                )}
              </div>
              <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <ReviewRow label={lang === 'es' ? 'Tipo' : 'Type'}
                  value={data.tripType === 'roundtrip' ? (lang === 'es' ? 'Ida y Vuelta' : 'Round Trip') : (lang === 'es' ? 'Solo Ida' : 'One Way')} />
                <ReviewRow label={lang === 'es' ? 'Ruta' : 'Route'}
                  value={data.route === 'airport-hotel' ? (lang === 'es' ? 'Aeropuerto → Hotel' : 'Airport → Hotel') : (lang === 'es' ? 'Hotel → Aeropuerto' : 'Hotel → Airport')} />
                <ReviewRow label="Hotel" value={data.selectedHotel?.name || '—'} />
                <ReviewRow label={lang === 'es' ? 'Llegada' : 'Arrival'}
                  value={data.arrivalDate ? `${format(data.arrivalDate, 'MMM d, yyyy')}${data.arrivalTime ? ` · ${data.arrivalTime}` : ''}` : '—'} />
                {data.tripType === 'roundtrip' && data.departureDate && (
                  <ReviewRow label={lang === 'es' ? 'Salida' : 'Departure'}
                    value={`${format(data.departureDate, 'MMM d, yyyy')}${data.departureTime ? ` · ${data.departureTime}` : ''}`} />
                )}
                {data.flightNumber && <ReviewRow label={lang === 'es' ? 'Vuelo llegada' : 'Arrival flight'} value={data.flightNumber} />}
                {data.departureFlightNumber && <ReviewRow label={lang === 'es' ? 'Vuelo salida' : 'Dep. flight'} value={data.departureFlightNumber} />}
                <ReviewRow label={lang === 'es' ? 'Recogida' : 'Pickup'} value={data.pickup || '—'} />
                <ReviewRow label={lang === 'es' ? 'Destino' : 'Dropoff'} value={data.dropoff || '—'} />
              </div>
            </motion.div>

            {/* ── Section 3: Extras if selected ── */}
            {(data.extras.length > 0 || data.activities.length > 0 || data.specialNote.trim()) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="rounded-2xl border border-border bg-background overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 bg-muted/40 border-b border-border">
                  <Sparkles size={14} className="text-foreground/50" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    {lang === 'es' ? 'Extras seleccionados' : 'Selected extras'}
                  </h3>
                  <button type="button" onClick={() => setCurrent(2)}
                    className="ml-auto text-xs text-gold font-semibold hover:underline">
                    {lang === 'es' ? 'Editar' : 'Edit'}
                  </button>
                </div>
                <div className="px-5 py-4 space-y-2 text-sm">
                  {data.extras.map(code => (
                    <div key={code} className="flex items-center gap-2">
                      <Check size={13} className="text-gold shrink-0" />
                      <span className="text-foreground font-medium">{getExtraLabel(code)}</span>
                    </div>
                  ))}
                  {data.activities.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-gold shrink-0" />
                      <span className="text-foreground font-medium">
                        {data.comboMode === 'crazy' ? 'Crazy Combo' : 'Combo'} — {data.activities.map(id => {
                          const act = upsellActivities.find(a => a.id === id);
                          return act ? t(act.key) : id;
                        }).join(', ')}
                      </span>
                    </div>
                  )}
                  {data.specialNote.trim() && (
                    <p className="text-muted-foreground italic text-xs pt-1">{data.specialNote}</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Section 4: Price breakdown ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="rounded-2xl border-2 border-gold/30 bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-gold/5 border-b border-gold/20">
                <CreditCard size={14} className="text-gold/70" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {lang === 'es' ? 'Desglose de precios' : 'Price breakdown'}
                </h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {data.serviceType && selectedArea ? (
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{lang === 'es' ? 'Traslado privado' : 'Private transfer'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedArea.name} · {data.tripType === 'roundtrip' ? (lang === 'es' ? 'Ida y vuelta' : 'Round trip') : (lang === 'es' ? 'Solo ida' : 'One way')}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">${transferPrice.toFixed(0)}</span>
                  </div>
                ) : data.serviceType ? (
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-foreground">{lang === 'es' ? 'Traslado' : 'Transfer'}</span>
                    <span className="font-bold text-foreground">${transferPrice.toFixed(0)}</span>
                  </div>
                ) : null}

                {activitiesPrice > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                    <div>
                      <p className="font-semibold text-foreground">
                        {data.comboMode === 'crazy' ? 'Crazy Combo' : 'Combo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.passengers} {lang === 'es' ? 'personas' : 'people'} × ${data.comboMode === 'crazy' ? 125 : 100}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">${activitiesPrice}</span>
                  </div>
                )}

                {extrasPrice > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                    <span className="font-semibold text-foreground">{lang === 'es' ? 'Extras' : 'Add-ons'}</span>
                    <span className="font-bold text-foreground">${extrasPrice.toFixed(0)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-gold/30">
                  <span className="font-display font-bold text-base text-foreground">{t('book.review.total')}</span>
                  <span className="font-display font-bold text-2xl text-gold">${Math.round(total)} USD</span>
                </div>
              </div>
            </motion.div>

            {/* ── CTA: Stripe Checkout ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="space-y-3">

              {/* Security trust bar */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5 text-foreground/60">
                  <Shield size={13} className="text-green-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {lang === 'es' ? 'SSL Cifrado' : 'SSL Encrypted'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground/60">
                  <Lock size={13} className="text-[#635BFF]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {lang === 'es' ? 'Pagos seguros vía' : 'Secure payments via'}
                  </span>
                  <span className="text-[13px] font-bold italic" style={{ color: '#635BFF', letterSpacing: '-0.3px' }}>stripe</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground/60">
                  <CreditCard size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {lang === 'es' ? 'Cifrado 256-bit' : '256-bit encryption'}
                  </span>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handleStripeCheckout}
                disabled={creatingBooking || !reviewValidation.valid}
                className="w-full rounded-2xl overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-shadow hover:shadow-[0_16px_48px_rgba(212,175,55,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                style={{ boxShadow: '0 8px 28px rgba(212,175,55,0.28)' }}
              >
                <div className="px-6 py-4 flex items-center justify-between"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F5C842 60%, #D4AF37 100%)' }}>
                  <div className="flex items-center gap-3">
                    {creatingBooking
                      ? <LuxurySpinner size={20} />
                      : <Lock size={20} style={{ color: '#0A1628' }} />}
                    <span className="font-bold text-lg tracking-wide" style={{ color: '#0A1628' }}>
                      {creatingBooking
                        ? (lang === 'es' ? 'Procesando...' : 'Processing...')
                        : (lang === 'es' ? 'Pagar Ahora' : 'Pay Now')}
                    </span>
                  </div>
                  <span className="font-display font-bold text-xl" style={{ color: '#0A1628' }}>
                    ${Math.round(total)} USD
                  </span>
                </div>
                <div className="py-2 flex items-center justify-center gap-2"
                  style={{ background: '#071524', borderTop: '1px solid rgba(212,175,55,0.18)' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.03em' }}>
                    {lang === 'es' ? 'Protegido por' : 'Secured by'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontStyle: 'italic', color: '#635BFF', letterSpacing: '-0.3px' }}>
                    stripe
                  </span>
                </div>
              </button>

              {bookingError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center space-y-2">
                  <p className="text-sm text-destructive">{bookingError}</p>
                  <a href="https://wa.me/5216241222174" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#25D366] font-semibold hover:underline">
                    <MessageCircle size={14} />
                    {lang === 'es' ? 'Reservar por WhatsApp' : 'Book via WhatsApp'}
                  </a>
                </motion.div>
              )}
            </motion.div>
          </div>
        );
      default:
        return (
          <div className="space-y-5">
            <h2 className="font-display text-2xl font-bold text-foreground">{t('book.title')}</h2>
            <p className="text-muted-foreground text-sm">{lang === 'es' ? 'Cargando...' : 'Loading...'}</p>
          </div>
        );
    }
  };

  const stepLabels: Record<string, string> = {
    info: lang === 'es' ? 'Información' : 'Info',
    details: lang === 'es' ? 'Detalles' : 'Details',
    extras: lang === 'es' ? 'Extras' : 'Extras',
    review: lang === 'es' ? 'Resumen' : 'Review',
  };

  return (
    <div className="pt-28 pb-36 lg:pb-24 px-4 min-h-screen bg-gradient-to-b from-background to-muted/30">
      <SEO
        title="Book a Private Airport Transfer in Los Cabos"
        description="Book your private luxury airport transfer in Los Cabos in minutes. Choose your vehicle, route, date, and extras. Secure payment via Stripe."
        keywords="book cabo transfer, reserve los cabos transportation, cabo airport pickup, private driver reservation los cabos"
        canonical="https://www.classviptransfers.com/book"
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Book a Private Airport Transfer — Los Cabos',
          provider: { '@type': 'LocalBusiness', name: 'Class VIP Transfers', url: 'https://www.classviptransfers.com' },
          areaServed: { '@type': 'Place', name: 'Los Cabos, Baja California Sur, Mexico' },
          description: 'Book a private luxury transfer from SJD Airport to your hotel in Los Cabos.',
          offers: { '@type': 'Offer', priceCurrency: 'USD', price: '90', priceValidUntil: '2027-12-31' },
        }, {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.classviptransfers.com/' },
            { '@type': 'ListItem', position: 2, name: 'Book', item: 'https://www.classviptransfers.com/book' },
          ],
        }]}
      />
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{t('book.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {lang === 'es'
              ? 'Reserva en minutos · Pago seguro con Stripe'
              : 'Book in minutes · Secure payment via Stripe'}
          </p>
        </motion.div>

        {/* Modern Stepper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-10"
        >
          <div className="hidden md:flex items-center justify-between gap-1">
            {BOOKING_STEPS.map((step, i) => {
              const isActive = i === current;
              const isComplete = i < current;
              const isClickable = i <= current;
              return (
                <div key={step} className="flex flex-1 items-center last:flex-initial">
                  <button
                    type="button"
                    onClick={() => isClickable && setCurrent(i)}
                    disabled={!isClickable}
                    className={cn(
                      'flex flex-col items-center gap-1.5 transition-all duration-300',
                      isClickable && 'cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                        isActive && 'gold-gradient text-secondary-foreground shadow-lg shadow-gold/20 scale-110',
                        isComplete && 'bg-gold/20 text-gold',
                        !isActive && !isComplete && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check size={16} strokeWidth={3} /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-medium max-w-[4rem] text-center leading-tight transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {(typeof stepLabels[step] === 'string' ? stepLabels[step] : step).split(' ')[0]}
                    </span>
                  </button>
                  {i < BOOKING_STEPS.length - 1 && (
                    <div className="flex-1 min-w-[12px] h-0.5 mx-0.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-gold/60 rounded-full"
                        initial={false}
                        animate={{ width: current > i ? '100%' : 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Mobile: compact progress with step label */}
          <div className="md:hidden space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{stepLabels[BOOKING_STEPS[current]] || BOOKING_STEPS[current]}</span>
                {current < BOOKING_STEPS.length - 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    → {stepLabels[BOOKING_STEPS[current + 1]]}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-gold tabular-nums">{current + 1} / {BOOKING_STEPS.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full gold-gradient rounded-full"
                initial={false}
                animate={{ width: `${((current + 1) / BOOKING_STEPS.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                style={{ width: `${((current + 1) / BOOKING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Wizard */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons - touch-friendly min height on mobile */}
            <motion.div
              layout
              className="hidden lg:flex justify-between items-center mt-10 gap-4 touch-target"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <motion.button
                onClick={prev}
                disabled={current === 0}
                whileHover={current > 0 ? { scale: 1.02 } : {}}
                whileTap={current > 0 ? { scale: 0.98 } : {}}
                className={cn(
                  'flex items-center gap-2 text-sm font-semibold py-3 px-4 rounded-xl transition-all duration-200',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
                )}
              >
                <ArrowLeft size={18} /> {t('book.back')}
              </motion.button>
              {current < BOOKING_STEPS.length - 1 && (
                <motion.button
                  onClick={handleNext}
                  disabled={current === 1 && Object.values(dateStepErrors).some(Boolean)}
                  whileHover={current !== 2 || !Object.values(dateStepErrors).some(Boolean) ? { scale: 1.02 } : {}}
                  whileTap={current !== 2 || !Object.values(dateStepErrors).some(Boolean) ? { scale: 0.98 } : {}}
                  className={cn(
                    "gold-gradient text-navy px-10 py-3.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-gold/25 transition-shadow",
                    current === 1 && Object.values(dateStepErrors).some(Boolean)
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-xl hover:shadow-gold/30 active:scale-[0.98]"
                  )}
                >
                  {t('book.next')} <ArrowRight size={18} />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Sticky Summary (desktop) */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-32 rounded-2xl border border-gold/15 bg-card shadow-sm p-6 space-y-4">
              <h3 className="font-display text-lg font-bold text-foreground">{t('book.summary')}</h3>
              <div className="space-y-2.5 text-sm">
                {data.tripType && (
                  <Row label={t('book.review.trip')} value={
                    data.tripType === 'roundtrip'
                      ? (lang === 'es' ? 'Ida y Vuelta' : 'Round Trip')
                      : (lang === 'es' ? 'Solo Ida' : 'One Way')
                  } />
                )}
                {data.route && (
                  <Row label={t('book.review.route')} value={
                    data.route === 'airport-hotel'
                      ? (lang === 'es' ? 'Aeropuerto → Hotel' : 'Airport → Hotel')
                      : (lang === 'es' ? 'Hotel → Aeropuerto' : 'Hotel → Airport')
                  } />
                )}
                {data.selectedHotel && <Row label="Hotel" value={data.selectedHotel.name} />}
                {data.arrivalDate && <Row label={t('book.review.date')} value={format(data.arrivalDate, 'PPP')} />}
                <Row label={t('book.review.passengers')} value={`${data.passengers} ${data.passengers === 1 ? (lang === 'es' ? 'persona' : 'person') : (lang === 'es' ? 'personas' : 'people')}`} />
                {data.pickup && <Row label={t('book.review.pickup')} value={data.pickup} />}
                {data.extras.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">{t('book.review.extras')}</span>
                    {data.extras.map(e => <span key={e} className="inline-block bg-gold/10 text-gold text-xs font-semibold px-2.5 py-1 rounded-full mr-1 mb-1">{getExtraLabel(e)}</span>)}
                  </div>
                )}
                {data.activities.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block mb-1">{t('book.review.activitiesUpsell')}</span>
                    {data.activities.map(id => {
                      const act = upsellActivities.find(a => a.id === id);
                      return <span key={id} className="inline-block bg-gold/10 text-gold text-xs font-semibold px-2.5 py-1 rounded-full mr-1 mb-1">{act ? t(act.key) : id}</span>;
                    })}
                  </div>
                )}
                {!data.serviceType && <p className="text-muted-foreground text-sm italic">{t('book.summaryEmpty')}</p>}
              </div>

              {transferPrice > 0 && (
                <div className="border-t border-border pt-4 space-y-2.5">
                  <Row label={t('book.review.transferPrice')} value={`$${Math.round(transferPrice)} USD`} gold />
                  {activitiesPrice > 0 && <Row label={data.comboMode === 'crazy' ? 'Crazy Combo' : data.comboMode === 'combo' ? 'Combo' : lang === 'es' ? 'Actividades' : 'Activities'} value={`$${Math.round(activitiesPrice)} USD`} gold />}
                  <div className="border-t-2 border-gold/20 pt-4 mt-2 rounded-xl bg-gold/5 px-4 py-3">
                    <Row label={t('book.review.total')} value={`$${Math.round(total)} USD`} gold bold />
                  </div>
                </div>
              )}

              {/* Upsell prompt in summary */}
              {current < 2 && data.activities.length === 0 && (
                <div className="border-t border-border pt-4">
                  <button onClick={() => setCurrent(2)} className="w-full text-left rounded-xl p-3 border border-gold/20 bg-gold/5 hover:bg-gold/10 transition-all group">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-gold" />
                      <span className="text-xs font-bold text-gold">
                        {lang === 'es' ? '🔥 ¡Agrega Crazy Combo!' : '🔥 Add Crazy Combo!'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {lang === 'es' ? '3 actividades por $125/persona' : '3 activities for $125/person'}
                    </p>
                  </button>
                </div>
              )}

              <a href="https://wa.me/5216241222174?text=Hello%2C%20I%27d%20like%20to%20book%20a%20transfer" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
                <MessageCircle size={16} className="text-[#25D366]" /> {t('transfers.cta.chat')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky CTA bar (Prev/Next) when not on review */}
      {current < BOOKING_STEPS.length - 1 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-pb">
          <div className="flex items-center justify-between gap-4 px-4 py-3 min-h-[56px]">
            <motion.button
              onClick={prev}
              disabled={current === 0}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold touch-manipulation min-h-[44px]',
                'text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none'
              )}
            >
              <ArrowLeft size={18} /> {t('book.back')}
            </motion.button>
            <motion.button
              onClick={next}
              disabled={current === 1 && Object.values(dateStepErrors).some(Boolean)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "gold-gradient text-navy px-6 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 touch-manipulation min-h-[44px] shadow-lg shadow-gold/25",
                current === 1 && Object.values(dateStepErrors).some(Boolean) && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {t('book.next')} <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Mobile bottom summary bar - visible on review or as expandable */}
      <div className={cn(
        'lg:hidden fixed left-0 right-0 z-40 bg-card/98 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-pb',
        current < BOOKING_STEPS.length - 1 ? 'bottom-14' : 'bottom-0'
      )}>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="w-full px-4 py-3 flex items-center justify-between min-h-[48px] touch-manipulation">
          <div className="flex items-center gap-3">
            <ChevronUp size={16} className={cn("text-muted-foreground transition-transform", mobileOpen && "rotate-180")} />
            <span className="text-sm font-semibold text-foreground">{t('book.summary')}</span>
          </div>
          <span className="text-gold font-bold text-lg">${Math.round(total)} USD</span>
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-4 py-4 space-y-2.5 text-sm max-h-60 overflow-y-auto">
                {data.serviceType && <Row label={t('book.review.service')} value={data.serviceType} />}
                {data.tripType && <Row label={t('book.review.trip')} value={data.tripType} />}
                <Row label={t('book.review.passengers')} value={String(data.passengers)} />
                {transferPrice > 0 && <Row label={t('book.review.transferPrice')} value={`$${transferPrice}`} gold />}
                {activitiesPrice > 0 && <Row label={lang === 'es' ? 'Actividades' : 'Activities'} value={`$${activitiesPrice}`} gold />}

                {/* Mobile upsell prompt */}
                {data.activities.length === 0 && current < 2 && (
                  <button onClick={() => { setCurrent(2); setMobileOpen(false); }} className="w-full text-left rounded-lg p-2.5 border border-gold/20 bg-gold/5 mt-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-gold" />
                      <span className="text-[11px] font-bold text-gold">🔥 {lang === 'es' ? '¡Agrega Crazy Combo por $125!' : 'Add Crazy Combo for $125!'}</span>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Row = ({ label, value, gold, bold, className }: { label: string; value: string; gold?: boolean; bold?: boolean; className?: string }) => (
  <div className={cn('flex justify-between items-baseline gap-3', bold && 'font-bold', className)}>
    <span className="text-muted-foreground text-sm shrink-0">{label}</span>
    <span className={cn(
      gold ? 'text-gold font-semibold' : 'text-foreground',
      bold && 'text-lg',
      'ml-auto truncate max-w-[220px] text-right'
    )}>{value}</span>
  </div>
);

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-0.5">{label}</p>
    <p className="text-[14px] font-medium text-foreground">{value}</p>
  </div>
);

export default Book;
