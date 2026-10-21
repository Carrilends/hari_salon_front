/**
 * La ficha de detalle del servicio (fase D de la remodelación de /services).
 *
 * Tres cosas se vigilan aquí por encima del resto:
 *
 * 1. El **contrato de cierre**. `useDialogPluginComponent` devuelve `'cancel'` a
 *    `useService.ts`, que es quien limpia `serviceIdRef`. Si la ficha deja de
 *    devolverlo, volver a tocar el MISMO servicio en la lista no abre nada: la
 *    clave de la query no cambia y el `watch` no se vuelve a disparar.
 * 2. Que «Añadir a la reserva» **añade** y no reserva. El único «Reservar» del
 *    portal es el de la cabecera.
 * 3. Que `isFromBooking` sigue escondiendo el pie, porque la ficha se abre desde
 *    dentro del flujo de reserva y allí la bolsa ya está a la vista.
 *
 * El CSS no existe en las pruebas (está mockeado): el contrato visual se
 * comprueba leyendo la fuente, al final del archivo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';
import { useBookStore } from 'src/stores/book-store';
import type Service from 'src/interfaces/service';
import type { Image } from 'src/interfaces/service';

/** Ancho de ventana que ve `useDialogMaximizedBelow`. jsdom no trae matchMedia. */
let anchoVentana = 1280;
/** Alto de ventana que ve la consulta de alto de la ficha. */
let altoVentana = 900;

/** Veces que el diálogo se ha cerrado de verdad (el plugin llama a `hide()`). */
const cerrado = { veces: 0 };

/**
 * Doble de QDialog. Hace falta por dos razones y no basta con `stubs`:
 * `<q-dialog>` no está registrado en las pruebas, así que Vue lo deja como
 * elemento nativo y el mecanismo de `stubs` de test-utils —que solo transforma
 * componentes resueltos— no lo alcanza. Se registra como componente global.
 *
 * Expone `hide()` porque `onDialogOK` del plugin de Quasar llama a
 * `dialogRef.value.hide()`: sin ese método, cerrar lanzaría un TypeError.
 * Reproduce también el `role="dialog"` del original, que es donde aterrizan la
 * clase y el `aria-label` que la ficha le pasa.
 */
const QDialogFalso = defineComponent({
  name: 'QDialog',
  props: {
    persistent: { type: Boolean, default: false },
    maximized: { type: Boolean, default: false },
    transitionShow: { type: String, default: '' },
    transitionHide: { type: String, default: '' },
  },
  emits: ['hide'],
  methods: {
    show() {
      return undefined;
    },
    hide() {
      cerrado.veces += 1;
      this.$emit('hide');
    },
  },
  template:
    '<div role="dialog" class="q-dialog"><div class="q-dialog__inner"><slot /></div></div>',
});

const foto = (nombre: string): Image => ({
  id: nombre,
  url: `https://res.cloudinary.com/demo/image/upload/v1/${nombre}.jpg`,
  isPrincipal: nombre === 'a',
  publicId: `v1/${nombre}`,
  version: '1',
});

const hacerServicio = (cambios: Partial<Service> = {}): Service =>
  ({
    id: 's1',
    name: 'Fade bajo clásico',
    gender: 'Masculino',
    // Clave del sembrado, no texto de cara al público: la traduce
    // `etiquetaDeCategoria` (fase B) a «Barbería».
    type: 'hair-men',
    price: 45000,
    isSpecial: false,
    duration: 60,
    slug: 'fade_bajo_clasico',
    tags: [],
    images: [],
    detail: {
      id: 'd1',
      description: 'El degradado arranca sobre la línea de las orejas.',
      specifications: {},
    },
    ...cambios,
  } as Service);

function montar(
  opciones: { servicio?: Service; isFromBooking?: boolean } = {}
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(ServiceDialog, {
    props: {
      service: opciones.servicio ?? hacerServicio(),
      isFromBooking: opciones.isFromBooking ?? false,
    },
    global: { plugins: [pinia], components: { QDialog: QDialogFalso } },
  });
  return { wrapper, bolsa: useBookStore(pinia) };
}

enableAutoUnmount(afterEach);

