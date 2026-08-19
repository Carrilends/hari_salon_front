import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchAllReservations,
  confirmReservation,
  cancelReservation,
} from 'src/api/reservations-api';
import type { ReservationDto } from 'src/interfaces/booking';

/**
 * Estado del panel de reservas de administración (Fase 4, RF55). La consulta usa
 * la clave `['reservations']`, la MISMA que invalida el aviso en tiempo real
 * (`useAdminNotifications`), así una reserva nueva refresca la lista sin recargar.
 */
export function useAdminReservations() {
  const queryClient = useQueryClient();

  const query = useQuery<ReservationDto[]>({
    queryKey: ['reservations'],
    queryFn: fetchAllReservations,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['reservations'] });

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
