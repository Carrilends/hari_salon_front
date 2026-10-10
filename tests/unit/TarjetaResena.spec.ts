/**
 * Una tarjeta del muro de Testimonios: inicial en círculo tinta, nombre, fecha,
 * estrellas en oro profundo y el texto entero (en el muro no se recorta: leer
 * la reseña completa es a lo que se viene).
 */
import { mount } from '@vue/test-utils';
import TarjetaResena from 'src/components/testimonios/TarjetaResena.vue';
import type { ReviewItem } from 'src/api/apiTypes';

const resena = (cambios: Partial<ReviewItem> = {}): ReviewItem => ({
  id: 'r1',
  name: 'Adriana Banegas',
  description: 'El cepillado me quedó muy bonito, buena atención',
  score: 4,
  createdAt: '2026-05-18T15:00:00.000Z',
  ...cambios,
});

describe('TarjetaResena', () => {
  it('pinta la inicial, el nombre, la fecha y el texto', () => {
    const wrapper = mount(TarjetaResena, { props: { resena: resena() } });

    expect(wrapper.get('[data-test="inicial"]').text()).toBe('A');
    expect(wrapper.get('[data-test="nombre"]').text()).toBe('Adriana Banegas');
    expect(wrapper.get('[data-test="fecha"]').text()).toBe('18 may 2026');
    expect(wrapper.get('[data-test="fecha"]').attributes('datetime')).toBe(
      '2026-05-18T15:00:00.000Z'
    );
    expect(wrapper.get('[data-test="texto"]').text()).toBe(
      'El cepillado me quedó muy bonito, buena atención'
    );
  });

  it('las estrellas dicen la nota', () => {
    const wrapper = mount(TarjetaResena, { props: { resena: resena() } });

    expect(
      wrapper.get('[data-test="estrellas"]').attributes('aria-label')
    ).toBe('4 de 5 estrellas');
  });

  it('la inicial es decorativa: el nombre ya está escrito al lado', () => {
    const wrapper = mount(TarjetaResena, { props: { resena: resena() } });

    expect(wrapper.get('[data-test="inicial"]').attributes('aria-hidden')).toBe(
      'true'
    );
  });

  /**
   * Foco de revisión 2: el backend admite 1 000 caracteres y 120 de nombre.
   * jsdom no mide desbordes: aquí solo se fija que nada se recorta en JS; el
   * `overflow-wrap` lo afirma la prueba de la fuente y el recorrido en navegador.
   */
  it('no recorta el texto en JS', () => {
    const largo = 'muy bien '.repeat(110).trim();
    const nombre = 'a'.repeat(120);
    const wrapper = mount(TarjetaResena, {
      props: { resena: resena({ description: largo, name: nombre }) },
    });

    expect(wrapper.get('[data-test="texto"]').text()).toBe(largo);
    expect(wrapper.get('[data-test="nombre"]').text()).toBe(nombre);
  });
});