beforeEach(() => {
  anchoVentana = 1280;
  altoVentana = 900;
  cerrado.veces = 0;
  window.matchMedia = ((consulta: string) => {
    const topeAncho = consulta.match(/max-width:\s*(\d+)px/)?.[1];
    const topeAlto = consulta.match(/max-height:\s*(\d+)px/)?.[1];
    return {
      matches: topeAncho
        ? anchoVentana <= Number(topeAncho)
        : topeAlto
        ? altoVentana <= Number(topeAlto)
        : false,
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  }) as unknown as typeof window.matchMedia;
});

describe('ficha del servicio · lo que se lee', () => {
  it('pinta el nombre, la categoría, la duración y la descripción del servicio', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="nombre"]').text()).toBe(
      'Fade bajo clásico'
    );
    // La categoría la traduce el ayudante de la fase B: `hair-men` → «Barbería».
    // Con el valor crudo, la ficha pintaría «hair-men» donde la tarjeta pinta la
    // versalita en español (hoja de ruta §8.1).
    expect(wrapper.get('[data-test="categoria"]').text()).toBe('Barbería');
    expect(wrapper.get('[data-test="duracion"]').text()).toBe('1 h');
    expect(wrapper.get('[data-test="descripcion"]').text()).toContain(
      'arranca sobre la línea de las orejas'
    );
  });

  it('sin descripción lo dice, en vez de dejar el hueco', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        detail: {
          id: 'd1',
          description: '   ',
          specifications: {},
        } as Service['detail'],
      }),
    });

    expect(wrapper.get('[data-test="descripcion"]').text()).toBe(
      'Sin descripción.'
    );
  });

  /** Enfoque de revisión 2: el store arranca en `{}` y una respuesta recortada es posible. */
  it('un servicio sin detalle no revienta la ficha', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        detail: undefined as unknown as Service['detail'],
      }),
    });

    expect(wrapper.find('[data-test="ficha"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="descripcion"]').text()).toBe(
      'Sin descripción.'
    );
  });

  /** Enfoque de revisión 3: «0 min» no es una duración, es un dato que falta. */
  it('una duración de cero no pinta la línea de duración', () => {
    const { wrapper } = montar({ servicio: hacerServicio({ duration: 0 }) });

    expect(wrapper.find('[data-test="duracion"]').exists()).toBe(false);
  });

  it('dice las duraciones largas en horas y minutos', () => {
    const { wrapper } = montar({ servicio: hacerServicio({ duration: 90 }) });

    expect(wrapper.get('[data-test="duracion"]').text()).toBe('1 h 30 min');
  });
});

describe('ficha del servicio · la galería', () => {
  it('pide a Cloudinary la foto grande a 840 px, no la URL cruda', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a')] }),
    });

    // La columna de la foto mide 420 px: 840 cubre las pantallas densas.
    expect(wrapper.get('[data-test="foto"]').attributes('src')).toContain(
      '/upload/f_auto,q_auto,w_840,c_limit/'
    );
  });

  it('el alt de la foto grande nombra el servicio', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a')] }),
    });

    expect(wrapper.get('[data-test="foto"]').attributes('alt')).toBe(
      'Fade bajo clásico'
    );
  });

  /** Enfoque de revisión 2: sin fotos, el sustituto; nunca un hueco roto. */
  it('sin imágenes usa el sustituto, no un hueco roto', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        images: undefined as unknown as Service['images'],
      }),
    });

    expect(wrapper.get('[data-test="foto"]').attributes('src')).toMatch(
      /^data:image\/svg\+xml/
    );
    expect(wrapper.findAll('[data-test="miniatura"]')).toHaveLength(0);
  });

  it('las miniaturas son botones de verdad y dicen qué foto abren', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a'), foto('b'), foto('c')] }),
    });
    const miniaturas = wrapper.findAll('[data-test="miniatura"]');

    expect(miniaturas).toHaveLength(3);
    expect(miniaturas[0].element.tagName).toBe('BUTTON');
    expect(miniaturas[0].attributes('aria-label')).toBe('Ver foto 1 de 3');
    expect(miniaturas[2].attributes('aria-label')).toBe('Ver foto 3 de 3');
  });

  it('tocar una miniatura cambia la foto grande y marca la elegida', async () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a'), foto('b'), foto('c')] }),
    });
    const miniaturas = wrapper.findAll('[data-test="miniatura"]');

    expect(miniaturas[0].attributes('aria-current')).toBe('true');

    await miniaturas[1].trigger('click');

    expect(wrapper.get('[data-test="foto"]').attributes('src')).toContain(
      '/b.jpg'
    );
    const tras = wrapper.findAll('[data-test="miniatura"]');
    expect(tras[1].attributes('aria-current')).toBe('true');
    expect(tras[0].attributes('aria-current')).toBeUndefined();
  });

  it('con una sola foto no pinta la tira de miniaturas', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a')] }),
    });

    expect(wrapper.find('[data-test="galeria"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="miniatura"]')).toHaveLength(0);
  });

  it('las miniaturas se piden a 112 px, que es el doble de los 56 que miden', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('a'), foto('b')] }),
    });

    const img = wrapper.findAll('[data-test="miniatura"]')[0].get('img');
    expect(img.attributes('src')).toContain(
      '/upload/f_auto,q_auto,w_112,c_limit/'
    );
    // El nombre ya lo dice el `aria-label` del botón: repetirlo haría que el
    // lector de pantalla lo diga dos veces por miniatura.
    expect(img.attributes('alt')).toBe('');
  });

  /** Misma regla que la tarjeta, la fila y la bolsa: abre en la principal. */
  it('abre en la foto principal aunque no sea la primera de la lista', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ images: [foto('b'), foto('a'), foto('c')] }),
    });

    expect(wrapper.get('[data-test="foto"]').attributes('src')).toContain(
      '/a.jpg'
    );
    const miniaturas = wrapper.findAll('[data-test="miniatura"]');
    expect(miniaturas[0].get('img').attributes('src')).toContain('/a.jpg');
    expect(miniaturas[0].attributes('aria-current')).toBe('true');
  });
});

