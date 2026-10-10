import { mount } from '@vue/test-utils';
import TarjetasSemana from 'src/components/estilistas/TarjetasSemana.vue';
import { HOY, diasCon, semanaDePrueba } from './fixtures/estilistas';

const montar = (props: Record<string, unknown> = {}) =>
  mount(TarjetasSemana, {
    props: { semana: semanaDePrueba(), hoy: HOY, seleccionada: null, ...props },
  });

describe('TarjetasSemana', () => {
  it('una tarjeta por estilista asignable, que se nombra entera', () => {
    const tarjetas = montar().findAll('[data-test="tarjeta-estilista"]');

    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].element.tagName).toBe('BUTTON');
    expect(tarjetas[0].attributes('aria-label')).toBe(
      'Editar a Alejandro · 22 h en la semana'
    );
    expect(tarjetas[1].get('[data-test="total-tarjeta"]').text()).toBe(
      '46 h en la semana'
    );
  });

  it('siete mini-barras con su letra y su número, hoy marcado con su propio gancho', () => {
    const tarjeta = montar().findAll('[data-test="tarjeta-estilista"]')[0];

    expect(tarjeta.findAll('[data-test="mini-dia"]')).toHaveLength(7);
    expect(
      tarjeta.findAll('[data-test="letra-dia"]').map((l) => l.text())
    ).toEqual(['L5', 'M6', 'J8', 'V9', 'S10', 'D11']);
    expect(tarjeta.get('[data-test="letra-hoy"]').text()).toBe('M7');
    expect(tarjeta.get('[data-test="barra-carga"]').classes()).toContain(
      'barra-carga--mini'
    );
  });

  it('tocar una tarjeta la elige; la elegida se marca', async () => {
    const lista = montar({ seleccionada: 'w-ale' });
    const tarjetas = lista.findAll('[data-test="tarjeta-estilista"]');

    await tarjetas[1].trigger('click');

    expect(lista.emitted('elegir')).toEqual([['w-mon']]);
    expect(tarjetas[0].classes()).toContain(
      'tarjetas-semana__tarjeta--elegida'
    );
  });

  it('«Sin preferencia» va aparte y no se puede tocar', () => {
    const defecto = montar().get('[data-test="tarjeta-sin-preferencia"]');

    expect(defecto.element.tagName).not.toBe('BUTTON');
    expect(defecto.text()).toContain('Sin preferencia');
    expect(defecto.text()).toContain('predeterminada');
    expect(defecto.find('[data-test="carga-sin-preferencia"]').exists()).toBe(
      false
    );
  });

  it('si «Sin preferencia» tiene citas, lo dice', () => {
    const semana = semanaDePrueba();
    semana.workers[3] = {
      ...semana.workers[3],
      days: diasCon([60, 0, 0, 0, 0, 0, 0]),
    };

    expect(
      montar({ semana }).get('[data-test="carga-sin-preferencia"]').text()
    ).toBe('1 h de citas a su nombre esta semana: revísalas en Reservas.');
  });
});
