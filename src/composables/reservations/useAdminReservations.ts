import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchAllReservations,
  confirmReservation,
  cancelReservation,
} from 'src/api/reservations-api';
import type { ReservationDto } from 'src/interfaces/booking';
import { queryKeys } from 'src/api/query-keys';

/**
 * Estado de la bandeja de reservas de la dueña (Fase 4, RF55; spec §3). La
 * consulta usa `queryKeys.reservations.all`, la MISMA raíz que invalida el
 * canal en tiempo real (`useAdminNotifications`), así un cambio ajeno refresca
 * la lista sin recargar.
 *
 * Cancelar es `PATCH /:id/cancel`; el `DELETE /:id` que usaba la pestaña vieja
 * del diálogo de reserva hacía lo mismo en el backend (RF33: «borrar» es
 * cancelar), así que la bandeja usa el nombre honesto.
 */
export function useAdminReservations() {
  const queryClient = useQueryClient();

  const query = useQuery<ReservationDto[]>({
    queryKey: queryKeys.reservations.all,
    queryFn: fetchAllReservations,
  });

  /** Vuelve a pedir la lista: tras una acción propia o un error que la deja vieja. */
  const refrescar = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });

  const confirm = useMutation({
    mutationFn: (id: string) => confirmReservation(id),
    onSuccess: refrescar,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: refrescar,
  });

  return { query, confirm, cancel, refrescar };
}
