/**
 * Lo que hay que borrar al cerrar sesión, registrado por quien lo posee.
 *
 * Existe para no invertir una dependencia: `auth-store` no puede importar
 * `useAssistant`, porque `useAssistant` llega a `assistant-api` y `assistant-api`
 * importa `auth-store` para poner el Bearer — un ciclo en tiempo de módulo que,
 * además, arrastra `import.meta.env` a cada prueba que toque el store. Así el
 * store solo conoce una lista de funciones, y es el asistente quien se apunta.
 *
 * Mismo patrón que `useReviewDialog().registrarSolicitud()`: el que sabe se
 * registra; el que manda no necesita conocerlo.
 */
type Limpieza = () => void;

const limpiezas: Limpieza[] = [];

export function registrarLimpiezaDeSesion(limpieza: Limpieza): void {
  if (!limpiezas.includes(limpieza)) limpiezas.push(limpieza);
}

/**
 * Se llama desde `logout()`. Un fallo en una limpieza no puede impedir las
 * demás ni dejar la sesión a medio cerrar: cerrar sesión siempre termina.
 */
export function limpiarDatosDeSesion(): void {
  for (const limpieza of limpiezas) {
    try {
      limpieza();
    } catch {
      /* una limpieza rota no bloquea el cierre de sesión */
    }
  }
}
