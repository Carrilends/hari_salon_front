import {
  createReservation,
  type CreateReservationPayload,
} from 'src/api/reservations-api';
import { refreshOnce } from 'src/api/refresh-interceptor';
import { useAuthStore } from 'src/stores/auth-store';
import { estadoDeError } from 'src/helpers/mensajes-acceso';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * El texto con que el backend rechaza una hora que ya empezó
 * (`ReservationInThePastError`, `hair_salon_back/src/reservations/domain/
 * errors.ts`): «La reserva no puede programarse en el pasado». El filtro de
 * Reservas lo devuelve como 400 sin código de motivo (`reason` solo viaja en
 * los 409), así que no queda más que leer el mensaje.
 */
const MENSAJE_HORA_PASADA = /en el pasado/i;

function esHoraPasada(error: unknown): boolean {
  const mensaje = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof mensaje === 'string' && MENSAJE_HORA_PASADA.test(mensaje);
}

/** Lo que le queda al token por debajo de lo cual se renueva antes de enviar. */
export const MARGEN_RENOVACION_MS = 60_000;

export type ResultadoEnvio =
  | { tipo: 'creada'; reserva: ReservationDto }
  | { tipo: 'conflicto' }
  | { tipo: 'hora-pasada' }
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
 * Un 409 es que otra reserva tomó el hueco (`WorkerOverlapError`). Un 400
 * «en el pasado» es que la hora empezó mientras la clienta escribía
 * (`ReservationInThePastError`): reintentarla fallaría igual. Cualquier otro
 * fallo —red, otro 400, 500— se puede reintentar sin perder nada.
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
    const estado = estadoDeError(error);
    if (estado === 409) return { tipo: 'conflicto' };
    if (estado === 400 && esHoraPasada(error)) return { tipo: 'hora-pasada' };
    return { tipo: 'error' };
  }
}
