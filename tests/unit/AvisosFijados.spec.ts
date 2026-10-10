/**
 * A5: los avisos en tiempo real, fijados sobre la lista (tablero «Llegan
 * avisos»): descartables y con «Ver» solo si la reserva sigue en la lista.
 */
import { mount } from '@vue/test-utils';
import AvisosFijados from 'src/components/admin-reservas/AvisosFijados.vue';
import type { AvisoEnVivo } from 'src/composables/notifications/avisosEnVivo';

const nueva: AvisoEnVivo = {
  id: 2,
  reservationId: 'res-6',
  evento: 'reservation.created',
  mensaje: 'Nueva reserva de Sofía T.',
  detalle: '8 oct 2026, 12:00 p. m.',
};

const cancelada: AvisoEnVivo = {
  id: 1,
  reservationId: 'res-9',
  evento: 'reservation.cancelled',
  mensaje: 'Laura Gómez canceló su cita',
  detalle: '8 oct 2026, 9:00 a. m. · ya no está en la lista',
};

const montar = (avisos: AvisoEnVivo[], idsEnLista: string[] = ['res-6']) =>
  mount(AvisosFijados, { props: { avisos, idsEnLista } });

describe('AvisosFijados', () => {
  it('la región de avisos existe aunque esté vacía (si no, el lector no anuncia el primero)', () => {
    const w = montar([]);
    const region = w.find('[data-test="avisos-fijados"]');

    expect(region.exists()).toBe(true);
    expect(region.attributes('role')).toBe('status');
    expect(w.findAll('[data-test="aviso"]')).toHaveLength(0);
  });

  it('pinta mensaje y detalle en el orden que recibe', () => {
    const w = montar([nueva, cancelada]);
    const avisos = w.findAll('[data-test="aviso"]');

    expect(
      avisos.map((a) => a.find('[data-test="aviso-mensaje"]').text())
    ).toEqual(['Nueva reserva de Sofía T.', 'Laura Gómez canceló su cita']);
    expect(avisos[1].find('[data-test="aviso-detalle"]').text()).toContain(
      'ya no está en la lista'
    );
    expect(avisos[0].attributes('data-evento')).toBe('reservation.created');
  });

  it('«Ver» solo si la reserva sigue en la lista', () => {
    const avisos = montar([nueva, cancelada]).findAll('[data-test="aviso"]');

    expect(avisos[0].find('[data-test="ver-aviso"]').exists()).toBe(true);
    expect(avisos[1].find('[data-test="ver-aviso"]').exists()).toBe(false);
  });

  it('«Ver» y descartar avisan a la página', async () => {
    const w = montar([nueva]);

    await w.find('[data-test="ver-aviso"]').trigger('click');
    await w.find('[data-test="descartar-aviso"]').trigger('click');

    expect(w.emitted('ver')).toEqual([[nueva]]);
    expect(w.emitted('descartar')).toEqual([[2]]);
  });

  it('los botones dicen qué hacen al lector de pantalla', () => {
    const w = montar([nueva]);

    expect(
      w.find('[data-test="descartar-aviso"]').attributes('aria-label')
    ).toBe('Descartar el aviso');
    expect(w.find('[data-test="ver-aviso"]').attributes('aria-label')).toBe(
      'Ver la reserva: Nueva reserva de Sofía T.'
    );
  });

  it('«Ver» y descartar son botones planos: sin caja de sombra al pasar', () => {
    const w = montar([nueva]);

    expect(w.find('[data-test="ver-aviso"]').classes()).toContain(
      'm-boton-plano'
    );
    expect(w.find('[data-test="descartar-aviso"]').classes()).toContain(
      'm-boton-plano'
    );
  });

  it('cada uno de los cuatro eventos tiene icono', () => {
    const eventos: AvisoEnVivo['evento'][] = [
      'reservation.created',
      'reservation.cancelled',
      'reservation.rescheduled',
      'reservation.confirmed',
    ];
    for (const evento of eventos) {
      const w = montar([{ ...nueva, evento }]);
      expect(
        w.find('[data-test="aviso"] svg').findAll('path').length
      ).toBeGreaterThan(0);
    }
  });
});