describe('ficha del servicio · la conducta del diálogo', () => {
  it('es un diálogo con nombre accesible', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe(
      'Ficha de Fade bajo clásico'
    );
  });

  /**
   * Persistente fuera del flujo de reserva **a propósito**: obliga a cerrar por
   * los botones, y es eso lo que garantiza que `useService.ts` reciba su
   * `'cancel'`. Dentro del flujo de reserva el velo sí cierra, como hoy.
   */
  it('es persistente solo cuando no viene del flujo de reserva', () => {
    const suelta = montar().wrapper.findComponent({ name: 'QDialog' });
    const desdeReserva = montar({ isFromBooking: true }).wrapper.findComponent({
      name: 'QDialog',
    });

    expect(suelta.props('persistent')).toBe(true);
    expect(desdeReserva.props('persistent')).toBe(false);
  });

  /** Reutiliza `useDialogMaximizedBelow(500)`: no se decide otra vez aquí. */
  it('por debajo de 500 px el diálogo va a pantalla completa', () => {
    anchoVentana = 390;

    const { wrapper } = montar();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      true
    );
    expect(wrapper.get('[data-test="ficha"]').classes()).toContain(
      'ficha--amplia'
    );
  });

  it('a 1280 px el diálogo no va a pantalla completa', () => {
    const { wrapper } = montar();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      false
    );
  });

  /**
   * Teléfono tumbado o ventana bajita: la ficha es persistente, así que si la X
   * y el pie se salen de la pantalla no hay forma de cerrarla. Por debajo de
   * 600 px de alto va a pantalla completa, aunque sobre ancho.
   */
  it('por debajo de 600 px de alto va a pantalla completa aunque sobre ancho', () => {
    anchoVentana = 844;
    altoVentana = 390;

    const { wrapper } = montar();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      true
    );
    expect(wrapper.get('[data-test="ficha"]').classes()).toContain(
      'ficha--amplia'
    );
  });

  it('a 600 px de alto justos sigue siendo la ficha flotante', () => {
    altoVentana = 600;

    const { wrapper } = montar();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      false
    );
  });

  /** NF06: en Safari 13.1 la consulta solo trae `addListener`. */
  it('sigue el alto también en Safari 13.1, con addListener', async () => {
    const escuchas: Array<() => void> = [];
    window.matchMedia = ((consulta: string) => ({
      get matches() {
        const topeAlto = consulta.match(/max-height:\s*(\d+)px/)?.[1];
        return topeAlto ? altoVentana <= Number(topeAlto) : false;
      },
      media: consulta,
      addListener: (fn: () => void) => escuchas.push(fn),
      removeListener: () => undefined,
    })) as unknown as typeof window.matchMedia;

    const { wrapper } = montar();
    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      false
    );

    altoVentana = 420;
    escuchas.forEach((fn) => fn());
    await nextTick();

    expect(wrapper.findComponent({ name: 'QDialog' }).props('maximized')).toBe(
      true
    );
  });

  /**
   * Enfoque de revisión 5. Si la X no devuelve `'cancel'`, `serviceIdRef` se
   * queda puesto en `useService.ts` y el MISMO servicio no se puede volver a
   * abrir desde la lista.
   */
  it('la X cierra devolviendo «cancel», que es lo que limpia serviceIdRef', async () => {
    const { wrapper } = montar();

    await wrapper.get('[data-test="cerrar"]').trigger('click');

    expect(wrapper.emitted('ok')?.[0]).toEqual(['cancel']);
    expect(cerrado.veces).toBe(1);
  });

  /** Sin «hide» el plugin de Quasar no desmonta el componente ni limpia su nodo. */
  it('al cerrarse avisa con «hide», que es lo que desmonta el diálogo', async () => {
    const { wrapper } = montar();

    await wrapper.get('[data-test="cerrar"]').trigger('click');

    expect(wrapper.emitted('hide')).toHaveLength(1);
  });

  it('la X es un botón de verdad, con nombre y área de toque', () => {
    const { wrapper } = montar();
    const x = wrapper.get('[data-test="cerrar"]');

    expect(x.element.tagName).toBe('BUTTON');
    expect(x.attributes('type')).toBe('button');
    expect(x.attributes('aria-label')).toMatch(/cerrar/i);
  });
});

