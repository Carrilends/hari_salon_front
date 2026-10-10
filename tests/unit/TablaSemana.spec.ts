import { mount } from '@vue/test-utils';
import TablaSemana from 'src/components/estilistas/TablaSemana.vue';
import { HOY, diasCon, semanaDePrueba } from './fixtures/estilistas';

const montar = (props: Record<string, unknown> = {}) =>
  mount(TablaSemana, {
    props: { semana: semanaDePrueba(), hoy: HOY, seleccionada: null, ...props },
  });

describe('TablaSemana', () => {
  it('es una tabla con su título para el lector de pantalla', () => {
    const tabla = montar();

    expect(tabla.find('table[data-test="tabla-semana"]').exists()).toBe(true);
    expect(tabla.get('caption').text()).toBe(
      'Horas reservadas por estilista y día de la semana'
    );
  });

  it('nombra los siete días y marca hoy con texto, no solo con color', () => {
    const tabla = montar();
    const hoy = tabla.get('[data-test="cabecera-hoy"]');

    expect(tabla.findAll('[data-test="cabecera-dia"]')).toHaveLength(6);
    expect(hoy.text()).toContain('Mié');
    expect(hoy.text()).toContain('7');
    expect(hoy.text()).toContain('hoy');
    expect(hoy.attributes('aria-current')).toBe('date');
  });

  it('una semana sin hoy no marca ninguna columna', () => {
    const tabla = montar({ hoy: '2026-10-20' });

    expect(tabla.find('[data-test="cabecera-hoy"]').exists()).toBe(false);
    expect(tabla.findAll('[data-test="cabecera-dia"]')).toHaveLength(7);
  });

  it('una fila por estilista asignable, con sus siete barras y su total', () => {
    const filas = montar().findAll('[data-test="fila-estilista"]');

    expect(
      filas.map((f) =>
        f.get('[data-test="elegir-estilista"]').attributes('aria-label')
      )
    ).toEqual(['Editar a Alejandro', 'Editar a Monica', 'Editar a Sonia s']);
    expect(filas[0].findAll('[data-test="celda-dia"]')).toHaveLength(7);
    // Cifra y «de …» son dos bloques: Vue quita el blanco con salto de línea entre ellos.
    expect(filas[0].get('[data-test="total-semana"]').text()).toMatch(
      /^22 h\s*de 80 h$/
    );
    expect(filas[2].get('[data-test="total-semana"]').text()).toMatch(
      /^11 h 30\s*de 80 h$/
    );
  });

  it('cada celda dice sus horas, y «—» el día sin citas', () => {
    const horas = montar()
      .findAll('[data-test="fila-estilista"]')[0]
      .findAll('[data-test="horas-dia"]')
      .map((h) => h.text());

    expect(horas).toEqual([
      '3 h',
      '2 h',
      '1 h 30',
      '4 h',
      '5 h 30',
      '6 h',
      '—',
    ]);
  });

  it('la barra de cada día lleva su texto', () => {
    const barra = montar()
      .findAll('[data-test="fila-estilista"]')[0]
      .get('[data-test="barra-carga"]');

    expect(barra.attributes('aria-label')).toBe('3 h reservadas de 12 h');
  });

  it('pulsar a una estilista la elige; la elegida se marca', async () => {
    const tabla = montar({ seleccionada: 'w-mon' });
    const filas = tabla.findAll('[data-test="fila-estilista"]');

    await filas[2].get('[data-test="elegir-estilista"]').trigger('click');

    expect(tabla.emitted('elegir')).toEqual([['w-son']]);
    expect(filas[1].classes()).toContain('tabla-semana__fila--elegida');
    expect(
      filas[1].get('[data-test="elegir-estilista"]').attributes('aria-expanded')
    ).toBe('true');
    expect(
      filas[0].get('[data-test="elegir-estilista"]').attributes('aria-expanded')
    ).toBe('false');
    expect(
      filas[0].get('[data-test="elegir-estilista"]').attributes('aria-label')
    ).toBe('Editar a Alejandro');
  });

  it('«Sin preferencia» va aparte, sin botón y con su explicación', () => {
    const fila = montar().get('[data-test="fila-sin-preferencia"]');

    expect(fila.text()).toContain('Sin preferencia');
    expect(fila.text()).toContain('Predeterminada');
    expect(fila.text()).toContain('No atiende');
    expect(fila.find('button').exists()).toBe(false);
    expect(fila.find('[data-test="carga-sin-preferencia"]').exists()).toBe(
      false
    );
  });

  it('si «Sin preferencia» tiene citas esa semana, no se esconden', () => {
    const semana = semanaDePrueba();
    semana.workers[3] = {
      ...semana.workers[3],
      days: diasCon([0, 0, 120, 0, 0, 0, 0]),
    };

    const fila = montar({ semana }).get('[data-test="fila-sin-preferencia"]');

    expect(fila.get('[data-test="carga-sin-preferencia"]').text()).toBe(
      'Esta semana tiene 2 h de citas a su nombre: revísalas en Reservas.'
    );
  });
});
