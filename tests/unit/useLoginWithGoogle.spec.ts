/**
 * El acceso con Google sin `$q` (A11): el error se expone en `error` para
 * pintarlo en línea, y el consentimiento de una cuenta nueva (S9) se pide con
 * un diálogo propio a través de `pidiendoConsentimiento`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushPromises } from '@vue/test-utils';
import { authApi } from 'src/api/auth-api';
import { useLoginWithGoogle } from 'src/composables/auth/useLoginWithGoogle';
import {
  MENSAJE_DE_RESPALDO,
  MENSAJE_SIN_CONEXION,
} from 'src/helpers/mensajes-acceso';
import { errorDeRed, errorHttp, respuestaSesion } from './fixtures/acceso';

const mockPush = jest.fn();
jest.mock('vue-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('src/api/auth-api', () => ({
  authApi: { loginWithGoogle: jest.fn() },
}));
const mockAuth = { setSession: jest.fn() };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));

const canjear = authApi.loginWithGoogle as jest.Mock;
const PIDE_CONSENTIMIENTO = errorHttp(
  400,
  'Debe aceptar la Política de Tratamiento de Datos Personales'
);

beforeEach(() => {
  canjear.mockReset();
  mockPush.mockReset();
  mockAuth.setSession.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useLoginWithGoogle', () => {
  it('canjea el ID token, abre la sesión con los mismos campos y va al destino', async () => {
    canjear.mockResolvedValue(respuestaSesion({ roles: ['admin'] }));
    const google = useLoginWithGoogle({ redirectTo: '/mis-reservas' });

    await google.handleCredential('id-token');

    expect(canjear).toHaveBeenCalledWith('id-token', undefined);
    expect(mockAuth.setSession).toHaveBeenCalledWith(
      'token-de-acceso',
      {
        fullName: 'Clienta de Ejemplo',
        email: 'clienta@correo.com',
        roles: ['admin'],
        emailVerified: false,
      },
      expect.any(Number)
    );
    expect(mockPush).toHaveBeenCalledWith({ path: '/mis-reservas' });
    expect(google.error.value).toBe('');
  });

  it('una respuesta sin roles abre la sesión con ["user"] (§7.4)', async () => {
    const sinRoles: Partial<ReturnType<typeof respuestaSesion>> =
      respuestaSesion();
    delete sinRoles.roles;
    canjear.mockResolvedValue(sinRoles);

    await useLoginWithGoogle().handleCredential('id-token');

    expect(mockAuth.setSession.mock.calls[0][1].roles).toEqual(['user']);
  });

  it('sin destino va al catálogo', async () => {
    canjear.mockResolvedValue(respuestaSesion());

    await useLoginWithGoogle().handleCredential('id-token');

    expect(mockPush).toHaveBeenCalledWith({ path: '/services' });
  });

  it('la caducidad es expiresIn en milisegundos desde ahora', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    canjear.mockResolvedValue(respuestaSesion({ expiresIn: 900 }));

    await useLoginWithGoogle().handleCredential('id-token');

    expect(mockAuth.setSession.mock.calls[0][2]).toBe(901_000);
  });

  it('si el backend pide el consentimiento (cuenta nueva, S9), lo pide sin mensaje de error', async () => {
    canjear.mockRejectedValue(PIDE_CONSENTIMIENTO);
    const google = useLoginWithGoogle();

    await google.handleCredential('id-token');

    expect(google.pidiendoConsentimiento.value).toBe(true);
    expect(google.error.value).toBe('');
    expect(mockAuth.setSession).not.toHaveBeenCalled();
  });

  it('aceptar reintenta con la misma credencial y dataPolicyAccepted = true', async () => {
    canjear
      .mockRejectedValueOnce(PIDE_CONSENTIMIENTO)
      .mockResolvedValueOnce(respuestaSesion());
    const google = useLoginWithGoogle({ redirectTo: '/testimonios' });
    await google.handleCredential('id-token');

    google.aceptarConsentimiento();
    await flushPromises();

    expect(canjear).toHaveBeenLastCalledWith('id-token', true);
    expect(google.pidiendoConsentimiento.value).toBe(false);
    expect(mockPush).toHaveBeenCalledWith({ path: '/testimonios' });
  });

  it('cancelar cierra la petición y no reintenta', async () => {
    canjear.mockRejectedValue(PIDE_CONSENTIMIENTO);
    const google = useLoginWithGoogle();
    await google.handleCredential('id-token');

    google.rechazarConsentimiento();
    await flushPromises();

    expect(google.pidiendoConsentimiento.value).toBe(false);
    expect(canjear).toHaveBeenCalledTimes(1);
  });

  it('una segunda pulsación de «Acepto» no reintenta otra vez', async () => {
    canjear
      .mockRejectedValueOnce(PIDE_CONSENTIMIENTO)
      .mockResolvedValueOnce(respuestaSesion());
    const google = useLoginWithGoogle();
    await google.handleCredential('id-token');

    google.aceptarConsentimiento();
    google.aceptarConsentimiento();
    await flushPromises();

    expect(canjear).toHaveBeenCalledTimes(2);
  });

  it('tras cancelar, un «Acepto» rezagado no reusa la credencial vieja', async () => {
    canjear.mockRejectedValue(PIDE_CONSENTIMIENTO);
    const google = useLoginWithGoogle();
    await google.handleCredential('id-token');

    google.rechazarConsentimiento();
    google.aceptarConsentimiento();
    await flushPromises();

    expect(canjear).toHaveBeenCalledTimes(1);
  });

  it('si ya se mandó el consentimiento y aun así lo pide, es un error, no un bucle', async () => {
    canjear.mockRejectedValue(PIDE_CONSENTIMIENTO);
    const google = useLoginWithGoogle();

    await google.handleCredential('id-token', true);

    expect(google.pidiendoConsentimiento.value).toBe(false);
    expect(google.error.value).toBe(
      'Debe aceptar la Política de Tratamiento de Datos Personales'
    );
  });

  it('un token inválido (401) da el respaldo de Google, en línea', async () => {
    canjear.mockRejectedValue(errorHttp(401, 'Token de Google inválido'));
    const google = useLoginWithGoogle();

    await google.handleCredential('id-token');

    expect(google.error.value).toBe(MENSAJE_DE_RESPALDO.google);
  });

  it('sin conexión, lo dice', async () => {
    canjear.mockRejectedValue(errorDeRed());
    const google = useLoginWithGoogle();

    await google.handleCredential('id-token');

    expect(google.error.value).toBe(MENSAJE_SIN_CONEXION);
  });

  it('un intento nuevo borra el error anterior', async () => {
    canjear
      .mockRejectedValueOnce(errorDeRed())
      .mockResolvedValueOnce(respuestaSesion());
    const google = useLoginWithGoogle();
    await google.handleCredential('id-token');
    expect(google.error.value).not.toBe('');

    await google.handleCredential('id-token');

    expect(google.error.value).toBe('');
  });

  it('isLoading acompaña al canje', async () => {
    let resolver: (valor: unknown) => void = () => undefined;
    canjear.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    const google = useLoginWithGoogle();

    const pendiente = google.handleCredential('id-token');
    expect(google.isLoading.value).toBe(true);

    resolver(respuestaSesion());
    await pendiente;
    expect(google.isLoading.value).toBe(false);
  });

  it('ya no usa $q: ni useQuasar, ni dialog, ni notify (A11)', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/composables/auth/useLoginWithGoogle.ts'),
      'utf8'
    );
    expect(fuente).not.toMatch(/useQuasar|\$q\b|from 'quasar'/);
  });
});
