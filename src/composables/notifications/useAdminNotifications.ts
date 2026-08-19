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
import type { ReservationCreatedEvent } from 'src/interfaces/booking';

/** Zona del salón (America/Bogota); el servidor puede correr en UTC. */
const SALON_TZ = 'America/Bogota';

function formatSalonDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: SALON_TZ,
  }).format(new Date(iso));
}

/**
 * Aviso en tiempo real de reservas nuevas para administración (Fase 4, RF53). El
 * socket se abre solo para sesiones de administración y se reconstruye en cada
 * cambio de token (login o renovación de la Fase 3b, que el servidor solo valida
 * en el handshake); se cierra al cerrar sesión.
 */
export function useAdminNotifications() {
  const auth = useAuthStore();
  const $q = useQuasar();
  const queryClient = useQueryClient();
  const router = useRouter();

  function connect(token: string) {
    const socket = connectAdminSocket(token);
    socket.on('reservation.created', (event: ReservationCreatedEvent) => {
      $q.notify({
        type: 'positive',
        icon: 'event_available',
        message: `Nueva reserva de ${event.customerName}`,
        caption: formatSalonDateTime(event.scheduledAt),
        timeout: 8000,
        actions: [
          {
            label: 'Ver',
            color: 'white',
            handler: () => void router.push('/reservas'),
          },
        ],
      });
      // El panel se refresca solo: invalidar la consulta basta.
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    });
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

  return { start, stop: disconnectAdminSocket };
}
