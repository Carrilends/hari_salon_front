jest.mock('src/api/auth-api', () => ({ authApi: { refresh: jest.fn() } }));
jest.mock('src/stores/auth-store', () => ({ useAuthStore: jest.fn() }));

import { refreshOnce, shouldRefresh } from 'src/api/refresh-interceptor';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';

const refresh = authApi.refresh as jest.Mock;
const setSession = jest.fn();
const logout = jest.fn();

beforeEach(() => {
  refresh.mockReset();
  setSession.mockReset();
  logout.mockReset();
  (useAuthStore as unknown as jest.Mock).mockReturnValue({
    setSession,
    logout,
  });
});

describe('shouldRefresh (predicado del interceptor)', () => {
  it('renueva ante un 401 de un endpoint protegido no excluido', () => {
    expect(shouldRefresh(401, '/service', false)).toBe(true);
  });

  it('NO renueva ante 401 de las rutas de auth (evita el bucle)', () => {
    expect(shouldRefresh(401, '/auth/login', false)).toBe(false);
    expect(shouldRefresh(401, '/auth/refresh', false)).toBe(false);
    expect(shouldRefresh(401, '/auth/google', false)).toBe(false);
  });

  it('NO renueva si no es 401 ni si ya se reintentó', () => {
    expect(shouldRefresh(500, '/service', false)).toBe(false);
    expect(shouldRefresh(401, '/service', true)).toBe(false);
  });
});

describe('refreshOnce (petición única)', () => {
  it('varias llamadas concurrentes disparan UNA sola renovación', async () => {
    refresh.mockImplementation(
      () =>
        new Promise((res) =>
          setTimeout(
            () =>
              res({
                token: 't',
                fullName: 'Ana',
                email: 'a@b.com',
                roles: ['user'],
                emailVerified: true,
                expiresIn: 900,
              }),
            10
          )
        )
    );

    await Promise.all([
      refreshOnce(),
      refreshOnce(),
      refreshOnce(),
      refreshOnce(),
      refreshOnce(),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledWith(
      't',
      expect.objectContaining({ email: 'a@b.com' }),
      expect.any(Number)
    );
  });

  it('si la renovación falla, cierra la sesión y propaga el error', async () => {
    refresh.mockRejectedValue(new Error('401'));
    await expect(refreshOnce()).rejects.toThrow();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(setSession).not.toHaveBeenCalled();
  });
});
