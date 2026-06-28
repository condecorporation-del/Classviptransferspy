import { useCallback, useEffect, useState } from 'react';
import { startOfDay } from 'date-fns';

export const BOOKING_STEPS = ['info', 'details', 'extras', 'review'] as const;
export const SJD_AIRPORT = 'SJD International Airport';

export type BookingStep = (typeof BOOKING_STEPS)[number];

export type HotelOption = {
  id: string;
  name: string;
  zone: string;
};

export type BookingFormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialNote: string;
  serviceType: 'private';
  tripType: '' | 'oneway' | 'roundtrip';
  areaId: string;
  route: '' | 'airport-hotel' | 'hotel-airport';
  zoneFrom: string;
  zoneTo: string;
  selectedHotel: HotelOption | null;
  arrivalDate: Date | null;
  departureDate: Date | null;
  flightNumber: string;
  arrivalTime: string;
  departureFlightNumber: string;
  departureTime: string;
  pickupTime: string;
  passengers: number;
  pickup: string;
  dropoff: string;
  extras: string[];
  activities: string[];
  comboMode: '' | 'combo' | 'crazy';
};

export type DateStepErrors = {
  arrivalDate?: string;
  departureDate?: string;
  flightNumber?: string;
  departureFlightNumber?: string;
  pickupTime?: string;
};

const FLIGHT_REGEX = /^[A-Za-z]{2,3}\s?\d{1,4}$/;

function createInitialBookingData(): BookingFormData {
  return {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialNote: '',
    serviceType: 'private',
    tripType: '',
    areaId: '',
    route: '',
    zoneFrom: '',
    zoneTo: '',
    selectedHotel: null,
    arrivalDate: null,
    departureDate: null,
    flightNumber: '',
    arrivalTime: '',
    departureFlightNumber: '',
    departureTime: '',
    pickupTime: '',
    passengers: 1,
    pickup: '',
    dropoff: '',
    extras: [],
    activities: [],
    comboMode: '',
  };
}

function timeToMinutes(hhmm: string): number | null {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function useBookingForm(t: (key: string) => string) {
  const [current, setCurrent] = useState(0);
  const [step0Attempted, setStep0Attempted] = useState(false);
  const [data, setData] = useState<BookingFormData>(() => createInitialBookingData());
  const [dateStepErrors, setDateStepErrors] = useState<DateStepErrors>({});

  const validateDateStep = useCallback((): DateStepErrors => {
    const err: DateStepErrors = {};
    const today = startOfDay(new Date());

    if (data.arrivalDate && startOfDay(data.arrivalDate) < today) {
      err.arrivalDate = t('book.date.errorPast');
    }

    if (data.tripType === 'roundtrip' && data.arrivalDate && data.departureDate) {
      if (startOfDay(data.departureDate) < startOfDay(data.arrivalDate)) {
        err.departureDate = t('book.date.errorDepartureBefore');
      }
    }

    if (data.flightNumber.trim() && !FLIGHT_REGEX.test(data.flightNumber.trim())) {
      err.flightNumber = t('book.date.errorFlightFormat');
    }

    if (
      data.tripType === 'roundtrip' &&
      data.departureFlightNumber.trim() &&
      !FLIGHT_REGEX.test(data.departureFlightNumber.trim())
    ) {
      err.departureFlightNumber = t('book.date.errorFlightFormat');
    }

    if (data.tripType === 'roundtrip' && data.departureTime && data.pickupTime) {
      const depM = timeToMinutes(data.departureTime);
      const pickM = timeToMinutes(data.pickupTime);
      if (depM !== null && pickM !== null && depM - pickM < 180) {
        err.pickupTime = t('book.date.errorPickupTooLate');
      }
    }

    return err;
  }, [data, t]);

  useEffect(() => {
    setDateStepErrors(validateDateStep());
  }, [validateDateStep]);

  useEffect(() => {
    const isDeparture = data.route === 'hotel-airport' && data.tripType !== 'roundtrip';
    const isRoundtrip = data.tripType === 'roundtrip';
    if (!isDeparture && !isRoundtrip) return;
    if (!data.departureTime) return;

    const departureMinutes = timeToMinutes(data.departureTime);
    if (departureMinutes === null) return;

    const suggested = minutesToTime(Math.max(0, departureMinutes - 180));
    if (isRoundtrip) {
      setData((prev) => ({ ...prev, pickupTime: suggested }));
      return;
    }

    setData((prev) => ({ ...prev, arrivalTime: suggested }));
  }, [data.route, data.tripType, data.departureTime]);

  const next = useCallback(() => {
    setCurrent((value) => Math.min(value + 1, BOOKING_STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrent((value) => Math.max(value - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    if (current === 0) {
      setStep0Attempted(true);
      if (
        !data.customerName.trim() ||
        !data.customerEmail.trim() ||
        !data.customerPhone.trim() ||
        !data.tripType ||
        !data.route
      ) {
        return;
      }
    }

    next();
  }, [current, data, next]);

  return {
    current,
    setCurrent,
    step0Attempted,
    setStep0Attempted,
    data,
    setData,
    dateStepErrors,
    next,
    prev,
    handleNext,
  };
}
