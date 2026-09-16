/**
 * Despliegue sin `VITE_WS_URL` (p. ej. Netlify sin la variable): el panel no
 * debe abrir socket —el proxy no negocia WebSocket y reintentaría sin tope— y
 * debe decirlo una vez por consola. Fichero aparte porque el stub de `ws-url`
 * se fija por módulo.
 */
const connectAdminSocket = jest.fn();
const disconnectAdminSocket = jest.fn();

jest.mock('src/api/ws-url', () => ({ WS_URL: '' }));
jest.mock('quasar', () => ({ useQuasar: () => ({ notify: jest.fn() }) }));
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('vue-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => ({ isAdmin: true, token: 'jwt' }),
}));
jest.mock('src/api/realtime', () => ({
  shouldConnectSocket: (isAdmin: boolean, token: string, wsUrl: string) =>
    isAdmin && !!token && !!wsUrl,
  connectAdminSocket,
  disconnectAdminSocket,
}));

import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';

describe('useAdminNotifications sin VITE_WS_URL', () => {
  it('no abre socket y avisa una sola vez por consola', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useAdminNotifications().start();

    expect(connectAdminSocket).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/VITE_WS_URL/);
    warn.mockRestore();
  });
});
