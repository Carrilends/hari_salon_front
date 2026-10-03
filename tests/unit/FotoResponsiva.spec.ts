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
  it('ofrece WebP primero y el JPEG detrás, los dos a varios anchos', () => {
    const fuentes = montar().findAll('source');

    expect(fuentes).toHaveLength(2);
    expect(fuentes[0].attributes('type')).toBe('image/webp');
    expect(fuentes[0].attributes('srcset')).toContain(
      '/people/women-hair-cut-760.webp 760w'
    );
    /**
     * El JPEG va en su propio `<source>`, no en el `srcset` del `<img>`: así
     * Safari 13.1 —que no tiene WebP— recibe un JPEG **del tamaño que pinta**, y
     * el `<img>` se queda sin `srcset` que disparar antes de tiempo.
     */
    expect(fuentes[1].attributes('type')).toBe('image/jpeg');
    expect(fuentes[1].attributes('srcset')).toContain(
      '/people/women-hair-cut-760.jpg 760w'
    );
  });

  it('dice a cada pantalla cuánto va a ocupar', () => {
    const fuentes = montar().findAll('source');

    expect(fuentes[0].attributes('sizes')).toBe('(max-width: 699px) 100vw, 53vw');
    expect(fuentes[1].attributes('sizes')).toBe('(max-width: 699px) 100vw, 53vw');
  });

  /**
   * El `src` es el último recurso —un navegador sin `srcset`, que no está en la
   * matriz de NF06— así que es la variante más pequeña y no el original: ese `src`
   * se pide una vez de más en WebKit cuando Vue construye el `<picture>` en el
   * cliente, y pagarlo a 131 KB en vez de a 17 era la mayor parte de los 640 KB
   * que medía la portada al llegar desde otra página.
   */
  it('el src de último recurso es la variante más pequeña', () => {
    expect(montar().get('img').attributes('src')).toBe(
      '/people/women-hair-cut-420.jpg'
    );
    expect(montar().get('img').attributes('srcset')).toBeUndefined();
  });

  /**
   * El orden de los atributos no es cosmético. Un `<img>` empieza a cargar en
   * cuanto se le pone el `src`, y Vue se los pone mientras todavía está fuera del
   * `<picture>`: si `loading` llega después, el navegador ya arrancó una descarga
   * que nadie va a usar. Con `loading` delante, la aplaza.
   */
  it('pone loading antes del src, que es lo que evita la descarga de más', () => {
    const html = montar().get('img').html();

    expect(html.indexOf('loading=')).toBeGreaterThan(-1);
    expect(html.indexOf('loading=')).toBeLessThan(html.indexOf('src='));
  });

  it('las rutas son absolutas desde la raíz, que es lo que publica el SSG', () => {
    for (const fuente of montar().findAll('source')) {
      const srcset = fuente.attributes('srcset') ?? '';
      for (const trozo of srcset.split(',')) {
        expect(trozo.trim().startsWith('/people/')).toBe(true);
      }
    }
    expect(montar().get('img').attributes('src')).toMatch(/^\/people\//);
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
