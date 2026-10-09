/**
 * Con quién (B3): fichas con la inicial, «Sin preferencia» primero, y la que
 * no alcanza atenuada con «Sin tiempo suficiente» y sin poder elegirse.
 */
import { mount } from '@vue/test-utils';
import FichasDeEstilista from 'src/components/reserva/FichasDeEstilista.vue';
import type { WorkerAvailabilityEntry } from 'src/api/workers-api';
import { disponibilidad, estilista } from './fixtures/reserva';

const ESTILISTAS = disponibilidad().workers;

const montar = (
  cambios: Partial<{
    estilistas: WorkerAvailabilityEntry[];
    seleccionada: string | null;
    duracionMin: number;
    fija: boolean;
  }> = {}
) =>
  mount(FichasDeEstilista, {
    props: {
      estilistas: ESTILISTAS,
      seleccionada: null,
      duracionMin: 60,
      ...cambios,
    },
  });

const fichaDe = (wrapper: ReturnType<typeof montar>, nombre: string) =>
  wrapper
    .findAll('[data-test="ficha-estilista"]')
    .find((f) => f.text().includes(nombre));

describe('FichasDeEstilista', () => {
  it('«Sin preferencia» va primero, y es la elegida por defecto', () => {
    const primera = montar().find('button');

    expect(primera.attributes('data-test')).toBe('ficha-sin-preferencia');
    expect(primera.attributes('aria-pressed')).toBe('true');
    expect(primera.text()).toContain('Sin preferencia');
  });

  it('una ficha por estilista asignable; la predeterminada de la BD no sale', () => {
    const wrapper = montar();
    const fichas = wrapper.findAll('[data-test="ficha-estilista"]');

    expect(fichas).toHaveLength(3);
    expect(wrapper.text()).not.toContain('Sin prefencia');
  });

  it('cada ficha lleva la inicial de la estilista', () => {
    expect(fichaDe(montar(), 'Monica')?.get('.estilistas__avatar').text()).toBe(
      'M'
    );
  });

  it('dice cuánta holgura tiene cada una', () => {
    const wrapper = montar();

    expect(fichaDe(wrapper, 'Alejandro')?.text()).toContain(
      'Libre casi todo el día'
    );
    expect(fichaDe(wrapper, 'Monica')?.text()).toContain('Pocas horas libres');
  });

  it('la que no alcanza se atenúa, lo dice y no se puede elegir', async () => {
    const wrapper = montar();
    const sonia = fichaDe(wrapper, 'Sonia s');

    expect(sonia?.attributes('disabled')).toBeDefined();
    expect(sonia?.get('[data-test="estilista-sin-tiempo"]').text()).toBe(
      'Sin tiempo suficiente'
    );
    await sonia?.trigger('click');
    expect(wrapper.emitted('elegir')).toBeUndefined();
  });

  it('elegir emite el id, y «Sin preferencia» emite null', async () => {
    const wrapper = montar({ seleccionada: 'w-monica' });

    expect(fichaDe(wrapper, 'Monica')?.attributes('aria-pressed')).toBe('true');
    await fichaDe(wrapper, 'Alejandro')?.trigger('click');
    await wrapper.get('[data-test="ficha-sin-preferencia"]').trigger('click');

    expect(wrapper.emitted('elegir')).toEqual([['w-alejandro'], [null]]);
  });

  it('si ninguna alcanza, tampoco «Sin preferencia»', () => {
    const sinPreferencia = montar({ duracionMin: 800 }).get(
      '[data-test="ficha-sin-preferencia"]'
    );

    expect(sinPreferencia.attributes('disabled')).toBeDefined();
    expect(
      sinPreferencia.find('[data-test="estilista-sin-tiempo"]').exists()
    ).toBe(true);
  });

  it('sin estilistas asignables, «Sin preferencia» sigue (el salón asigna)', () => {
    const wrapper = montar({
      estilistas: [
        estilista({
          id: 'w-defecto',
          name: 'Sin prefencia',
          isDefault: true,
          assignable: false,
        }),
      ],
    });

    expect(
      wrapper.get('[data-test="ficha-sin-preferencia"]').attributes('disabled')
    ).toBeUndefined();
    expect(wrapper.find('[data-test="ficha-estilista"]').exists()).toBe(false);
  });

  it('fija: muestra solo la elegida, sin botón', async () => {
    const wrapper = montar({ seleccionada: 'w-monica', fija: true });
    const ficha = wrapper.get('[data-test="ficha-estilista"]');

    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.findAll('[data-test="ficha-estilista"]')).toHaveLength(1);
    expect(ficha.element.tagName).toBe('P');
    expect(ficha.text()).toContain('Monica');
    await ficha.trigger('click');
    expect(wrapper.emitted('elegir')).toBeUndefined();
  });

  it('fija y sin preferencia: lo dice', () => {
    expect(
      montar({ fija: true }).get('[data-test="ficha-sin-preferencia"]').text()
    ).toContain('Sin preferencia');
  });
});
