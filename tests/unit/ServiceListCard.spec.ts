/**
 * La tarjeta de servicios del asistente, repintada: marcado plano con los
 * tokens y un botón que **añade a la bolsa** en vez de seguir la conversación.
 *
 * Lo que de verdad se vigila aquí es el doble toque. Un dedo nervioso en una
 * conexión lenta añadiría el servicio dos veces y descuadraría el contador de
 * la cabecera, que es lo primero que la clienta mira.
 */
import { flushPromises, mount } from '@vue/test-utils';
import ServiceListCard from 'src/components/assistant/ServiceListCard.vue';
import type { PresentedService } from 'src/api/assistant-api';

const añadirServicio = jest.fn();
jest.mock('src/composables/booking/useAddToBag', () => ({
  useAddToBag: () => ({ añadirServicio, añadirVarios: jest.fn() }),
}));

const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/uno.jpg';

const SERVICIOS: PresentedService[] = [
  { id: 's1', nombre: 'Maquillaje de novia clásico', precio: 52000, minutos: 30 },
  { id: 's2', nombre: 'Recogido con ondas', precio: 45000, minutos: 30 },
];

const CON_FOTO: PresentedService[] = [
  { id: 's3', nombre: 'Uñas acrílicas', precio: 78000, minutos: 90, imagen: CLOUDINARY },
];

const montar = (servicios: PresentedService[] = SERVICIOS) =>
  mount(ServiceListCard, { props: { servicios } });

beforeEach(() => añadirServicio.mockReset());

describe('ServiceListCard', () => {
  it('pinta una fila por servicio, con su precio y su duración', () => {
    const wrapper = montar();

    expect(wrapper.findAll('[data-test="fila"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Maquillaje de novia clásico');
    // Pesos colombianos, sin decimales: 52.000 con separador de miles.
    expect(wrapper.text()).toContain('52.000');
    expect(wrapper.text()).toContain('30 min');
  });

  it('dice las duraciones largas en horas, no en noventa minutos', () => {
    expect(montar(CON_FOTO).text()).toContain('1 h 30 min');
  });

  it('optimiza la imagen de Cloudinary para una miniatura, no la sirve cruda', () => {
    const img = montar(CON_FOTO).get('img');

    // La fila mide 58 px: servir el original sería absurdo.
    expect(img.attributes('src')).toContain('/upload/f_auto,q_auto,w_');
    expect(img.attributes('srcset')).toContain(' 96w');
  });

  it('sin imagen no deja un hueco roto: usa el marcador de posición', () => {
    const img = montar([SERVICIOS[0]]).get('img');

    expect(img.attributes('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('la miniatura no se nombra dos veces al lector de pantalla', () => {
    // El nombre ya está en el texto de al lado: repetirlo en el `alt` hace que
    // un lector de pantalla lo diga dos veces por fila.
    expect(montar().get('img').attributes('alt')).toBe('');
  });

  it('el botón de añadir nombra el servicio, que es lo que oye un lector de pantalla', () => {
    const boton = montar().findAll('[data-test="anadir"]')[0];

    expect(boton.attributes('aria-label')).toBe(
      'Añadir Maquillaje de novia clásico'
    );
  });

  it('añade el servicio por su id', async () => {
    añadirServicio.mockResolvedValue({ ok: true, añadidos: 1 });
    const wrapper = montar();

    await wrapper.findAll('[data-test="anadir"]')[1].trigger('click');

    expect(añadirServicio).toHaveBeenCalledWith('s2');
  });

  /**
   * Punto 1 del enfoque de revisión. Un dedo nervioso en una conexión lenta
   * añadiría el servicio dos veces y descuadraría el contador de la cabecera.
   */
  it('mientras la petición viaja, el botón no acepta otro toque', async () => {
    let resolver: (r: unknown) => void = () => undefined;
    añadirServicio.mockReturnValue(new Promise((r) => (resolver = r)));
    const wrapper = montar();
    const boton = wrapper.findAll('[data-test="anadir"]')[0];

    await boton.trigger('click');
    await boton.trigger('click');

    expect(añadirServicio).toHaveBeenCalledTimes(1);
    expect(boton.attributes('disabled')).toBeDefined();

    resolver({ ok: true, añadidos: 1 });
  });

  /**
   * El bloqueo era de la tarjeta entera, no de la fila: mientras viajaba la
   * petición de una, tocar otra no hacía **nada** —ni la añadía, ni se veía
   * deshabilitada, ni decía nada—. Añadir dos servicios en una conexión lenta
   * es el caso normal, y el segundo se perdía en silencio. Es justo lo que la
   * especificación §5.1 prohíbe: «un botón que no hace nada es peor que un
   * error».
   */
  it('mientras una fila viaja, las demás siguen vivas', async () => {
    let resolver: (r: unknown) => void = () => undefined;
    añadirServicio
      .mockReturnValueOnce(new Promise((r) => (resolver = r)))
      .mockResolvedValue({ ok: true, añadidos: 1 });
    const wrapper = montar();
    const botones = wrapper.findAll('[data-test="anadir"]');

    await botones[0].trigger('click');
    await botones[1].trigger('click');

    expect(añadirServicio).toHaveBeenNthCalledWith(1, 's1');
    expect(añadirServicio).toHaveBeenNthCalledWith(2, 's2');
    expect(botones[1].attributes('disabled')).toBeUndefined();

    resolver({ ok: true, añadidos: 1 });
  });

  /** Spec §5.1: «el botón queda deshabilitado **y lo dice**». */
  it('mientras viaja, el botón dice que está trabajando', async () => {
    añadirServicio.mockReturnValue(new Promise(() => undefined));
    const wrapper = montar();

    await wrapper.findAll('[data-test="anadir"]')[0].trigger('click');

    const boton = wrapper.findAll('[data-test="anadir"]')[0];
    expect(boton.text()).toContain('Añadiendo');
    expect(boton.attributes('aria-busy')).toBe('true');
  });

  it('dos servicios añadidos dejan DOS confirmaciones, no una que migra', async () => {
    añadirServicio.mockResolvedValue({ ok: true, añadidos: 1 });
    const wrapper = montar();

    await wrapper.findAll('[data-test="anadir"]')[0].trigger('click');
    await flushPromises();
    await wrapper.findAll('[data-test="anadir"]')[1].trigger('click');
    await flushPromises();

    expect(wrapper.findAll('.service-card__hecho')).toHaveLength(2);
  });

  it('al terminar lo confirma en la propia fila, sin ensuciar la conversación', async () => {
    añadirServicio.mockResolvedValue({ ok: true, añadidos: 1 });
    const wrapper = montar();

    await wrapper.findAll('[data-test="anadir"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.findAll('[data-test="fila"]')[0].text()).toContain('Añadido');
  });

  it('si el servicio ya no existe, lo dice en su fila', async () => {
    añadirServicio.mockResolvedValue({
      ok: false,
      motivo: 'Ese servicio ya no está disponible.',
    });
    const wrapper = montar();

    await wrapper.findAll('[data-test="anadir"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('ya no está disponible');
  });

  it('ya no invita a tocar la fila para seguir por el chat: eso dejó de ser verdad', () => {
    expect(montar().text()).not.toContain('seguir por el chat');
  });
});
