/**
 * A5 de punta a punta: socket → useAdminNotifications → aviso fijado +
 * invalidación coalescida → la consulta vuelve a pedir la lista → la fila
 * desaparece. Lo real: la página, el despachador, el almacén de avisos, la
 * tabla de efectos, el coalescedor y `useAdminReservations`. Lo doblado: el
 * socket, Quasar y TanStack (cuyo `invalidateQueries` hace de refetch contra
 * un «servidor» en memoria).
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type {
  ReservationCancelledEvent,
  ReservationDto,
} from 'src/interfaces/booking';

type Handler = (payload?: unknown) => void;

const fakeSocket = {
  handlers: new Map<string, Handler[]>(),
  on(name: string, fn: Handler) {
    const list = this.handlers.get(name) ?? [];
    list.push(fn);
    this.handlers.set(name, list);
    return this;
  },
  emit(name: string, payload?: unknown) {
    for (const fn of this.handlers.get(name) ?? []) fn(payload);
  },
};

const notify = jest.fn();
const servidor: { reservas: ReservationDto[] } = { reservas: [] };
const datos = ref<ReservationDto[] | undefined>(undefined);

jest.mock('quasar', () => ({ useQuasar: () => ({ notify }) }));
jest.mock('vue-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => ({ isAdmin: true, token: 'jwt' }),
}));
jest.mock('src/api/realtime', () => ({
  shouldConnectSocket: () => true,
  connectAdminSocket: () => fakeSocket,
  disconnectAdminSocket: jest.fn(),
}));
jest.mock('src/api/reservations-api', () => ({
  fetchAllReservations: jest.fn(),
  confirmReservation: jest.fn(),
  cancelReservation: jest.fn(),
}));
jest.mock('@tanstack/vue-query', () => {
  const vue = require('vue');
  return {
    useQuery: () => ({
      data: datos,
      isLoading: vue.ref(false),
      isError: vue.ref(false),
      isFetching: vue.ref(false),
      refetch: jest.fn(),
    }),
    useMutation: () => ({ mutateAsync: jest.fn(), isPending: vue.ref(false) }),
    // El refetch de verdad: invalidar la lista la vuelve a pedir al «servidor».
    useQueryClient: () => ({
      invalidateQueries: ({ queryKey }: { queryKey: readonly unknown[] }) => {
        if (queryKey[0] === 'reservations')
          datos.value = Array.from(servidor.reservas);
        return Promise.resolve();
      },
    }),
  };
});
jest.mock('src/helpers/businessHours', () => ({
  ...jest.requireActual('src/helpers/businessHours'),
  getSalonNowParts: () => ({
    ymd: '2026-10-07',
    qDate: '2026/10/07',
    minOfDay: 600,
  }),
}));
jest.mock('src/components/reservations/CambiarFechaDialog.vue', () => {
  const { defineComponent, h } = require('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'CambiarFechaDialog',
      props: {
        reserva: Object,
        modelValue: Boolean,
        permitirEstilista: Boolean,
      },
      emits: ['update:modelValue', 'reprogramada'],
      setup: () => () => h('div'),
    }),
  };
});

import AdminReservationsPage from 'src/pages/AdminReservationsPage.vue';
import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';
import { useAvisosEnVivo } from 'src/composables/notifications/avisosEnVivo';
import { bandeja } from './fixtures/bandeja';
import { cancelledByCustomer } from './fixtures/reservation-events';

const QPage = { name: 'QPage', template: '<main><slot /></main>' };
const QDialog = {
  name: 'QDialog',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
};

/** Andrea (res-1, jueves 8 a las 10:30) cancela ella misma. */
const canceladaPorAndrea: ReservationCancelledEvent = {
  ...cancelledByCustomer,
  reservationId: 'res-1',
  customerName: 'Andrea Ruiz',
  scheduledAt: '2026-10-08T15:30:00.000Z',
  endedAt: '2026-10-08T16:30:00.000Z',
};

