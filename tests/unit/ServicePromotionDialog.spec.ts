/**
 * El diálogo de la promoción, que sustituye al `$q.dialog` con `prompt` de
 * Quasar. Lo que se vigila: que el precio resultante se calcule con la misma
 * función que cobra la bolsa (`effectiveServiceUnitPrice`) y que no se cuele un
 * porcentaje imposible, que es lo que el `isValid` del `prompt` hacía.
 */
const ocultar = jest.fn();

/**
 * `useDialogPluginComponent` son treinta líneas: `emit('ok')` + `hide()` sobre
 * la referencia al `q-dialog`. Se dobla aquí en vez de importar el paquete de
 * Quasar entero, que en Jest arrastra el bundle completo para nada.
 */
jest.mock('quasar', () => {
  const { getCurrentInstance, ref } = require('vue');
  const useDialogPluginComponent = () => {
    const instancia = getCurrentInstance();
    const emit = instancia.emit;
    return {
      dialogRef: ref(null),
      onDialogHide: () => emit('hide'),
      onDialogOK: (payload: unknown) => {
        emit('ok', payload);
        ocultar();
      },
      onDialogCancel: () => ocultar(),
    };
  };
  useDialogPluginComponent.emits = ['ok', 'hide'];
  return { useDialogPluginComponent };
});

import { mount } from '@vue/test-utils';
import ServicePromotionDialog from 'src/components/dialogs/ServicePromotionDialog.vue';
import type Service from 'src/interfaces/service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fijarViewport } from '../viewportMock';

/**
 * Pasarela del `q-dialog`: deja ver lo que lleva dentro y declara las props
 * que la hoja inferior le pasa, para poder leerlas.
 */
const QDialog = {
  name: 'QDialog',
  props: ['position', 'persistent', 'transitionShow', 'transitionHide'],
  template: '<div class="q-dialog"><slot /></div>',
};

const SERVICIO = {
  id: 's1',
  name: 'Bob clásico',
  gender: 'femenino',
  type: 'corte',
  price: 45000,
  isSpecial: false,
  duration: 60,
  slug: 'bob-clasico',
  tags: ['t1'],
  images: [],
  detail: {
    id: 'd1',
    description: 'Corte recto a la mandíbula',
    specifications: {},
  },
} as unknown as Service;

/** Como lo devuelve el API: el porcentaje llega como cadena. */
const EN_PROMOCION = {
  ...SERVICIO,
  havePromotion: true,
  porcentageDiscount: '30',
} as unknown as Service;

const montar = (service: Service = SERVICIO) =>
  mount(ServicePromotionDialog, {
    props: { service },
    global: { components: { QDialog } },
  });

beforeEach(() => {
  ocultar.mockReset();
  // El diálogo lee el ancho al montarse (`useDialogMaximizedBelow`).
  fijarViewport({ ancho: 1280, alto: 900 });
});

describe('ServicePromotionDialog · poner promoción', () => {
  it('ofrece un campo numérico con su rótulo, no un cuadro suelto', () => {
    const wrapper = montar();
    const campo = wrapper.get('[data-test="porcentaje"]');

    expect(campo.element.tagName).toBe('INPUT');
    expect(campo.attributes('type')).toBe('number');
    expect(wrapper.get('label').attributes('for')).toBe(campo.attributes('id'));
  });

  it('dice en qué precio queda el servicio, en vivo, mientras se escribe', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('20');

    // 45.000 con 20 % menos: la misma cuenta que cobra la bolsa.
    expect(wrapper.get('[data-test="precio-resultante"]').text()).toContain(
      '36.000'
    );
  });

  it('aplica el porcentaje escrito, redondeado a entero', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('25');
    await wrapper.get('[data-test="aplicar"]').trigger('click');

    expect(wrapper.emitted('ok')?.[0]).toEqual([25]);
  });

  it.each(['0', '101', '', '1e2'])(
    'no deja aplicar «%s», y lo dice junto al campo',
    async (escrito) => {
      const wrapper = montar();

      await wrapper.get('[data-test="porcentaje"]').setValue(escrito);
      await wrapper.get('[data-test="aplicar"]').trigger('click');

      expect(wrapper.emitted('ok')).toBeUndefined();
      expect(
        wrapper.get('[data-test="aplicar"]').attributes('disabled')
      ).toBeDefined();
      expect(wrapper.get('[data-test="error-porcentaje"]').text()).toMatch(
        /entre 1 y 100/
      );
      expect(wrapper.find('[data-test="precio-resultante"]').exists()).toBe(
        false
      );
    }
  );

  it('marca el campo como inválido para quien usa lector de pantalla', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('250');

    expect(
      wrapper.get('[data-test="porcentaje"]').attributes('aria-invalid')
    ).toBe('true');
  });

  it('cancelar cierra sin aplicar nada', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cancelar"]').trigger('click');

    expect(wrapper.emitted('ok')).toBeUndefined();
    expect(ocultar).toHaveBeenCalledTimes(1);
  });

  it('no ofrece el control de quitar cuando no hay promoción', () => {
    expect(montar().find('[data-test="quitar"]').exists()).toBe(false);
  });
});

