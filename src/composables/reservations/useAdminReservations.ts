import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchAllReservations,
  confirmReservation,
  cancelReservation,
} from 'src/api/reservations-api';
import type { ReservationDto } from 'src/interfaces/booking';
import { queryKeys } from 'src/api/query-keys';

/**
 * Estado del panel de reservas de administración (Fase 4, RF55). La consulta usa
 * `queryKeys.reservations.all`, la MISMA raíz que invalida el canal en tiempo real
 * (`useAdminNotifications`), así un cambio ajeno refresca la lista sin recargar.
 */
export function useAdminReservations() {
  const queryClient = useQueryClient();

  const query = useQuery<ReservationDto[]>({
    queryKey: queryKeys.reservations.all,
    queryFn: fetchAllReservations,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmReservation(id),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: invalidate,
  });

  return { query, confirm, cancel };
}
