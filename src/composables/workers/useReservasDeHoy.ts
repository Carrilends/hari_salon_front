import { computed, type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { fetchAllReservations } from 'src/api/reservations-api';
import { queryKeys } from 'src/api/query-keys';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Las reservas vigentes del salón (`GET /reservations`, solo la dueña), para
 * la lista «Hoy» del panel de una estilista. Usa la MISMA clave que la página
 * de reservas: comparten caché y el canal en tiempo real la refresca.
 */
export function useReservasDeHoy(habilitada: Ref<boolean>) {
  const consulta = useQuery<ReservationDto[]>({
    queryKey: queryKeys.reservations.all,
    queryFn: fetchAllReservations,
    enabled: habilitada,
    staleTime: 30_000,
  });

  return { reservas: computed(() => consulta.data.value ?? []) };
}
