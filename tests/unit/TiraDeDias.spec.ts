/**
 * La tira de catorce días (B3). La usan el cajón, «Cambiar fecha» (plan 2) y
 * «Mover» (plan 3). Son botones con `aria-pressed`, no un `listbox`.
 */
import { mount } from '@vue/test-utils';
import TiraDeDias from 'src/components/reserva/TiraDeDias.vue';
import { diasDeLaTira } from 'src/helpers/reserva-huecos';
import { AHORA } from './fixtures/reserva';

const OCUPACION = {
  '2026/10/08': { usedMinutes: 0, capacityMinutes: 2160 },
  '2026/10/09': { usedMinutes: 1500, capacityMinutes: 2160 },
  '2026/10/10': { usedMinutes: 1800, capacityMinutes: 1800 },
};
const DIAS = diasDeLaTira(AHORA, OCUPACION, 60);

const montar = (seleccionado: string | null = null) =>
  mount(TiraDeDias, { props: { dias: DIAS, seleccionado } });

describe('TiraDeDias', () => {
  it('pinta los catorce días, y el primero dice «Hoy»', () => {
    const dias = montar().findAll('[data-test="dia"]');

    expect(dias).toHaveLength(14);
    expect(dias[0].text()).toContain('Hoy');
    expect(dias[1].text()).toContain('JUE');
    expect(dias[1].text()).toContain('8');
  });

  it('son botones que se pulsan, no las opciones de una lista', () => {
    const wrapper = montar();
    const dias = wrapper.findAll('[data-test="dia"]');

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(
      dias.every(
        (d) =>
          d.element.tagName === 'BUTTON' && d.attributes('type') === 'button'
      )
    ).toBe(true);
  });

  it('marca el día elegido con aria-pressed y con su marca', () => {
    const wrapper = montar('2026/10/08');
    const dias = wrapper.findAll('[data-test="dia"]');

    expect(dias[1].attributes('aria-pressed')).toBe('true');
    expect(dias[0].attributes('aria-pressed')).toBe('false');
    expect(dias[1].find('[data-test="dia-seleccionado"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="dia-seleccionado"]')).toHaveLength(1);
  });

  it('elegir un día emite su fecha', async () => {
    const wrapper = montar();

    await wrapper.findAll('[data-test="dia"]')[2].trigger('click');

    expect(wrapper.emitted('elegir')?.[0]).toEqual(['2026/10/09']);
  });

  /** B3: el festivo no está cerrado; se atiende con el horario reducido. */
  it('el festivo lo dice con su palabra y su horario, y se puede elegir', () => {
    const lunes = montar().findAll('[data-test="dia"]')[5];

    expect(lunes.get('[data-test="dia-festivo"]').text()).toBe('Festivo');
    expect(lunes.attributes('aria-label')).toBe(
      'Lunes 12 de octubre, festivo, de 9:00 a 19:00'
    );
    expect(lunes.attributes('disabled')).toBeUndefined();
  });

  it('un día sin hueco para la bolsa no se puede elegir', async () => {
    const wrapper = montar();
    const sabado = wrapper.findAll('[data-test="dia"]')[3];

    expect(sabado.attributes('disabled')).toBeDefined();
    expect(sabado.attributes('aria-label')).toContain(
      'sin hueco para tu reserva'
    );
    await sabado.trigger('click');
    expect(wrapper.emitted('elegir')).toBeUndefined();
  });

  it('el punto dice si hay horas libres o pocas, y la leyenda lo explica', () => {
    const wrapper = montar();
    const dias = wrapper.findAll('[data-test="dia"]');

    expect(dias[1].find('.tira__punto--libre').exists()).toBe(true);
    expect(dias[2].find('.tira__punto--poca').exists()).toBe(true);
    expect(dias[0].find('.tira__punto').exists()).toBe(false);
    expect(wrapper.get('[data-test="leyenda-dias"]').text()).toContain('Libre');
    expect(wrapper.get('[data-test="leyenda-dias"]').text()).toContain(
      'Pocas horas'
    );
  });

  it('sin ocupación no pinta puntos ni leyenda (no inventa)', () => {
    const wrapper = mount(TiraDeDias, {
      props: { dias: diasDeLaTira(AHORA), seleccionado: null },
    });

    expect(wrapper.find('.tira__punto').exists()).toBe(false);
    expect(wrapper.find('[data-test="leyenda-dias"]').exists()).toBe(false);
  });

  it('con un festivo elegido, una nota da su horario', () => {
    expect(montar('2026/10/12').get('[data-test="nota-festivo"]').text()).toBe(
      'Lunes 12 es festivo: se atiende de 9:00 a 19:00.'
    );
    expect(
      montar('2026/10/08').find('[data-test="nota-festivo"]').exists()
    ).toBe(false);
  });

  it('las flechas se nombran y desplazan la tira', async () => {
    const wrapper = montar();
    const desplazar = jest.fn();
    Object.defineProperty(wrapper.get('ul').element, 'scrollBy', {
      value: desplazar,
      configurable: true,
    });

    await wrapper.get('[data-test="tira-siguiente"]').trigger('click');
    await wrapper.get('[data-test="tira-anterior"]').trigger('click');

    expect(desplazar).toHaveBeenNthCalledWith(1, {
      left: 232,
      behavior: 'smooth',
    });
    expect(desplazar).toHaveBeenNthCalledWith(2, {
      left: -232,
      behavior: 'smooth',
    });
    expect(
      wrapper.get('[data-test="tira-anterior"]').attributes('aria-label')
    ).toBe('Días anteriores');
    expect(
      wrapper.get('[data-test="tira-siguiente"]').attributes('aria-label')
    ).toBe('Días siguientes');
  });
});

