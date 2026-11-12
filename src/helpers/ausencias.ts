/**
 * Las ausencias de las estilistas dichas como las lee la dueña: horas como el
 * resto del panel («10:00 – 12:00», `H:mm` de 24 h), fechas largas, la franja
 * de cada ausencia, lo que pasa con cada cita y los errores de la API en
 * palabras.
 *
 * Puro (sin Vue ni red). El horario del día sale de `businessHours.ts`, que
 * replica `salon-schedule.ts` del backend: aquí no se repite ninguna hora.
 */
import type { AbsenceImpact } from 'src/api/workers-api';
import { getBusinessDayBounds } from 'src/helpers/businessHours';
import { partesEnBogota } from 'src/helpers/my-reservations';
import { DIAS, MESES, horaCorta } from 'src/helpers/reserva-texto';
import { horaYFechaEnSalon } from 'src/helpers/semana-estilistas';

export const PASO_MIN = 30;

export interface OpcionDeHora {
  valor: string; // 'HH:mm', lo que viaja a la API
  texto: string; // '10:00', lo que lee la dueña
}

const dos = (n: number) => String(n).padStart(2, '0');

/** Minutos desde medianoche → 'HH:mm'. */
export function aHHmm(minutos: number): string {
  return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`;
}

/** 'HH:mm' → minutos desde medianoche. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos desde medianoche → '8:00' / '13:30', con `horaCorta` del portal. */
export function horaDelPanel(minutos: number): string {
  return horaCorta(aHHmm(minutos));
}

/** Un rango de horas como en el resto del panel: '10:00 – 12:00'. */
export function rangoDelPanel(desde: number, hasta: number): string {
  return `${horaDelPanel(desde)} – ${horaDelPanel(hasta)}`;
}

/** Apertura y cierre de ese día ('YYYY-MM-DD'), con festivos y fin de semana. */
export function horarioDelDia(ymd: string): { abre: number; cierra: number } {
  const { openMin, closeMin } = getBusinessDayBounds(ymd.replace(/-/g, '/'));
  return { abre: openMin, cierra: closeMin };
}

const opcion = (min: number): OpcionDeHora => ({
  valor: aHHmm(min),
  texto: horaDelPanel(min),
});

/** «Desde»: de la apertura a media hora antes del cierre, cada 30 min. */
export function opcionesDesde(ymd: string): OpcionDeHora[] {
  const { abre, cierra } = horarioDelDia(ymd);
  const lista: OpcionDeHora[] = [];
  for (let t = abre; t + PASO_MIN <= cierra; t += PASO_MIN)
    lista.push(opcion(t));
  return lista;
}

/** «Hasta»: de media hora después de `desde` al cierre, cada 30 min. */
export function opcionesHasta(ymd: string, desde: string): OpcionDeHora[] {
  const { abre, cierra } = horarioDelDia(ymd);
  const inicio = Math.max(abre, aMinutos(desde)) + PASO_MIN;
  const lista: OpcionDeHora[] = [];
  for (let t = inicio; t <= cierra; t += PASO_MIN) lista.push(opcion(t));
  return lista;
}

/** 'YYYY-MM-DD' → 'Jueves 12 de noviembre'. */
export function fechaLargaDeYmd(ymd: string): string {
  const [a, m, d] = ymd.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]}`;
}

