/**
 * El composable es un despachador delgado: socket → tabla de efectos → aviso
 * fijado (+ flotante fuera de la bandeja) + coalescedor → queryClient. Se
 * prueba con el socket y el contexto de Vue sustituidos por dobles,
 * disparando eventos a mano.
 */
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
  reset() {
    this.handlers.clear();
  },
};

const notify = jest.fn();
const invalidateQueries = jest.fn(() => Promise.resolve());
const push = jest.fn();
const authState = { isAdmin: true, token: 'jwt' };

jest.mock('quasar', () => ({ useQuasar: () => ({ notify }) }));
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries }),
}));
jest.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => authState }));
jest.mock('src/api/realtime', () => ({
  shouldConnectSocket: (isAdmin: boolean, token: string, wsUrl: string) =>
    isAdmin && !!token && !!wsUrl,
  connectAdminSocket: jest.fn(() => fakeSocket),
  disconnectAdminSocket: jest.fn(),
}));

import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';
import { useAvisosEnVivo } from 'src/composables/notifications/avisosEnVivo';
import { queryKeys } from 'src/api/query-keys';
import {
  cancelledByCustomer,
  confirmedEvent,
  createdEvent,
  rescheduledByAdmin,
} from './fixtures/reservation-events';

const keysInvalidated = () =>
  invalidateQueries.mock.calls.map((c) => (c as unknown[])[0]);

const ALL_THREE = [
  { queryKey: queryKeys.reservations.all },
  { queryKey: queryKeys.occupancy.all },
  { queryKey: queryKeys.workerAvailability.all },
];

describe('useAdminNotifications — despachador de los cuatro eventos', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fakeSocket.reset();
    notify.mockClear();
    invalidateQueries.mockClear();
    push.mockClear();
    const vivos = useAvisosEnVivo();
    vivos.vaciar();
    vivos.marcarBandeja(false);
    vivos.marcarEnVivo(false);
    useAdminNotifications().start();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('se suscribe a los cuatro eventos que emite el backend', () => {
    const names = Array.from(fakeSocket.handlers.keys()).filter((n) =>
      n.startsWith('reservation.')
    );
    expect(names.sort()).toEqual([
      'reservation.cancelled',
      'reservation.confirmed',
      'reservation.created',
      'reservation.rescheduled',
    ]);
  });

  it('fuera de la bandeja, una cancelación sale como flotante con la paleta', () => {
    fakeSocket.emit('reservation.cancelled', cancelledByCustomer);

    expect(notify).toHaveBeenCalledTimes(1);
    const aviso = notify.mock.calls[0][0];
    expect(aviso).toMatchObject({
      message: 'Ana canceló su cita',
      timeout: 8000,
    });
    // Sin `type`: el verde y el naranja de Quasar no están en la paleta.
    expect(aviso.type).toBeUndefined();
    expect(String(aviso.attrs.style)).toContain('var(--m-tinta)');
    expect(String(aviso.attrs.style)).toContain('var(--m-radio-tarjeta)');
    expect(aviso.position).toBe('top');
    // La acción no usa el blanco de Quasar (fuera de la paleta).
    expect(aviso.actions[0].color).toBeUndefined();
  });

  it('una cancelación invalida lista, ocupación y disponibilidad', () => {
    fakeSocket.emit('reservation.cancelled', cancelledByCustomer);
    jest.runAllTimers();

    expect(keysInvalidated()).toEqual(ALL_THREE);
  });

  it('una confirmación solo invalida la lista', () => {
    fakeSocket.emit('reservation.confirmed', confirmedEvent);
    jest.runAllTimers();

    expect(keysInvalidated()).toEqual([{ queryKey: queryKeys.reservations.all }]);
  });

  it('una ráfaga de eventos invalida cada clave una sola vez', () => {
    fakeSocket.emit('reservation.created', createdEvent);
    fakeSocket.emit('reservation.cancelled', cancelledByCustomer);
    fakeSocket.emit('reservation.rescheduled', rescheduledByAdmin);

    expect(notify).toHaveBeenCalledTimes(3); // un aviso por evento…
    jest.runAllTimers();
    expect(invalidateQueries).toHaveBeenCalledTimes(3); // …pero un refetch por clave
  });

  it('al (re)conectar refresca lista, ocupación y disponibilidad sin avisar', () => {
    // socket.io emite `connect` en cada conexión lograda. Lo que pasó mientras el
    // socket estaba caído se perdió; invalidar todo aquí es lo que lo recupera.
    fakeSocket.emit('connect');
    expect(notify).not.toHaveBeenCalled();
    expect(useAvisosEnVivo().avisos.value).toHaveLength(0);
    jest.runAllTimers();
    expect(keysInvalidated()).toEqual(ALL_THREE);
  });

  it('el aviso flotante lleva la acción «Ver» que lleva al panel de reservas', () => {
    fakeSocket.emit('reservation.created', createdEvent);
    const actions = notify.mock.calls[0][0].actions as { handler: () => void }[];
    actions[0]?.handler();
    expect(push).toHaveBeenCalledWith('/reservas');
  });

  it('cada evento queda fijado en los avisos en vivo (A5)', () => {
    fakeSocket.emit('reservation.created', createdEvent);
    fakeSocket.emit('reservation.cancelled', cancelledByCustomer);

    expect(useAvisosEnVivo().avisos.value.map((a) => a.mensaje)).toEqual([
      'Ana canceló su cita',
      'Nueva reserva de Ana',
    ]);
  });

  it('con la bandeja abierta no sale el flotante, pero se fija y se invalida', () => {
    useAvisosEnVivo().marcarBandeja(true);

    fakeSocket.emit('reservation.cancelled', cancelledByCustomer);

    expect(notify).not.toHaveBeenCalled();
    expect(useAvisosEnVivo().avisos.value).toHaveLength(1);
    jest.runAllTimers();
    expect(keysInvalidated()).toEqual(ALL_THREE);
  });

  it('dice si está en vivo: se enciende al conectar y se apaga al caer', () => {
    fakeSocket.emit('connect');
    expect(useAvisosEnVivo().enVivo.value).toBe(true);

    fakeSocket.emit('disconnect');
    expect(useAvisosEnVivo().enVivo.value).toBe(false);
  });
});
