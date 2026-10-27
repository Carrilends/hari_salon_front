/**
 * RF32 c3: cuando la sesión se cierra sola, el portal lo dice. Se prueba con el
 * store real de Pinia; solo lo que tiene efectos (limpiar datos) y `quasar`
 * van simulados.
 */
const notify = jest.fn();
jest.mock('quasar', () => ({ useQuasar: () => ({ notify }) }));
jest.mock('src/stores/session-cleanup', () => ({
  limpiarDatosDeSesion: jest.fn(),
}));

import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { useAvisoSesionCerrada } from 'src/composables/auth/useAvisoSesionCerrada';
import { MENSAJE_SESION_CERRADA } from 'src/constants/mensajes-sesion';

const PERFIL = { fullName: 'Ada', email: 'ada@example.com', roles: [] };
const entrar = (store: ReturnType<typeof useAuthStore>) =>
  store.setSession('jwt', PERFIL, Date.now() + 60_000);

let store: ReturnType<typeof useAuthStore>;

beforeEach(() => {
  notify.mockReset();
  setActivePinia(createPinia());
  store = useAuthStore();
});

describe('useAvisoSesionCerrada', () => {
  it('avisa una vez cuando la sesión se cierra sola', async () => {
    useAvisoSesionCerrada();
    entrar(store);
    store.caducar();
    await nextTick();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].message).toBe(MENSAJE_SESION_CERRADA);
  });

  it('no avisa al cerrar la sesión a propósito', async () => {
    useAvisoSesionCerrada();
    entrar(store);
    store.logout();
    await nextTick();

    expect(notify).not.toHaveBeenCalled();
  });

  it('avisa de nuevo si hubo una sesión nueva entre medias', async () => {
    useAvisoSesionCerrada();
    entrar(store);
    store.caducar();
    await nextTick();
    entrar(store);
    await nextTick();
    store.caducar();
    await nextTick();

    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('avisa si la bandera ya estaba levantada al montar (restauración fallida al cargar)', () => {
    store.email = 'ada@example.com'; // perfil guardado, sin token
    store.caducar(); // lo hace refreshOnce en el boot, antes de montar App
    useAvisoSesionCerrada();

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('un visitante sin sesión que recibe un 401 no ve el aviso', async () => {
    useAvisoSesionCerrada();
    store.caducar(); // refreshOnce falla para un anónimo
    await nextTick();

    expect(store.sesionCaducada).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });
});
