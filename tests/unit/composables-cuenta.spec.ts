/**
 * Los dos composables de Mi cuenta (plan 6):
 * - `aplicarSesion` vuelca en el almacén lo que devuelven `PATCH /auth/me/*` y
 *   `GET /auth/check-status` (token nuevo y perfil al día, `hasPassword` incluido);
 * - `useEnlaceContrasena` pide el enlace de restablecer al correo de la cuenta,
 *   sin salir de la página (C3: «Crear una contraseña» y «¿No la recuerdas?»).
 */
import { createPinia, setActivePinia } from 'pinia';
import { authApi } from 'src/api/auth-api';
import { aplicarSesion } from 'src/composables/cuenta/aplicarSesion';
import { useEnlaceContrasena } from 'src/composables/cuenta/useEnlaceContrasena';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { useAuthStore } from 'src/stores/auth-store';
import { errorDeRed, respuestaSesion } from './fixtures/acceso';

jest.mock('src/api/auth-api', () => ({
  authApi: { forgotPassword: jest.fn() },
}));

const pedirEnlace = authApi.forgotPassword as jest.Mock;

describe('aplicarSesion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('vuelca la sesión entera en el almacén, hasPassword incluido', () => {
    setActivePinia(createPinia());
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    aplicarSesion(
      respuestaSesion({
        fullName: 'Laura Gómez',
        email: 'laura@correo.com',
        emailVerified: false,
        hasPassword: false,
      })
    );

    const sesion = useAuthStore();
    expect(sesion.token).toBe('token-de-acceso');
    expect(sesion.fullname).toBe('Laura Gómez');
    expect(sesion.email).toBe('laura@correo.com');
    expect(sesion.roles).toEqual(['user']);
    expect(sesion.emailVerified).toBe(false);
    expect(sesion.hasPassword).toBe(false);
    expect(sesion.expiresAt).toBe(1_900_000);
    expect(sesion.isLoggedIn).toBe(true);
  });
});

describe('useEnlaceContrasena', () => {
  beforeEach(() => {
    pedirEnlace.mockReset();
  });

  it('pide el enlace para ese correo y recuerda a cuál lo mandó', async () => {
    pedirEnlace.mockResolvedValue({ message: 'ok' });
    const enlace = useEnlaceContrasena();

    await enlace.enviar('laura@correo.com');

    expect(pedirEnlace).toHaveBeenCalledWith('laura@correo.com');
    expect(enlace.enviadoA.value).toBe('laura@correo.com');
    expect(enlace.enviando.value).toBe(false);
    expect(enlace.error.value).toBe('');
  });

  it('mientras envía no manda otro', async () => {
    pedirEnlace.mockReturnValue(new Promise(() => undefined));
    const enlace = useEnlaceContrasena();

    void enlace.enviar('laura@correo.com');
    void enlace.enviar('laura@correo.com');

    expect(pedirEnlace).toHaveBeenCalledTimes(1);
    expect(enlace.enviando.value).toBe(true);
  });

  it('sin conexión: lo dice y permite reintentar', async () => {
    pedirEnlace.mockRejectedValueOnce(errorDeRed());
    const enlace = useEnlaceContrasena();

    await enlace.enviar('laura@correo.com');

    expect(enlace.error.value).toBe(MENSAJE_SIN_CONEXION);
    expect(enlace.enviadoA.value).toBe('');

    pedirEnlace.mockResolvedValueOnce({ message: 'ok' });
    await enlace.enviar('laura@correo.com');

    expect(enlace.error.value).toBe('');
    expect(enlace.enviadoA.value).toBe('laura@correo.com');
  });
});
