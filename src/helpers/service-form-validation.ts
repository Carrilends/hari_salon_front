/**
 * Validación del formulario de crear/editar servicio que puede vivir fuera de
 * la plantilla.
 *
 * El mensaje de «sin imágenes» estaba escrito dentro de un `$q.notify` en
 * `controlStepper`: no se podía probar sin montar el `q-stepper` completo, y la
 * dueña solo lo veía como un aviso flotante que se iba a los tres segundos.
 * Aquí es una cadena, y la plantilla la pinta junto al campo.
 */
export const ERROR_SIN_IMAGENES = 'Debes seleccionar al menos una imagen';

/** Cadena vacía = no hay error. Lo que devuelve se pinta junto al campo. */
export function validarPasoImagenes(
  archivos: unknown[] | null | undefined
): string {
  return (archivos?.length ?? 0) === 0 ? ERROR_SIN_IMAGENES : '';
}
