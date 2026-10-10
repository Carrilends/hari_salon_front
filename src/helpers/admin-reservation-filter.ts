import type { ReservationDto } from 'src/interfaces/booking';
import {
  horaHHmm,
  nombreDeEstilista as nombreBase,
  partesEnBogota,
} from 'src/helpers/my-reservations';
import { fechaLarga } from 'src/helpers/reserva-texto';

/**
 * El modelo de «la bandeja» de la dueña (spec §3, A1–A4). Puro: sin Vue y sin
 * red, para probarlo entero.
 *
 * Trabaja sobre `GET /reservations`, que devuelve las reservas **vigentes**
 * (ventana sin terminar y no canceladas) en UTC y de la más lejana a la más
 * próxima. Por eso no hay pestaña «Pasadas» —el endpoint no las trae— y todo
 * se reordena y se lee en hora de Bogotá antes de pintarse. Si algún día hace
 * falta un histórico, es el endpoint el que tiene que cambiar, no este archivo.
 */
export type PestanaBandeja = 'pendientes' | 'confirmadas' | 'hoy' | 'todas';

export const PESTANAS_BANDEJA: ReadonlyArray<{
  id: PestanaBandeja;
  rotulo: string;
}> = [
  { id: 'pendientes', rotulo: 'Pendientes' },
  { id: 'confirmadas', rotulo: 'Confirmadas' },
  { id: 'hoy', rotulo: 'Hoy' },
  { id: 'todas', rotulo: 'Todas' },
];

export interface GrupoDelDia {
  ymd: string;
  titulo: string;
  reservas: ReservationDto[];
}

export const TEXTO_VACIO: Record<PestanaBandeja, string> = {
  pendientes: 'No hay reservas pendientes.',
  confirmadas: 'No hay reservas confirmadas.',
  hoy: 'Hoy no hay citas.',
  todas: 'No hay reservas vigentes.',
};

/** La lista no explica sola por qué una fila desaparece: lo dice esto. */
export const NOTA_CANCELADAS =
  'Las canceladas salen de la lista; el aviso en tiempo real dice quién y cuándo.';

/**
 * El tiempo del salón sale de los ayudantes que ya usan «Mis reservas» y el
 * cajón de reserva: la zona, las tablas de días/meses y el formateador no se
 * repiten aquí.
 */
const dos = (n: number) => String(n).padStart(2, '0');

/** Día de la cita en Bogotá, `YYYY-MM-DD`. */
export function diaDelSalon(iso: string): string {
  const p = partesEnBogota(iso);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

/** Hora de la cita en Bogotá, `HH:mm` (24 h, como el tablero). */
export function horaDelSalon(iso: string): string {
  return horaHHmm(partesEnBogota(iso));
}

export function franjaDeLaCita(
  r: Pick<ReservationDto, 'scheduledAt' | 'endedAt'>
): string {
  return `${horaDelSalon(r.scheduledAt)} a ${horaDelSalon(r.endedAt)}`;
}

/** Aritmética de calendario en UTC puro: el `ymd` ya es del salón. */
function aFecha(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function sumarDias(ymd: string, dias: number): string {
  const fecha = aFecha(ymd);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** «jueves 8 de octubre» (privada: la de `reserva-texto` va con mayúscula). */
function fechaEnMinuscula(ymd: string): string {
  const larga = fechaLarga(ymd);
  return larga.charAt(0).toLowerCase() + larga.slice(1);
}

/** «Jueves 8 de octubre»: el día en la ficha del detalle. */
export function fechaLargaCapitalizada(ymd: string): string {
  return fechaLarga(ymd);
}

/** Encabezado de un grupo: «Hoy · …», «Mañana · …» o «Viernes 9 de octubre». */
export function tituloDelDia(ymd: string, hoyYmd: string): string {
  if (ymd === hoyYmd) return `Hoy · ${fechaEnMinuscula(ymd)}`;
  if (ymd === sumarDias(hoyYmd, 1)) return `Mañana · ${fechaEnMinuscula(ymd)}`;
  return fechaLargaCapitalizada(ymd);
}

/** De la más próxima a la más lejana. Copia: no toca la lista de la consulta. */
export function ordenarPorHora(
  lista: readonly ReservationDto[]
): ReservationDto[] {
  return Array.from(lista).sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)
  );
}

export function filtrarPorPestana(
  lista: readonly ReservationDto[],
  pestana: PestanaBandeja,
  hoyYmd: string
): ReservationDto[] {
  switch (pestana) {
    case 'pendientes':
      return lista.filter((r) => r.status === 'pendiente');
    case 'confirmadas':
      return lista.filter((r) => r.status === 'confirmada');
    case 'hoy':
      return lista.filter((r) => diaDelSalon(r.scheduledAt) === hoyYmd);
    case 'todas':
      return Array.from(lista);
  }
}

export function contarPorPestana(
  lista: readonly ReservationDto[],
  hoyYmd: string
): Record<PestanaBandeja, number> {
  return {
    pendientes: filtrarPorPestana(lista, 'pendientes', hoyYmd).length,
    confirmadas: filtrarPorPestana(lista, 'confirmadas', hoyYmd).length,
    hoy: filtrarPorPestana(lista, 'hoy', hoyYmd).length,
    todas: lista.length,
  };
}

export function agruparPorDia(
  lista: readonly ReservationDto[],
  hoyYmd: string
): GrupoDelDia[] {
  const grupos: GrupoDelDia[] = [];
  for (const r of ordenarPorHora(lista)) {
    const ymd = diaDelSalon(r.scheduledAt);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.ymd === ymd) ultimo.reservas.push(r);
    else grupos.push({ ymd, titulo: tituloDelDia(ymd, hoyYmd), reservas: [r] });
  }
  return grupos;
}

export function textoDelPie(pestana: PestanaBandeja): string {
  return pestana === 'pendientes'
    ? `No hay más pendientes. ${NOTA_CANCELADAS}`
    : NOTA_CANCELADAS;
}

/**
 * `GET /reservations` no trae el nombre de la cuenta: una reserva hecha con
 * sesión y sin teléfono llega con `contact: null` (plan 1, B4).
 */
export function nombreDeClienta(r: ReservationDto): string {
  const nombre = r.contact?.name?.trim();
  if (nombre) return nombre;
  return r.userId ? 'Clienta con cuenta' : 'Clienta sin nombre';
}

export function procedenciaDeClienta(r: ReservationDto): string {
  return r.userId ? 'con cuenta en el portal' : 'sin cuenta en el portal';
}

export function nombreDeEstilista(r: ReservationDto): string {
  // El de «Mis reservas» cae a «tu estilista», que no sirve a la dueña.
  return r.worker?.name?.trim() ? nombreBase(r) : 'Sin estilista';
}

/** A4: quién decidió la estilista. */
export function textoAsignacion(r: ReservationDto): string {
  return r.workerPinned ? 'La eligió la clienta' : 'La asignó el sistema';
}

export function serviciosEnUnaLinea(r: ReservationDto): string {
  const nombres = (r.services ?? []).map((s) => s.name);
  return nombres.length ? nombres.join(' + ') : 'Sin servicios';
}

export function totalDeLaReserva(r: ReservationDto): number {
  return (r.services ?? []).reduce((suma, s) => suma + Number(s.price || 0), 0);
}