/** Un instante → su día del salón, 'YYYY-MM-DD'. */
export function ymdDelSalon(iso: string): string {
  const p = partesEnBogota(iso);
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

/** Un instante → 'Jueves 12 de noviembre' en el salón. */
export function fechaDeAusencia(iso: string): string {
  return fechaLargaDeYmd(ymdDelSalon(iso));
}

/** Un instante → '10:00' en el salón (el formateador de las citas de hoy). */
export function horaDe(iso: string): string {
  return horaYFechaEnSalon(iso).hora;
}

/**
 * La franja de una ausencia: «Todo el día» si cubre el horario entero de ese
 * día; si no, «10:00 – 12:00».
 */
export function franjaDeAusencia(startsAt: string, endsAt: string): string {
  const inicio = partesEnBogota(startsAt);
  const ymd = ymdDelSalon(startsAt);
  const { abre, cierra } = horarioDelDia(ymd);
  // Si termina otro día (no debería: las ausencias son de un día), cuenta
  // como el cierre de ese día.
  const minFin =
    ymdDelSalon(endsAt) === ymd ? partesEnBogota(endsAt).minutoDelDia : cierra;
  if (inicio.minutoDelDia <= abre && minFin >= cierra) return 'Todo el día';
  return rangoDelPanel(inicio.minutoDelDia, minFin);
}

export interface LineaDeImpacto {
  id: string;
  hora: string;
  clienta: string;
  servicios: string;
  /** «pasa a Estilista B» / «se cancela» (o en pasado, tras aplicar). */
  destino: string;
  cancelada: boolean;
}

export function lineaDeImpacto(
  impacto: AbsenceImpact,
  tiempo: 'futuro' | 'pasado' = 'futuro'
): LineaDeImpacto {
  const cancelada = impacto.outcome === 'cancelada';
  const nueva = impacto.newWorkerName?.trim() || 'otra estilista';
  const destino = cancelada
    ? tiempo === 'futuro'
      ? 'se cancela'
      : 'se canceló'
    : `${tiempo === 'futuro' ? 'pasa' : 'pasó'} a ${nueva}`;
  return {
    id: impacto.reservationId,
    hora: horaDe(impacto.scheduledAt),
    clienta: impacto.customerName?.trim() || 'Clienta sin nombre',
    servicios: impacto.services.length
      ? impacto.services.join(', ')
      : 'Sin servicios',
    destino,
    cancelada,
  };
}

/** «1 pasa a otra estilista · 1 se cancela»; '' si no hay citas. */
export function cuentaDeImpactos(impactos: AbsenceImpact[]): string {
  const cancela = impactos.filter((i) => i.outcome === 'cancelada').length;
  const pasan = impactos.length - cancela;
  const partes: string[] = [];
  if (pasan)
    partes.push(`${pasan} ${pasan === 1 ? 'pasa' : 'pasan'} a otra estilista`);
  if (cancela)
    partes.push(`${cancela} ${cancela === 1 ? 'se cancela' : 'se cancelan'}`);
  return partes.join(' · ');
}

type ErrorHttp = { response?: { status?: number; data?: { reason?: string } } };

/**
 * El error de la API dicho en palabras. `nombre` es la estilista; `accion`
 * distingue revisar (vista previa), guardar (confirmar) y quitar.
 */
export function mensajeDeAusencia(
  err: unknown,
  nombre: string,
  accion: 'revisar' | 'guardar' | 'quitar'
): string {
  const respuesta = (err as ErrorHttp | null)?.response;
  const reason = respuesta?.data?.reason;
  if (reason === 'ausencia_cruzada') {
    return `${nombre} ya tiene una ausencia que se cruza con ese rato. Quita la otra en la lista o elige otras horas.`;
  }
  if (reason === 'ausencia_invalida') {
    return 'Esas horas no sirven: tienen que ser de hoy en adelante, dentro del horario del salón, y no haber pasado ya.';
  }
  if (reason === 'estilista_por_defecto') {
    return '«Sin preferencia» no atiende: no se puede marcar como ausente.';
  }
  if (respuesta?.status === 404) {
    return accion === 'quitar'
      ? 'Esa ausencia ya no estaba: la lista se actualizó.'
      : `${nombre} ya no está en el equipo. Cierra y vuelve a cargar la página.`;
  }
  if (respuesta?.status === 400) {
    return 'Revisa la fecha y las horas.';
  }
  if (accion === 'quitar') {
    return 'No se pudo quitar la ausencia. Revisa la conexión e inténtalo de nuevo.';
  }
  if (accion === 'guardar') {
    return 'No se pudo guardar la ausencia. Revisa la conexión e inténtalo de nuevo.';
  }
  return 'No se pudo revisar la agenda. Revisa la conexión e inténtalo de nuevo.';
}
