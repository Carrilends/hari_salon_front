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

// Zona horaria fija del salón (Sopó, Cundinamarca). Antes se intentaba leer
// `import.meta.env.VITE_SALON_TZ` con un truco de `Function()` para evadir
// Jest, pero esa cadena hacía que `rollup-plugin-dynamic-import-variables` se
// rompiera en el build SSG. Para esta tesis basta con hardcodear la zona.
const SALON_TZ = 'America/Bogota';

const WEEKDAY_OPEN_MIN = 8 * 60;
const WEEKDAY_CLOSE_MIN = 21 * 60 + 59;

const WEEKEND_OPEN_MIN = 9 * 60;
const WEEKEND_CLOSE_MIN = 19 * 60 + 59;

export type SalonNowParts = {
  ymd: string;
  qDate: string;
  minOfDay: number;
};

/** q-date / defaultDate: YYYY/MM/DD */
export function parseQDateToLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
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
  return getSalonNowParts().qDate;
}

function extractDateTimeParts(
  date: Date,
  timeZone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

function parseQDate(dateStr: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  return {
    y: Number(m[1]),
    m: Number(m[2]),
    d: Number(m[3]),
  };
}

function zonedLocalToUtcIso(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string
): string {
  const targetAsUtc = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
  let candidateUtc = targetAsUtc;

  for (let i = 0; i < 3; i++) {
    const p = extractDateTimeParts(new Date(candidateUtc), tz);
    const currentAsUtc = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      0,
      0
    );
    const diff = targetAsUtc - currentAsUtc;
    if (diff === 0) break;
    candidateUtc += diff;
  }

  return new Date(candidateUtc).toISOString();
}

export function getSalonNowParts(tz = SALON_TZ): SalonNowParts {
  const nowParts = extractDateTimeParts(new Date(), tz);
  const ymd = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-${String(
    nowParts.day
  ).padStart(2, '0')}`;
  return {
    ymd,
    qDate: `${nowParts.year}/${String(nowParts.month).padStart(2, '0')}/${String(
      nowParts.day
    ).padStart(2, '0')}`,
    minOfDay: nowParts.hour * 60 + nowParts.minute,
  };
}

export function isTodayQDate(dateStr: string, salonNowQDate?: string): boolean {
  return dateStr === (salonNowQDate ?? formatTodayQDate());
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
 *
 * `serviceDurationMinutes` (default 0) retrocede el techo para que la
 * reserva termine antes del cierre: `endTotalMin = closeMin - duration`.
 */
export function getBookingTimeBounds(
  dateStr: string,
  serviceDurationMinutes = 0,
  salonNowOverride?: Partial<SalonNowParts>
): {
  startTotalMin: number;
  endTotalMin: number;
} {
  const { openMin, closeMin } = getBusinessDayBounds(dateStr);
  const salonNow = salonNowOverride?.qDate
    ? {
        qDate: salonNowOverride.qDate,
        minOfDay: salonNowOverride.minOfDay ?? getSalonNowParts().minOfDay,
      }
    : getSalonNowParts();
  let startTotalMin = openMin;
  if (isTodayQDate(dateStr, salonNow.qDate)) {
    startTotalMin = Math.max(openMin, salonNow.minOfDay);
  }
  const endTotalMin = closeMin - Math.max(0, serviceDurationMinutes);
  return { startTotalMin, endTotalMin };
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
export function createBookingTimeOptionsFn(
  getSelectedDate: () => string,
  getServiceDuration: () => number = () => 0,
  getSalonNowOverride?: () => Partial<SalonNowParts> | undefined
) {
  return (
    hour: number | null,
    minute: number | null,
    second: number | null
  ): boolean => {
    const dateStr = getSelectedDate();
    if (!dateStr || hour === null) return false;

    const { startTotalMin, endTotalMin } = getBookingTimeBounds(
      dateStr,
      getServiceDuration(),
      getSalonNowOverride?.()
    );
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
export function isQDateSelectable(
  dateStr: string,
  salonNowQDate?: string
): boolean {
  const dt = parseQDateToLocalDate(dateStr);
  if (!dt) return false;
  const parsed = parseQDate(dateStr);
  if (!parsed) return false;
  const salonToday = parseQDate(salonNowQDate ?? formatTodayQDate());
  if (!salonToday) return false;
  const cand = Date.UTC(parsed.y, parsed.m - 1, parsed.d);
  const today = Date.UTC(salonToday.y, salonToday.m - 1, salonToday.d);
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
  timeModel: string,
  serviceDurationMinutes = 0,
  salonNowOverride?: Partial<SalonNowParts>
): boolean {
  if (!qDateStr || !timeModel) return false;
  const parts = timeModel.trim().split(/\s+/);
  const timePart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  const parsed = parseTimeHHmm(timePart);
  if (!parsed) return false;
  const total = parsed.h * 60 + parsed.m;
  const { startTotalMin, endTotalMin } = getBookingTimeBounds(
    qDateStr,
    serviceDurationMinutes,
    salonNowOverride
  );
  return startTotalMin <= endTotalMin &&
    total >= startTotalMin &&
    total <= endTotalMin;
}

/**
 * Combina q-date (`YYYY/MM/DD`) y el modelo de q-time (último segmento `HH:mm`)
 * en ISO 8601 (UTC) para enviar al API.
 */
export function bookingSelectionToUtcIso(
  qDateStr: string,
  timeModel: string
): string | null {
  const qDate = parseQDate(qDateStr);
  if (!qDate) return null;
  const parts = timeModel.trim().split(/\s+/);
  const timePart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  const parsed = parseTimeHHmm(timePart);
  if (!parsed) return null;
  return zonedLocalToUtcIso(
    qDate.y,
    qDate.m,
    qDate.d,
    parsed.h,
    parsed.m,
    SALON_TZ
  );
}
