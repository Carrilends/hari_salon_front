/**
 * El estado de carga de las fotos remotas (Cloudinary): tarjeta, renglón, ficha
 * y tarjeta del asistente.
 *
 * Antes, mientras una foto no había llegado, su hueco era un rectángulo carbón
 * liso y la foto «saltaba» al aparecer. Ahora el hueco lleva un brillo que lo
 * recorre (`.m-foto-cargando`, en `app.scss`) y la foto entra con un fundido
 * corto (`.m-foto-fundido`). El brillo se apaga con `load` y con `error`, y
 * tampoco se enciende si la foto ya estaba en caché al montar: `load` pudo
 * dispararse antes de que hubiera oyente.
 *
 * Las fotos locales del inicio NO entran aquí: tienen su propio latido
 * (`.m-foto--esperando`, `useImagenesEnEspera`) y `FotoResponsiva` no se toca.
 *
 * El CSS está mockeado en Jest: lo que se ve se prueba montando (las clases), y
 * lo que hacen las clases se prueba leyendo la fuente, al final.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import ServiceCard from 'src/components/servicePage/ServiceCard.vue';
import ServiceRow from 'src/components/servicePage/ServiceRow.vue';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';
import ServiceListCard from 'src/components/assistant/ServiceListCard.vue';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
import type Service from 'src/interfaces/service';
import type { Image } from 'src/interfaces/service';
import { FOTO_CLOUDINARY, servicio } from './fixtures/servicios';

jest.mock('src/composables/booking/useAddToBag', () => ({
  useAddToBag: () => ({ añadirServicio: jest.fn(), añadirVarios: jest.fn() }),
}));

enableAutoUnmount(afterEach);

const CARGANDO = 'm-foto-cargando';
const ESPERANDO = 'm-foto-fundido--esperando';

/**
 * jsdom nunca descarga imágenes: `complete` es `false` y `naturalWidth` 0 para
 * cualquier `src`. Para el caso «ya estaba en caché» se fingen los dos.
 */
function fingirEnCache() {
  jest
    .spyOn(HTMLImageElement.prototype, 'complete', 'get')
    .mockReturnValue(true);
  jest
    .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
    .mockReturnValue(560);
}

afterEach(() => jest.restoreAllMocks());

describe('la tarjeta de servicio', () => {
  const montar = (s: Service = servicio()) =>
    mount(ServiceCard, { props: { servicio: s } });

  it('mientras la foto no llega, el hueco brilla y la foto espera oculta', () => {
    const tarjeta = montar();

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).toContain(CARGANDO);
    expect(tarjeta.get('img').classes()).toContain('m-foto-fundido');
    expect(tarjeta.get('img').classes()).toContain(ESPERANDO);
  });

  it('al llegar la foto, el brillo se apaga y la foto aparece', async () => {
    const tarjeta = montar();

    await tarjeta.get('img').trigger('load');

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).not.toContain(
      CARGANDO
    );
    expect(tarjeta.get('img').classes()).not.toContain(ESPERANDO);
  });

  it('si la foto falla, «Sin foto» y sin brillo', async () => {
    const tarjeta = montar();

    await tarjeta.get('img').trigger('error');

    expect(tarjeta.find('[data-test="sin-foto"]').exists()).toBe(true);
    expect(tarjeta.get('[data-test="tarjeta"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('una foto que ya estaba en caché no se queda brillando', async () => {
    fingirEnCache();
    const tarjeta = montar();
    await nextTick();

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).not.toContain(
      CARGANDO
    );
    expect(tarjeta.get('img').classes()).not.toContain(ESPERANDO);
  });

  it('sin foto no hay nada que esperar', () => {
    const tarjeta = montar(servicio({ images: [] }));

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).not.toContain(
      CARGANDO
    );
  });

  /** La rejilla reutiliza instancias al cambiar de página. */
  it('si la instancia pasa a otro servicio, vuelve a esperar', async () => {
    const tarjeta = montar();
    await tarjeta.get('img').trigger('load');

    await tarjeta.setProps({
      servicio: servicio({
        id: 's2',
        images: [
          {
            id: 'i2',
            url: FOTO_CLOUDINARY.replace('bob', 'otra'),
            isPrincipal: true,
            publicId: 'marlene/otra',
            version: '1712',
          },
        ],
      }),
    });

    expect(tarjeta.get('[data-test="tarjeta"]').classes()).toContain(CARGANDO);
  });
});

