/**
 * Los cortes de ancho de la página de servicios.
 *
 * Son los tres que `ServicePage.vue` tenía sueltos (1100 para las etiquetas de
 * los botones, 550 para el buscador compacto, 501 para la lista de móvil) más
 * el número de columnas de la rejilla, que es nuevo (D9). Están aquí y no en la
 * página porque los leen tres sitios —la página, la barra y, en la fase B, la
 * rejilla— y tres copias de un número son tres sitios donde se desincroniza.
 *
 * Se prueban montando un componente de usar y tirar: el composable se apoya en
 * `onMounted` y `onUnmounted`, y llamarlo fuera de un componente dejaría el
 * oyente de `resize` sin recoger.
 */
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import {
  ANCHO_SSG,
  anchoDeVentana,
  useServiceViewport,
} from 'src/composables/services/useServiceViewport';

type Mirilla = ReturnType<typeof useServiceViewport>;

const fijarAncho = (px: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  });
};

const montar = (ancho: number) => {
  fijarAncho(ancho);
  let mirilla!: Mirilla;
  const wrapper = mount(
    defineComponent({
      name: 'MirillaDePrueba',
      setup() {
        mirilla = useServiceViewport();
        return () => null;
      },
    })
  );
  return { wrapper, mirilla };
};

const redimensionar = async (px: number) => {
  fijarAncho(px);
  window.dispatchEvent(new Event('resize'));
  await nextTick();
};

describe('useServiceViewport', () => {
  it('en escritorio ancho: etiquetas en los botones, buscador ancho y tres columnas', () => {
    const { mirilla } = montar(1280);

    expect(mirilla.anchoVentana.value).toBe(1280);
    expect(mirilla.muestraEtiquetas.value).toBe(true);
    expect(mirilla.esBusquedaCompacta.value).toBe(false);
    expect(mirilla.esListaMovil.value).toBe(false);
    expect(mirilla.columnas.value).toBe(3);
  });

  it('a 1100 px conserva las etiquetas; a 1099 las pierde', async () => {
    const { mirilla } = montar(1100);
    expect(mirilla.muestraEtiquetas.value).toBe(true);

    await redimensionar(1099);
    expect(mirilla.muestraEtiquetas.value).toBe(false);
  });

  it('a 550 px el buscador sigue ancho; a 549 se vuelve compacto', async () => {
    const { mirilla } = montar(550);
    expect(mirilla.esBusquedaCompacta.value).toBe(false);

    await redimensionar(549);
    expect(mirilla.esBusquedaCompacta.value).toBe(true);
  });

  it('a 501 px todavía es rejilla; a 500 pasa a lista de móvil', async () => {
    const { mirilla } = montar(501);
    expect(mirilla.esListaMovil.value).toBe(false);

    await redimensionar(500);
    expect(mirilla.esListaMovil.value).toBe(true);
  });

  /**
   * Los cuatro tramos de D9. El de 1239 es el que importa: a ese ancho, con el
   * carril de filtros de 226 px de la fase C, tres columnas dejarían 190 px por
   * tarjeta.
   */
  it('reparte las columnas en los cuatro tramos de D9', async () => {
    const { mirilla } = montar(1240);
    expect(mirilla.columnas.value).toBe(3);

    await redimensionar(1239);
    expect(mirilla.columnas.value).toBe(2);

    await redimensionar(760);
    expect(mirilla.columnas.value).toBe(2);

    await redimensionar(759);
    expect(mirilla.columnas.value).toBe(1);
  });

  /**
   * `build:ssg` prerenderiza sin ventana. Sin este respaldo el prerenderizado
   * saldría con `undefined` y la página se generaría en su versión de móvil.
   */
  it('sin ventana supone el escritorio del diseño, no cero', () => {
    expect(anchoDeVentana(undefined)).toBe(ANCHO_SSG);
    expect(ANCHO_SSG).toBe(1280);
    expect(anchoDeVentana({ innerWidth: 390 })).toBe(390);
  });

  it('al desmontarse deja de escuchar los cambios de tamaño', async () => {
    const quitar = jest.spyOn(window, 'removeEventListener');
    const { wrapper, mirilla } = montar(1280);

    wrapper.unmount();
    expect(quitar).toHaveBeenCalledWith('resize', expect.any(Function));

    await redimensionar(390);
    expect(mirilla.anchoVentana.value).toBe(1280);

    quitar.mockRestore();
  });
});