describe('ficha del servicio · el precio (D3)', () => {
  /**
   * Hoy la tarjeta pinta el precio base y la bolsa cobra el efectivo: la clienta
   * ve dos cifras distintas para el mismo servicio. D3 pone el efectivo en todas
   * las superficies, con el base tachado al lado.
   */
  it('con promoción pinta el precio efectivo, el base tachado y el porcentaje', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        price: 45000,
        havePromotion: true,
        porcentageDiscount: 20,
      }),
    });

    expect(wrapper.get('[data-test="precio"]').text()).toBe('$36.000');
    expect(wrapper.get('[data-test="precio-base"]').text()).toBe(
      'antes $45.000'
    );
    expect(wrapper.get('[data-test="promo-pildora"]').text()).toBe('-20 %');
    // El tachado no se oye: «antes» se lo dice al lector de pantalla.
    expect(wrapper.get('[data-test="precio-base"] .sr').text()).toBe('antes');
  });

  it('sin promoción pinta una sola cifra', () => {
    const { wrapper } = montar({ servicio: hacerServicio({ price: 45000 }) });

    expect(wrapper.get('[data-test="precio"]').text()).toBe('$45.000');
    expect(wrapper.find('[data-test="precio-base"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="promo-pildora"]').exists()).toBe(false);
  });

  it('una promoción marcada con cero por ciento no es una promoción', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ havePromotion: true, porcentageDiscount: 0 }),
    });

    expect(wrapper.find('[data-test="precio-base"]').exists()).toBe(false);
  });

  /**
   * Enfoque de revisión 1. `price` y `porcentage_disscount` son columnas
   * `numeric` de Postgres y TypeORM las devuelve en TEXTO: con aritmética
   * directa, `'45000' * 0.8` cuela pero `'45000' + algo` concatena. Por eso todo
   * pasa por los ayudantes, que hacen `Number(...)`.
   */
  it('un precio que llega como cadena se pinta igual', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        price: '45000' as unknown as number,
        havePromotion: true,
        porcentageDiscount: '20' as unknown as number,
      }),
    });

    expect(wrapper.get('[data-test="precio"]').text()).toBe('$36.000');
    expect(wrapper.get('[data-test="precio-base"]').text()).toBe(
      'antes $45.000'
    );
    expect(wrapper.get('[data-test="promo-pildora"]').text()).toBe('-20 %');
  });
});

describe('ficha del servicio · el pie y la bolsa', () => {
  it('«Añadir a la reserva» mete el servicio en la bolsa', async () => {
    const { wrapper, bolsa } = montar();

    await wrapper.get('[data-test="anadir-reserva"]').trigger('click');

    expect(bolsa.bookings).toHaveLength(1);
    expect(bolsa.bookings[0].service.id).toBe('s1');
  });

  it('con el servicio ya en la bolsa, el botón lo dice y no lo añade otra vez', async () => {
    const { wrapper, bolsa } = montar();
    await wrapper.get('[data-test="anadir-reserva"]').trigger('click');

    const boton = wrapper.get('[data-test="anadir-reserva"]');
    expect(boton.text()).toBe('Ya está en tu bolsa');
    expect(boton.attributes('disabled')).toBeDefined();
    await boton.trigger('click');
    expect(bolsa.bookings).toHaveLength(1);
  });

  /**
   * Regla de producto: el único «Reservar» del portal es el de la cabecera. Este
   * botón **añade**, y la ficha se queda abierta para que el resumen de abajo
   * sea la confirmación de que el servicio entró.
   */
  it('añadir no abre el diálogo de reserva ni cierra la ficha', async () => {
    const { wrapper, bolsa } = montar();

    await wrapper.get('[data-test="anadir-reserva"]').trigger('click');

    expect(bolsa.showDialog).toBe(false);
    expect(wrapper.emitted('ok')).toBeUndefined();
    expect(cerrado.veces).toBe(0);
  });

  it('el resumen sale de la bolsa, no de las props', async () => {
    const { wrapper, bolsa } = montar();

    await wrapper.get('[data-test="anadir-reserva"]').trigger('click');
    expect(wrapper.get('[data-test="resumen-bolsa"]').text()).toBe(
      'En tu reserva: 1 servicio · 1 h · $45.000'
    );

    // Un servicio que la ficha no conoce: si el resumen saliera de las props,
    // esta línea no cambiaría.
    bolsa.addBooking(
      hacerServicio({ id: 's2', name: 'Barba', price: 20000, duration: 30 })
    );
    await nextTick();

    expect(wrapper.get('[data-test="resumen-bolsa"]').text()).toBe(
      'En tu reserva: 2 servicios · 1 h 30 min · $65.000'
    );
  });

  it('con la bolsa vacía el resumen lo dice', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="resumen-bolsa"]').text()).toBe(
      'Tu reserva está vacía.'
    );
  });

  /** Enfoque de revisión 3: «0 min» no es una duración. */
  it('una bolsa sin duración no dice «0 min»', async () => {
    const { wrapper } = montar({ servicio: hacerServicio({ duration: 0 }) });

    await wrapper.get('[data-test="anadir-reserva"]').trigger('click');

    const resumen = wrapper.get('[data-test="resumen-bolsa"]').text();
    expect(resumen).toBe('En tu reserva: 1 servicio · $45.000');
    expect(resumen).not.toContain('0 min');
  });

  it('el resumen se anuncia al lector de pantalla cuando cambia', () => {
    const { wrapper } = montar();

    expect(
      wrapper.get('[data-test="resumen-bolsa"]').attributes('aria-live')
    ).toBe('polite');
  });

  /**
   * La ficha se abre desde dentro del flujo de reserva: allí la bolsa ya está a
   * la vista y un segundo «añadir» sobraría. La X sigue, que es la única salida.
   */
  it('con isFromBooking no hay pie de acciones ni botón de añadir', () => {
    const { wrapper } = montar({ isFromBooking: true });

    expect(wrapper.find('[data-test="pie-acciones"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="anadir-reserva"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="resumen-bolsa"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="cerrar"]').exists()).toBe(true);
  });

  it('«Cerrar» del pie devuelve «cancel» igual que la X', async () => {
    const { wrapper } = montar();

    await wrapper.get('[data-test="cerrar-pie"]').trigger('click');

    expect(wrapper.emitted('ok')?.[0]).toEqual(['cancel']);
    expect(cerrado.veces).toBe(1);
  });

  it('los dos botones del pie son botones de verdad', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="anadir-reserva"]').element.tagName).toBe(
      'BUTTON'
    );
    expect(wrapper.get('[data-test="cerrar-pie"]').element.tagName).toBe(
      'BUTTON'
    );
    expect(wrapper.get('[data-test="anadir-reserva"]').text()).toBe(
      'Añadir a la reserva'
    );
  });
});

