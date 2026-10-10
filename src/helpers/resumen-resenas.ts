/**
 * La nota de Testimonios (S1 de
 * `docs/superpowers/specs/2026-10-09-vistas-restantes-design.md`): media,
 * total y barras de 5 a 1 estrellas, más los dos formatos que pinta cada
 * tarjeta. Puro: recibe la lista y no sabe de dónde viene.
 */
import type { ReviewItem } from 'src/api/apiTypes';
import { partesEnBogota } from 'src/helpers/my-reservations';
import { MESES } from 'src/helpers/reserva-texto';

export type Estrellas = 1 | 2 | 3 | 4 | 5;

export interface BarraEstrellas {
  estrellas: Estrellas;
  cuantas: number;
  porcentaje: number;
}

export interface ResumenResenas {
  total: number;
  media: number;
  mediaTexto: string;
  barras: BarraEstrellas[];
}

const DE_CINCO_A_UNA: Estrellas[] = [5, 4, 3, 2, 1];

/**
 * Una nota válida es un entero de 1 a 5. El backend lo garantiza al crear
 * (`CreateReviewDto`), pero la columna puede llegar como texto: se convierte y,
 * si no encaja, se deja fuera en vez de hundir la media con un cero.
 */
function notaValida(score: unknown): Estrellas | null {
  if (score === null || score === undefined || score === '') return null;
  const n = Math.round(Number(score));
  return n >= 1 && n <= 5 ? (n as Estrellas) : null;
}

export function resumenDeResenas(
  resenas: Array<Pick<ReviewItem, 'score'>>
): ResumenResenas {
  const notas = resenas
    .map((r) => notaValida(r.score))
    .filter((n): n is Estrellas => n !== null);
  const total = notas.length;
  const suma = notas.reduce<number>((acc, n) => acc + n, 0);
  const media = total ? Math.round((suma / total) * 10) / 10 : 0;

  return {
    total,
    media,
    mediaTexto: media.toFixed(1).replace('.', ','),
    barras: DE_CINCO_A_UNA.map((estrellas) => {
      const cuantas = notas.filter((n) => n === estrellas).length;
      return {
        estrellas,
        cuantas,
        porcentaje: total ? Math.round((cuantas / total) * 100) : 0,
      };
    }),
  };
}

export function textoTotal(n: number): string {
  return `${n} ${n === 1 ? 'reseña' : 'reseñas'}`;
}

/**
 * «18 may 2026». El día se cuenta en hora de Bogotá: una reseña escrita a las
 * 22:00 en Sopó ya es del día siguiente en UTC, y la tarjeta diría otra fecha
 * de la que vivió la clienta. Reutiliza `partesEnBogota` y los meses de
 * `reserva-texto`, abreviados a tres letras (sin depender del ICU).
 */
export function fechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const p = partesEnBogota(fecha);
  return `${p.dia} ${MESES[p.mes - 1].slice(0, 3)} ${p.anio}`;
}

export function inicialDe(nombre: string): string {
  return (nombre?.trim().charAt(0) || '?').toUpperCase();
}