describe('el renglón de servicio', () => {
  const montar = (s: Service = servicio()) =>
    mount(ServiceRow, { props: { servicio: s } });

  it('el marco brilla mientras la foto no llega, y se apaga al llegar', async () => {
    const fila = montar();

    expect(fila.get('[data-test="fila-marco"]').classes()).toContain(CARGANDO);
    expect(fila.get('img').classes()).toContain(ESPERANDO);

    await fila.get('img').trigger('load');

    expect(fila.get('[data-test="fila-marco"]').classes()).not.toContain(
      CARGANDO
    );
    expect(fila.get('img').classes()).not.toContain(ESPERANDO);
  });

  it('si la foto falla, «Sin foto» y sin brillo', async () => {
    const fila = montar();

    await fila.get('img').trigger('error');

    expect(fila.find('[data-test="fila-sin-foto"]').exists()).toBe(true);
    expect(fila.get('[data-test="fila-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('una foto que ya estaba en caché no se queda brillando', async () => {
    fingirEnCache();
    const fila = montar();
    await nextTick();

    expect(fila.get('[data-test="fila-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });
});

/** Doble mínimo de QDialog: ver `serviceDialog.spec.ts` para el porqué. */
const QDialogFalso = defineComponent({
  name: 'QDialog',
  emits: ['hide'],
  methods: {
    show() {
      return undefined;
    },
    hide() {
      this.$emit('hide');
    },
  },
  template: '<div role="dialog"><slot /></div>',
});

const foto = (nombre: string): Image => ({
  id: nombre,
  url: `https://res.cloudinary.com/demo/image/upload/v1/${nombre}.jpg`,
  isPrincipal: nombre === 'a',
  publicId: `v1/${nombre}`,
  version: '1',
});

describe('la ficha del servicio', () => {
  beforeEach(() => {
    window.matchMedia = ((consulta: string) => ({
      matches: false,
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  });

  const montar = (images: Image[] = [foto('a'), foto('b')]) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(ServiceDialog, {
      props: { service: servicio({ images }), isFromBooking: false },
      global: { plugins: [pinia], components: { QDialog: QDialogFalso } },
    });
  };

  it('la galería brilla mientras la foto grande no llega, y se apaga al llegar', async () => {
    const ficha = montar();

    expect(ficha.get('[data-test="galeria"]').classes()).toContain(CARGANDO);
    expect(ficha.get('[data-test="foto"]').classes()).toContain(ESPERANDO);

    await ficha.get('[data-test="foto"]').trigger('load');

    expect(ficha.get('[data-test="galeria"]').classes()).not.toContain(
      CARGANDO
    );
    expect(ficha.get('[data-test="foto"]').classes()).not.toContain(ESPERANDO);
  });

  it('elegir otra miniatura vuelve a esperar la foto nueva', async () => {
    const ficha = montar();
    await ficha.get('[data-test="foto"]').trigger('load');

    await ficha.findAll('[data-test="miniatura"]')[1].trigger('click');

    expect(ficha.get('[data-test="galeria"]').classes()).toContain(CARGANDO);
  });

  it('si la foto grande falla, se pinta el sustituto y el brillo se apaga', async () => {
    const ficha = montar();

    await ficha.get('[data-test="foto"]').trigger('error');

    expect(ficha.get('[data-test="foto"]').attributes('src')).toBe(
      PLACEHOLDER_IMAGE
    );
    expect(ficha.get('[data-test="galeria"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('cada miniatura espera la suya, y se apaga sola', async () => {
    const ficha = montar();
    const miniaturas = ficha.findAll('[data-test="miniatura"]');

    expect(miniaturas[0].classes()).toContain(CARGANDO);
    expect(miniaturas[1].classes()).toContain(CARGANDO);

    await miniaturas[0].get('img').trigger('load');

    const tras = ficha.findAll('[data-test="miniatura"]');
    expect(tras[0].classes()).not.toContain(CARGANDO);
    expect(tras[1].classes()).toContain(CARGANDO);
  });

  it('una foto grande que ya estaba en caché no se queda brillando', async () => {
    fingirEnCache();
    const ficha = montar();
    await nextTick();

    expect(ficha.get('[data-test="galeria"]').classes()).not.toContain(
      CARGANDO
    );
  });
});

describe('la tarjeta de servicios del asistente', () => {
  const CON_FOTO = [
    {
      id: 's3',
      nombre: 'Uñas acrílicas',
      precio: 78000,
      minutos: 90,
      imagen: FOTO_CLOUDINARY,
    },
  ];

  it('la miniatura brilla hasta que llega, y se apaga al llegar', async () => {
    const tarjeta = mount(ServiceListCard, { props: { servicios: CON_FOTO } });

    expect(tarjeta.get('[data-test="foto-marco"]').classes()).toContain(
      CARGANDO
    );

    await tarjeta.get('img').trigger('load');

    expect(tarjeta.get('[data-test="foto-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('si falla, el sustituto y sin brillo', async () => {
    const tarjeta = mount(ServiceListCard, { props: { servicios: CON_FOTO } });

    await tarjeta.get('img').trigger('error');

    expect(tarjeta.get('img').attributes('src')).toBe(PLACEHOLDER_IMAGE);
    expect(tarjeta.get('[data-test="foto-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });
});

const APP = readFileSync(join(__dirname, '../../src/css/app.scss'), 'utf8');
const TOKENS = readFileSync(
  join(__dirname, '../../src/css/tokens.scss'),
  'utf8'
);

/** Las reglas de primer nivel de `app.scss` que mencionan un selector. */
const reglas = (selector: string) =>
  [...APP.matchAll(/^([^\n{]+)\{([^}]*)\}/gm)]
    .filter((r) => r[1].includes(selector))
    .map((r) => r[2])
    .join('\n');

/**
 * Revisión de código: una foto que falló ANTES de que hubiera oyente (caché
 * rota, o prerenderizada e hidratada después) llega con `complete` y
 * `naturalWidth` 0. Sin el repaso, esperaría para siempre.
 */
describe('una foto que ya había fallado al montar', () => {
  const fingirRota = () => {
    jest
      .spyOn(HTMLImageElement.prototype, 'complete', 'get')
      .mockReturnValue(true);
    jest
      .spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get')
      .mockReturnValue(0);
  };

  it('la tarjeta pasa a «Sin foto» y no brilla', async () => {
    fingirRota();
    const tarjeta = mount(ServiceCard, { props: { servicio: servicio() } });
    await nextTick();

    expect(tarjeta.find('[data-test="sin-foto"]').exists()).toBe(true);
    expect(tarjeta.get('[data-test="tarjeta"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('el renglón pasa a «Sin foto» y no brilla', async () => {
    fingirRota();
    const fila = mount(ServiceRow, { props: { servicio: servicio() } });
    await nextTick();

    expect(fila.find('[data-test="fila-sin-foto"]').exists()).toBe(true);
    expect(fila.get('[data-test="fila-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });

  it('la tarjeta del asistente pinta el sustituto', async () => {
    fingirRota();
    const tarjeta = mount(ServiceListCard, {
      props: {
        servicios: [
          { id: 's3', nombre: 'Uñas', precio: 1, minutos: 30, imagen: FOTO_CLOUDINARY },
        ],
      },
    });
    await nextTick();

    expect(tarjeta.get('img').attributes('src')).toBe(PLACEHOLDER_IMAGE);
    expect(tarjeta.get('[data-test="foto-marco"]').classes()).not.toContain(
      CARGANDO
    );
  });
});

describe('el brillo y el fundido · la fuente', () => {
  /**
   * Revisión de código: animar `background-position` repinta cada fotograma, y
   * una rejilla de fotos perezosas fuera de pantalla seguía repintando hasta que
   * se desplazaban a la vista. Ahora el degradado es una franja ancha que se
   * mueve con `transform`, que va por el compositor.
   */
  it('el brillo es una franja ancha que recorre el hueco con transform', () => {
    const cuerpo = reglas('.m-foto-cargando::before');
    const fotogramas = APP.slice(APP.indexOf('@keyframes m-foto-brillo'));
    const bloque = fotogramas.slice(0, fotogramas.indexOf('\n}\n'));

    expect(cuerpo).toMatch(/linear-gradient\(/);
    expect(cuerpo).toMatch(/var\(--m-carbon-claro\)/);
    expect(cuerpo).toMatch(/animation: m-foto-brillo/);
    expect(bloque).toMatch(/transform: translateX\(/);
    expect(bloque).not.toMatch(/background-position/);
    expect(cuerpo).not.toMatch(/background-position|background-size/);
  });

  /**
   * La franja mide el triple del hueco (un hueco a cada lado) para cubrirlo
   * entero en todo el recorrido. Los lados a mano, no `inset` (Safari 13.1).
   */
  it('la franja desborda el hueco por los lados, y el hueco la recorta', () => {
    const cuerpo = reglas('.m-foto-cargando::before');

    expect(cuerpo).toMatch(/position: absolute;/);
    expect(cuerpo).toMatch(/top: 0;/);
    expect(cuerpo).toMatch(/bottom: 0;/);
    expect(cuerpo).toMatch(/left: -100%;/);
    expect(cuerpo).toMatch(/right: -100%;/);
    expect(cuerpo).toMatch(/pointer-events: none;/);
    expect(cuerpo).not.toMatch(/\binset:/);
    expect(reglas('.m-foto-cargando ')).toMatch(/overflow: hidden;/);
  });

  it('la foto entra con un fundido corto, y se oculta sin fundido', () => {
    expect(reglas('.m-foto-fundido ')).toMatch(
      /transition: opacity var\(--m-transicion-fundido\)/
    );
    expect(reglas('.m-foto-fundido--esperando')).toMatch(/opacity: 0;/);
    expect(TOKENS).toMatch(/--m-transicion-fundido:\s*250ms/);
  });

  it('con movimiento reducido no hay brillo que corra ni fundido', () => {
    const reducido = APP.slice(
      APP.indexOf('@media (prefers-reduced-motion: reduce)', APP.indexOf('m-foto-brillo'))
    );
    const bloque = reducido.slice(0, reducido.indexOf('\n}\n'));

    expect(bloque).toMatch(/\.m-foto-cargando::before\s*\{[^}]*animation: none;/);
    expect(bloque).toMatch(/\.m-foto-cargando::before\s*\{[^}]*transform: none;/);
    expect(bloque).toMatch(/\.m-foto-fundido\s*\{[^}]*transition: none;/);
  });

  it('el tono del brillo es un token anotado que no es color de texto', () => {
    const [, comentario] =
      TOKENS.match(/((?:\s*\/\/\/[^\n]*\n)+)\s*--m-carbon-claro:/) ?? [];

    expect(comentario).toMatch(/no es color de texto/i);
  });
});
