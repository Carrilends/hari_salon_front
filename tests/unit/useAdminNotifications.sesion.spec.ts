/**
 * Foco 5: los avisos fijados viven en memoria del módulo. Al cerrar sesión no
 * pueden quedarse para la siguiente persona que use el navegador; una
 * renovación de token (cada 15 min) sí los conserva.
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
};

const disconnectAdminSocket = jest.fn();
const mockSesion: { estado: { isAdmin: boolean; token: string } | null } = {
  estado: null,
};

jest.mock('quasar', () => ({ useQuasar: () => ({ notify: jest.fn() }) }));
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(() => Promise.resolve()),
  }),
}));
jest.mock('vue-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => mockSesion.estado,
}));
jest.mock('src/api/realtime', () => ({
  shouldConnectSocket: (isAdmin: boolean, token: string, wsUrl: string) =>
    isAdmin && !!token && !!wsUrl,
  connectAdminSocket: jest.fn(() => fakeSocket),
  disconnectAdminSocket,
}));

import { nextTick, reactive } from 'vue';
import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';
import { useAvisosEnVivo } from 'src/composables/notifications/avisosEnVivo';
import { limpiarDatosDeSesion } from 'src/stores/session-cleanup';
import { createdEvent } from './fixtures/reservation-events';

describe('useAdminNotifications · la sesión', () => {
  it('una renovación de token conserva los avisos; cerrar sesión los borra', async () => {
    const sesion = reactive({ isAdmin: true, token: 'jwt' });
    mockSesion.estado = sesion;
    useAvisosEnVivo().vaciar();
    useAdminNotifications().start();
    fakeSocket.emit('connect');
    fakeSocket.emit('reservation.created', createdEvent);
    expect(useAvisosEnVivo().avisos.value).toHaveLength(1);

    sesion.token = 'jwt-renovado';
    await nextTick();
    expect(useAvisosEnVivo().avisos.value).toHaveLength(1);

    // Cerrar sesión: `logout()` llama a `limpiarDatosDeSesion()` y luego vacía el token.
    limpiarDatosDeSesion();
    sesion.token = '';
    await nextTick();
    expect(disconnectAdminSocket).toHaveBeenCalled();
    expect(useAvisosEnVivo().avisos.value).toHaveLength(0);
    expect(useAvisosEnVivo().enVivo.value).toBe(false);
  });

  it('la caída que provoca el propio cliente (renovar el token) no apaga «En vivo»', () => {
    const vivos = useAvisosEnVivo();
    fakeSocket.emit('connect');
    expect(vivos.enVivo.value).toBe(true);

    fakeSocket.emit('disconnect', 'io client disconnect');
    expect(vivos.enVivo.value).toBe(true);

    fakeSocket.emit('disconnect', 'transport close');
    expect(vivos.enVivo.value).toBe(false);
  });

  it('si el socket de la renovación no llega a conectar, «En vivo» se apaga', () => {
    const vivos = useAvisosEnVivo();
    fakeSocket.emit('connect');
    // La renovación cierra el viejo a propósito: «En vivo» sigue encendido…
    fakeSocket.emit('disconnect', 'io client disconnect');
    expect(vivos.enVivo.value).toBe(true);

    // …pero el nuevo nunca conecta (servidor caído, token rechazado).
    fakeSocket.emit('connect_error', new Error('xhr poll error'));
    expect(vivos.enVivo.value).toBe(false);
  });
});