/**
 * Revisión final del plan 2 (D3): «Cambiar fecha» abre con el día de la cita
 * elegido, y si caía más allá de los primeros siete la tira no se movía: se
 * veían las horas de un día que no estaba a la vista. Ahora el elegido se
 * centra DENTRO de la tira (solo ella: ni el diálogo ni la página se mueven),
 * y solo si no se ve entero. jsdom no maqueta: se fijan las cajas a mano
 * (tira de 300 px; cada día, 52 px cada 58).
 */
describe('TiraDeDias · el día elegido se ve', () => {
  const desplazar = jest.fn();
  const matchMediaOriginal = window.matchMedia;
  const caja = (left: number, width: number) =>
    ({
      left,
      width,
      right: left + width,
      top: 0,
      bottom: 72,
      height: 72,
    } as DOMRect);

  beforeEach(() => {
    desplazar.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
      value: desplazar,
      configurable: true,
      writable: true,
    });
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.tagName === 'UL') return caja(0, 300);
        const li = this.closest('li');
        const indice = li?.parentElement
          ? Array.from(li.parentElement.children).indexOf(li)
          : 0;
        return caja(indice * 58, 52);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollBy;
    window.matchMedia = matchMediaOriginal;
  });

  it('al montar con un día lejano elegido, lo centra sin animar', () => {
    // Día 10 (17 oct): de 580 a 632; su centro (606) menos el de la tira (150).
    montar(DIAS[10].fecha);

    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(desplazar).toHaveBeenCalledWith({ left: 456, behavior: 'auto' });
  });

  it('si el elegido ya se ve entero, no mueve la tira', () => {
    montar(DIAS[1].fecha);

    expect(desplazar).not.toHaveBeenCalled();
  });

  it('al cambiar a un día que no se ve, lo centra con suavidad', async () => {
    const wrapper = montar(DIAS[1].fecha);

    await wrapper.setProps({ seleccionado: DIAS[12].fecha });

    // Día 12: de 696 a 748; centro 722 − 150.
    expect(desplazar).toHaveBeenCalledWith({ left: 572, behavior: 'smooth' });
  });

  it('con movimiento reducido, el cambio no anima', async () => {
    window.matchMedia = ((consulta: string) => ({
      matches: consulta.includes('prefers-reduced-motion'),
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    const wrapper = montar(DIAS[1].fecha);

    await wrapper.setProps({ seleccionado: DIAS[12].fecha });

    expect(desplazar).toHaveBeenCalledWith({ left: 572, behavior: 'auto' });
  });

  it('sin `scrollBy` (un navegador viejo) no revienta', () => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollBy;

    expect(() => montar(DIAS[10].fecha)).not.toThrow();
  });
});
