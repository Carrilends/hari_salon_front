/**
 * `useMyReservations` (revisión final D2). Con el navegador sin conexión, una
 * mutación con el `networkMode: 'online'` por defecto de TanStack se PAUSA en
 * vez de fallar: «Cancelando…» se quedaba para siempre, sin error, y la
 * cancelación salía sola al volver la red. Con `'always'` la petición se
 * intenta, falla al momento y el diálogo pinta el aviso de conexión.
 *
 * Se usa un `QueryClient` de verdad (no un doble) para ver la pausa real.
 */
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import {
  QueryClient,
  VueQueryPlugin,
  onlineManager,
} from '@tanstack/vue-query';
import { useMyReservations } from 'src/composables/reservations/useMyReservations';
import { queryKeys } from 'src/api/query-keys';

const mockCancelar = jest.fn();
jest.mock('src/api/reservations-api', () => ({
  fetchMyReservations: () => Promise.resolve([]),
  cancelReservation: (id: string) => mockCancelar(id),
}));

function montar(queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, enabled: false } },
})) {
  let resultado!: ReturnType<typeof useMyReservations>;
  const Anfitrion = defineComponent({
    setup() {
      resultado = useMyReservations();
      return () => null;
    },
  });
  mount(Anfitrion, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  return resultado;
}

afterEach(() => {
  onlineManager.setOnline(true);
  mockCancelar.mockReset();
});

describe('useMyReservations · cancelar sin conexión', () => {
  it('falla al momento en vez de quedarse en pausa', async () => {
    onlineManager.setOnline(false);
    const sinRed = Object.assign(new Error('Network Error'), {
      request: {},
    });
    mockCancelar.mockRejectedValue(sinRed);
    const { cancel } = montar();

    const resultado = await Promise.race([
      cancel.mutateAsync('r1').then(
        () => 'resuelta',
        (e: unknown) => e
      ),
      new Promise((r) => setTimeout(() => r('en pausa'), 200)),
    ]);

    expect(mockCancelar).toHaveBeenCalledWith('r1');
    expect(resultado).toBe(sinRed);
    expect(cancel.isPaused.value).toBe(false);
  });
});

describe('useMyReservations · frescura', () => {
  /**
   * El portal da `staleTime: 60_000` por defecto (las páginas pregeneradas
   * hidratan sin volver a pedir). «Mis reservas» no: vuelve a preguntar al
   * montar y al recuperar el foco, como antes.
   */
  it('nunca se da por fresca aunque el cliente diga 60 s', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, enabled: false, staleTime: 60_000 },
      },
    });
    montar(queryClient);

    const consulta = queryClient
      .getQueryCache()
      .find({ queryKey: queryKeys.reservations.me });
    expect(consulta?.options).toMatchObject({ staleTime: 0 });
  });
});
