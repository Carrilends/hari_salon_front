/**
 * El orden de las preguntas frecuentes, en funciones puras: lo usan la lista
 * de la dueña (arrastre y teclado) y `useFaqs` (el pintado optimista).
 */

/** Copia de `lista` con el elemento de `desde` llevado a `hasta` (acotado a la lista). */
export function moverEnLista<T>(
  lista: readonly T[],
  desde: number,
  hasta: number
): T[] {
  const copia = lista.slice();
  if (desde < 0 || desde >= copia.length) return copia;
  const destino = Math.min(Math.max(hasta, 0), copia.length - 1);
  const [movido] = copia.splice(desde, 1);
  copia.splice(destino, 0, movido);
  return copia;
}

/**
 * `lista` en el orden de `ids`. Los ids desconocidos se ignoran y los
 * elementos que `ids` no nombra quedan al final, en su orden: así un pintado
 * optimista nunca hace desaparecer una pregunta.
 */
export function ordenarPorIds<T extends { id: string }>(
  lista: readonly T[],
  ids: readonly string[]
): T[] {
  const porId = new Map(lista.map((item): [string, T] => [item.id, item]));
  const nombrados = new Set(ids);
  const ordenados = ids
    .map((id) => porId.get(id))
    .filter((item): item is T => item !== undefined);
  return ordenados.concat(lista.filter((item) => !nombrados.has(item.id)));
}

/**
 * Puesto (0..n-1) en el que caería la fila `desde` si se soltara a la altura
 * `y`. `mitades` es el centro vertical de cada fila, en el orden actual,
 * medido al empezar a arrastrar: el puesto es cuántas OTRAS filas tienen su
 * centro por encima del puntero.
 */
export function destinoDeArrastre(
  mitades: readonly number[],
  y: number,
  desde: number
): number {
  return mitades.filter((mitad, indice) => indice !== desde && mitad < y)
    .length;
}
