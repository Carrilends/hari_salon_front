/**
 * La semana de «Mis estilistas»: fechas, rótulos, cifras y mensajes.
 *
 * Puro (sin Vue ni red): la página y sus piezas solo pintan lo que sale de
 * aquí. Las fechas son civiles del salón (`YYYY-MM-DD`) y se manejan en UTC,
 * así la zona del navegador no mueve ningún día. La única conversión de zona
 * es la de las horas de las reservas, que llegan como instantes ISO.
 */
import type { WorkersWeekDay } from 'src/api/workers-api';
import type { ReservationDto } from 'src/interfaces/booking';

export const ZONA_SALON = 'America/Bogota';

/** El texto de la especificación E3 para el 409 del backend. */
export const MENSAJE_CON_RESERVAS =
  'No se puede eliminar: tiene reservas registradas';

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
/** Índice = `getUTCDay()` (0 = domingo). */
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

function aMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function aYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function partes(ymd: string) {
  const f = new Date(aMs(ymd));
  return {
    anio: f.getUTCFullYear(),
    mes: f.getUTCMonth(),
    dia: f.getUTCDate(),
    semana: f.getUTCDay(),
  };
}

export function sumarDias(ymd: string, dias: number): string {
  return aYmd(aMs(ymd) + dias * DIA_MS);
}

/** El lunes de la semana de `ymd`; el domingo va con el lunes ANTERIOR. */
export function lunesDe(ymd: string): string {
  return sumarDias(ymd, -((partes(ymd).semana + 6) % 7));
}

/** '5 – 11 oct 2026' · '28 sep – 4 oct 2026' · '29 dic 2025 – 4 ene 2026'. */
export function rotuloCortoSemana(lunes: string): string {
  const a = partes(lunes);
  const b = partes(sumarDias(lunes, 6));
  if (a.anio !== b.anio) {
    return `${a.dia} ${MESES_CORTOS[a.mes]} ${a.anio} – ${b.dia} ${
      MESES_CORTOS[b.mes]
    } ${b.anio}`;
  }
  if (a.mes !== b.mes) {
    return `${a.dia} ${MESES_CORTOS[a.mes]} – ${b.dia} ${MESES_CORTOS[b.mes]} ${
      b.anio
    }`;
  }
  return `${a.dia} – ${b.dia} ${MESES_CORTOS[b.mes]} ${b.anio}`;
}

/** 'semana del 5 al 11 de octubre' · 'semana del 28 de septiembre al 4 de octubre'. */
export function rotuloLargoSemana(lunes: string): string {
  const a = partes(lunes);
  const b = partes(sumarDias(lunes, 6));
  if (a.mes !== b.mes) {
    return `semana del ${a.dia} de ${MESES[a.mes]} al ${b.dia} de ${
      MESES[b.mes]
    }`;
  }
  return `semana del ${a.dia} al ${b.dia} de ${MESES[b.mes]}`;
}

export interface CabeceraDia {
  fecha: string;
  corto: string; // 'Lun'
  inicial: string; // 'L'
  numero: number; // 5
  nombreLargo: string; // 'lunes'
  esHoy: boolean;
}

export function cabecerasDeDias(dias: string[], hoy: string): CabeceraDia[] {
  return dias.map((fecha) => {
    const p = partes(fecha);
    const corto = DIAS_CORTOS[p.semana];
    return {
      fecha,
      corto,
      inicial: corto.charAt(0),
      numero: p.dia,
      nombreLargo: DIAS_LARGOS[p.semana],
      esHoy: fecha === hoy,
    };
  });
}

