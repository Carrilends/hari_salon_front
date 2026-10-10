/**
 * El estado de la bandeja: una consulta (la MISMA clave que invalida el canal
 * en tiempo real) y dos mutaciones que refrescan al acabar. Cancelar es el
 * `PATCH /:id/cancel`, no el `DELETE` que usaba la pestaña vieja del diálogo
 * de reserva (que, en el backend, también cancelaba).
 */
const invalidateQueries = jest.fn(() => Promise.resolve());
const opcionesConsulta: Array<{ queryKey: readonly unknown[] }> = [];
const opcionesMutacion: Array<{
  mutationFn: (id: string) => Promise<unknown>;
  onSuccess?: () => unknown;
}> = [];

jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useQuery: (opciones: { queryKey: readonly unknown[] }) => {
    opcionesConsulta.push(opciones);
    return { opciones };
  },
  useMutation: (opciones: {
    mutationFn: (id: string) => Promise<unknown>;
    onSuccess?: () => unknown;
  }) => {
    opcionesMutacion.push(opciones);
    return { opciones };
  },
}));
jest.mock('src/api/reservations-api', () => ({
  fetchAllReservations: jest.fn(),
  confirmReservation: jest.fn(() => Promise.resolve()),
  cancelReservation: jest.fn(() => Promise.resolve()),
}));

import { useAdminReservations } from 'src/composables/reservations/useAdminReservations';
import { queryKeys } from 'src/api/query-keys';

const api = jest.requireMock('src/api/reservations-api') as Record<
  string,
  jest.Mock
>;

beforeEach(() => {
  invalidateQueries.mockClear();
  opcionesConsulta.length = 0;
  opcionesMutacion.length = 0;
  Object.values(api).forEach((fn) => fn.mockClear());
});

describe('useAdminReservations', () => {
  it('consulta la lista con la clave que invalida el tiempo real', () => {
    useAdminReservations();

    expect(opcionesConsulta[0].queryKey).toEqual(queryKeys.reservations.all);
  });

  it('confirmar llama al PATCH de confirmar y refresca la lista', async () => {
    useAdminReservations();
    const [confirmar] = opcionesMutacion;

    await confirmar.mutationFn('res-1');
    await confirmar.onSuccess?.();

    expect(api.confirmReservation).toHaveBeenCalledWith('res-1');
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.reservations.all,
    });
  });

  it('cancelar llama al PATCH de cancelar', async () => {
    useAdminReservations();
    const [, cancelar] = opcionesMutacion;

    await cancelar.mutationFn('res-1');

    expect(api.cancelReservation).toHaveBeenCalledWith('res-1');
  });

  it('refrescar invalida solo la lista', async () => {
    await useAdminReservations().refrescar();

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.reservations.all,
    });
  });
});
