/**
 * La tarjeta del paquete, repintada y con otro cierre: «Reservar este paquete»
 * pasa a «Añadir los N».
 *
 * El aviso de la fecha es la aserción que más vale. El asistente **consulta** el
 * cupo, no lo aparta: entre la propuesta y la confirmación ese hueco se lo puede
 * llevar otra persona, así que la tarjeta lo dice en vez de dejar creer que el
 * sábado ya está guardado.
 */
import { flushPromises, mount } from '@vue/test-utils';
import PackageProposalCard from 'src/components/assistant/PackageProposalCard.vue';
import type { PackageProposal } from 'src/api/assistant-api';

const añadirVarios = jest.fn();
jest.mock('src/composables/booking/useAddToBag', () => ({
  useAddToBag: () => ({ añadirVarios, añadirServicio: jest.fn() }),
}));

const PROPUESTA = {
  evento: 'matrimonio',
  fecha: '2026-10-10',
  lineas: [
    {
      serviceId: 's1',
      nombre: 'Maquillaje de novia clásico',
      precio: 52000,
      minutos: 30,
      categoria: 'Maquillaje',
    },
    {
      serviceId: 's2',
      nombre: 'Recogido con ondas',
      precio: 45000,
      minutos: 30,
      categoria: 'Recogidos',
    },
  ],
  serviciosIds: ['s1', 's2'],
  total: 97000,
  minutos: 60,
  omitidas: [],
  completa: true,
} as PackageProposal;

const montar = (propuesta: PackageProposal = PROPUESTA) =>
  mount(PackageProposalCard, { props: { propuesta } });

beforeEach(() => añadirVarios.mockReset());

describe('PackageProposalCard', () => {
  it('ya no ofrece reservar: ofrece añadir, y dice cuántos', () => {
    const wrapper = montar();

    expect(wrapper.text()).not.toContain('Reservar');
    expect(wrapper.get('[data-test="anadir-paquete"]').text()).toContain(
      'Añadir los 2'
    );
  });

  it('conserva lo que ya mostraba: evento, fecha, líneas, total y duración', () => {
    const texto = montar().text();

    expect(texto).toContain('matrimonio');
    expect(texto).toContain('2026-10-10');
    expect(texto).toContain('Maquillaje de novia clásico');
    expect(texto).toContain('52.000');
    expect(texto).toContain('97.000');
    expect(texto).toContain('1 h');
  });

  it('sigue diciendo lo que no pudo incluir y cuándo el paquete quedó corto', () => {
    const texto = montar({
      ...PROPUESTA,
      completa: false,
      omitidas: [{ categoria: 'Uñas', motivo: 'sin cupo' }],
    }).text();

    expect(texto).toContain('No incluido');
    expect(texto).toContain('Uñas');
    expect(texto).toContain('Faltó alguna parte principal');
  });

  it('añade todas las líneas de una vez', async () => {
    añadirVarios.mockResolvedValue({ ok: true, añadidos: 2 });
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');

    expect(añadirVarios).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('mientras viaja, el botón no acepta otro toque', async () => {
    let resolver: (r: unknown) => void = () => undefined;
    añadirVarios.mockReturnValue(new Promise((r) => (resolver = r)));
    const wrapper = montar();
    const boton = wrapper.get('[data-test="anadir-paquete"]');

    await boton.trigger('click');
    await boton.trigger('click');

    expect(añadirVarios).toHaveBeenCalledTimes(1);
    expect(boton.attributes('disabled')).toBeDefined();

    resolver({ ok: true, añadidos: 2 });
  });

  /** Spec §5.1: «el botón queda deshabilitado **y lo dice**». */
  it('mientras viaja, el botón dice que está trabajando', async () => {
    añadirVarios.mockReturnValue(new Promise(() => undefined));
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');

    const boton = wrapper.get('[data-test="anadir-paquete"]');
    expect(boton.text()).toContain('Añadiendo');
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  it('un reintento que falla no deja «Añadido» y el error a la vez', async () => {
    añadirVarios
      .mockResolvedValueOnce({ ok: true, añadidos: 2 })
      .mockResolvedValue({ ok: false, motivo: 'Ese servicio ya no está disponible.' });
    const wrapper = montar();
    const boton = wrapper.get('[data-test="anadir-paquete"]');

    await boton.trigger('click');
    await flushPromises();
    await boton.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('ya no está disponible');
    expect(wrapper.find('.package-card__nota').exists()).toBe(false);
  });

  /**
   * El asistente consulta el cupo, no lo aparta: entre la propuesta y la
   * confirmación ese hueco se lo puede llevar otra persona. La tarjeta lo dice
   * en vez de dejar creer que el sábado ya está guardado.
   */
  it('avisa de que el día se elige en el paso siguiente', async () => {
    añadirVarios.mockResolvedValue({ ok: true, añadidos: 2 });
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('elige el día al confirmar');
  });

  it('si parte del paquete ya estaba en la bolsa, dice qué entró', async () => {
    añadirVarios.mockResolvedValue({ ok: true, añadidos: 1, yaEstaban: 1 });
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Añadimos 1; 1 ya estaba en tu bolsa.');
  });

  it('con varios ya en la bolsa, la nota va en plural', async () => {
    añadirVarios.mockResolvedValue({ ok: true, añadidos: 2, yaEstaban: 3 });
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Añadimos 2; 3 ya estaban en tu bolsa.');
  });

  it('si la bolsa no pudo con el paquete, lo dice', async () => {
    añadirVarios.mockResolvedValue({
      ok: false,
      motivo: 'Ese servicio ya no está disponible.',
    });
    const wrapper = montar();

    await wrapper.get('[data-test="anadir-paquete"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('ya no está disponible');
  });

  it('un paquete sin líneas no ofrece el botón', () => {
    const wrapper = montar({ ...PROPUESTA, lineas: [], serviciosIds: [] });

    expect(wrapper.find('[data-test="anadir-paquete"]').exists()).toBe(false);
  });
});
