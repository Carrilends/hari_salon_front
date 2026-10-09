/**
 * La ocupación de los catorce días de la tira, en una sola consulta. Se corta
 * por `useQuery` para leer sus opciones sin red ni `reservations-api`.
 */
type Opciones = {
  queryKey: { value: readonly unknown[] };
  queryFn: () => Promise<unknown>;
  enabled: { value: boolean };
  staleTime: number;
};
const mockConsulta: { opciones: Opciones | null } = { opciones: null };
jest.mock('@tanstack/vue-query', () => ({
  useQuery: (opciones: Opciones) => {
    mockConsulta.opciones = opciones;
    return {};
  },
}));
const mockPedirOcupacion = jest.fn();
jest.mock('src/api/reservations-api', () => ({
  fetchReservationOccupancy: (...args: unknown[]) =>
    mockPedirOcupacion(...args),
}));

import { ref } from 'vue';
import { queryKeys } from 'src/api/query-keys';
import { useOcupacionDeLaTira } from 'src/composables/booking/useOcupacionDeLaTira';

beforeEach(() => {
  mockConsulta.opciones = null;
  mockPedirOcupacion.mockReset();
});

describe('useOcupacionDeLaTira', () => {
  it('pide justo el rango de la tira, y solo con el cajón abierto', async () => {
    const rango = ref({ desde: '2026-10-07', hasta: '2026-10-20' });
    const activo = ref(false);

    useOcupacionDeLaTira(rango, activo);
    const opciones = mockConsulta.opciones as Opciones;

    expect(opciones.queryKey.value).toEqual([
      'reservation-occupancy',
      'rango',
      '2026-10-07',
      '2026-10-20',
    ]);
    expect(opciones.enabled.value).toBe(false);
    activo.value = true;
    expect(opciones.enabled.value).toBe(true);

    await opciones.queryFn();
    expect(mockPedirOcupacion).toHaveBeenCalledWith('2026-10-07', '2026-10-20');
  });

  it('su clave cuelga de la raíz de ocupación (el tiempo real la invalida)', () => {
    const clave = queryKeys.occupancy.rango('2026-10-07', '2026-10-20');
    const raiz = queryKeys.occupancy.all;

    expect(clave.slice(0, raiz.length)).toEqual(Array.from(raiz));
  });
});
