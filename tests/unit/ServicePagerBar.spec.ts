/**
 * El pie del mostrador: cuántos servicios se ven de cuántos hay, y el
 * paginador.
 *
 * Está escrito a mano a propósito (D8): `q-pagination` pinta sus números con
 * `<div>` con `role`, y restilarlo obligaba a pelear con `:deep()` contra sus
 * tripas. Lo que se vigila aquí son los bordes: una sola página, y una página
 * que ya no existe porque la dueña borró servicios mientras se miraba.
 */
import { mount } from '@vue/test-utils';

import ServicePagerBar from 'src/components/servicePage/ServicePagerBar.vue';

const montar = (props: {
  pagina: number;
  totalPaginas: number;
  mostrados?: number;
  total?: number;
}) =>
  mount(ServicePagerBar, {
    props: { mostrados: 10, total: 48, ...props },
  });

const numeros = (wrapper: ReturnType<typeof montar>) =>
  wrapper.findAll('[data-test="pagina"]').map((boton) => boton.text());

describe('ServicePagerBar', () => {
  it('resume cuántos servicios se ven y cuántos hay', () => {
    const wrapper = montar({ pagina: 2, totalPaginas: 5, mostrados: 12 });

    expect(wrapper.find('[data-test="pie"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="resumen"]').text()).toBe(
      '12 de 48 servicios'
    );
  });

  it('un solo servicio se dice en singular', () => {
    const wrapper = montar({
      pagina: 1,
      totalPaginas: 1,
      mostrados: 1,
      total: 1,
    });

    expect(wrapper.get('[data-test="resumen"]').text()).toBe('1 de 1 servicio');
  });

  /** Review Focus 1: catálogo vacío o de una sola página. */
  it('con una sola página no pinta paginación', () => {
    expect(
      montar({ pagina: 1, totalPaginas: 1 })
        .find('[data-test="paginacion"]')
        .exists()
    ).toBe(false);
    expect(
      montar({ pagina: 1, totalPaginas: 0 })
        .find('[data-test="paginacion"]')
        .exists()
    ).toBe(false);
  });

  it('pinta la ventana de cinco con elipsis y los enlaces a la primera y la última', () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });

    expect(numeros(wrapper)).toEqual(['1', '4', '5', '6', '7', '8', '12']);
    expect(wrapper.findAll('[data-test="elipsis"]')).toHaveLength(2);
  });

  it('en la primera página no hay elipsis a la izquierda', () => {
    const wrapper = montar({ pagina: 1, totalPaginas: 12 });

    expect(numeros(wrapper)).toEqual(['1', '2', '3', '4', '5', '12']);
    expect(wrapper.findAll('[data-test="elipsis"]')).toHaveLength(1);
  });

  it('en la última la ventana se pega al final y «Siguiente» se apaga', () => {
    const wrapper = montar({ pagina: 12, totalPaginas: 12 });

    expect(numeros(wrapper)).toEqual(['1', '8', '9', '10', '11', '12']);
    expect(
      wrapper.get('[data-test="siguiente"]').attributes('disabled')
    ).toBeDefined();
  });

  it('con pocas páginas las pinta todas, sin elipsis', () => {
    const wrapper = montar({ pagina: 2, totalPaginas: 4 });

    expect(numeros(wrapper)).toEqual(['1', '2', '3', '4']);
    expect(wrapper.findAll('[data-test="elipsis"]')).toHaveLength(0);
  });

  it('los números son botones de verdad, no divs con cursor', () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });

    for (const boton of wrapper.findAll('[data-test="pagina"]')) {
      expect(boton.element.tagName).toBe('BUTTON');
      expect(boton.attributes('type')).toBe('button');
      expect(boton.attributes('aria-label')).toMatch(/^Ir a la página \d+$/);
    }
    expect(wrapper.get('[data-test="paginacion"]').element.tagName).toBe('NAV');
    expect(wrapper.get('[data-test="siguiente"]').element.tagName).toBe(
      'BUTTON'
    );
  });

  it('marca la página en la que se está, y solo esa', () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });
    const marcadas = wrapper
      .findAll('[data-test="pagina"]')
      .filter((boton) => boton.attributes('aria-current') === 'page');

    expect(marcadas).toHaveLength(1);
    expect(marcadas[0].text()).toBe('6');
  });

  it('pulsar un número pide esa página', async () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });

    await wrapper.findAll('[data-test="pagina"]')[5].trigger('click');

    expect(wrapper.emitted('update:pagina')).toEqual([[8]]);
  });

  it('«Siguiente» pide la de después', async () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });

    await wrapper.get('[data-test="siguiente"]').trigger('click');

    expect(wrapper.emitted('update:pagina')).toEqual([[7]]);
  });

  it('pulsar la página en la que ya estás no pide nada', async () => {
    const wrapper = montar({ pagina: 6, totalPaginas: 12 });
    const activa = wrapper
      .findAll('[data-test="pagina"]')
      .find((boton) => boton.text() === '6');

    await activa?.trigger('click');

    expect(wrapper.emitted('update:pagina')).toBeUndefined();
  });

  /** Review Focus 2: la dueña borra servicios y la página 9 deja de existir. */
  it('una página que ya no existe no pinta números que no existen', async () => {
    const wrapper = montar({ pagina: 9, totalPaginas: 5 });

    expect(numeros(wrapper)).toEqual(['1', '2', '3', '4', '5']);
    expect(wrapper.findAll('[data-test="elipsis"]')).toHaveLength(0);
    expect(
      wrapper.get('[data-test="siguiente"]').attributes('disabled')
    ).toBeDefined();

    const ultima = wrapper
      .findAll('[data-test="pagina"]')
      .find((boton) => boton.text() === '5');
    await ultima?.trigger('click');

    expect(wrapper.emitted('update:pagina')).toEqual([[5]]);
  });
});
