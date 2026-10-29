/**
 * «Eliminar mi cuenta» (Mi cuenta → Sesión): la acción, el diálogo con sus
 * consecuencias, la confirmación (contraseña, o correo si la cuenta no tiene)
 * y qué hace cada respuesta de `DELETE /auth/me`.
 */
import { flushPromises, mount } from '@vue/test-utils';
import type { Pinia } from 'pinia';
import EliminarCuenta from 'src/components/cuenta/EliminarCuenta.vue';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import { MENSAJE_CUENTA_ELIMINADA } from 'src/constants/mensajes-sesion';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import {
  MENSAJE_ELIMINAR_ADMIN,
  MENSAJE_ELIMINAR_CLAVE,
  MENSAJE_ELIMINAR_CORREO,
  MENSAJE_ELIMINAR_INTENTOS,
  MENSAJE_SESION_CADUCADA,
} from 'src/helpers/mensajes-cuenta';
import { abrirSesionDePrueba, type SesionDePrueba } from './fixtures/cuenta';

jest.mock('src/api/auth-api', () => ({
  authApi: { deleteAccount: jest.fn() },
}));
const mockPush = jest.fn();
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
const mockLogro = jest.fn();
jest.mock('src/composables/shared/useAviso', () => ({
  useAviso: () => ({ logro: mockLogro, fallo: jest.fn(), atencion: jest.fn() }),
}));
jest.mock('src/composables/shared/useConsultaMedios', () => ({
  useConsultaMedios: () => ({ value: false }),
}));

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'position'],
  emits: ['update:modelValue'],
  template: '<div class="q-dialog-doble"><slot v-if="modelValue" /></div>',
};

const borrar = authApi.deleteAccount as jest.Mock;
let pinia: Pinia;

const montar = (cambios: SesionDePrueba = {}) => {
  pinia = abrirSesionDePrueba(cambios);
  return mount(EliminarCuenta, {
    attachTo: document.body,
    global: { plugins: [pinia], stubs: { QDialog } },
  });
};
type W = ReturnType<typeof montar>;
const t = (w: W, g: string) => w.find(`[data-test="${g}"]`);
const abrir = async (w: W) => {
  await t(w, 'eliminar-cuenta').trigger('click');
  await flushPromises();
};
const escribir = async (w: W, valor: string) => {
  await w.find('input').setValue(valor);
};
const confirmar = async (w: W) => {
  await t(w, 'eliminar-confirmar').trigger('click');
  await flushPromises();
};
const errorHttp = (status: number) => ({ response: { status, data: {} } });

let w: W | undefined;
beforeEach(() => {
  borrar.mockReset();
  mockPush.mockReset();
  mockLogro.mockReset();
});
afterEach(() => {
  w?.unmount();
  w = undefined;
});

describe('EliminarCuenta', () => {
  it('no aparece si la cuenta es de administración', () => {
    w = montar({ roles: ['admin'] });
    expect(t(w, 'eliminar-cuenta').exists()).toBe(false);
  });

  it('aparece para una clienta y el diálogo empieza cerrado', () => {
    w = montar();
    expect(t(w, 'eliminar-cuenta').exists()).toBe(true);
    expect(t(w, 'eliminar-dialogo').exists()).toBe(false);
  });

  it('el diálogo cuenta qué se borra, qué se conserva y enlaza al WhatsApp del salón', async () => {
    w = montar();
    await abrir(w);
    const texto = t(w, 'eliminar-dialogo').text();
    expect(texto).toContain('conversaciones con el asistente');
    expect(texto).toContain('citas vigentes');
    expect(texto).toContain('reseñas');
    expect(texto).toContain('no se puede deshacer');
    const enlace = t(w, 'eliminar-whatsapp');
    expect(enlace.attributes('href')).toContain(`wa.me/${WHATSAPP_PHONE}`);
    expect(enlace.attributes('rel')).toContain('noopener');
  });

  it('pide la contraseña si la cuenta la tiene', async () => {
    w = montar({ hasPassword: true });
    await abrir(w);
    expect(w.find('input').attributes('type')).toBe('password');
  });

  it('pide el correo si la cuenta no tiene contraseña', async () => {
    w = montar({ hasPassword: false });
    await abrir(w);
    expect(w.find('input').attributes('type')).toBe('email');
  });

  it('no envía mientras el campo está vacío', async () => {
    w = montar();
    await abrir(w);
    expect(t(w, 'eliminar-confirmar').attributes('disabled')).toBeDefined();
    await confirmar(w);
    expect(borrar).not.toHaveBeenCalled();
  });

  it('envía la contraseña; 204 cierra la sesión, avisa y va a la portada', async () => {
    borrar.mockResolvedValue(undefined);
    w = montar();
    await abrir(w);
    await escribir(w, 'Secreta123');
    await confirmar(w);
    expect(borrar).toHaveBeenCalledWith({ password: 'Secreta123' });
    expect(useAuthStore().isLoggedIn).toBe(false);
    expect(useAuthStore().sesionCaducada).toBe(false);
    expect(mockLogro).toHaveBeenCalledWith(MENSAJE_CUENTA_ELIMINADA);
    expect(mockPush).toHaveBeenCalledWith({ path: '/' });
  });

  it('sin contraseña envía el correo', async () => {
    borrar.mockResolvedValue(undefined);
    w = montar({ hasPassword: false });
    await abrir(w);
    await escribir(w, 'laura@correo.com');
    await confirmar(w);
    expect(borrar).toHaveBeenCalledWith({ email: 'laura@correo.com' });
  });

  it.each([
    [422, true, MENSAJE_ELIMINAR_CLAVE],
    [422, false, MENSAJE_ELIMINAR_CORREO],
    [429, true, MENSAJE_ELIMINAR_INTENTOS],
    [403, true, MENSAJE_ELIMINAR_ADMIN],
    [401, true, MENSAJE_SESION_CADUCADA],
  ])(
    '%i (contraseña: %s) muestra el error y no cierra la sesión',
    async (estado, conClave, mensaje) => {
      borrar.mockRejectedValue(errorHttp(estado));
      w = montar({ hasPassword: conClave });
      await abrir(w);
      await escribir(w, 'x');
      await confirmar(w);
      expect(t(w, 'eliminar-error').text()).toBe(mensaje);
      expect(t(w, 'eliminar-error').attributes('role')).toBe('alert');
      expect(useAuthStore().isLoggedIn).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockLogro).not.toHaveBeenCalled();
      // el diálogo sigue abierto y se puede reintentar
      expect(t(w, 'eliminar-dialogo').exists()).toBe(true);
      expect(t(w, 'eliminar-confirmar').attributes('disabled')).toBeUndefined();
    }
  );

  it('sin conexión lo dice', async () => {
    borrar.mockRejectedValue({ request: {}, code: 'ERR_NETWORK' });
    w = montar();
    await abrir(w);
    await escribir(w, 'x');
    await confirmar(w);
    expect(t(w, 'eliminar-error').text()).toBe(MENSAJE_SIN_CONEXION);
  });

  it('«Volver» cierra sin llamar a la API y borra el error', async () => {
    borrar.mockRejectedValue(errorHttp(422));
    w = montar();
    await abrir(w);
    await escribir(w, 'x');
    await confirmar(w);
    await t(w, 'eliminar-volver').trigger('click');
    expect(t(w, 'eliminar-dialogo').exists()).toBe(false);
    await abrir(w);
    expect(t(w, 'eliminar-error').exists()).toBe(false);
    expect(borrar).toHaveBeenCalledTimes(1);
  });
});
