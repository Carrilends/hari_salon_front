/**
 * Paso 1, «Tus servicios» (tablero ReservaCajonPasos, móvil 1) y la bolsa
 * vacía (ReservaCajonEstados). Cada servicio está una sola vez: el servidor
 * no admite repetidos en una cita (hallazgo de la F4).
 */
import { mount } from '@vue/test-utils';
import PasoServicios from 'src/components/reserva/PasoServicios.vue';
import type { BookingLine } from 'src/interfaces/booking';
import { servicio } from './fixtures/servicios';

const LINEAS: BookingLine[] = [
  { service: servicio() },
  {
    service: servicio({
      id: 's2',
      name: 'Uñas de gel',
      type: 'nails',
      price: 48000,
      duration: 30,
    }),
  },
];

const montar = (lineas: BookingLine[] = LINEAS) =>
  mount(PasoServicios, { props: { lineas } });

describe('PasoServicios', () => {
  it('cuenta los servicios de la bolsa', () => {
    expect(montar().text()).toContain('En tu bolsa · 2 servicios');
  });

  it('cada línea: categoría, nombre, precio y duración', () => {
    const [bob, unas] = montar().findAll('[data-test="linea-bolsa"]');

    expect(bob.text()).toContain('Cortes de dama');
    expect(bob.text()).toContain('Bob clásico');
    expect(bob.text()).toContain('$ 45.000');
    expect(bob.text()).toContain('1 h');
    expect(unas.text()).toContain('Uñas');
    expect(unas.text()).toContain('$ 48.000');
  });

  it('ninguna línea dice cantidad: cada servicio está una vez', () => {
    const wrapper = montar();

    expect(wrapper.find('[data-test="cantidad-linea"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('×');
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
