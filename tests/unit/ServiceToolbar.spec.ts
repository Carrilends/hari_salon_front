/**
 * La cabecera de contenido del mostrador: el conteo del catálogo, el único
 * `<h1>` de la página, el buscador y los botones de filtros y de crear.
 *
 * Lo que de verdad se vigila aquí es el buscador. Pide al backend, así que una
 * tecla no puede valer una petición: el `q-input` traía `debounce="1000"` y ese
 * segundo de espera se pierde en silencio si nadie lo prueba. Y por debajo de
 * 550 px el campo no cabe: se convierte en un botón que abre un overlay a
 * ancho completo, y si ese overlay se queda abierto al girar el teléfono, la
 * página de escritorio se queda sin título.
 */
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import ServiceToolbar from 'src/components/servicePage/ServiceToolbar.vue';
import { useOptionsStore } from 'src/stores/options-store';
import type { Tag } from 'src/interfaces/tag';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROPS_BASE = {
  total: 48,
  mostrados: 10,
  busqueda: '',
  filtrosActivos: 0,
  esAdmin: false,
};

const categorias = (cuantas: number): Tag[] =>
  Array.from({ length: cuantas }, (_, i) => ({
    id: `t${i}`,
    name: `Categoría ${i}`,
    selected: false,
  }));

const fijarAncho = (px: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: px,
  });
};

const montar = (
  props: Partial<
    Omit<typeof PROPS_BASE, 'total'> & { total: number | null; conCarril: boolean }
  > = {},
  { ancho = 1280, cuantasCategorias = 6 } = {}
) => {
  fijarAncho(ancho);
  const pinia = createPinia();
  useOptionsStore(pinia).setPrincipalServices(categorias(cuantasCategorias));
  return mount(ServiceToolbar, {
    attachTo: document.body,
    props: { ...PROPS_BASE, ...props },
    global: { plugins: [pinia] },
  });
};

const escribir = async (wrapper: ReturnType<typeof montar>, texto: string) => {
  const campo = wrapper.get('[data-test="buscador"]');
  (campo.element as HTMLInputElement).value = texto;
  await campo.trigger('input');
};

beforeEach(() => {
  jest.useFakeTimers();
});

/**
 * Los montajes van con `attachTo` para poder preguntar por el foco, así que se
 * barre el cuerpo entre casos: si no, dos barras montadas comparten el `id` del
 * campo y `label[for=…]` deja de ser una sola cosa.
 */
afterEach(() => {
  jest.useRealTimers();
  document.body.innerHTML = '';
});

