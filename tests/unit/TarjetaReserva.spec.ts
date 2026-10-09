/**
 * La tarjeta de una próxima (M1, tablero MisReservasA): fecha en Marcellus
 * grande, rango horario, día relativo con la estilista, servicios, estado, y
 * al pie «Cancelar» y «Cambiar fecha» solo si se puede.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import TarjetaReserva from 'src/components/reservations/TarjetaReserva.vue';
import type { ReservationDto } from 'src/interfaces/booking';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/reservations/TarjetaReserva.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const RESERVA: ReservationDto = {
  id: 'r1',
  scheduledAt: '2026-10-08T15:30:00.000Z', // jueves 8, 10:30 en Bogotá
  endedAt: '2026-10-08T16:30:00.000Z',
  workerId: 'w1',
  worker: { id: 'w1', name: 'Monica' },
  workerPinned: true,
  totalDurationMinutes: 60,
  status: 'confirmada',
  userId: 'u1',
  contact: null,
  services: [
    { serviceId: 's1', name: 'Wolf cut mujer', price: 1, durationMinutes: 30 },
    { serviceId: 's2', name: 'Uñas de gel', price: 1, durationMinutes: 30 },
  ],
};
const AHORA = new Date('2026-10-07T17:00:00.000Z'); // miércoles 7, 12:00 en Bogotá

const montar = (
  cambios: Partial<{
    reserva: ReservationDto;
    cancelable: boolean;
    movible: boolean;
  }> = {}
) =>
  mount(TarjetaReserva, {
    props: {
      reserva: RESERVA,
      ahora: AHORA,
      cancelable: true,
      movible: true,
      ...cambios,
    },
  });

describe('TarjetaReserva', () => {
  it('pinta la fecha, el rango, el detalle y los servicios del tablero', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="tarjeta-fecha"]').text()).toMatch(
      /Jue\s*8\s*oct/
    );
    expect(wrapper.get('[data-test="tarjeta-horas"]').text()).toBe(
      '10:30 – 11:30'
    );
    expect(wrapper.get('[data-test="tarjeta-detalle"]').text()).toBe(
      'Mañana · con Monica · 60 min'
    );
    expect(wrapper.get('[data-test="tarjeta-servicios"]').text()).toBe(
      'Wolf cut mujer, Uñas de gel'
    );
    expect(wrapper.get('[data-test="estado-reserva"]').text()).toBe(
      'Confirmada'
    );
  });

  it('es un <article>', () => {
    expect(montar().get('[data-test="tarjeta-reserva"]').element.tagName).toBe(
      'ARTICLE'
    );
  });

  it('avisa en el detalle cuando la estilista la asignó el salón', () => {
    const wrapper = montar({ reserva: { ...RESERVA, workerPinned: false } });

    expect(wrapper.get('[data-test="tarjeta-detalle"]').text()).toContain(
      'asignación del salón'
    );
  });

  it('«Cancelar» y «Cambiar fecha» emiten con la reserva', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="abrir-cancelar"]').trigger('click');
    await wrapper.get('[data-test="abrir-cambiar-fecha"]').trigger('click');

    expect(wrapper.emitted('cancelar')).toEqual([[RESERVA]]);
    expect(wrapper.emitted('cambiar-fecha')).toEqual([[RESERVA]]);
  });

  it('los botones dicen de qué cita son, empezando por su texto visible', () => {
    const wrapper = montar();

    expect(
      wrapper.get('[data-test="abrir-cancelar"]').attributes('aria-label')
    ).toBe('Cancelar la cita del jueves 8');
    expect(
      wrapper.get('[data-test="abrir-cambiar-fecha"]').attributes('aria-label')
    ).toBe('Cambiar fecha de la cita del jueves 8');
  });

  it('los botones no envían ningún formulario', () => {
    const wrapper = montar();

    for (const gancho of ['abrir-cancelar', 'abrir-cambiar-fecha']) {
      expect(wrapper.get(`[data-test="${gancho}"]`).attributes('type')).toBe(
        'button'
      );
    }
  });

  it('sin acciones posibles no queda un pie vacío', () => {
    const wrapper = montar({ cancelable: false, movible: false });

    expect(wrapper.find('[data-test="acciones-reserva"]').exists()).toBe(false);
  });

  it('cada acción sale solo si se puede', () => {
    const soloCancelar = montar({ movible: false });

    expect(soloCancelar.find('[data-test="abrir-cancelar"]').exists()).toBe(
      true
    );
    expect(
      soloCancelar.find('[data-test="abrir-cambiar-fecha"]').exists()
    ).toBe(false);
  });

  it('una cancelada tacha la fecha y la hora (M2), y lo dice con texto', () => {
    const wrapper = montar({
      reserva: { ...RESERVA, status: 'cancelada' },
      cancelable: false,
      movible: false,
    });

    expect(wrapper.get('[data-test="tarjeta-reserva"]').classes()).toContain(
      'tarjeta-reserva--cancelada'
    );
    expect(wrapper.get('[data-test="tarjeta-fecha"]').classes()).toContain(
      'tarjeta-reserva__fecha--tachada'
    );
    expect(wrapper.get('[data-test="tarjeta-horas"]').classes()).toContain(
      'tarjeta-reserva__horas--tachada'
    );
    expect(wrapper.get('[data-test="estado-reserva"]').text()).toBe(
      'Cancelada'
    );
  });

  it('una confirmada no se tacha', () => {
    expect(montar().get('[data-test="tarjeta-horas"]').classes()).not.toContain(
      'tarjeta-reserva__horas--tachada'
    );
  });

  it('el aspecto sale de tokens: nieve, filete, Marcellus, peligro', () => {
    expect(ESTILOS).toMatch(
      /\.tarjeta-reserva\s*\{[^}]*background: var\(--m-nieve\);/
    );
    expect(ESTILOS).toMatch(
      /\.tarjeta-reserva__numero\s*\{[^}]*font-family: var\(--m-font-display\);/
    );
    expect(ESTILOS).toMatch(
      /\.tarjeta-reserva__cancelar\s*\{[^}]*color: var\(--m-peligro\);/
    );
    expect(ESTILOS).toMatch(/text-decoration: line-through;/);
    expect(ESTILOS).toMatch(/min-height: var\(--m-tactil-min\);/);
  });

  /**
   * Revisión final D6: a 390 la píldora del estado (con icono) empujaba el
   * rango y lo partía en dos líneas («10:00 –» / «10:30»). El rango no se
   * parte; si no caben los dos, la píldora baja a la línea siguiente.
   */
  it('el rango horario va en una línea y la píldora baja si no cabe', () => {
    expect(ESTILOS).toMatch(
      /\.tarjeta-reserva__horas\s*\{[^}]*white-space: nowrap;/
    );
    expect(ESTILOS).toMatch(
      /\.tarjeta-reserva__fila\s*\{[^}]*flex-wrap: wrap;/
    );
  });
});
