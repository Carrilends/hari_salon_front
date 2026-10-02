/**
 * El `<picture>` sirve WebP a quien puede y JPEG a quien no.
 *
 * No es un adorno: NF06 (Tabla 44) promete **Safari 13.1+**, y WebP llega en
 * Safari 14. Un `src` con `.webp` suelto dejaría un hueco roto en un navegador
 * que la tesis dice soportar — el mismo error que ya costó una revisión con
 * `100dvh`.
 */
import { mount } from '@vue/test-utils';
import FotoResponsiva from 'src/components/shared/FotoResponsiva.vue';

const montar = (props = {}) =>
  mount(FotoResponsiva, {
    props: {
      foto: '/people/women-hair-cut.jpg',
      alt: 'Clienta en la peluquería',
      anchos: [420, 760, 1440],
      medidas: '(max-width: 699px) 100vw, 53vw',
      ...props,
    },
  });

describe('FotoResponsiva', () => {
  it('ofrece WebP primero y deja el JPEG detrás', () => {
    const wrapper = montar();

    expect(wrapper.get('source').attributes('type')).toBe('image/webp');
    expect(wrapper.get('source').attributes('srcset')).toContain(
      '/people/women-hair-cut-760.webp 760w'
    );
    // El `src` del `<img>` es el JPEG de siempre: lo que ve Safari 13.1.
    expect(wrapper.get('img').attributes('src')).toBe(
      '/people/women-hair-cut.jpg'
    );
    expect(wrapper.get('img').attributes('srcset')).toContain(
      '/people/women-hair-cut-760.jpg 760w'
    );
  });

  it('dice a cada pantalla cuánto va a ocupar', () => {
    const wrapper = montar();

    expect(wrapper.get('source').attributes('sizes')).toBe(
      '(max-width: 699px) 100vw, 53vw'
    );
    expect(wrapper.get('img').attributes('sizes')).toBe(
      '(max-width: 699px) 100vw, 53vw'
    );
  });

  it('las rutas son absolutas desde la raíz, que es lo que publica el SSG', () => {
    const srcset = montar().get('source').attributes('srcset') ?? '';

    for (const trozo of srcset.split(',')) {
      expect(trozo.trim().startsWith('/people/')).toBe(true);
    }
  });

  /**
   * Punto 2 del enfoque de revisión: la de la portada decide la sensación de
   * velocidad, así que no se aplaza; las demás sí.
   */
  it('la prioritaria no se aplaza, y la normal sí', () => {
    expect(montar({ prioritaria: true }).get('img').attributes('loading')).toBe(
      'eager'
    );
    expect(montar().get('img').attributes('loading')).toBe('lazy');
  });

  it('avisa cuando la foto llega', async () => {
    const wrapper = montar();

    await wrapper.get('img').trigger('load');

    expect(wrapper.emitted('cargada')).toHaveLength(1);
  });

  /** Punto 4: una foto rota no puede dejar el hueco esperando para siempre. */
  it('avisa también cuando la foto falla', async () => {
    const wrapper = montar();

    await wrapper.get('img').trigger('error');

    expect(wrapper.emitted('cargada')).toHaveLength(1);
  });

  /**
   * El repaso de `onMounted` en `useImagenesEnEspera` busca `img[data-foto]`:
   * sin ese atributo, una foto servida desde la caché —cuyo `load` se dispara
   * antes de que Vue ate el manejador— dejaría el hueco latiendo debajo de una
   * imagen ya pintada.
   */
  it('deja el data-foto que el repaso de la caché necesita', () => {
    expect(montar().get('img').attributes('data-foto')).toBe(
      '/people/women-hair-cut.jpg'
    );
  });
});
