/**
 * Los días de la tira y los huecos de hora del cajón de reserva (contrato
 * §4.1 de `docs/superpowers/plans/2026-10-09-vistas-hoja-de-ruta.md`). Lo
 * reutilizan «Cambiar fecha» (plan 2) y «Mover» (plan 3): la regla de qué
 * hora se ofrece vive aquí una sola vez.
 *
 * Funciones puras. Los tipos de la disponibilidad se importan solo como
 * tipos: `workers-api.ts` lee `import.meta.env` y no debe entrar en ejecución.
 */
import type {
  WorkerAvailabilityEntry,
  WorkerAvailabilityResponse,
} from 'src/api/workers-api';
import {
  horarioDeHoy,
  isColombianHolidayQDate,
  type SalonNowParts,
} from 'src/helpers/businessHours';
import { hasSlotForCart, occupancyRatio } from 'src/helpers/booking-occupancy';

export type Franja = 'manana' | 'tarde' | 'noche';

export interface DiaDeTira {
  fecha: string; // 'YYYY/MM/DD' (formato QDate, el que ya usa businessHours)
  diaSemanaCorto: string; // 'LUN', 'MAR'…
  numero: number; // día del mes
  esHoy: boolean;
  esFestivo: boolean; // isColombianHolidayQDate
  horario: { abre: string; cierra: string }; // '8:00' / '20:00' o '9:00' / '19:00'
  disponibilidad: 'libre' | 'poca' | 'sin-hueco' | 'desconocida';
}

export interface HuecoDeHora {
  hora: string; // 'HH:mm'
  minutoDelDia: number;
  franja: Franja; // manana < 12:00 ≤ tarde < 17:00 ≤ noche
  libre: boolean; // cabe la duración completa con la estilista elegida (o con alguna si es «sin preferencia»)
}

const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const UN_DIA_MS = 24 * 60 * 60 * 1000;
/** Usado ≥ 2/3: «pocas horas». La misma frontera que el `q-date` de antes. */
const POCA_HOLGURA = 2 / 3;
const MEDIODIA = 12 * 60;
const TARDE_HASTA = 17 * 60;

const dos = (n: number) => String(n).padStart(2, '0');