describe('ServiceToolbar', () => {
  it('cuenta el catálogo en versalitas y titula la página', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="conteo"]').text()).toBe(
      '48 servicios · 6 categorías'
    );
    expect(wrapper.get('h1').text()).toBe('Servicios');
    expect(wrapper.find('[data-test="toolbar"]').exists()).toBe(true);
  });

  /** Review Focus 5: el primer render llega antes de que `/filters` conteste. */
  it('sin categorías cargadas no dice «0 categorías»', () => {
    const wrapper = montar({}, { cuantasCategorias: 0 });

    expect(wrapper.get('[data-test="conteo"]').text()).toBe('48 servicios');
  });

  /**
   * `/services` se prerenderiza antes de que la lista conteste: un total
   * desconocido (`null`) no se dice, ni siquiera como cero.
   */
  it('con el total desconocido no dice «0 servicios» ni ninguna cifra', () => {
    const wrapper = montar({ total: null });

    expect(wrapper.get('[data-test="conteo"]').text()).not.toMatch(/\d/);
    expect(wrapper.text()).not.toContain('0 servicios');
  });

  it('un solo servicio y una sola categoría se dicen en singular', () => {
    const wrapper = montar({ total: 1 }, { cuantasCategorias: 1 });

    expect(wrapper.get('[data-test="conteo"]').text()).toBe(
      '1 servicio · 1 categoría'
    );
  });

  it('el buscador tiene etiqueta de verdad, aunque no se vea', () => {
    const wrapper = montar();
    const campo = wrapper.get('[data-test="buscador"]');
    const etiqueta = wrapper.get(`label[for="${campo.attributes('id')}"]`);

    expect(campo.element.tagName).toBe('INPUT');
    expect(campo.attributes('placeholder')).toBe('Buscar servicio');
    expect(etiqueta.classes()).toContain('sr');
    expect(etiqueta.text()).toBe('Buscar servicio');
  });

  it('espera un segundo antes de avisar de lo que se busca', async () => {
    const wrapper = montar();

    await escribir(wrapper, 'corte');
    jest.advanceTimersByTime(999);
    expect(wrapper.emitted('update:busqueda')).toBeUndefined();

    jest.advanceTimersByTime(1);
    expect(wrapper.emitted('update:busqueda')).toEqual([['corte']]);
  });

  it('seguir escribiendo reinicia la espera: una petición, no cinco', async () => {
    const wrapper = montar();

    await escribir(wrapper, 'cor');
    jest.advanceTimersByTime(800);
    await escribir(wrapper, 'corte');
    jest.advanceTimersByTime(800);
    expect(wrapper.emitted('update:busqueda')).toBeUndefined();

    jest.advanceTimersByTime(200);
    expect(wrapper.emitted('update:busqueda')).toEqual([['corte']]);
  });

  /** Review Focus 3: limpiar filtros o llegar con el atajo del inicio. */
  it('un valor cambiado desde fuera entra en el campo y no rebota', async () => {
    const wrapper = montar();

    await wrapper.setProps({ busqueda: 'tinte' });

    expect(
      (wrapper.get('[data-test="buscador"]').element as HTMLInputElement).value
    ).toBe('tinte');
    jest.advanceTimersByTime(2000);
    expect(wrapper.emitted('update:busqueda')).toBeUndefined();
  });

  /** Review Focus (fuga): nadie emite después de desmontarse. */
  it('al desmontarse con una tecla pendiente no avisa de nada', async () => {
    const wrapper = montar();

    await escribir(wrapper, 'uñas');
    wrapper.unmount();
    jest.advanceTimersByTime(2000);

    expect(wrapper.emitted('update:busqueda')).toBeUndefined();
  });

  it('por debajo de 550 px el buscador es un botón que abre el overlay', async () => {
    const wrapper = montar({}, { ancho: 400 });

    expect(wrapper.find('[data-test="buscador"]').exists()).toBe(false);
    const boton = wrapper.get('[data-test="buscador-compacto"]');
    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('aria-label')).toBe('Buscar servicio');

    await boton.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-test="buscador-overlay"]').exists()).toBe(true);
    expect(document.activeElement).toBe(
      wrapper.get('[data-test="buscador"]').element
    );
  });

  it('al cerrar el overlay vuelve el encabezado', async () => {
    const wrapper = montar({}, { ancho: 400 });

    await wrapper.get('[data-test="buscador-compacto"]').trigger('click');
    await wrapper.get('[data-test="cerrar-buscador"]').trigger('click');

    expect(wrapper.find('[data-test="buscador-overlay"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="buscador-compacto"]').exists()).toBe(true);
    expect(wrapper.get('h1').text()).toBe('Servicios');
  });

  /** Review Focus 4: girar el teléfono con el overlay abierto. */
  it('al ensancharse la ventana el overlay se va y vuelve el título', async () => {
    const wrapper = montar({}, { ancho: 400 });
    await wrapper.get('[data-test="buscador-compacto"]').trigger('click');

    fijarAncho(900);
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(wrapper.find('[data-test="buscador-overlay"]').exists()).toBe(false);
    expect(wrapper.get('h1').text()).toBe('Servicios');
  });

  it('«Crear servicio» solo existe con sesión de dueña', () => {
    expect(
      montar({ esAdmin: false }).find('[data-test="crear-servicio"]').exists()
    ).toBe(false);

    const conSesion = montar({ esAdmin: true });
    const boton = conSesion.get('[data-test="crear-servicio"]');
    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('aria-label')).toBe('Crear servicio');
    expect(boton.text()).toContain('Crear servicio');
  });

  it('por debajo de 1100 px los botones pierden la etiqueta pero no el nombre', () => {
    const ancho = montar({ esAdmin: true }, { ancho: 1100 });
    expect(ancho.get('[data-test="boton-filtros"]').text()).toContain(
      'Filtros'
    );

    const estrecho = montar({ esAdmin: true }, { ancho: 1099 });
    expect(estrecho.get('[data-test="boton-filtros"]').text()).toBe('');
    expect(
      estrecho.get('[data-test="boton-filtros"]').attributes('aria-label')
    ).toBe('Filtros');
    expect(estrecho.get('[data-test="crear-servicio"]').text()).toBe('');
  });

  it('el contador de filtros aparece solo cuando hay filtros, y se corta en 9+', () => {
    expect(montar().find('[data-test="contador-filtros"]').exists()).toBe(
      false
    );

    const tres = montar({ filtrosActivos: 3 });
    expect(tres.get('[data-test="contador-filtros"]').text()).toBe('3');
    expect(
      tres.get('[data-test="boton-filtros"]').attributes('aria-label')
    ).toBe('Filtros (3 activos)');

    expect(
      montar({ filtrosActivos: 12 })
        .get('[data-test="contador-filtros"]')
        .text()
    ).toBe('9+');
  });

  /**
   * Desde 1024 px los filtros son el carril (D1): un botón que abre una hoja que
   * a ese ancho no existe sería un botón muerto. Sin la prop, la barra es la de
   * siempre.
   */
  it('con carril no hay botón de filtros ni su contador', () => {
    const conCarril = montar({ conCarril: true, filtrosActivos: 3 });

    expect(conCarril.find('[data-test="boton-filtros"]').exists()).toBe(false);
    expect(conCarril.find('[data-test="contador-filtros"]').exists()).toBe(
      false
    );

    const sinCarril = montar({ filtrosActivos: 3 });
    expect(sinCarril.find('[data-test="boton-filtros"]').exists()).toBe(true);
    expect(sinCarril.get('[data-test="contador-filtros"]').text()).toBe('3');
  });

  it('pedir filtros y pedir crear llegan al padre', async () => {
    const wrapper = montar({ esAdmin: true });

    await wrapper.get('[data-test="boton-filtros"]').trigger('click');
    await wrapper.get('[data-test="crear-servicio"]').trigger('click');

    expect(wrapper.emitted('abrir-filtros')).toHaveLength(1);
    expect(wrapper.emitted('crear-servicio')).toHaveLength(1);
  });

  it('con el cambio de encabezado a overlay sin atajos, el campo recibe el foco', async () => {
    fijarAncho(400);
    const pinia = createPinia();
    const wrapper = mount(ServiceToolbar, {
      attachTo: document.body,
      props: PROPS_BASE,
      global: { plugins: [pinia], stubs: { transition: false } },
    });

    await wrapper.get('[data-test="buscador-compacto"]').trigger('click');
    jest.advanceTimersByTime(500);
    await nextTick();

    expect(document.activeElement).toBe(
      wrapper.get('[data-test="buscador"]').element
    );
  });

  it('Enter en el overlay entrega lo escrito ya y lo cierra', async () => {
    const wrapper = montar({}, { ancho: 400 });
    await wrapper.get('[data-test="buscador-compacto"]').trigger('click');

    await escribir(wrapper, 'tinte');
    await wrapper.get('[data-test="buscador"]').trigger('keyup.enter');

    expect(wrapper.emitted('update:busqueda')).toEqual([['tinte']]);
    expect(wrapper.find('[data-test="buscador-overlay"]').exists()).toBe(false);
    jest.advanceTimersByTime(2000);
    expect(wrapper.emitted('update:busqueda')).toHaveLength(1);
  });
});

/**
 * Plan 9, V3 · foco de revisión 4: por debajo de 700 px la dueña crea desde la
 * barra fija de abajo; un segundo «Crear servicio» en la cabecera de la lista
 * sobraría. Se esconde con el mismo corte en el que aparece la barra.
 */
describe('ServiceToolbar · crear en móvil', () => {
  it('por debajo de 700 px esconde su botón de crear', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/servicePage/ServiceToolbar.vue'),
      'utf8'
    );
    const plantilla = fuente.split('<script')[0];
    const desde = plantilla.indexOf('data-test="crear-servicio"');
    const apertura = plantilla.lastIndexOf('<button', desde);

    expect(plantilla.slice(apertura, desde)).toContain('barra__crear');
    expect(fuente).toMatch(
      /@media \(max-width: 699px\) \{[\s\S]*?\.barra__crear \{\s*display: none;/
    );
  });
});