describe('ficha del servicio · etiquetas y rostros', () => {
  /**
   * El API devuelve los tags con `leftJoinAndSelect`, o sea objetos con nombre,
   * aunque la interfaz del front los tenga tipados como `string[]`.
   */
  const tags = (...nombres: string[]) =>
    nombres.map((name, i) => ({ id: `t${i}`, name })) as unknown as string[];

  it('pinta las etiquetas del servicio como chips', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        // Con `type` reconocido la categoría es «Barbería», que no es ninguna
        // etiqueta: las tres salen enteras.
        type: 'hair-men',
        tags: tags('Fade/Degradado', 'Universal', 'Adulto'),
      }),
    });

    const chips = wrapper.findAll('[data-test="tag"]');
    expect(wrapper.find('[data-test="tags"]').exists()).toBe(true);
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.text())).toEqual([
      'Fade/Degradado',
      'Universal',
      'Adulto',
    ]);
  });

  it('sin etiquetas no deja una tira vacía', () => {
    const { wrapper } = montar({ servicio: hacerServicio({ tags: [] }) });

    expect(wrapper.find('[data-test="tags"]').exists()).toBe(false);
  });

  /**
   * Enfoque de revisión 4. `normalizeServiceTags` (en
   * `useServiceAdminActions.ts`) reenvía los tags como identificadores al aplicar una promoción: un uuid no es una
   * etiqueta y no se puede pintar como tal. El descarte lo hace
   * `etiquetasDeServicio` (fase B) y tiene su propia prueba allí; esta comprueba
   * que la ficha lo consume y no arma la tira por su cuenta.
   */
  it('no pinta como etiqueta un identificador', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        type: 'hair-men',
        tags: [
          '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
          ...tags('Universal'),
        ] as unknown as string[],
      }),
    });

    const chips = wrapper.findAll('[data-test="tag"]');
    expect(chips).toHaveLength(1);
    expect(chips[0].text()).toBe('Universal');
  });

  /**
   * El respaldo por etiqueta vive en `etiquetaDeCategoria` (fase B), no aquí:
   * `type` es una columna que el sembrado deja vacía y el DTO del backend tiene
   * comentada, así que la primera etiqueta es lo más parecido a una categoría
   * que trae el servicio de verdad. Lo que SÍ decide la ficha es que entonces no
   * se diga dos veces, arriba y abajo.
   */
  it('cuando la categoría sale de una etiqueta, esa no se repite como chip', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        type: '',
        tags: tags('Fade/Degradado', 'Universal', 'Adulto'),
      }),
    });

    expect(wrapper.get('[data-test="categoria"]').text()).toBe(
      'Fade/Degradado'
    );
    expect(wrapper.findAll('[data-test="tag"]').map((c) => c.text())).toEqual([
      'Universal',
      'Adulto',
    ]);
  });

  it('sin «type» y sin etiquetas no pinta la línea de categoría', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ type: '', tags: [] }),
    });

    expect(wrapper.find('[data-test="categoria"]').exists()).toBe(false);
  });

  /**
   * Un servicio creado desde el formulario de administración llega con un `type`
   * que la tabla no reconoce (o sin ninguno). El ayudante lo manda a la etiqueta;
   * lo que no puede pasar es que la ficha pinte la clave cruda.
   */
  it('un «type» que no está en la tabla no sale a pantalla', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({ type: 'spa', tags: tags('Universal') }),
    });

    expect(wrapper.get('[data-test="categoria"]').text()).toBe('Universal');
    expect(wrapper.text()).not.toContain('spa');
  });

  /** En el sembrado `faceTypes` viene vacío: es el caso normal, no el raro. */
  it('sin faceTypes no pinta la línea de rostros', () => {
    const { wrapper } = montar();

    expect(wrapper.find('[data-test="rostros"]').exists()).toBe(false);
  });

  it('con dos faceTypes los pinta traducidos, sin iconos de Material', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        detail: {
          id: 'd1',
          description: 'Lo de siempre.',
          specifications: { faceTypes: ['Oval', 'Round'] },
        } as Service['detail'],
      }),
    });

    const rostros = wrapper.get('[data-test="rostros"]');
    expect(rostros.text()).toContain('Favorece a rostros');
    expect(rostros.text()).toContain('Ovalado');
    expect(rostros.text()).toContain('Redondo');
    // El mapa viejo arrastraba nombres de iconos de Material («exposure_zero»,
    // «radio_button_unchecked»): ahora solo quedan los nombres en texto.
    expect(rostros.text()).not.toMatch(/exposure_zero|radio_button_unchecked/);
  });

  it('traduce los seis tipos de rostro', () => {
    const { wrapper } = montar({
      servicio: hacerServicio({
        detail: {
          id: 'd1',
          description: 'Lo de siempre.',
          specifications: {
            faceTypes: ['Oval', 'Round', 'Diamond', 'Square', 'Heart', 'Long'],
          },
        } as Service['detail'],
      }),
    });

    expect(wrapper.get('[data-test="rostros"]').text()).toContain(
      'Ovalado · Redondo · Diamante · Cuadrado · Corazón · Largo'
    );
  });
});

