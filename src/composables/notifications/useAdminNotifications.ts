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
import { WS_URL } from 'src/api/ws-url';
import type { ReservationEvent } from 'src/interfaces/booking';
import { queryKeys } from 'src/api/query-keys';
import { reservationEventEffects } from './reservationEventEffects';
import { createInvalidationCoalescer } from './invalidationCoalescer';

/**
 * Nombres a los que se suscribe el socket. La anotación obliga a que estén los
 * cuatro miembros de la unión, ni uno más ni uno menos: si el backend emite un
 * quinto y alguien amplía `ReservationEvent`, esto deja de compilar hasta que
 * se añada aquí. (No se usa `satisfies`: el esbuild 0.14 de Vite 2 no lo
 * entiende y rompe `yarn dev`/`yarn build` aunque vue-tsc y jest lo acepten.)
 */
const RESERVATION_EVENT_NAMES: Record<ReservationEvent['type'], true> = {
  'reservation.created': true,
  'reservation.cancelled': true,
  'reservation.rescheduled': true,
  'reservation.confirmed': true,
};

/** Todo lo que depende de las reservas; es lo que se refresca al reconectar. */
const EVERYTHING_RESERVATIONS_TOUCH = [
  queryKeys.reservations.all,
  queryKeys.occupancy.all,
  queryKeys.workerAvailability.all,
];

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
    // `connect` se emite en CADA conexión lograda, no solo en la primera. Los
    // eventos emitidos mientras el socket estaba caído (portátil suspendido,
    // redeploy del backend) se perdieron: refrescarlo todo aquí es lo que los
    // recupera. En la primera conexión cuesta, como mucho, un refetch.
    socket.on('connect', () => coalescer.add(EVERYTHING_RESERVATIONS_TOUCH));
    for (const name of Object.keys(RESERVATION_EVENT_NAMES)) {
      socket.on(name, dispatch);
    }
  }

  let warnedNoWsUrl = false;

  function sync() {
    // Las páginas del SSG se prerenderizan sin `window`; una clienta nunca abre
    // este socket. Solo administración, y solo en el navegador.
    if (typeof window === 'undefined') return;
    if (shouldConnectSocket(auth.isAdmin, auth.token, WS_URL)) {
      connect(auth.token);
      return;
    }
    disconnectAdminSocket();
    // Un despliegue sin `VITE_WS_URL` no debe fallar en silencio: el panel
    // seguiría funcionando, pero sin tiempo real, y nadie sabría por qué.
    if (auth.isAdmin && auth.token && !WS_URL && !warnedNoWsUrl) {
      warnedNoWsUrl = true;
      console.warn(
        '[tiempo real] VITE_WS_URL no está definida: el panel no recibirá avisos en vivo.'
      );
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