/** `'YYYY-MM-DD'` o `'YYYY/MM/DD'` → medianoche UTC de ese día. */
function diaUtc(fecha: string): Date | null {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(fecha.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const aYmd = (d: Date) =>
  `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;

const aQDate = (d: Date) => aYmd(d).replace(/-/g, '/');

const aHora = (minutos: number) =>
  `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;

export function franjaDe(minutoDelDia: number): Franja {
  if (minutoDelDia < MEDIODIA) return 'manana';
  if (minutoDelDia < TARDE_HASTA) return 'tarde';
  return 'noche';
}

function disponibilidadDe(
  entrada: { usedMinutes: number; capacityMinutes: number } | undefined,
  duracionMin: number
): DiaDeTira['disponibilidad'] {
  if (!entrada) return 'desconocida';
  if (!hasSlotForCart(entrada.usedMinutes, entrada.capacityMinutes, duracionMin)) {
    return 'sin-hueco';
  }
  return occupancyRatio(entrada.usedMinutes, entrada.capacityMinutes) >=
    POCA_HOLGURA
    ? 'poca'
    : 'libre';
}

/** 14 días desde hoy (hora de Bogotá). La ocupación es opcional: sin ella, 'desconocida'.
 *  Las claves de `ocupacion` son las de `ReservationOccupancyResponse.byDate`
 *  tal cual llegan del backend: QDate `'YYYY/MM/DD'` en la zona del salón
 *  (`get-occupancy.use-case.ts`). También se aceptan `'YYYY-MM-DD'`. */
export function diasDeLaTira(
  ahora: SalonNowParts,
  ocupacion?: Record<string, { usedMinutes: number; capacityMinutes: number }>,
  duracionMin = 0,
  cuantos = 14
): DiaDeTira[] {
  const hoy = diaUtc(ahora.ymd);
  if (!hoy) return [];
  const dias: DiaDeTira[] = [];
  for (let i = 0; i < cuantos; i += 1) {
    const dia = new Date(hoy.getTime() + i * UN_DIA_MS);
    const fecha = aQDate(dia);
    dias.push({
      fecha,
      diaSemanaCorto: DIAS_CORTOS[dia.getUTCDay()],
      numero: dia.getUTCDate(),
      esHoy: i === 0,
      esFestivo: isColombianHolidayQDate(fecha),
      // `horarioDeHoy` solo lee `qDate`: así hereda entera la regla de
      // sábado, domingo y festivos sin una segunda copia.
      horario: horarioDeHoy({ ymd: aYmd(dia), qDate: fecha, minOfDay: 0 }),
      // Las claves de `byDate` llegan en QDate ('YYYY/MM/DD'), como `fecha`;
      // se acepta también 'YYYY-MM-DD' por si el backend cambiara de formato.
      disponibilidad: disponibilidadDe(
        ocupacion?.[fecha] ?? ocupacion?.[aYmd(dia)],
        duracionMin
      ),
    });
  }
  return dias;
}

/** Desde y hasta (`YYYY-MM-DD`) de la tira: lo que se pide a `/reservations/occupancy`. */
export function rangoDeLaTira(
  ahora: SalonNowParts,
  cuantos = 14
): { desde: string; hasta: string } {
  const hoy = diaUtc(ahora.ymd);
  if (!hoy) return { desde: ahora.ymd, hasta: ahora.ymd };
  const ultimo = new Date(hoy.getTime() + (cuantos - 1) * UN_DIA_MS);
  return { desde: aYmd(hoy), hasta: aYmd(ultimo) };
}

/**
 * Quién puede atender. Con una estilista elegida, solo ella. Sin preferencia,
 * cualquiera asignable; y si no hay ninguna, la predeterminada: es lo que hace
 * `WorkerAssigner.elegir` en el backend.
 */
function candidatas(
  workers: WorkerAvailabilityEntry[],
  estilistaId: string | null
): WorkerAvailabilityEntry[] {
  if (estilistaId !== null) return workers.filter((w) => w.id === estilistaId);
  const asignables = workers.filter((w) => w.assignable);
  return asignables.length ? asignables : workers.filter((w) => w.isDefault);
}

function estaLibre(
  estilista: WorkerAvailabilityEntry,
  inicio: number,
  duracion: number
): boolean {
  const fin = inicio + duracion;
  return !estilista.reservations.some(
    (r) => inicio < r.endMin && r.startMin < fin
  );
}

/** Huecos cada 30 min del día, ya filtrados por horario y por «ahora» si es hoy. */
export function huecosDelDia(args: {
  fecha: string;
  duracionMin: number;
  disponibilidad: WorkerAvailabilityResponse;
  estilistaId: string | null; // null = sin preferencia
  pasoMin?: number; // por defecto 30
}): HuecoDeHora[] {
  const { fecha, disponibilidad, estilistaId, pasoMin = 30 } = args;
  const dia = diaUtc(fecha);
  if (!dia || aYmd(dia) < disponibilidad.salonNow.ymd) return [];

  const { openMin, closeMin, effectiveStartMin } = disponibilidad.dayBounds;
  const duracion = Math.max(0, args.duracionMin);
  const quienes = candidatas(disponibilidad.workers, estilistaId);
  const huecos: HuecoDeHora[] = [];
  for (let t = openMin; t < closeMin && t + duracion <= closeMin; t += pasoMin) {
    if (t < effectiveStartMin) continue;
    huecos.push({
      hora: aHora(t),
      minutoDelDia: t,
      franja: franjaDe(t),
      libre: quienes.some((w) => estaLibre(w, t, duracion)),
    });
  }
  return huecos;
}