/**
 * El CSS no existe en las pruebas (`\.(css|scss|sass)$` está mapeado a
 * `tests/styleMock.js`): un color NO se puede afirmar montando. El contrato
 * visual se lee de la fuente, como en `tests/unit/main-header.spec.ts`.
 */
describe('ficha del servicio · el contrato visual', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/dialogs/serviceDialog.vue'),
    'utf8'
  );
  const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

  it('no pinta con hexadecimales sueltos', () => {
    expect(ESTILOS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  /**
   * 640 de alto como techo, nunca más que la ventana menos un margen: con una
   * altura fija, en una ventana de 620 px la X y el pie quedaban fuera y la
   * ficha, que es persistente, no se podía cerrar. `100vh` primero y `100dvh`
   * después: Safari 13.1 descarta la segunda y se queda con la primera.
   */
  it('la ficha mide 880 px de ancho y como mucho 640 de alto, sin pasarse de la ventana', () => {
    expect(ESTILOS).toContain('width: 880px');
    expect(ESTILOS).toMatch(
      /\.ficha \{[^}]*height: min\(640px, calc\(100vh - 32px\)\);\s*height: min\(640px, calc\(100dvh - 32px\)\);/
    );
    expect(ESTILOS).not.toMatch(/\bheight: 640px/);
  });

  /**
   * La foto grande y las miniaturas se ven ENTERAS, centradas, sobre carbón:
   * recortadas (`cover`), la miniatura de un retrato no se distinguía de otra.
   */
  it('la foto grande y las miniaturas se ven enteras sobre carbón', () => {
    expect(ESTILOS).toMatch(
      /\.ficha__galeria \{[^}]*background: var\(--m-carbon\);/
    );
    expect(ESTILOS).toMatch(
      /\.ficha__foto \{[^}]*object-fit: contain;[^}]*object-position: center;/
    );
    expect(ESTILOS).toMatch(
      /\.ficha__miniatura \{[^}]*background: var\(--m-carbon\);/
    );
    expect(ESTILOS).toMatch(
      /\.ficha__miniatura img \{[^}]*object-fit: contain;[^}]*object-position: center;/
    );
    expect(ESTILOS).not.toContain('object-fit: cover');
  });

  /**
   * V1: la foto mide 340 px de pie (tablero DetalleMovil) y se va al desplazar;
   * tumbada, media pantalla, para que el nombre asome sin buscarlo.
   */
  it('a pantalla completa la foto mide 340 px, y tumbada cede a media pantalla', () => {
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__galeria \{\s*flex: none;\s*height: min\(340px, 50vh\);/
    );
  });

  it('la consulta de alto va detrás de la guarda de SSG', () => {
    expect(FUENTE).toContain("typeof window !== 'undefined'");
    expect(FUENTE).toContain("typeof window.matchMedia === 'function'");
    expect(FUENTE).toContain('escucharConsulta(');
  });

  it('todo el color y el ritmo salen de los tokens', () => {
    for (const token of [
      '--m-carbon',
      '--m-oro',
      '--m-hueso',
      '--m-tinta',
      '--m-piedra-clara',
      '--m-filete-oscuro',
      '--m-radio-panel',
      '--m-font-display',
      '--m-font-sans',
      '--m-tracking-etiqueta',
      '--m-tactil-min',
    ]) {
      expect(ESTILOS).toContain(`var(${token})`);
    }
  });

  /**
   * El velo y el ancho los pinta QDialog, cuyos nodos renderiza Quasar y no
   * llevan el atributo de ámbito de este componente: esas dos reglas tienen que
   * vivir FUERA de `scoped`, acotadas por la clase que la ficha le pasa.
   */
  it('tiñe el velo del diálogo con el token, fuera de «scoped»', () => {
    const global = FUENTE.slice(FUENTE.lastIndexOf('<style lang="scss">'));

    expect(FUENTE.indexOf('<style scoped lang="scss">')).toBeLessThan(
      FUENTE.lastIndexOf('<style lang="scss">')
    );
    expect(global).toContain('.ficha-servicio .q-dialog__backdrop');
    expect(global).toContain('var(--m-velo)');
    expect(global).toContain('.q-dialog__inner--minimized');
  });

  /** Decisión D8: menos CSS peleado con las tripas de Quasar. */
  it('ya no monta el carrusel ni el área de scroll de Quasar', () => {
    expect(FUENTE).not.toContain('q-carousel');
    expect(FUENTE).not.toContain('q-scroll-area');
    expect(FUENTE).not.toContain('q-card');
    expect(FUENTE).not.toContain('q-btn');
  });

  /** El riel de la descripción es dorado y de 6 px, el suyo propio. */
  it('la descripción trae su propio riel dorado de 6 px', () => {
    expect(ESTILOS).toContain('scrollbar-color: var(--m-oro)');
    expect(ESTILOS).toContain('::-webkit-scrollbar');
    expect(ESTILOS).toContain('width: 6px');
  });

  /** Nadie puede quedarse sin ver dónde está el foco. */
  it('todo control enfocable dibuja su foco con el oro', () => {
    const focos = ESTILOS.match(/:focus-visible/g) ?? [];

    expect(focos.length).toBeGreaterThanOrEqual(4);
    expect(ESTILOS).toContain('outline: 2px solid var(--m-oro)');
  });
});

