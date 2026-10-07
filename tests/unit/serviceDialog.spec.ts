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
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
// `nextTick` y `foto` los consumen las tareas 2–6 de la fase D.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { defineComponent, nextTick } from 'vue';
import ServiceDialog from 'src/components/dialogs/serviceDialog.vue';
import { useBookStore } from 'src/stores/book-store';
import type Service from 'src/interfaces/service';
import type { Image } from 'src/interfaces/service';

/** Ancho de ventana que ve `useDialogMaximizedBelow`. jsdom no trae matchMedia. */
let anchoVentana = 1280;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  }) as Service;

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
  cerrado.veces = 0;
  window.matchMedia = ((consulta: string) => {
    const tope = Number(consulta.match(/max-width:\s*(\d+)px/)?.[1] ?? 0);
    return {
      matches: anchoVentana <= tope,
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  }) as unknown as typeof window.matchMedia;
});

describe('ficha del servicio · lo que se lee', () => {
  it('pinta el nombre, la categoría, la duración y la descripción del servicio', () => {
    const { wrapper } = montar();

    expect(wrapper.get('[data-test="nombre"]').text()).toBe('Fade bajo clásico');
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
