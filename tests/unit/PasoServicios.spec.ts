/**
 * Paso 1, «Tus servicios» (tablero ReservaCajonPasos, móvil 1) y la bolsa
 * vacía (ReservaCajonEstados). B10: la cantidad de cada línea se conserva y
 * se dice («× 2»), pero sin los botones +/− de antes.
 */
import { mount } from '@vue/test-utils';
import PasoServicios from 'src/components/reserva/PasoServicios.vue';
import type { BookingLine } from 'src/interfaces/booking';
import { servicio } from './fixtures/servicios';

const LINEAS: BookingLine[] = [
  { service: servicio(), quantity: 1 },
  {
    service: servicio({
      id: 's2',
      name: 'Uñas de gel',
      type: 'nails',
      price: 48000,
      duration: 30,
    }),
    quantity: 2,
  },
];

const montar = (lineas: BookingLine[] = LINEAS) =>
  mount(PasoServicios, { props: { lineas } });

describe('PasoServicios', () => {
  it('cuenta los servicios de la bolsa', () => {
    expect(montar().text()).toContain('En tu bolsa · 3 servicios');
  });

  it('cada línea: categoría, nombre, precio y duración', () => {
    const [bob, unas] = montar().findAll('[data-test="linea-bolsa"]');

    expect(bob.text()).toContain('Cortes de dama');
    expect(bob.text()).toContain('Bob clásico');
    expect(bob.text()).toContain('$ 45.000');
    expect(bob.text()).toContain('1 h');
    expect(unas.text()).toContain('Uñas');
    expect(unas.text()).toContain('$ 96.000');
  });

  it('una línea repetida dice su cantidad, sin botones para cambiarla', () => {
    const wrapper = montar();
    const lineas = wrapper.findAll('[data-test="linea-bolsa"]');

    expect(lineas[0].find('[data-test="cantidad-linea"]').exists()).toBe(false);
    expect(lineas[1].get('[data-test="cantidad-linea"]').text()).toBe('× 2');
    expect(lineas[1].findAll('button')).toHaveLength(1);
  });

  it('quitar se nombra con el servicio y emite su id', async () => {
    const wrapper = montar();
    const quitar = wrapper.findAll('[data-test="quitar-servicio"]')[1];

    expect(quitar.attributes('aria-label')).toBe('Quitar Uñas de gel');
    await quitar.trigger('click');
    expect(wrapper.emitted('quitar')?.[0]).toEqual(['s2']);
  });

  it('«Añadir más servicios» lleva a servicios', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-servicios"]').trigger('click');

    expect(wrapper.emitted('ver-servicios')).toHaveLength(1);
  });

  it('las fotos son decorativas: el nombre ya va al lado', () => {
    expect(montar().get('img').attributes('alt')).toBe('');
  });

  it('con la bolsa vacía lo dice y ofrece servicios o el asistente', async () => {
    const wrapper = montar([]);

    expect(wrapper.get('[data-test="bolsa-vacia"]').text()).toContain(
      'Tu bolsa está vacía'
    );
    expect(wrapper.find('[data-test="linea-bolsa"]').exists()).toBe(false);
    await wrapper.get('[data-test="ver-servicios"]').trigger('click');
    await wrapper.get('[data-test="abrir-asistente"]').trigger('click');
    expect(wrapper.emitted('ver-servicios')).toHaveLength(1);
    expect(wrapper.emitted('abrir-asistente')).toHaveLength(1);
  });
});
