import {
  createReservation,
  type CreateReservationPayload,
} from 'src/api/reservations-api';
import { refreshOnce } from 'src/api/refresh-interceptor';
import { useAuthStore } from 'src/stores/auth-store';
import { estadoDeError } from 'src/helpers/mensajes-acceso';
import type { ReservationDto } from 'src/interfaces/booking';

/** Lo que le queda al token por debajo de lo cual se renueva antes de enviar. */
export const MARGEN_RENOVACION_MS = 60_000;

export type ResultadoEnvio =
  | { tipo: 'creada'; reserva: ReservationDto }
  | { tipo: 'conflicto' }
  | { tipo: 'sesion-cerrada' }
  | { tipo: 'error' };

/**
 * Manda la reserva del cajón y traduce la respuesta a lo que el cajón sabe
 * contar.
 *
 * `POST /reservations` va con `OptionalJwtAuthGuard`, que NUNCA responde 401:
 * con un token vencido trata la reserva como anónima. La renovación por 401
 * del interceptor no salta, así que se hace aquí, antes de enviar. Si la
 * renovación falla, no se envía: una reserva con sesión sin teléfono saldría
 * sin `userId` ni `contact` (400), y con teléfono saldría huérfana de cuenta.
 *
 * Un 409 es que otra reserva tomó el hueco (`WorkerOverlapError`); cualquier
 * otro fallo —red, 400, 500— se puede reintentar sin perder nada.
 */
export async function enviarReserva(
  solicitud: CreateReservationPayload,
  conSesion: boolean
): Promise<ResultadoEnvio> {
  if (conSesion) {
    const auth = useAuthStore();
    const caduca =
      auth.expiresAt > 0 && auth.expiresAt - Date.now() < MARGEN_RENOVACION_MS;
    if (!auth.token || caduca) {
      try {
        await refreshOnce();
      } catch {
        return { tipo: 'sesion-cerrada' };
      }
    }
  }
  try {
    const reserva = await createReservation(solicitud);
    return { tipo: 'creada', reserva };
  } catch (error) {
    return estadoDeError(error) === 409
      ? { tipo: 'conflicto' }
      : { tipo: 'error' };
  }
}