/**
 * Plan 9, V1 (tablero DetalleMovil): en pantalla completa la foto y la lectura
 * desplazan juntas dentro de una caja, el pie se queda abajo y, cuando la foto
 * se va por arriba, aparece una cabecera fija con el nombre. jsdom no maqueta:
 * el alto de la foto y la posición de la caja se fijan a mano.
 */
describe('ficha del servicio · móvil: una caja que desplaza y la cabecera fija', () => {
  const desplazar = async (
    wrapper: ReturnType<typeof montar>['wrapper'],
    { altoFoto, arriba }: { altoFoto: number; arriba: number }
  ) => {
    Object.defineProperty(
      wrapper.get('[data-test="galeria"]').element,
      'offsetHeight',
      { configurable: true, value: altoFoto }
    );
    const caja = wrapper.get('[data-test="desplazable"]');
    Object.defineProperty(caja.element, 'scrollTop', {
      configurable: true,
      value: arriba,
    });
    await caja.trigger('scroll');
  };

  it('la foto y la lectura van en la misma caja; el pie, fuera', () => {
    anchoVentana = 390;
    const { wrapper } = montar();
    const caja = wrapper.get('[data-test="desplazable"]');

    expect(caja.find('[data-test="galeria"]').exists()).toBe(true);
    expect(caja.find('[data-test="descripcion"]').exists()).toBe(true);
    expect(caja.find('[data-test="pie-acciones"]').exists()).toBe(false);
  });

  it('mientras queda foto a la vista no hay cabecera fija', async () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 340, arriba: 100 });

    expect(wrapper.find('[data-test="barra-fija"]').exists()).toBe(false);
  });

  it('cuando la foto se va por arriba aparece la cabecera con el nombre', async () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 340, arriba: 280 });

    const barra = wrapper.get('[data-test="barra-fija"]');
    expect(barra.text()).toBe('Fade bajo clásico');
    // El nombre de verdad es el `<h2>`: la cabecera no se oye dos veces.
    expect(barra.attributes('aria-hidden')).toBe('true');
  });

  it('al volver arriba la cabecera se va', async () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 340, arriba: 300 });
    await desplazar(wrapper, { altoFoto: 340, arriba: 0 });

    expect(wrapper.find('[data-test="barra-fija"]').exists()).toBe(false);
  });

  it('con la cabecera puesta sigue habiendo una sola X, y cierra con «cancel»', async () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 340, arriba: 300 });
    const equis = wrapper.findAll('[data-test="cerrar"]');

    expect(equis).toHaveLength(1);
    expect(equis[0].classes()).toContain('ficha__cerrar--en-barra');

    await equis[0].trigger('click');
    expect(wrapper.emitted('ok')?.[0]).toEqual(['cancel']);
  });

  /** Foco de revisión 1: sin foto medida el umbral sería 0 − 60. */
  it('sin la foto medida no se enciende, aunque llegue un scroll', async () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 0, arriba: 300 });

    expect(wrapper.find('[data-test="barra-fija"]').exists()).toBe(false);
  });

  /** Foco de revisión 1: en escritorio la caja no desplaza; un scroll suelto no cuenta. */
  it('en escritorio no hay cabecera fija aunque llegue un scroll', async () => {
    const { wrapper } = montar();

    await desplazar(wrapper, { altoFoto: 640, arriba: 600 });

    expect(wrapper.find('[data-test="barra-fija"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="cerrar"]').classes()).not.toContain(
      'ficha__cerrar--en-barra'
    );
  });

  it('el teclado desplaza la caja en móvil, y la descripción en escritorio', () => {
    anchoVentana = 390;
    const movil = montar().wrapper;

    expect(movil.get('[data-test="desplazable"]').attributes('tabindex')).toBe(
      '0'
    );
    expect(
      movil.get('[data-test="descripcion"]').attributes('tabindex')
    ).toBeUndefined();

    anchoVentana = 1280;
    const escritorio = montar().wrapper;

    expect(
      escritorio.get('[data-test="desplazable"]').attributes('tabindex')
    ).toBeUndefined();
    expect(
      escritorio.get('[data-test="descripcion"]').attributes('tabindex')
    ).toBe('0');
  });

  /** Corrige el tablero 2: la ficha es persistente; «Cerrar» no se quita. */
  it('con la bolsa vacía el pie sigue ofreciendo «Cerrar»', () => {
    anchoVentana = 390;
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="resumen-bolsa"]').text()).toBe(
      'Tu reserva está vacía.'
    );
    expect(wrapper.find('[data-test="cerrar-pie"]').exists()).toBe(true);
  });
});

