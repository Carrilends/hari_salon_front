import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function makeJwtWithExp(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: expSeconds }));
  return `${header}.${payload}.`;
}

describe('auth-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.useRealTimers();
  });

  test('setSession decodes exp from JWT when expMs is not provided', () => {
    const store = useAuthStore();
    const nowMs = Date.now();
    const expSeconds = Math.floor((nowMs + 60_000) / 1000);
    const jwt = makeJwtWithExp(expSeconds);

    store.setSession(jwt, {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: ['admin'],
    });

    expect(store.token).toBe(jwt);
    expect(store.fullname).toBe('Ada Lovelace');
    expect(store.email).toBe('ada@example.com');
    expect(store.roles).toEqual(['admin']);
    expect(store.expiresAt).toBe(expSeconds * 1000);
    expect(store.isLoggedIn).toBe(true);
    expect(store.isAdmin).toBe(true);
  });

  test('setSession uses provided expMs when available', () => {
    const store = useAuthStore();
    const jwt = makeJwtWithExp(Math.floor((Date.now() + 999_999) / 1000));

    store.setSession(
      jwt,
      { fullName: 'User', email: 'u@example.com', roles: [] },
      123_456
    );

    expect(store.expiresAt).toBe(123_456);
  });

  test('setSession stores emailVerified from the response', () => {
    const store = useAuthStore();
    const jwt = makeJwtWithExp(Math.floor((Date.now() + 60_000) / 1000));

    store.setSession(jwt, {
      fullName: 'User',
      email: 'u@example.com',
      roles: ['user'],
      emailVerified: false,
    });

    expect(store.emailVerified).toBe(false);
  });

  test('setSession assumes verified when emailVerified is omitted (old sessions)', () => {
    const store = useAuthStore();
    const jwt = makeJwtWithExp(Math.floor((Date.now() + 60_000) / 1000));

    store.setSession(jwt, {
      fullName: 'User',
      email: 'u@example.com',
      roles: ['user'],
    });

    expect(store.emailVerified).toBe(true);
  });

  test('logout resets emailVerified to true', () => {
    const store = useAuthStore();
    const jwt = makeJwtWithExp(Math.floor((Date.now() + 60_000) / 1000));

    store.setSession(jwt, {
      fullName: 'User',
      email: 'u@example.com',
      roles: ['user'],
      emailVerified: false,
    });
    store.logout();

    expect(store.emailVerified).toBe(true);
  });

  test('sweepIfExpired logs out when expired', () => {
    const store = useAuthStore();
    const expSeconds = 1; // 1970-01-01T00:00:01Z
    const jwt = makeJwtWithExp(expSeconds);

    store.setSession(jwt, {
      fullName: 'User',
      email: 'u@example.com',
      roles: ['admin'],
    });

    jest.spyOn(Date, 'now').mockReturnValue(expSeconds * 1000 + 1);
    store.sweepIfExpired();

    expect(store.token).toBe('');
    expect(store.isLoggedIn).toBe(false);
    expect(store.roles).toEqual([]);
  });
});

describe('auth-store · hasPassword (plan 6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const jwt = () => makeJwtWithExp(Math.floor((Date.now() + 60_000) / 1000));

  test('setSession guarda hasPassword de la respuesta', () => {
    const store = useAuthStore();

    store.setSession(jwt(), {
      fullName: 'Ana',
      email: 'a@b.com',
      roles: ['user'],
      hasPassword: false,
    });

    expect(store.hasPassword).toBe(false);
  });

  test('una respuesta sin hasPassword lo deja en null: no se sabe', () => {
    const store = useAuthStore();

    store.setSession(jwt(), {
      fullName: 'Ana',
      email: 'a@b.com',
      roles: ['user'],
      hasPassword: true,
    });
    store.setSession(jwt(), {
      fullName: 'Ana',
      email: 'a@b.com',
      roles: ['user'],
    });

    expect(store.hasPassword).toBeNull();
  });

  test('cerrar sesión lo olvida', () => {
    const store = useAuthStore();
    store.setSession(jwt(), {
      fullName: 'Ana',
      email: 'a@b.com',
      roles: ['user'],
      hasPassword: false,
    });

    store.logout();

    expect(store.hasPassword).toBeNull();
  });

  test('se persiste con el perfil, para no parpadear al recargar', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/stores/auth-store.ts'),
      'utf8'
    );

    expect(fuente).toMatch(/pick: \[[^\]]*'hasPassword'[^\]]*\]/);
  });
});
