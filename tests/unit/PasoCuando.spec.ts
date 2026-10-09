/**
 * Paso 2, «Cuándo» (B3, B6): con quién, qué día y a qué hora, más el aviso en
 * línea de «la disponibilidad cambió» y el error de carga, que sustituyen a
 * los `$q.notify` de antes. Se monta con sus piezas de verdad.
 */
import { mount } from '@vue/test-utils';
import PasoCuando from 'src/components/reserva/PasoCuando.vue';
import { diasDeLaTira, huecosDelDia } from 'src/helpers/reserva-huecos';
import type { AvisoDisponibilidad } from 'src/components/reserva/tipos';
import { AHORA, disponibilidad } from './fixtures/reserva';

const BASE = {
  estilistas: disponibilidad().workers,
  estilistaId: null as string | null,
  duracionMin: 60,
  dias: diasDeLaTira(AHORA, undefined, 60),
  fecha: '2026/10/08' as string | null,
  huecos: huecosDelDia({
    fecha: '2026/10/08',
    duracionMin: 60,
    disponibilidad: disponibilidad(),
    estilistaId: null,
  }),
  hora: null as string | null,
  cargando: false,
  errorHuecos: false,
  aviso: null as AvisoDisponibilidad | null,
};

const montar = (cambios: Partial<typeof BASE> = {}) =>
  mount(PasoCuando, {
    props: { ...BASE, ...cambios },
    attachTo: document.body,
  });

const AVISO: AvisoDisponibilidad = {
  texto:
    'La disponibilidad cambió y ya no hay tiempo suficiente con Monica a las 10:30.',
  ofrecerSinPreferencia: true,
};

describe('PasoCuando', () => {
  it('pregunta con quién, qué día y a qué hora, y nombra el mes', () => {
    const wrapper = montar();

    expect(wrapper.text()).toContain('Con quién');
    expect(wrapper.text()).toContain('Qué día');
    expect(wrapper.text()).toContain('A qué hora');
    expect(wrapper.get('[data-test="mes-tira"]').text()).toBe('Octubre 2026');
  });

  it('reenvía lo que elige la clienta', async () => {
    const wrapper = montar();

    await wrapper.findAll('[data-test="ficha-estilista"]')[0].trigger('click');
    await wrapper.findAll('[data-test="dia"]')[2].trigger('click');
    await wrapper.findAll('[data-test="ficha-hora"]')[0].trigger('click');

    expect(wrapper.emitted('elegir-estilista')?.[0]).toEqual(['w-monica']);
    expect(wrapper.emitted('elegir-fecha')?.[0]).toEqual(['2026/10/09']);
    expect(wrapper.emitted('elegir-hora')?.[0]).toEqual(['08:00']);
  });

  it('sin día elegido pide elegirlo, en vez de pintar horas', () => {
    const wrapper = montar({ fecha: null, huecos: [] });

    expect(wrapper.find('[data-test="elige-dia"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="fichas-hora"]').exists()).toBe(false);
  });

  it('mientras carga, las fichas son esqueletos', () => {
    expect(
      montar({ cargando: true, huecos: [] })
        .find('[data-test="fichas-cargando"]')
        .exists()
    ).toBe(true);
  });

  /** B6: el aviso va en línea, con sus dos salidas. */
  it('«la disponibilidad cambió»: aviso en línea con dos acciones', async () => {
    const wrapper = montar({ aviso: AVISO, estilistaId: 'w-monica' });
    const aviso = wrapper.get('[data-test="aviso-disponibilidad"]');

    expect(aviso.attributes('role')).toBe('alert');
    expect(aviso.text()).toContain(AVISO.texto);
    await wrapper.get('[data-test="elegir-otra-hora"]').trigger('click');
    await wrapper.get('[data-test="probar-sin-preferencia"]').trigger('click');
    expect(wrapper.emitted('elegir-otra-hora')).toHaveLength(1);
    expect(wrapper.emitted('probar-sin-preferencia')).toHaveLength(1);
  });

  it('«Elegir otra hora» lleva el foco a las horas', async () => {
    const wrapper = montar({ aviso: AVISO });

    await wrapper.get('[data-test="elegir-otra-hora"]').trigger('click');
    await wrapper.vm.$nextTick();

    expect(document.activeElement?.textContent).toContain('A qué hora');
    wrapper.unmount();
  });

  it('si ya era sin preferencia, no ofrece pasar a sin preferencia', () => {
    const wrapper = montar({
      aviso: {
        texto: 'La disponibilidad cambió y ya no queda hueco a las 10:30.',
        ofrecerSinPreferencia: false,
      },
    });

    expect(wrapper.find('[data-test="probar-sin-preferencia"]').exists()).toBe(
      false
    );
  });

  it('si no cargan las horas, lo dice en línea y deja reintentar', async () => {
    const wrapper = montar({ errorHuecos: true, huecos: [] });

    expect(wrapper.get('[data-test="error-huecos"]').attributes('role')).toBe(
      'alert'
    );
    expect(wrapper.find('[data-test="fichas-hora"]').exists()).toBe(false);
    await wrapper.get('[data-test="reintentar-huecos"]').trigger('click');
    expect(wrapper.emitted('reintentar')).toHaveLength(1);
  });
});
