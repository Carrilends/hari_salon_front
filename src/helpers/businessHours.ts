/**
 * Horarios alineados con el diálogo de contacto (ourContact).
 * Sábado/domingo usan el mismo rango que "festivos" en el cartel; para fechas
 * festivas en día laborable habría que ampliar con un calendario de festivos.
 */

export const BUSINESS_SCHEDULE_COPY = {
  weekdayLabel: 'Lunes a viernes',
  weekdayRange: '8:00 a. m. – 9:00 p. m.',
  weekendLabel: 'Sábado, domingo y festivos',
  weekendRange: '9:00 a. m. – 7:00 p. m.',
} as const;

const WEEKDAY_OPEN_MIN = 8 * 60;
const WEEKDAY_CLOSE_MIN = 21 * 60 + 59;

const WEEKEND_OPEN_MIN = 9 * 60;
const WEEKEND_CLOSE_MIN = 19 * 60 + 59;

/** q-date / defaultDate: YYYY/MM/DD */
export function parseQDateToLocalDate(dateStr: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function isWeekendQDate(dateStr: string): boolean {
  const dt = parseQDateToLocalDate(dateStr);
  if (!dt) return false;
  const dow = dt.getDay();
  return dow === 0 || dow === 6;
}

function formatTodayQDate(): string {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}/${mo}/${d}`;
}

export function isTodayQDate(dateStr: string): boolean {
  return dateStr === formatTodayQDate();
}

/** Inicio y fin del día en minutos desde medianoche (local), según tipo de día. */
export function getBusinessDayBounds(dateStr: string): {
  openMin: number;
  closeMin: number;
} {
  const weekend = isWeekendQDate(dateStr);
  return {
    openMin: weekend ? WEEKEND_OPEN_MIN : WEEKDAY_OPEN_MIN,
    closeMin: weekend ? WEEKEND_CLOSE_MIN : WEEKDAY_CLOSE_MIN,
  };
}

/**
 * Rango efectivo para elegir hora: respeta horario de apertura y, si el día
 * es hoy, no permite minutos ya pasados.
 */
export function getBookingTimeBounds(dateStr: string): {
  startTotalMin: number;
  endTotalMin: number;
} {
  const { openMin, closeMin } = getBusinessDayBounds(dateStr);
  let startTotalMin = openMin;
  if (isTodayQDate(dateStr)) {
    const n = new Date();
    startTotalMin = Math.max(openMin, n.getHours() * 60 + n.getMinutes());
  }
  return { startTotalMin, endTotalMin: closeMin };
}

export function hourHasSelectableMinute(
  hour: number,
  startTotalMin: number,
  endTotalMin: number
): boolean {
  const hStart = hour * 60;
  const hEnd = hour * 60 + 59;
  return hEnd >= startTotalMin && hStart <= endTotalMin;
}

/**
 * QTime `options`: (hour, minute, second) => boolean
 * - Solo hora: minute y second son null.
 * - Minuto: hour fijado, minute candidato, second null.
 */
export function createBookingTimeOptionsFn(getSelectedDate: () => string) {
  return (
    hour: number | null,
    minute: number | null,
    second: number | null
  ): boolean => {
    const dateStr = getSelectedDate();
    if (dateStr === '' || hour === null) return false;

    const { startTotalMin, endTotalMin } = getBookingTimeBounds(dateStr);
    if (startTotalMin > endTotalMin) return false;

    if (minute === null && second === null) {
      return hourHasSelectableMinute(hour, startTotalMin, endTotalMin);
    }

    if (second === null && minute !== null) {
      const total = hour * 60 + minute;
      return total >= startTotalMin && total <= endTotalMin;
    }

    return true;
  };
}

/** q-date options: habilita solo hoy o fechas futuras (calendario local). */
export function isQDateSelectable(dateStr: string): boolean {
  const dt = parseQDateToLocalDate(dateStr);
  if (!dt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cand = new Date(dt);
  cand.setHours(0, 0, 0, 0);
  return cand >= today;
}

/** "HH:mm" 24h */
export function parseTimeHHmm(timePart: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timePart.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (
    !Number.isFinite(h) ||
    !Number.isFinite(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }
  return { h, m: min };
}

/**
 * model q-time con mask que incluye hora en la cadena (p. ej. "... HH:mm").
 */
export function isBookingDateTimeWithinHours(
  qDateStr: string,
  timeModel: string
): boolean {
  if (!qDateStr || !timeModel) return false;
  const parts = timeModel.trim().split(/\s+/);
  const timePart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  const parsed = parseTimeHHmm(timePart);
  if (!parsed) return false;
  const total = parsed.h * 60 + parsed.m;
  const { startTotalMin, endTotalMin } = getBookingTimeBounds(qDateStr);
  return startTotalMin <= endTotalMin &&
    total >= startTotalMin &&
    total <= endTotalMin;
}
