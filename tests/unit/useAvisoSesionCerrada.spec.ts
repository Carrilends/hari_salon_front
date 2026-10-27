/**
 * RF32 c3: cuando la sesión se cierra sola, el portal lo dice. Un cierre a
 * propósito (`logout()`) no pone `sesionCaducada` y no avisa.
 */
const notify = jest.fn();
jest.mock('quasar', () => ({ useQuasar: () => ({ notify }) }));

const mockSesion: { estado: { sesionCaducada: boolean } | null } = {
  estado: null,
};
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => mockSesion.estado,
}));

import { nextTick, reactive } from 'vue';
import { useAvisoSesionCerrada } from 'src/composables/auth/useAvisoSesionCerrada';
import { MENSAJE_SESION_CERRADA } from 'src/constants/mensajes-sesion';

let sesion: { sesionCaducada: boolean };

beforeEach(() => {
  notify.mockReset();
  sesion = reactive({ sesionCaducada: false });
  mockSesion.estado = sesion;
  useAvisoSesionCerrada();
});

describe('useAvisoSesionCerrada', () => {
  it('avisa una vez cuando la sesión se cierra sola', async () => {
    sesion.sesionCaducada = true;
    await nextTick();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].message).toBe(MENSAJE_SESION_CERRADA);
  });

  it('no avisa al cerrar la sesión a propósito', async () => {
    // `logout()` no toca la bandera.
    await nextTick();
    expect(notify).not.toHaveBeenCalled();
  });

  it('no vuelve a avisar sin una sesión nueva entre medias', async () => {
    sesion.sesionCaducada = true;
    await nextTick();
    sesion.sesionCaducada = true;
    await nextTick();
    expect(notify).toHaveBeenCalledTimes(1);

    sesion.sesionCaducada = false; // setSession
    await nextTick();
    sesion.sesionCaducada = true;
    await nextTick();
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
