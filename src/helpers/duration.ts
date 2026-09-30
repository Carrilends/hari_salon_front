/**
 * Duración en minutos, dicha como la diría una persona: «45 min», «1 h»,
 * «2 h 30 min». Se muestra siempre ANTES de confirmar, porque un paquete de
 * boda puede pasar de tres horas y eso cambia los planes del día.
 *
 * Vive aquí, y no dentro de una tarjeta, porque ya lo necesitan dos.
 */
export function formatDurationMinutes(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}
