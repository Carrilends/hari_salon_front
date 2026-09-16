jest.mock('socket.io-client', () => {
  const socket = { on: jest.fn(), disconnect: jest.fn() };
  return { io: jest.fn(() => socket) };
});

import { io } from 'socket.io-client';
import {
  shouldConnectSocket,
  connectAdminSocket,
  disconnectAdminSocket,
  getAdminSocket,
} from 'src/api/realtime';

describe('shouldConnectSocket', () => {
  it('conecta solo si es admin y hay token', () => {
    expect(shouldConnectSocket(true, 'jwt')).toBe(true);
  });
  it('no conecta si no es administrador', () => {
    expect(shouldConnectSocket(false, 'jwt')).toBe(false);
  });
  it('no conecta si no hay token', () => {
    expect(shouldConnectSocket(true, '')).toBe(false);
  });
});

describe('cliente del socket de administración', () => {
  afterEach(() => {
    disconnectAdminSocket();
    (io as jest.Mock).mockClear();
  });

  it('crea el socket con el token en el handshake auth', () => {
    connectAdminSocket('jwt1');
    expect(io).toHaveBeenCalledTimes(1);
    const opts = (io as jest.Mock).mock.calls[0][1];
    expect(opts.auth).toEqual({ token: 'jwt1' });
    expect(getAdminSocket()).not.toBeNull();
  });

  it('no limita los reintentos: un redeploy del backend no deja al panel sin canal', () => {
    connectAdminSocket('jwt1');
    const opts = (io as jest.Mock).mock.calls[0][1];
    expect(opts.reconnectionAttempts).toBeUndefined();
    expect(opts.reconnection).not.toBe(false);
  });

  it('al reconectar descarta el socket anterior', () => {
    const socket = connectAdminSocket('jwt1');
    connectAdminSocket('jwt2');
    expect(socket.disconnect).toHaveBeenCalled();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it('disconnect limpia el socket', () => {
    connectAdminSocket('jwt1');
    disconnectAdminSocket();
    expect(getAdminSocket()).toBeNull();
  });
});
