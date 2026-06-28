export function localDateKey(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addLocalDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function startOfCurrentWeekKey() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return localDateKey(date);
}

export function monthStartKey(date: Date = new Date()) {
  return localDateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0));
}

export function monthEndKey(date: Date = new Date()) {
  return localDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0));
}

export function sameLocalDay(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.slice(0, 10) === right.slice(0, 10);
}

export function isDateWithinRange(dateKey: string, startKey: string, endKey: string) {
  return dateKey >= startKey && dateKey <= endKey;
}

// `new Date("2026-06-23")` se interpreta como medianoche UTC (spec ECMA-262
// para strings solo-fecha). Si luego se formatea con .toLocaleDateString()
// en una zona horaria detrás de UTC (México, Pacific/Mountain/Central), el
// resultado se corre un día atrás (muestra 22 en vez de 23). Esto rompió la
// vista de reservas del admin: la fecha de servicio se mostraba un día
// antes de la real. Construir el Date con año/mes/día explícitos a mediodía
// evita el problema por completo (mismo patrón que addLocalDays arriba).
export function parseDateOnlyAsLocalNoon(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
}