/** '—' (nada) · '30 min' · '1 h' · '1 h 05' · '11 h 30'. */
export function formatearDuracion(minutos: number): string {
  if (minutos <= 0) return '—';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${String(resto).padStart(2, '0')}`;
}

/**
 * Alto de la barra. Se queda en 100: citas solapadas heredadas pueden sumar
 * más que el horario, y la barra no puede salirse de su caja. El TEXTO sí dice
 * las horas reales (`textoCarga`).
 */
export function porcentajeDeCarga(usados: number, capacidad: number): number {
  if (capacidad <= 0 || usados <= 0) return 0;
  return Math.min(100, Math.round((usados / capacidad) * 100));
}

/** Lo que oye el lector de pantalla en cada barra (y su `title`). */
export function textoCarga(usados: number, capacidad: number): string {
  if (usados <= 0)
    return `Sin citas · ${formatearDuracion(capacidad)} de horario`;
  return `${formatearDuracion(usados)} reservadas de ${formatearDuracion(
    capacidad
  )}`;
}

export interface ResumenSemana {
  usados: number;
  capacidad: number;
}

export function resumenDeSemana(dias: WorkersWeekDay[]): ResumenSemana {
  return dias.reduce(
    (suma, d) => ({
      usados: suma.usados + d.usedMinutes,
      capacidad: suma.capacidad + d.capacityMinutes,
    }),
    { usados: 0, capacidad: 0 }
  );
}

export function inicialDe(nombre: string): string {
  return (nombre.trim().charAt(0) || '?').toUpperCase();
}

const FORMATO_SALON = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_SALON,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Día y hora de un instante en el reloj del salón: `{ ymd, hora: 'H:mm' }`. */
export function horaYFechaEnSalon(iso: string): { ymd: string; hora: string } {
  const p = FORMATO_SALON.formatToParts(new Date(iso));
  const leer = (tipo: Intl.DateTimeFormatPartTypes) =>
    p.find((parte) => parte.type === tipo)?.value ?? '00';
  return {
    ymd: `${leer('year')}-${leer('month')}-${leer('day')}`,
    hora: `${Number(leer('hour'))}:${leer('minute')}`,
  };
}

export interface CitaDeHoy {
  id: string;
  desde: string; // '8:30'
  hasta: string; // '10:00'
  servicios: string; // 'Balayage' · 'Wolf cut mujer + 1'
}

function textoServicios(nombres: string[]): string {
  if (nombres.length === 0) return 'Sin servicios';
  return nombres.length === 1
    ? nombres[0]
    : `${nombres[0]} + ${nombres.length - 1}`;
}

/**
 * Las citas de hoy de una estilista, en orden. Sale de `GET /reservations`,
 * que solo trae las vigentes (no terminadas, no canceladas): es «lo que le
 * queda hoy». El filtro de canceladas se repite por si la lista cambia.
 */
export function citasDeHoy(
  reservas: ReservationDto[],
  estilistaId: string,
  hoy: string
): CitaDeHoy[] {
  return reservas
    .filter(
      (r) =>
        r.workerId === estilistaId &&
        r.status !== 'cancelada' &&
        horaYFechaEnSalon(r.scheduledAt).ymd === hoy
    )
    .slice()
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    .map((r) => ({
      id: r.id,
      desde: horaYFechaEnSalon(r.scheduledAt).hora,
      hasta: horaYFechaEnSalon(r.endedAt).hora,
      servicios: textoServicios(r.services.map((s) => s.name)),
    }));
}

function estadoHttp(err: unknown): number | undefined {
  return (err as { response?: { status?: number } } | null | undefined)
    ?.response?.status;
}

const YA_NO_EXISTE = 'Esta estilista ya no existe. Actualiza la página.';

/** Solo el 409 es «tiene reservas»; sin respuesta es la conexión. */
export function mensajeAlEliminar(err: unknown): string {
  switch (estadoHttp(err)) {
    case 409:
      return MENSAJE_CON_RESERVAS;
    case 400:
      return 'La opción predeterminada no se puede eliminar.';
    case 404:
      return YA_NO_EXISTE;
    default:
      return 'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.';
  }
}

export function mensajeAlGuardar(err: unknown): string {
  switch (estadoHttp(err)) {
    case 400:
      return 'Revisa el nombre: entre 2 y 120 caracteres.';
    case 404:
      return YA_NO_EXISTE;
    default:
      return 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.';
  }
}

/** La regla de `CreateWorkerDto` (2–120), sobre el nombre ya recortado. */
export function validarNombre(nombre: string): string | null {
  const limpio = nombre.trim();
  if (limpio.length < 2) return 'Escribe al menos 2 caracteres.';
  if (limpio.length > 120) return 'Máximo 120 caracteres.';
  return null;
}