describe('ficha del servicio · el contrato visual de móvil', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/dialogs/serviceDialog.vue'),
    'utf8'
  );
  const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

  it('en escritorio la caja no pinta nada: sus hijas siguen en la rejilla', () => {
    expect(ESTILOS).toMatch(/\.ficha__desplazable \{\s*display: contents;/);
  });

  it('en pantalla completa la caja es lo único que desplaza', () => {
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[^}]*display: flex;[^}]*flex-direction: column;/
    );
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__desplazable \{[^}]*overflow-y: auto;/
    );
  });

  /** Corrige el tablero 1: nada de un scroll dentro de otro en un teléfono. */
  it('en pantalla completa la descripción no tiene scroll propio', () => {
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__descripcion \{[^}]*overflow: visible;/
    );
  });

  /** Foco de revisión 5: un nombre largo no empuja la X. */
  it('la cabecera fija mide 60 px, deja sitio a la X y corta un nombre largo', () => {
    expect(ESTILOS).toMatch(
      /\.ficha__barra \{[^}]*position: absolute;[^}]*height: 60px;[^}]*padding: 0 60px 0 var\(--m-banda-margen-movil\);/
    );
    expect(ESTILOS).toMatch(
      /\.ficha__barra-nombre \{[^}]*overflow: hidden;[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/
    );
  });

  it('las miniaturas bajan a la esquina inferior y miden 52 px', () => {
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__miniaturas \{\s*top: auto;\s*bottom: 14px;/
    );
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__miniatura \{\s*width: 52px;\s*height: 52px;/
    );
  });

  it('nombre a 27 px y precio a 24 px, como el tablero', () => {
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__nombre \{\s*font-size: 27px;/
    );
    expect(ESTILOS).toMatch(
      /\.ficha--amplia \{[\s\S]*?\.ficha__precio \{\s*font-size: 24px;/
    );
  });
});

/**
 * Plan 9: lo que `DetalleDialogo` (escritorio) y `DetalleMovil` dibujan igual y
 * la fase D dejó distinto. Vale en los dos tamaños.
 */
describe('ficha del servicio · el aspecto de los dos tableros', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/dialogs/serviceDialog.vue'),
    'utf8'
  );
  const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));
  const regla = (selector: string) => {
    const desde = ESTILOS.indexOf(`${selector} {`);
    return ESTILOS.slice(desde, ESTILOS.indexOf('}', desde));
  };

  it('las etiquetas son píldoras de 30 px en versalitas piedra clara', () => {
    expect(ESTILOS).toMatch(
      /\.ficha__tag \{[^}]*height: 30px;[^}]*text-transform: uppercase;[^}]*letter-spacing: var\(--m-tracking-nav\);[^}]*color: var\(--m-piedra-clara\);/
    );
  });

  it('la descripción se lee en hueso, 14 px con interlineado de 1,75', () => {
    expect(ESTILOS).toMatch(
      /\.ficha__texto \{[^}]*font-size: 14px;[^}]*line-height: 1\.75;[^}]*color: var\(--m-hueso\);/
    );
  });

  it('la línea de la bolsa va en versalitas', () => {
    expect(ESTILOS).toMatch(
      /\.ficha__resumen \{[^}]*text-transform: uppercase;[^}]*letter-spacing: var\(--m-tracking-nav\);/
    );
  });

  it('la duración va pegada al precio, no empujada al borde', () => {
    expect(regla('.ficha__duracion')).not.toContain('margin-left: auto');
  });
});