const sinAndrea = () => bandeja().filter((r) => r.id !== 'res-1');

describe('la bandeja en tiempo real', () => {
  let wrapper: VueWrapper;
  let montada = false;

  beforeEach(async () => {
    jest.useFakeTimers();
    fakeSocket.handlers.clear();
    notify.mockClear();
    const vivos = useAvisosEnVivo();
    vivos.vaciar();
    vivos.marcarBandeja(false);
    servidor.reservas = bandeja();
    datos.value = bandeja();

    useAdminNotifications().start();
    wrapper = mount(AdminReservationsPage, {
      global: { components: { QPage, QDialog } },
    });
    montada = true;
    fakeSocket.emit('connect');
    jest.runAllTimers();
    await nextTick();
  });

  afterEach(() => {
    if (montada) wrapper.unmount();
    jest.useRealTimers();
  });

  it('una reserva cancelada por la clienta deja el aviso fijado y sale de la lista', async () => {
    expect(wrapper.find('[data-id="res-1"]').exists()).toBe(true);

    servidor.reservas = sinAndrea();
    fakeSocket.emit('reservation.cancelled', canceladaPorAndrea);
    await nextTick();

    // Fijado sobre la lista, no flotante.
    expect(notify).not.toHaveBeenCalled();
    const aviso = wrapper.find('[data-test="aviso"]');
    expect(aviso.find('[data-test="aviso-mensaje"]').text()).toBe(
      'Andrea Ruiz canceló su cita'
    );
    expect(aviso.find('[data-test="aviso-detalle"]').text()).toContain(
      '· ya no está en la lista'
    );

    // El coalescedor invalida → la lista se vuelve a pedir → la fila se va.
    jest.runAllTimers();
    await nextTick();
    expect(wrapper.find('[data-id="res-1"]').exists()).toBe(false);
    expect(
      wrapper
        .find('[data-test="pestana-pendientes"] [data-test="cuenta"]')
        .text()
    ).toBe('2');
    // El aviso se queda (lo único que explica la desaparición) y sin «Ver».
    expect(wrapper.find('[data-test="aviso"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="ver-aviso"]').exists()).toBe(false);
  });

  it('si estaba abierta en la ficha, la ficha la suelta y no ofrece confirmarla', async () => {
    await wrapper
      .find('[data-id="res-1"] [data-test="abrir-reserva"]')
      .trigger('click');
    expect(wrapper.find('[data-test="confirmar-detalle"]').exists()).toBe(true);

    servidor.reservas = sinAndrea();
    fakeSocket.emit('reservation.cancelled', canceladaPorAndrea);
    jest.runAllTimers();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-test="detalle-reserva"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="detalle-vacio"]').exists()).toBe(true);
  });

  it('al reconectar se refresca todo sin fijar ningún aviso', async () => {
    servidor.reservas = bandeja().filter((r) => r.id !== 'res-2');

    fakeSocket.emit('connect');
    jest.runAllTimers();
    await nextTick();

    expect(wrapper.find('[data-id="res-2"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="aviso"]').exists()).toBe(false);
  });

  it('dice «En vivo» con el socket arriba y «Sin tiempo real» si se cae', async () => {
    expect(wrapper.find('[data-test="en-vivo"]').text()).toContain('En vivo');

    fakeSocket.emit('disconnect');
    await nextTick();

    expect(wrapper.find('[data-test="en-vivo"]').text()).toContain(
      'Sin tiempo real'
    );
  });

  it('fuera de la bandeja el mismo evento sale como flotante, y queda fijado para luego', async () => {
    wrapper.unmount();
    montada = false;

    fakeSocket.emit('reservation.cancelled', canceladaPorAndrea);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].message).toBe('Andrea Ruiz canceló su cita');
    expect(useAvisosEnVivo().avisos.value).toHaveLength(1);
  });
});
