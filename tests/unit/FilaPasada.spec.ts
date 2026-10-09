/**
 * Una pasada en fila fina (M1) y, si fue cumplida, «Deja tu reseña» (M6).
 */
import { mount } from '@vue/test-utils';
import FilaPasada from 'src/components/reservations/FilaPasada.vue';
import type { ReservationDto } from 'src/interfaces/booking';

const RESERVA: ReservationDto = {
  id: 'r3',
  scheduledAt: '2026-09-18T21:00:00.000Z', // viernes 18, 16:00 en Bogotá
  endedAt: '2026-09-18T22:00:00.000Z',
  workerId: 'w2',
  worker: { id: 'w2', name: 'Sonia' },
  workerPinned: true,
  totalDurationMinutes: 60,
  status: 'cumplida',
  userId: 'u1',
  contact: null,
  services: [
    { serviceId: 's3', name: 'Uñas acrílicas', price: 1, durationMinutes: 60 },
  ],
};

const montar = (reserva: ReservationDto = RESERVA) =>
  mount(FilaPasada, { props: { reserva } });

describe('FilaPasada', () => {
  it('pinta fecha, estilista, servicios y estado compacto', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="fila-pasada"]').element.tagName).toBe('LI');
    expect(wrapper.get('[data-test="fila-fecha"]').text()).toBe(
      'Vie 18 sep · 16:00'
    );
    expect(wrapper.get('[data-test="fila-estilista"]').text()).toBe('Sonia');
    expect(wrapper.get('[data-test="fila-servicios"]').text()).toBe(
      'Uñas acrílicas'
    );
    const estado = wrapper.get('[data-test="estado-reserva"]');
    expect(estado.text()).toBe('Cumplida');
    expect(estado.classes()).toContain('estado--compacto');
  });

  it('una cumplida ofrece «Deja tu reseña» y emite al pulsarlo (M6)', async () => {
    const wrapper = montar();
    const boton = wrapper.get('[data-test="deja-resena"]');

    expect(boton.text()).toBe('Deja tu reseña');
    expect(boton.attributes('type')).toBe('button');
    await boton.trigger('click');

    expect(wrapper.emitted('resena')).toEqual([[RESERVA]]);
  });

  it.each(['cancelada', 'pendiente', 'confirmada'] as const)(
    'una %s no ofrece reseña',
    (status) => {
      const wrapper = montar({ ...RESERVA, status });

      expect(wrapper.find('[data-test="deja-resena"]').exists()).toBe(false);
    }
  );

  it('una cancelada tacha la fecha', () => {
    const wrapper = montar({ ...RESERVA, status: 'cancelada' });

    expect(wrapper.get('[data-test="fila-fecha"]').classes()).toContain(
      'fila-pasada__fecha--tachada'
    );
  });
});
