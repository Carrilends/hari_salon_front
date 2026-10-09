/**
 * Las horas en fichas de 30 min (B3): sin reloj `q-time`, agrupadas en
 * mañana, tarde y noche; las ocupadas, tachadas y deshabilitadas.
 */
import { mount } from '@vue/test-utils';
import FichasDeHora from 'src/components/reserva/FichasDeHora.vue';
import { huecosDelDia, type HuecoDeHora } from 'src/helpers/reserva-huecos';
import { disponibilidad } from './fixtures/reserva';

const DE_MONICA = huecosDelDia({
  fecha: '2026/10/08',
  duracionMin: 60,
  disponibilidad: disponibilidad(),
  estilistaId: 'w-monica',
});

const montar = (
  cambios: Partial<{
    huecos: HuecoDeHora[];
    seleccionada: string | null;
    cargando: boolean;
  }> = {}
) =>
  mount(FichasDeHora, {
    props: {
      huecos: DE_MONICA,
      seleccionada: null,
      cargando: false,
      ...cambios,
    },
  });

const fichaDe = (wrapper: ReturnType<typeof montar>, hora: string) =>
  wrapper.findAll('button').find((b) => b.text() === hora);

describe('FichasDeHora', () => {
  it('agrupa en mañana, tarde y noche, en ese orden y con su rótulo', () => {
    const wrapper = montar();
    const franjas = wrapper.findAll('[data-test^="franja-"]');

    expect(franjas.map((f) => f.attributes('data-test'))).toEqual([
      'franja-manana',
      'franja-tarde',
      'franja-noche',
    ]);
    expect(franjas[0].text()).toContain('Mañana');
    expect(franjas[1].text()).toContain('Tarde');
    expect(franjas[2].text()).toContain('Noche');
  });

  it('pinta las horas sin cero a la izquierda', () => {
    expect(montar().find('button').text()).toBe('8:00');
  });

  it('la ocupada va tachada en el CSS y deshabilitada, y lo dice', () => {
    const nueve = fichaDe(montar(), '9:00');

    expect(nueve?.attributes('data-test')).toBe('ficha-ocupada');
    expect(nueve?.attributes('disabled')).toBeDefined();
    expect(nueve?.attributes('aria-label')).toBe('9:00, ocupada');
  });

  it('la libre es un botón con aria-pressed', () => {
    const ocho = fichaDe(montar(), '8:00');

    expect(ocho?.attributes('data-test')).toBe('ficha-hora');
    expect(ocho?.attributes('aria-pressed')).toBe('false');
    expect(ocho?.attributes('aria-label')).toBeUndefined();
  });

  it('elegir emite la hora en HH:mm', async () => {
    const wrapper = montar();

    await fichaDe(wrapper, '10:00')?.trigger('click');

    expect(wrapper.emitted('elegir')?.[0]).toEqual(['10:00']);
  });

  it('la elegida se marca', () => {
    expect(
      fichaDe(montar({ seleccionada: '10:00' }), '10:00')?.attributes(
        'aria-pressed'
      )
    ).toBe('true');
  });

  it('cargando: esqueletos y un aviso para el lector, sin botones', () => {
    const wrapper = montar({ cargando: true });

    expect(wrapper.get('[data-test="fichas-cargando"]').text()).toContain(
      'Buscando horas libres…'
    );
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('si no queda ninguna libre lo dice, y deja ver las ocupadas', () => {
    const deSonia = huecosDelDia({
      fecha: '2026/10/08',
      duracionMin: 60,
      disponibilidad: disponibilidad(),
      estilistaId: 'w-sonia',
    });
    const wrapper = montar({ huecos: deSonia });

    expect(wrapper.find('[data-test="sin-huecos"]').exists()).toBe(true);
    expect(
      wrapper.findAll('[data-test="ficha-ocupada"]').length
    ).toBeGreaterThan(0);
    expect(wrapper.findAll('[data-test="ficha-hora"]')).toHaveLength(0);
  });

  it('sin huecos en absoluto, solo el aviso', () => {
    const wrapper = montar({ huecos: [] });

    expect(wrapper.find('[data-test="sin-huecos"]').exists()).toBe(true);
    expect(wrapper.find('[data-test^="franja-"]').exists()).toBe(false);
  });

  it('con huecos libres no sale el aviso de vacío', () => {
    expect(montar().find('[data-test="sin-huecos"]').exists()).toBe(false);
  });
});
