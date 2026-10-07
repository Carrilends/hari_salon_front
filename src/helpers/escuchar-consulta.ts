/**
 * Escucha los cambios de una consulta de medios y devuelve con qué soltarla.
 *
 * NF06 (Tabla 44) promete Safari 13.1, y ahí `MediaQueryList` todavía no es un
 * `EventTarget`: no tiene `addEventListener`, solo el `addListener` obsoleto.
 * Una llamada suelta a `addEventListener` revienta el montaje del componente
 * entero en ese Safari, así que la decisión se toma en un solo sitio y quien
 * escucha una consulta pasa por aquí.
 *
 * Si la consulta no trae ninguno de los dos (un doble de prueba a medias), no
 * se escucha nada y el `soltar` no hace nada: el valor inicial ya está puesto.
 */
export function escucharConsulta(
  consulta: MediaQueryList,
  alCambiar: () => void
): () => void {
  if (typeof consulta.addEventListener === 'function') {
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }
  if (typeof consulta.addListener === 'function') {
    consulta.addListener(alCambiar);
    return () => consulta.removeListener(alCambiar);
  }
  return () => undefined;
}
