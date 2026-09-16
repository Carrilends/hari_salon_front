import { watch } from 'vue';
import { useQuasar } from 'quasar';
import { useQueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import {
  connectAdminSocket,
  disconnectAdminSocket,
  shouldConnectSocket,
} from 'src/api/realtime';
import type { ReservationEvent } from 'src/interfaces/booking';
import { reservationEventEffects } from './reservationEventEffects';
import { createInvalidationCoalescer } from './invalidationCoalescer';

/**
 * Nombres a los que se suscribe el socket. `satisfies` obliga a que estén los
 * cuatro miembros de la unión: si el backend emite un quinto y alguien amplía
 * `ReservationEvent`, esto deja de compilar hasta que se añada aquí.
 */
const RESERVATION_EVENT_NAMES = {
  'reservation.created': true,
  'reservation.cancelled': true,
  'reservation.rescheduled': true,
  'reservation.confirmed': true,
} satisfies Record<ReservationEvent['type'], true>;

/**
 * Canal en tiempo real del panel de administración (Fase 4, RF53, ampliado con
 * la Etapa 2 de WhatsApp). Despachador delgado: cada evento del socket pasa por
 * la tabla `reservationEventEffects`, que decide el aviso y las consultas a
 * invalidar; las invalidaciones se coalescen para que una ráfaga no dispare un
 * refetch por evento.
 *
 * El socket se abre solo para sesiones de administración y se reconstruye en
 * cada cambio de token (login o renovación de la Fase 3b, que el servidor solo
 * valida en el handshake); se cierra al cerrar sesión.
 */
export function useAdminNotifications() {
  const auth = useAuthStore();
  const $q = useQuasar();
  const queryClient = useQueryClient();
  const router = useRouter();

  const coalescer = createInvalidationCoalescer((keys) => {
    for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
  });

  function dispatch(event: ReservationEvent) {
    const { notice, invalidate } = reservationEventEffects(event);
    $q.notify({
      ...notice,
      timeout: 8000,
      actions: [
        {
          label: 'Ver',
          color: 'white',
          handler: () => void router.push('/reservas'),
        },
      ],
    });
    // El panel se refresca solo: invalidar las consultas basta.
    coalescer.add(invalidate);
  }

  function connect(token: string) {
    const socket = connectAdminSocket(token);
    for (const name of Object.keys(RESERVATION_EVENT_NAMES)) {
      socket.on(name, dispatch);
    }
  }

  function sync() {
    // Las páginas del SSG se prerenderizan sin `window`; una clienta nunca abre
    // este socket. Solo administración, y solo en el navegador.
    if (typeof window === 'undefined') return;
    if (shouldConnectSocket(auth.isAdmin, auth.token)) {
      connect(auth.token);
    } else {
      disconnectAdminSocket();
    }
  }

  function start() {
    sync(); // conecta si ya había sesión de administración al arrancar
    // Un cambio de token cubre login, renovación (token nuevo → reconecta) y
    // cierre de sesión (token vacío → desconecta); isAdmin cubre cambios de rol.
    watch(() => [auth.token, auth.isAdmin], sync);
  }

  function stop() {
    coalescer.dispose();
    disconnectAdminSocket();
  }

  return { start, stop };
}
