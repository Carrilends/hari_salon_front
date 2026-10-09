/**
 * Ancho que se le pide a Google para su botón (decisión A10): el del
 * contenedor, entre los topes que admite GSI (200–400 px). Un contenedor sin
 * medir (0, oculto al montar) pide el mínimo.
 */
export const ANCHO_GOOGLE_MIN = 200;
export const ANCHO_GOOGLE_MAX = 400;

export function anchoBotonGoogle(anchoContenedor: number): number {
  if (!Number.isFinite(anchoContenedor) || anchoContenedor <= 0) {
    return ANCHO_GOOGLE_MIN;
  }
  return Math.max(
    ANCHO_GOOGLE_MIN,
    Math.min(ANCHO_GOOGLE_MAX, Math.floor(anchoContenedor))
  );
}
