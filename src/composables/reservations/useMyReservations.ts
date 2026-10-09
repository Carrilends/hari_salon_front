import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchMyReservations,
  cancelReservation,
} from 'src/api/reservations-api';
import type { ReservationDto } from 'src/interfaces/booking';
import { queryKeys } from 'src/api/query-keys';

/**
 * Estado de la página «Mis reservas» (Fase 6, RF60/RF61). Consulta las reservas
 * propias con la clave `queryKeys.reservations.me` y ofrece una mutación de
 * cancelación que invalida esa consulta. La cancelación va por el mismo endpoint
 * que usa el asistente conversacional: comparten el caso de uso de Reservas, así
 * que ambas vías informan siempre del mismo estado.
 *
 * Mover una cita ya no vive aquí: lo hace `CambiarFechaDialog`, que lo reutiliza
 * la bandeja de la dueña y que invalida `reservations.all` (por prefijo, también
 * esta consulta) antes de avisar.
 */
export function useMyReservations() {
  const queryClient = useQueryClient();

  const query = useQuery<ReservationDto[]>({
    queryKey: queryKeys.reservations.me,
    queryFn: fetchMyReservations,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.me }),
  });

  return { query, cancel };
}
