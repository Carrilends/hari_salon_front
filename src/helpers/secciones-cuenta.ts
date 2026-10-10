/**
 * Las secciones de Mi cuenta (plan 6, C1) y cómo se leen de la consulta.
 *
 * La sección vive en `?seccion=` y no en estado local: en el móvil el índice
 * y la sección van a pantalla completa, y así el «atrás» del navegador vuelve
 * al índice; además un enlace puede llevar directo a una sección
 * (`{ query: { seccion: 'contrasena' } }` desde «Correo» en una cuenta de
 * Google). «Mis reservas» no es una sección: es un enlace a `/mis-reservas`.
 */
export type SeccionCuenta = 'perfil' | 'correo' | 'contrasena' | 'sesion';

export const SECCIONES_CUENTA: readonly SeccionCuenta[] = [
  'perfil',
  'correo',
  'contrasena',
  'sesion',
];

/**
 * Por debajo de 900 px no caben el índice (260) + 48 + una ficha de formulario
 * con sus márgenes: índice y sección pasan a pantalla completa (tablero,
 * móviles 1–3).
 */
export const CONSULTA_CUENTA_MOVIL = '(max-width: 899px)';

export function seccionDeConsulta(valor: unknown): SeccionCuenta | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof texto !== 'string') return null;
  return (SECCIONES_CUENTA as readonly string[]).includes(texto)
    ? (texto as SeccionCuenta)
    : null;
}
