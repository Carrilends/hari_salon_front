/**
 * B2: hecho ✓ oro, actual subrayado oro, pendiente en piedra clara. El estado
 * no va solo por color: hecho lleva su ✓ y lo dice al lector; el actual,
 * `aria-current="step"`.
 */
import { mount } from '@vue/test-utils';
import IndicadorPasos from 'src/components/reserva/IndicadorPasos.vue';

describe('IndicadorPasos', () => {
  it('nombra los tres pasos en orden', () => {
    const pasos = mount(IndicadorPasos, { props: { actual: 1 } }).findAll('li');

    expect(pasos.map((p) => p.text().replace(/\s+/g, ' ').trim())).toEqual([
      '1 Servicios',
      '2 Cuándo',
      '3 Tus datos',
    ]);
  });

  it('en el paso 2: uno hecho, el actual y uno pendiente', () => {
    const wrapper = mount(IndicadorPasos, { props: { actual: 2 } });

    expect(wrapper.findAll('[data-test="paso-hecho"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="paso-actual"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-test="paso-pendiente"]')).toHaveLength(1);
    expect(
      wrapper.get('[data-test="paso-actual"]').attributes('aria-current')
    ).toBe('step');
  });

  it('el hecho lleva su marca y lo dice, sin número', () => {
    const hecho = mount(IndicadorPasos, { props: { actual: 3 } }).findAll(
      '[data-test="paso-hecho"]'
    )[0];

    expect(hecho.find('svg').exists()).toBe(true);
    expect(hecho.text()).toContain('(hecho)');
    expect(hecho.text()).not.toContain('1');
  });

  it('solo el actual lleva aria-current', () => {
    const wrapper = mount(IndicadorPasos, { props: { actual: 3 } });

    expect(wrapper.findAll('[aria-current]')).toHaveLength(1);
  });
});