describe('ServicePromotionDialog · quitar promoción', () => {
  /** Review Focus 4: el porcentaje llega como cadena desde el API. */
  it('con promoción activa pregunta si se quita, y no pide porcentaje', () => {
    const wrapper = montar(EN_PROMOCION);

    expect(wrapper.text()).toContain(
      '¿Deseas quitar la promoción de este servicio?'
    );
    expect(wrapper.find('[data-test="porcentaje"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="quitar"]').text()).toBe('Quitar');
  });

  it('quitar avisa por su propio canal y resuelve con un cero', async () => {
    const wrapper = montar(EN_PROMOCION);

    await wrapper.get('[data-test="quitar"]').trigger('click');

    expect(wrapper.emitted('quitar')).toHaveLength(1);
    expect(wrapper.emitted('ok')?.[0]).toEqual([0]);
  });
});

/** Un servicio con categoría traducible y sin etiquetas que la pisen. */
const CORTE = {
  ...SERVICIO,
  type: 'hair-women',
  tags: [],
} as unknown as Service;

const FOTO = {
  id: 'i1',
  url: 'https://res.cloudinary.com/demo/image/upload/v1/marlene/bob.jpg',
  isPrincipal: true,
  publicId: 'marlene/bob',
  version: '1',
};

describe('ServicePromotionDialog · hoja inferior en móvil (V2)', () => {
  it('por debajo de 700 px sube como hoja inferior, con tirador', () => {
    fijarViewport({ ancho: 390, alto: 844 });
    const wrapper = montar();
    const dialogo = wrapper.findComponent({ name: 'QDialog' });

    expect(dialogo.props('position')).toBe('bottom');
    expect(dialogo.props('transitionShow')).toBe('slide-up');
    expect(wrapper.get('[data-test="dialogo-promocion"]').classes()).toContain(
      'promo--hoja'
    );
    expect(wrapper.find('[data-test="promo-tirador"]').exists()).toBe(true);
  });

  it('en escritorio es el diálogo centrado de siempre, sin tirador', () => {
    const wrapper = montar();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('position')).toBe(
      'standard'
    );
    expect(
      wrapper.get('[data-test="dialogo-promocion"]').classes()
    ).not.toContain('promo--hoja');
    expect(wrapper.find('[data-test="promo-tirador"]').exists()).toBe(false);
  });

  it('enseña de qué servicio se habla: nombre, categoría y precio de lista', () => {
    const ficha = montar(CORTE).get('[data-test="promo-servicio"]');

    expect(ficha.text()).toContain('Bob clásico');
    expect(ficha.text()).toContain('Cortes de dama · $45.000');
  });

  it('sin categoría la línea solo dice el precio', () => {
    const sinCategoria = { ...CORTE, type: '' } as unknown as Service;

    expect(
      montar(sinCategoria).get('[data-test="promo-servicio"]').text()
    ).toContain('$45.000');
    expect(
      montar(sinCategoria).get('[data-test="promo-servicio"]').text()
    ).not.toContain(' · ');
  });

  it('sin foto pinta el sustituto; con foto la pide a Cloudinary a 92 px', () => {
    const sin = montar(CORTE).get('[data-test="promo-servicio"] img');
    const con = montar({ ...CORTE, images: [FOTO] } as unknown as Service).get(
      '[data-test="promo-servicio"] img'
    );

    expect(sin.attributes('src')).toMatch(/^data:image\/svg\+xml/);
    expect(con.attributes('src')).toContain(
      '/upload/f_auto,q_auto,w_92,c_limit/'
    );
    expect(con.attributes('alt')).toBe('');
  });

  it('una foto que no carga cae en el sustituto', async () => {
    const wrapper = montar({ ...CORTE, images: [FOTO] } as unknown as Service);

    await wrapper.get('[data-test="promo-servicio"] img').trigger('error');

    expect(
      wrapper.get('[data-test="promo-servicio"] img').attributes('src')
    ).toMatch(/^data:image\/svg\+xml/);
  });

  it('el rótulo dice el rango que se acepta', () => {
    expect(montar().get('label').text()).toBe('Descuento (1–100)');
  });

  it('junto al precio resultante enseña el de antes, tachado y dicho', async () => {
    const wrapper = montar(CORTE);

    await wrapper.get('[data-test="porcentaje"]').setValue('20');

    expect(wrapper.get('[data-test="precio-resultante"]').text()).toContain(
      '$36.000'
    );
    expect(wrapper.get('[data-test="promo-precio-base"]').text()).toBe(
      'antes $45.000'
    );
  });

  it('al quitar también enseña la ficha del servicio', () => {
    const quitar = { ...CORTE, havePromotion: true, porcentageDiscount: '30' };

    expect(
      montar(quitar as unknown as Service)
        .get('[data-test="promo-servicio"]')
        .text()
    ).toContain('Bob clásico');
  });
});

