import { estadoDeError } from 'src/helpers/mensajes-acceso';

/**
 * Las dos acciones de la bandeja que pueden fallar en el sitio (Mover tiene
 * sus propios errores dentro de `CambiarFechaDialog`, plan 2).
 */
export type AccionBandeja = 'confirmar' | 'cancelar';

export interface FalloDeAccion {
  mensaje: string;
  /** La lista de la pantalla está vieja: hay que volver a pedirla. */
  refrescar: boolean;
}

/**
 * Traduce el error de `PATCH /reservations/:id/confirm|cancel`. El backend
 * (`reservation-domain-exception.filter.ts`) da 400 a una transición de estado
 * imposible —confirmar una confirmada, cancelar una cancelada— y 404 a una
 * reserva que no existe: en los dos casos otra vía se adelantó.
 */
export function falloDeAccion(
  err: unknown,
  accion: AccionBandeja
): FalloDeAccion {
  const estado = estadoDeError(err);
  if (estado === undefined) {
    return {
      mensaje: `No se pudo ${accion}: revisa la conexión e inténtalo de nuevo.`,
      refrescar: false,
    };
  }
  if (estado === 404) {
    return {
      mensaje: 'Esta reserva ya no existe. La lista se actualizó.',
      refrescar: true,
    };
  }
  if (estado === 400) {
    return {
      mensaje:
        accion === 'confirmar'
          ? 'Esta reserva ya no estaba pendiente. La lista se actualizó.'
          : 'Esta reserva ya no se puede cancelar. La lista se actualizó.',
      refrescar: true,
    };
  }
  if (estado === 401 || estado === 403) {
    return {
      mensaje: 'Tu sesión de administración caducó. Vuelve a entrar.',
      refrescar: false,
    };
  }
  return {
    mensaje: `No se pudo ${accion} la reserva. Inténtalo de nuevo.`,
    refrescar: false,
  };
}
