/**
 * Los textos del cajón de reserva (spec §1 de las vistas restantes): fechas,
 * horas, precios y duraciones dichos como los lee una clienta.
 *
 * Funciones puras y sin `Intl` de fecha a propósito: el nombre del día y del
 * mes no puede cambiar con el idioma del navegador, y el día de la semana se
 * calcula en UTC sobre la fecha del salón (que ya viene en hora de Bogotá).
 */
import { formatCopDisplay } from 'src/helpers/price-display';
import { formatDurationMinutes } from 'src/helpers/duration';

export const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const MESES = [
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

const HORA = /^(\d{1,2}):(\d{2})$/;

/** `'YYYY/MM/DD'` o `'YYYY-MM-DD'` → sus partes; null si no es una fecha real. */
export function partesDeFecha(
  fecha: string
): { anio: number; mes: number; dia: number; diaSemana: number } | null {
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(fecha.trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  if (utc.getUTCMonth() !== mes - 1 || utc.getUTCDate() !== dia) return null;
  return { anio, mes, dia, diaSemana: utc.getUTCDay() };
}

/** 'Jueves 8 de octubre'. */
export function fechaLarga(fecha: string): string {
  const p = partesDeFecha(fecha);
  if (!p) return '';
  return `${DIAS[p.diaSemana]} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/** 'Lunes 12' (la nota de festivo de la tira). */
export function diaYNumero(fecha: string): string {
  const p = partesDeFecha(fecha);
  if (!p) return '';
  return `${DIAS[p.diaSemana]} ${p.dia}`;
}

/** 'Octubre 2026' (el rótulo de «Qué día»). */
export function mesYAnio(fecha: string): string {
  const p = partesDeFecha(fecha);
  if (!p) return '';
  const mes = MESES[p.mes - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${p.anio}`;
}

/** '08:30' → '8:30'. Lo que no es una hora se devuelve tal cual. */
export function horaCorta(hora: string): string {
  const m = HORA.exec(hora.trim());
  if (!m) return hora;
  return `${Number(m[1])}:${m[2]}`;
}

/** 'HH:mm' + minutos → 'HH:mm'. */
export function sumarMinutos(hora: string, minutos: number): string {
  const m = HORA.exec(hora.trim());
  if (!m) return hora;
  const total = Number(m[1]) * 60 + Number(m[2]) + minutos;
  const h = Math.floor(total / 60);
  return `${String(h).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** '10:30 a 11:30'. */
export function franjaTexto(hora: string, duracionMin: number): string {
  return `${horaCorta(hora)} a ${horaCorta(sumarMinutos(hora, duracionMin))}`;
}

/** '$ 85.000' (pesos, sin decimales). */
export function precioTexto(valor: number): string {
  return `$ ${formatCopDisplay(valor)}`;
}

/** 'aprox. 1 h 30 min'; sin minutos, 'sin servicios' (el pie con la bolsa vacía). */
export function duracionAprox(minutos: number): string {
  return minutos > 0
    ? `aprox. ${formatDurationMinutes(minutos)}`
    : 'sin servicios';
}

/** '1 servicio' / '2 servicios'. */
export function cantidadDeServicios(n: number): string {
  return n === 1 ? '1 servicio' : `${n} servicios`;
}

/** Hasta dos iniciales en mayúscula: 'Laura Gómez' → 'LG'. */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}
