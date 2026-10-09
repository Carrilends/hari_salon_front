/**
 * El destino de `?redirect=` tras entrar o crear cuenta: solo rutas internas
 * (especificación §7.7).
 *
 * Lo usan el login, el registro (A12), el «← Entrar» del armazón y el menú
 * «Más» (`menuMas.ts`, para «Iniciar sesión» y «Crear cuenta»). Cualquier
 * cosa que no sea una ruta del propio portal acaba en el catálogo:
 * - lo que no empieza por `/`, o empieza por `//` (otro dominio);
 * - lo que lleva `\` o caracteres de control: los navegadores convierten
 *   `/\otro.sitio` y `/<tab>/otro.sitio` en `//otro.sitio`;
 * - lo que vuelve al propio acceso (`/auth…`, sin distinguir mayúsculas: el
 *   router tampoco las distingue): tras entrar sería un bucle.
 */
export const DESTINO_POR_DEFECTO = '/services';

// eslint-disable-next-line no-control-regex
const CARACTER_DE_CONTROL = /[\u0000-\u001F\u007F]/;

export function redireccionSegura(valor: unknown): string {
  if (typeof valor !== 'string') return DESTINO_POR_DEFECTO;
  const ruta = valor.trim();
  if (!ruta.startsWith('/') || ruta.startsWith('//')) {
    return DESTINO_POR_DEFECTO;
  }
  if (ruta.includes('\\') || CARACTER_DE_CONTROL.test(ruta)) {
    return DESTINO_POR_DEFECTO;
  }
  if (/^\/auth(?:[/?#]|$)/i.test(ruta)) return DESTINO_POR_DEFECTO;
  return ruta;
}
