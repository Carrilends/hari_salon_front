/**
 * El estado del salón «ahora» y la semana de horarios del diálogo de Horarios
 * (S3 de `docs/superpowers/specs/2026-10-09-vistas-restantes-design.md`;
 * contrato en §4.3 de la hoja de ruta de las vistas).
 *
 * No copia ningún horario: todo sale de `businessHours.ts`, que replica
 * `hair_salon_back/src/reservations/salon-schedule.ts`. Si el salón cambia de
 * horario, cambia allí y esto lo hereda —sábado, domingo y festivos con el
 * horario reducido incluidos—.
 *
 * Funciones puras: reciben las partes del día. Quien las llama decide CUÁNDO
 * mirar el reloj (el diálogo lo hace al abrirse, no al montarse).
 */
import {
  getBusinessDayBounds,
  getSalonNowParts,
  horarioDeHoy,
  isColombianHolidayQDate,
  type SalonNowParts,
} from 'src/helpers/businessHours';
import { DIAS } from 'src/helpers/reserva-texto';

export type EstadoSalon =
  | { tipo: 'abierto'; cierra: string } // 'cierra a las 20:00'
  | { tipo: 'antes-de-abrir'; abre: string } // hoy, aún no abre
  | { tipo: 'cerrado'; abreManana: string; mananaEsFestivo: boolean };

export interface FilaHorario {
  /** `YYYY/MM/DD`, el formato de `businessHours`. */
  fecha: string;
  dia: string;
  abre: string;
  cierra: string;
  esHoy: boolean;
  esFestivo: boolean;
}

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * El 1 de enero es festivo fijo todos los años (`FESTIVOS_FIJOS` de
 * `businessHours.ts`): su horario ES el de los festivos, sin escribir aquí ni
 * un número.
 */
const UN_FESTIVO_CUALQUIERA = '2000/01/01';

/** Las fechas se tratan en UTC: solo importa el día, nunca la hora local. */
function aFecha(qDate: string): Date {
  const [y, m, d] = qDate.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function aQDate(fecha: Date): string {
  return fecha.toISOString().slice(0, 10).replace(/-/g, '/');
}

function desplazar(qDate: string, dias: number): string {
  return aQDate(new Date(aFecha(qDate).getTime() + dias * UN_DIA_MS));
}

/** Partes de un día cualquiera, para pedirle su horario a `horarioDeHoy`. */
function partesDe(qDate: string): SalonNowParts {
  return { ymd: qDate.replace(/\//g, '-'), qDate, minOfDay: 0 };
}

export function horarioDeFestivos(): { abre: string; cierra: string } {
  return horarioDeHoy(partesDe(UN_FESTIVO_CUALQUIERA));
}

/**
 * Abierto entre la apertura (incluida) y el cierre (excluido): a las 20:00 en
 * punto ya no se atiende, que es lo mismo que dice el backend al no dejar que
 * una cita termine después del cierre.
 */
export function estadoDelSalon(
  ahora: SalonNowParts = getSalonNowParts()
): EstadoSalon {
  const { openMin, closeMin } = getBusinessDayBounds(ahora.qDate);
  const hoy = horarioDeHoy(ahora);

  if (ahora.minOfDay < openMin)
    return { tipo: 'antes-de-abrir', abre: hoy.abre };
  if (ahora.minOfDay < closeMin) return { tipo: 'abierto', cierra: hoy.cierra };

  const manana = desplazar(ahora.qDate, 1);
  return {
    tipo: 'cerrado',
    abreManana: horarioDeHoy(partesDe(manana)).abre,
    mananaEsFestivo: isColombianHolidayQDate(manana),
  };
}

export function textoEstadoSalon(
  e: EstadoSalon,
  hoyEsFestivo: boolean
): string {
  if (hoyEsFestivo && e.tipo !== 'cerrado') {
    const { abre, cierra } = horarioDeFestivos();
    return `Hoy es festivo · ${abre} a ${cierra}`;
  }
  switch (e.tipo) {
    case 'abierto':
      return `Abierto ahora · cierra a las ${e.cierra}`;
    case 'antes-de-abrir':
      return `Cerrado · abre hoy a las ${e.abre}`;
    case 'cerrado':
      return e.mananaEsFestivo
        ? `Cerrado · mañana es festivo: abre a las ${e.abreManana}`
        : `Cerrado · abre mañana a las ${e.abreManana}`;
  }
}

/**
 * La semana de `ahora`, de lunes a domingo, con el horario REAL de cada fecha:
 * si el lunes de esta semana es festivo, su fila dice 9:00 – 19:00 y lo marca.
 * Una tabla genérica «lunes 8:00 – 20:00» mentiría justo esa semana.
 */
export function semanaDelSalon(
  ahora: SalonNowParts = getSalonNowParts()
): FilaHorario[] {
  const diaSemana = aFecha(ahora.qDate).getUTCDay();
  const lunes = desplazar(ahora.qDate, -((diaSemana + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const fecha = desplazar(lunes, i);
    const { abre, cierra } = horarioDeHoy(partesDe(fecha));
    return {
      fecha,
      dia: DIAS[aFecha(fecha).getUTCDay()],
      abre,
      cierra,
      esHoy: fecha === ahora.qDate,
      esFestivo: isColombianHolidayQDate(fecha),
    };
  });
}
