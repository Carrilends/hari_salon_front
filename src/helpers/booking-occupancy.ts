/**
 * Colores Quasar para marcadores QDate (`bg-${color}`).
 * Verde &lt; 33%, amarillo &lt; 66%, rojo ≥ 66% de capacidad usada.
 */
export type OccupancyByDateEntry = {
  usedMinutes: number;
  capacityMinutes: number;
};

export type ReservationOccupancyResponse = {
  parallelStylists: number;
  salonTimeZone: string;
  byDate: Record<string, OccupancyByDateEntry>;
};

export function occupancyRatio(used: number, capacity: number): number {
  if (capacity <= 0) return 1;
  return used / capacity;
}

/** Color del evento en QDate según ratio usado/capacidad. */
export function occupancyEventColor(ratio: number): string {
  if (ratio < 1 / 3) return 'positive';
  if (ratio < 2 / 3) return 'warning';
  return 'negative';
}

export function hasSlotForCart(
  used: number,
  capacity: number,
  cartDurationMinutes: number,
): boolean {
  if (capacity <= 0) return false;
  if (cartDurationMinutes <= 0) return true;
  return capacity - used >= cartDurationMinutes;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `month` 1–12; fechas `YYYY-MM-DD` para el API. */
export function ymdRangeForCalendarMonth(
  year: number,
  month: number
): { from: string; to: string } {
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(last)}`,
  };
}
