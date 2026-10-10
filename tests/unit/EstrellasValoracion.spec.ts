/**
 * Las estrellas de la nota y de cada tarjeta. Se leen como una sola imagen
 * («4,5 de 5 estrellas»), no como cinco dibujos sueltos.
 */
import { mount } from '@vue/test-utils';
import EstrellasValoracion from 'src/components/testimonios/EstrellasValoracion.vue';

const cuenta = (valor: number) => {
  const wrapper = mount(EstrellasValoracion, { props: { valor } });
  return {
    llenas: wrapper.findAll('[data-test="estrella-llena"]').length,
    medias: wrapper.findAll('[data-test="estrella-media"]').length,
    vacias: wrapper.findAll('[data-test="estrella-vacia"]').length,
    etiqueta: wrapper.get('[data-test="estrellas"]').attributes('aria-label'),
    rol: wrapper.get('[data-test="estrellas"]').attributes('role'),
  };
};

describe('EstrellasValoracion', () => {
  it('cinco de cinco', () => {
    expect(cuenta(5)).toEqual({
      llenas: 5,
      medias: 0,
      vacias: 0,
      etiqueta: '5 de 5 estrellas',
      rol: 'img',
    });
  });

  it('4,5 pinta media estrella y lo dice con coma', () => {
    expect(cuenta(4.5)).toMatchObject({
      llenas: 4,
      medias: 1,
      vacias: 0,
      etiqueta: '4,5 de 5 estrellas',
    });
  });

  it('redondea al medio más cercano', () => {
    expect(cuenta(4.3)).toMatchObject({ llenas: 4, medias: 1, vacias: 0 });
    expect(cuenta(4.2)).toMatchObject({ llenas: 4, medias: 0, vacias: 1 });
  });

  it('fuera de rango o sin número no revienta', () => {
    expect(cuenta(9)).toMatchObject({ llenas: 5 });
    expect(cuenta(Number.NaN)).toMatchObject({ llenas: 0, vacias: 5 });
  });

  it('cada dibujo está oculto al lector: habla la etiqueta del conjunto', () => {
    const wrapper = mount(EstrellasValoracion, { props: { valor: 3 } });

    for (const svg of wrapper.findAll('svg')) {
      expect(svg.attributes('aria-hidden')).toBe('true');
    }
  });
});
