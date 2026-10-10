/**
 * Los composables de «Mis estilistas», con Vue Query DE VERDAD (un
 * `QueryClient` por prueba) y la red doblada: lo que se vigila es conducta de
 * caché —qué se pide, cuándo, qué se refresca— que un doble de `useQuery` no
 * probaría. Las API se doblan enteras: leen `import.meta.env`.
 */
jest.mock('src/api/workers-api', () => ({
  fetchWorkersWeek: jest.fn(),
  createWorker: jest.fn(),
  updateWorker: jest.fn(),
  removeWorker: jest.fn(),
}));
jest.mock('src/api/reservations-api', () => ({
  fetchAllReservations: jest.fn(),
}));

import { defineComponent, h, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import {
  createWorker,
  fetchWorkersWeek,
  removeWorker,
  updateWorker,
} from 'src/api/workers-api';
import { fetchAllReservations } from 'src/api/reservations-api';
import { queryKeys } from 'src/api/query-keys';
import { useWorkers } from 'src/composables/workers/useWorkers';
import { useSemanaEstilistas } from 'src/composables/workers/useSemanaEstilistas';
import { useReservasDeHoy } from 'src/composables/workers/useReservasDeHoy';
import { reservaDePrueba, semanaDePrueba } from './fixtures/estilistas';

const semanaMock = fetchWorkersWeek as jest.Mock;

/** Monta un anfitrión que llama al composable dentro de `setup`. */
function montar<T>(usar: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  let resultado!: T;
  const Anfitrion = defineComponent({
    setup() {
      resultado = usar();
      return () => h('div');
    },
  });
  mount(Anfitrion, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  return { resultado, queryClient };
}

/** Vue Query notifica en una tarea aparte: se vacía la cola hasta que se cumple. */
async function hasta(condicion: () => boolean) {
  for (let i = 0; i < 20 && !condicion(); i += 1) await flushPromises();
  expect(condicion()).toBe(true);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSemanaEstilistas', () => {
  it('pide la semana del lunes que se le da y la publica', async () => {
    semanaMock.mockResolvedValue(semanaDePrueba());
    const { resultado } = montar(() =>
      useSemanaEstilistas(ref('2026-10-05'), ref(true))
    );

    await hasta(() => resultado.semana.value !== undefined);
    expect(semanaMock).toHaveBeenCalledWith('2026-10-05');
    expect(resultado.semana.value?.start).toBe('2026-10-05');
  });

  it('al cambiar de semana pide la nueva y conserva la anterior mientras llega', async () => {
    let entregar!: (valor: unknown) => void;
    semanaMock
      .mockResolvedValueOnce(semanaDePrueba())
      .mockImplementationOnce(
        () => new Promise((resolver) => (entregar = resolver))
      );
    const lunes = ref('2026-10-05');
    const { resultado } = montar(() => useSemanaEstilistas(lunes, ref(true)));
    await hasta(() => resultado.semana.value?.start === '2026-10-05');

    lunes.value = '2026-10-12';
    await hasta(() => semanaMock.mock.calls.length === 2);

    expect(semanaMock).toHaveBeenLastCalledWith('2026-10-12');
    // Sin parpadeo: la tabla sigue con la semana anterior hasta que llega la nueva.
    expect(resultado.semana.value?.start).toBe('2026-10-05');
    expect(resultado.cargando.value).toBe(false);

    entregar(semanaDePrueba({ start: '2026-10-12' }));
    await hasta(() => resultado.semana.value?.start === '2026-10-12');
  });

  it('sin sesión de dueña no pide nada', async () => {
    montar(() => useSemanaEstilistas(ref('2026-10-05'), ref(false)));
    await flushPromises();

    expect(semanaMock).not.toHaveBeenCalled();
  });

  it('invalidar la raíz de disponibilidad (lo que hace el canal en tiempo real) la vuelve a pedir', async () => {
    semanaMock.mockResolvedValue(semanaDePrueba());
    const { resultado, queryClient } = montar(() =>
      useSemanaEstilistas(ref('2026-10-05'), ref(true))
    );
    await hasta(() => resultado.semana.value !== undefined);

    await queryClient.invalidateQueries({
      queryKey: queryKeys.workerAvailability.all,
    });

    await hasta(() => semanaMock.mock.calls.length === 2);
  });

  it('un fallo se publica como error, sin inventar semana', async () => {
    semanaMock.mockRejectedValue(new Error('red'));
    const { resultado } = montar(() =>
      useSemanaEstilistas(ref('2026-10-05'), ref(true))
    );

    await hasta(() => resultado.error.value !== null);
    expect(resultado.semana.value).toBeUndefined();
  });
});

describe('useReservasDeHoy', () => {
  it('trae la lista de la dueña bajo la clave de reservas', async () => {
    (fetchAllReservations as jest.Mock).mockResolvedValue([reservaDePrueba()]);
    const { resultado, queryClient } = montar(() =>
      useReservasDeHoy(ref(true))
    );

    await hasta(() => resultado.reservas.value.length === 1);
    expect(queryClient.getQueryData(queryKeys.reservations.all)).toHaveLength(
      1
    );
  });

  it('mientras no llega, es una lista vacía; sin permiso, no pide', async () => {
    const { resultado } = montar(() => useReservasDeHoy(ref(false)));
    await flushPromises();

    expect(resultado.reservas.value).toEqual([]);
    expect(fetchAllReservations).not.toHaveBeenCalled();
  });
});

describe('useWorkers', () => {
  it('crear, renombrar y eliminar llaman a la API y refrescan la lista y la semana', async () => {
    (createWorker as jest.Mock).mockResolvedValue({
      id: 'w-9',
      name: 'Ana',
      isDefault: false,
    });
    (updateWorker as jest.Mock).mockResolvedValue({
      id: 'w-9',
      name: 'Ana María',
      isDefault: false,
    });
    (removeWorker as jest.Mock).mockResolvedValue({ deleted: true });
    const { resultado, queryClient } = montar(() => useWorkers());
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');

    await resultado.crear.mutateAsync({ name: 'Ana' });
    await resultado.renombrar.mutateAsync({
      id: 'w-9',
      body: { name: 'Ana María' },
    });
    await resultado.eliminar.mutateAsync('w-9');

    expect(createWorker).toHaveBeenCalledWith({ name: 'Ana' });
    expect(updateWorker).toHaveBeenCalledWith('w-9', { name: 'Ana María' });
    expect(removeWorker).toHaveBeenCalledWith('w-9');
    expect(invalidar).toHaveBeenCalledTimes(6);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['workers'] });
    expect(invalidar).toHaveBeenCalledWith({
      queryKey: queryKeys.workerAvailability.all,
    });
  });

  it('un error de la API llega a quien llama, sin refrescar nada', async () => {
    (removeWorker as jest.Mock).mockRejectedValue({
      response: { status: 409 },
    });
    const { resultado, queryClient } = montar(() => useWorkers());
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');

    await expect(resultado.eliminar.mutateAsync('w-1')).rejects.toEqual({
      response: { status: 409 },
    });
    expect(invalidar).not.toHaveBeenCalled();
  });
});
