/**
 * Horarios alineados con el diálogo de contacto (ourContact) y con el backend
 * `hair_salon_back/src/reservations/salon-schedule.ts`, que es la fuente de
 * verdad: este archivo replica su regla, nunca al revés.
 *
 * Sábado, domingo **y festivos** usan el rango reducido, que es exactamente lo
 * que dice el cartel. Los festivos se calculan por la Ley Emiliani
 * (`isColombianHolidayQDate`, más abajo); antes faltaban y el portal ofrecía
 * las 8:00 de un lunes festivo que el backend rechazaba.
 */

export const BUSINESS_SCHEDULE_COPY = {
  weekdayLabel: 'Lunes a viernes',
  weekdayRange: '8:00 a. m. – 8:00 p. m.',
  weekendLabel: 'Sábado, domingo y festivos',
  weekendRange: '9:00 a. m. – 7:00 p. m.',
} as const;

// Zona horaria fija del salón (Sopó, Cundinamarca). Antes se intentaba leer
// `import.meta.env.VITE_SALON_TZ` con un truco de `Function()` para evadir
// Jest, pero esa cadena hacía que `rollup-plugin-dynamic-import-variables` se
// rompiera en el build SSG. Para esta tesis basta con hardcodear la zona.
const SALON_TZ = 'America/Bogota';

// `*_CLOSE_MIN` es la hora de cierre (minutos desde medianoche): el último
// instante en que una reserva puede terminar. Debe coincidir con el backend
// `hair_salon_back/src/reservations/salon-schedule.ts`.
const WEEKDAY_OPEN_MIN = 8 * 60;
const WEEKDAY_CLOSE_MIN = 20 * 60;

const WEEKEND_OPEN_MIN = 9 * 60;
const WEEKEND_CLOSE_MIN = 19 * 60;

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

/**
 * Festivos colombianos CALCULADOS (Ley 51 de 1983, «Ley Emiliani»).
 *
 * Réplica exacta de `hair_salon_back/src/reservations/salon-schedule.ts`; el
 * backend es la fuente de verdad y este archivo le sigue. Los dos repos son
 * independientes, así que la regla está duplicada a propósito y los tests de
 * ambos lados comparan contra la MISMA lista de referencia escrita a mano: si
 * un día divergen, uno de los dos se pone rojo.
 *
 * Se calcula en vez de listarse porque una lista por año caduca en silencio: el
 * día que se acabara, el portal ofrecería las 8:00 de un festivo y la reserva
 * la rechazaría el backend, sin que nadie supiera por qué.
 */

/** Fecha fija, nunca se traslada: [mes, día]. */
const FESTIVOS_FIJOS: [number, number][] = [
  [1, 1], // Año Nuevo
  [5, 1], // Día del Trabajo
  [7, 20], // Grito de Independencia
  [8, 7], // Batalla de Boyacá
  [12, 8], // Inmaculada Concepción
  [12, 25], // Navidad
];

/** Fecha fija trasladable al lunes siguiente: [mes, día]. */
const FESTIVOS_TRASLADABLES: [number, number][] = [
  [1, 6], // Reyes Magos
  [3, 19], // San José
  [6, 29], // San Pedro y San Pablo
  [8, 15], // Asunción de la Virgen
  [10, 12], // Día de la Raza
  [11, 1], // Todos los Santos
  [11, 11], // Independencia de Cartagena
];

// Desplazamientos desde el Domingo de Pascua. Jueves y Viernes Santo no se
// trasladan; Ascensión, Corpus Christi y Sagrado Corazón sí, y los valores
// +43/+64/+71 ya incluyen ese traslado al lunes.
const PASCUA_SIN_TRASLADO = [-3, -2];
const PASCUA_CON_TRASLADO = [43, 64, 71];

/** Domingo de Pascua (algoritmo anónimo gregoriano de Meeus/Jones/Butcher). */
function domingoDePascua(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, mes - 1, dia));
}

/** Lunes siguiente, o el mismo día si ya es lunes (traslado Emiliani). */
function siguienteLunes(fecha: Date): Date {
  const faltan = (8 - fecha.getUTCDay()) % 7;
  return new Date(fecha.getTime() + faltan * 24 * 60 * 60 * 1000);
}

/** Clave q-date `YYYY/MM/DD` a partir de una fecha tratada como UTC. */
function claveQDate(fecha: Date): string {
  return fecha.toISOString().slice(0, 10).replace(/-/g, '/');
}

const cacheFestivos = new Map<number, Set<string>>();

function festivosDelAnio(year: number): Set<string> {
  const enCache = cacheFestivos.get(year);
  if (enCache) return enCache;

  const festivos = new Set<string>();
  for (const [mes, dia] of FESTIVOS_FIJOS) {
    festivos.add(claveQDate(new Date(Date.UTC(year, mes - 1, dia))));
  }
  for (const [mes, dia] of FESTIVOS_TRASLADABLES) {
    festivos.add(
      claveQDate(siguienteLunes(new Date(Date.UTC(year, mes - 1, dia))))
    );
  }
  const pascua = domingoDePascua(year);
  const unDia = 24 * 60 * 60 * 1000;
  for (const off of [...PASCUA_SIN_TRASLADO, ...PASCUA_CON_TRASLADO]) {
    festivos.add(claveQDate(new Date(pascua.getTime() + off * unDia)));
  }

  cacheFestivos.set(year, festivos);
  return festivos;
}

/** ¿La fecha q-date `YYYY/MM/DD` es festivo en Colombia? */
export function isColombianHolidayQDate(dateStr: string): boolean {
  const parsed = parseQDate(dateStr);
  if (!parsed) return false;
  return festivosDelAnio(parsed.y).has(dateStr.trim());
}

/**
 * ¿El día usa el horario reducido 9:00–19:00? Sábado, domingo **y festivos**,
 * que es lo que el cartel («Sábado, domingo y festivos») viene prometiendo.
 */
export function usesWeekendHoursQDate(dateStr: string): boolean {
  return isWeekendQDate(dateStr) || isColombianHolidayQDate(dateStr);
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
  // Festivo = mismo horario reducido que sábado y domingo, igual que el backend
  // (`salon-time.ts::getDayBounds`).
  const reducido = usesWeekendHoursQDate(dateStr);
  return {
    openMin: reducido ? WEEKEND_OPEN_MIN : WEEKDAY_OPEN_MIN,
    closeMin: reducido ? WEEKEND_CLOSE_MIN : WEEKDAY_CLOSE_MIN,
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