describe('ServicePromotionDialog · Enter, precio ausente y 100 %', () => {
  it('Enter con un valor válido aplica, como el botón', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('25');
    await wrapper.get('[data-test="porcentaje"]').trigger('keydown.enter');

    expect(wrapper.emitted('ok')?.[0]).toEqual([25]);
  });

  it('Enter con un valor inválido no envía y deja el error a la vista', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('150');
    await wrapper.get('[data-test="porcentaje"]').trigger('keydown.enter');

    expect(wrapper.emitted('ok')).toBeUndefined();
    expect(wrapper.find('[data-test="error-porcentaje"]').exists()).toBe(true);
  });

  it('sin precio de lista no pinta «$0» ni el «antes»', async () => {
    const sinPrecio = { ...CORTE, price: undefined } as unknown as Service;
    const wrapper = montar(sinPrecio);

    expect(wrapper.get('[data-test="promo-servicio"]').text()).not.toContain(
      '$'
    );
    await wrapper.get('[data-test="porcentaje"]').setValue('20');
    expect(wrapper.find('[data-test="promo-precio-base"]').exists()).toBe(
      false
    );
  });

  it('al 100 % queda en $0 y enseña el de antes', async () => {
    const wrapper = montar(CORTE);

    await wrapper.get('[data-test="porcentaje"]').setValue('100');

    expect(wrapper.get('[data-test="precio-resultante"]').text()).toContain(
      '$0'
    );
    expect(wrapper.get('[data-test="promo-precio-base"]').text()).toBe(
      'antes $45.000'
    );
  });

  it('la caja se desplaza en pantallas bajas: overflow-y auto, nunca hidden', () => {
    const fuente = readFileSync(
      join(
        __dirname,
        '../../src/components/dialogs/ServicePromotionDialog.vue'
      ),
      'utf8'
    );
    const caja = /\.promo \{[^}]*\}/.exec(
      fuente.slice(fuente.indexOf('<style'))
    );
    expect(caja?.[0]).toContain('overflow-y: auto;');
    expect(caja?.[0]).not.toContain('overflow: hidden');
  });

  it('la raíz no es un div: ella misma se topa al alto de la ventana (100vh y luego 100dvh)', () => {
    const fuente = readFileSync(
      join(
        __dirname,
        '../../src/components/dialogs/ServicePromotionDialog.vue'
      ),
      'utf8'
    );
    const caja = /\.promo \{[^}]*\}/.exec(
      fuente.slice(fuente.indexOf('<style'))
    )?.[0];
    expect(caja).toMatch(/max-height: calc\(100vh - 48px\);/);
    expect(caja).toMatch(
      /max-height: calc\(100vh - 48px\);\s*max-height: calc\(100dvh - 48px\);/
    );
  });
});

/**
 * La paleta: carbón, como los dos tableros que la dibujan (AdminMostradorMovil
 * y AdminDialogosCortos). El CSS no existe en Jest: se lee la fuente.
 */
describe('ServicePromotionDialog · el contrato visual', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/dialogs/ServicePromotionDialog.vue'),
    'utf8'
  );
  const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

  it('la caja va en carbón con texto hueso y filete oro', () => {
    expect(ESTILOS).toMatch(
      /\.promo \{[^}]*pointer-events: all;[^}]*border: var\(--m-filete-grosor\) solid var\(--m-oro\);[^}]*background: var\(--m-carbon\);[^}]*color: var\(--m-hueso\);/
    );
  });

  /** Foco de revisión 2: sobre carbón, los tokens de fondo claro no se leen. */
  it('no usa como texto ningún token pensado para fondo claro', () => {
    expect(ESTILOS).not.toContain('var(--m-rosa-profundo)');
    expect(ESTILOS).not.toContain('var(--m-oro-profundo)');
    expect(ESTILOS).not.toMatch(/var\(--m-filete\)/);
    expect(ESTILOS).not.toMatch(/var\(--m-peligro\)/);
  });

  it('el error del porcentaje va en el rosa legible sobre tinta', () => {
    expect(ESTILOS).toMatch(
      /\.promo__error \{[^}]*color: var\(--m-peligro-sobre-tinta\);/
    );
  });

  it('la hoja va de borde a borde, con la esquina del panel y el área segura', () => {
    expect(ESTILOS).toMatch(
      /\.promo--hoja \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*border-radius: var\(--m-radio-panel\) var\(--m-radio-panel\) 0 0;[^}]*padding-bottom: env\(safe-area-inset-bottom, 0px\);/
    );
    const global = FUENTE.slice(FUENTE.lastIndexOf('<style lang="scss">'));
    expect(global).toMatch(
      /\.promo-dialogo \.q-dialog__inner--bottom \{[^}]*padding-left: 0;[^}]*padding-right: 0;/
    );
    expect(global).toContain('.promo-dialogo .q-dialog__backdrop');
  });

  it('el foco de los controles se dibuja en hueso', () => {
    expect(ESTILOS).toMatch(
      /\.promo__boton:focus-visible \{[^}]*outline: 2px solid var\(--m-hueso\);/
    );
    expect(ESTILOS).toMatch(
      /\.promo__entrada:focus-visible \{[^}]*outline: 2px solid var\(--m-hueso\);/
    );
  });
});
