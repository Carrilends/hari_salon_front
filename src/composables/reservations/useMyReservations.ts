import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchMyReservations,
  cancelReservation,
  rescheduleReservation,
} from 'src/api/reservations-api';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Estado de la página «Mis reservas» (Fase 6, RF60/RF61). Consulta las reservas
 * propias con la clave `['reservations', 'me']` y ofrece una mutación de
 * cancelación que invalida esa consulta. La cancelación va por el mismo endpoint
 * que usa el asistente conversacional: comparten el caso de uso de Reservas, así
 * que ambas vías informan siempre del mismo estado.
 */
export function useMyReservations() {
  const queryClient = useQueryClient();

  const query = useQuery<ReservationDto[]>({
    queryKey: ['reservations', 'me'],
    queryFn: fetchMyReservations,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['reservations', 'me'] }),
  });

  // Mueve una cita conservando su id. Invalida la misma consulta que cancelar:
  // ambas vías y el asistente comparten el caso de uso del backend, así que
  // siempre informan del mismo estado.
  const reschedule = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      rescheduleReservation(id, scheduledAt),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['reservations', 'me'] }),
  });

  return { query, cancel, reschedule };
}
