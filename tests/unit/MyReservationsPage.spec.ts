/**
 * La página «Mis reservas» (M1–M6, tablero MisReservasA). Se monta con las
 * piezas de verdad (tarjeta, fila, estado) y con los dos diálogos doblados
 * como módulo: lo que se prueba aquí es cómo la página los abre, qué les pasa
 * y qué hace con lo que le devuelven.
 *
 * Las fechas se fabrican relativas a «ahora»: la página separa próximas de
 * pasadas con el reloj real.
 */
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import MyReservationsPage from 'src/pages/MyReservationsPage.vue';
import type { ReservationDto } from 'src/interfaces/booking';

const mockQuery = {
  data: ref<ReservationDto[] | undefined>([]),
  isLoading: ref(false),
  isError: ref(false),
  isFetching: ref(false),
  dataUpdatedAt: ref(0),
  refetch: jest.fn(),
};
const mockCancelar = jest.fn();
jest.mock('src/composables/reservations/useMyReservations', () => ({
  useMyReservations: () => ({
    query: mockQuery,
    cancel: { mutateAsync: (id: string) => mockCancelar(id) },
  }),
}));

const mockSolicitarResena = jest.fn();
jest.mock('src/composables/reviews/useReviewDialog', () => ({
  useReviewDialog: () => ({ solicitar: () => mockSolicitarResena() }),
}));

jest.mock('src/components/reservations/CambiarFechaDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'CambiarFechaDialog',
    props: ['reserva', 'modelValue', 'permitirEstilista'],
    emits: ['update:modelValue', 'reprogramada'],
    template: '<div data-test="doble-cambiar-fecha" />',
  },
}));
jest.mock('src/components/reservations/CancelarReservaDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'CancelarReservaDialog',
    props: ['reserva', 'modelValue', 'cancelando', 'error'],
    emits: ['update:modelValue', 'confirmar'],
    template: '<div data-test="doble-cancelar" />',
  },
}));

const QPage = { name: 'QPage', template: '<main><slot /></main>' };

const HORA = 3_600_000;
const DIA = 24 * HORA;

function cita(
  id: string,
  desdeAhora: number,
  cambios: Partial<ReservationDto> = {}
): ReservationDto {
  const inicio = new Date(Date.now() + desdeAhora);
  return {
    id,
    scheduledAt: inicio.toISOString(),
    endedAt: new Date(inicio.getTime() + HORA).toISOString(),
    workerId: 'w1',
    worker: { id: 'w1', name: 'Monica' },
    workerPinned: true,
    totalDurationMinutes: 60,
    status: 'confirmada',
    userId: 'u1',
    contact: null,
    services: [
      {
        serviceId: 's1',
        name: 'Wolf cut mujer',
        price: 1,
        durationMinutes: 60,
      },
    ],
    ...cambios,
  };
}

/** Próximas: r1 (mañana), r5 (cancelada, en 3 días), r2 (en 17 días). Pasadas: r3, r4. */
const lista = (): ReservationDto[] => [
  cita('r1', DIA),
  cita('r2', 17 * DIA, {
    status: 'pendiente',
    workerPinned: false,
    workerId: 'w3',
    worker: { id: 'w3', name: 'Alejandro' },
  }),
  cita('r5', 3 * DIA, { status: 'cancelada' }),
  cita('r3', -20 * DIA, { status: 'cumplida' }),
  cita('r4', -35 * DIA, { status: 'cancelada' }),
];

const montar = () =>
  mount(MyReservationsPage, {
    global: {
      components: { QPage },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
type Pagina = ReturnType<typeof montar>;

const cancelarDoble = (w: Pagina) =>
  w.findComponent({ name: 'CancelarReservaDialog' });
const moverDoble = (w: Pagina) =>
  w.findComponent({ name: 'CambiarFechaDialog' });

beforeEach(() => {
  mockQuery.data.value = lista();
  mockQuery.isLoading.value = false;
  mockQuery.isError.value = false;
  mockQuery.isFetching.value = false;
  mockQuery.dataUpdatedAt.value = 0;
  mockQuery.refetch.mockReset();
  mockCancelar.mockReset();
  mockSolicitarResena.mockReset();
});

describe('MyReservationsPage · la lista', () => {
  it('encabeza como el tablero', () => {
    const texto = montar().text();

    expect(texto).toContain('Tu cuenta');
    expect(texto).toContain('Mis reservas');
    expect(texto).toContain(
      'Puedes mover o cancelar una cita hasta la hora en que empieza.'
    );
  });

  it('las próximas, de la más cercana a la más lejana, con su cuenta', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="seccion-proximas"]').text()).toContain(
      'Próximas · 3'
    );
    const tarjetas = wrapper.findAll('[data-test="tarjeta-reserva"]');
    expect(tarjetas).toHaveLength(3);
    expect(tarjetas[0].get('[data-test="estado-reserva"]').text()).toBe(
      'Confirmada'
    );
    expect(tarjetas[1].get('[data-test="estado-reserva"]').text()).toBe(
      'Cancelada'
    );
    expect(tarjetas[2].get('[data-test="estado-reserva"]').text()).toBe(
      'Pendiente'
    );
  });

  it('una cancelada futura no ofrece acciones', () => {
    const cancelada = montar().findAll('[data-test="tarjeta-reserva"]')[1];

    expect(cancelada.find('[data-test="acciones-reserva"]').exists()).toBe(
      false
    );
  });

  it('las vigentes ofrecen «Cancelar» y «Cambiar fecha»', () => {
    const primera = montar().findAll('[data-test="tarjeta-reserva"]')[0];

    expect(primera.find('[data-test="abrir-cancelar"]').exists()).toBe(true);
    expect(primera.find('[data-test="abrir-cambiar-fecha"]').exists()).toBe(
      true
    );
  });

  it('las pasadas empiezan plegadas y se despliegan', async () => {
    const wrapper = montar();
    const plegar = wrapper.get('[data-test="plegar-pasadas"]');

    expect(plegar.text()).toContain('Pasadas · 2');
    expect(plegar.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-test="lista-pasadas"]').exists()).toBe(false);

    await plegar.trigger('click');

    expect(plegar.attributes('aria-expanded')).toBe('true');
    expect(wrapper.findAll('[data-test="fila-pasada"]')).toHaveLength(2);
  });

  it('sin próximas lo dice y deja ir a servicios', () => {
    mockQuery.data.value = [cita('r3', -20 * DIA, { status: 'cumplida' })];
    const wrapper = montar();

    expect(wrapper.get('[data-test="sin-proximas"]').text()).toContain(
      'No tienes citas próximas.'
    );
    expect(wrapper.find('[data-test="plegar-pasadas"]').exists()).toBe(true);
  });

  it('«Actualizar» vuelve a pedir la lista', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="actualizar"]').trigger('click');

    expect(mockQuery.refetch).toHaveBeenCalled();
  });

  it('mientras actualiza, el botón lo dice y no se repite', () => {
    mockQuery.isFetching.value = true;
    const boton = montar().get('[data-test="actualizar"]');

    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
    expect(boton.text()).toBe('Actualizar');
  });
});

/**
 * Revisión final I1: «ahora» se renovaba solo cuando cambiaba `data`, pero
 * TanStack conserva el MISMO arreglo si el servidor devuelve la lista igual.
 * La pestaña de ayer seguía diciendo «Mañana» y una cita ya empezada seguía en
 * «Próximas» con sus botones. Se fija el reloj (solo `Date`) para mover el
 * tiempo sin tocar los temporizadores de Vue.
 */
describe('MyReservationsPage · «ahora» se renueva', () => {
  const SOLO_FECHA = [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ] as const;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: Array.from(SOLO_FECHA) });
    jest.setSystemTime(new Date('2026-10-09T15:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  /** Una cita que empieza en 5 minutos, y la misma lista para siempre. */
  const conUnaCitaInminente = () => {
    const misma = [cita('r9', 5 * 60_000)];
    mockQuery.data.value = misma;
    return misma;
  };
  const conAcciones = (w: Pagina) =>
    w
      .findAll('[data-test="tarjeta-reserva"]')
      .map((t) => t.find('[data-test="abrir-cancelar"]').exists());

  it('una respuesta con la MISMA lista saca de «Próximas» la cita ya empezada', async () => {
    const misma = conUnaCitaInminente();
    mockQuery.dataUpdatedAt.value = Date.now();
    const wrapper = montar();
    expect(conAcciones(wrapper)).toEqual([true]);

    jest.setSystemTime(Date.now() + 10 * 60_000);
    // El servidor respondió igual: el arreglo es el mismo, solo cambia la marca.
    mockQuery.data.value = misma;
    mockQuery.dataUpdatedAt.value = Date.now();
    await nextTick();

    expect(wrapper.find('[data-test="seccion-proximas"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="plegar-pasadas"]').text()).toContain(
      'Pasadas · 1'
    );
  });

  it('«Actualizar» renueva «ahora» aunque la respuesta no llegue', async () => {
    conUnaCitaInminente();
    const wrapper = montar();
    expect(conAcciones(wrapper)).toEqual([true]);

    jest.setSystemTime(Date.now() + 10 * 60_000);
    await wrapper.get('[data-test="actualizar"]').trigger('click');

    expect(mockQuery.refetch).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-test="seccion-proximas"]').exists()).toBe(false);
  });
});

describe('MyReservationsPage · estados', () => {
  it('cargando', () => {
    mockQuery.isLoading.value = true;
    mockQuery.data.value = undefined;

    expect(montar().get('[data-test="cargando"]').attributes('role')).toBe(
      'status'
    );
  });

  it('error con reintentar', async () => {
    mockQuery.isError.value = true;
    mockQuery.data.value = undefined;
    const wrapper = montar();

    expect(wrapper.get('[data-test="error-carga"]').attributes('role')).toBe(
      'alert'
    );
    await wrapper.get('[data-test="reintentar"]').trigger('click');

    expect(mockQuery.refetch).toHaveBeenCalled();
  });

  it('vacío: texto y «Ver servicios →», sin un segundo «Reservar» (M5)', () => {
    mockQuery.data.value = [];
    const wrapper = montar();

    expect(wrapper.get('[data-test="vacio"]').text()).toContain(
      'Todavía no tienes reservas.'
    );
    const enlace = wrapper.get('[data-test="ver-servicios"]');
    expect(enlace.text()).toBe('Ver servicios →');
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/services');
    expect(wrapper.text()).not.toMatch(/Reservar/);
  });
});

describe('MyReservationsPage · cancelar (M4)', () => {
  it('«Cancelar» abre la confirmación con esa cita', async () => {
    const wrapper = montar();

    await wrapper.findAll('[data-test="abrir-cancelar"]')[0].trigger('click');

    expect(cancelarDoble(wrapper).props('modelValue')).toBe(true);
    expect(cancelarDoble(wrapper).props('reserva').id).toBe('r1');
    expect(cancelarDoble(wrapper).props('error')).toBe('');
  });

  /** Foco de revisión 2. */
  it('dos confirmaciones seguidas cancelan una sola vez', async () => {
    let terminar: () => void = () => undefined;
    mockCancelar.mockReturnValue(new Promise<void>((r) => (terminar = r)));
    const wrapper = montar();
    await wrapper.findAll('[data-test="abrir-cancelar"]')[0].trigger('click');

    cancelarDoble(wrapper).vm.$emit('confirmar', 'r1');
    cancelarDoble(wrapper).vm.$emit('confirmar', 'r1');
    await nextTick();

    expect(mockCancelar).toHaveBeenCalledTimes(1);
    expect(cancelarDoble(wrapper).props('cancelando')).toBe(true);

    terminar();
    await flushPromises();

    expect(cancelarDoble(wrapper).props('cancelando')).toBe(false);
    expect(cancelarDoble(wrapper).props('modelValue')).toBe(false);
    const aviso = wrapper.get('[data-test="aviso-pagina"]');
    expect(aviso.attributes('role')).toBe('status');
    expect(wrapper.get('[data-test="aviso-texto"]').text()).toMatch(
      /^Tu cita del \S+ \d+ quedó cancelada\.$/
    );
  });

  /**
   * El diálogo de cancelar sigue pidiendo cerrarse mientras cancela (la X,
   * «Volver»): la página no le hace caso hasta que el PATCH responde, igual
   * que el cajón de reserva y «Cambiar fecha». Si no, se reabría la misma cita
   * con la cancelación aún en vuelo y el error se perdía en un diálogo cerrado.
   */
  it('no se cierra mientras cancela; después, sí', async () => {
    let fallar: (e: unknown) => void = () => undefined;
    mockCancelar.mockReturnValue(
      new Promise<void>((_, rechazar) => (fallar = rechazar))
    );
    const wrapper = montar();
    await wrapper.findAll('[data-test="abrir-cancelar"]')[0].trigger('click');
    cancelarDoble(wrapper).vm.$emit('confirmar', 'r1');
    await nextTick();

    cancelarDoble(wrapper).vm.$emit('update:modelValue', false);
    await nextTick();
    expect(cancelarDoble(wrapper).props('modelValue')).toBe(true);

    fallar({ response: { status: 409, data: {} } });
    await flushPromises();
    expect(cancelarDoble(wrapper).props('modelValue')).toBe(true);
    expect(cancelarDoble(wrapper).props('error')).toBe(
      'Ya no se puede cancelar: la hora de la cita ya pasó.'
    );

    cancelarDoble(wrapper).vm.$emit('update:modelValue', false);
    await nextTick();
    expect(cancelarDoble(wrapper).props('modelValue')).toBe(false);
  });

  it('si falla, el error vuelve al diálogo y este sigue abierto', async () => {
    mockCancelar.mockRejectedValue({ response: { status: 409, data: {} } });
    const wrapper = montar();
    await wrapper.findAll('[data-test="abrir-cancelar"]')[0].trigger('click');

    cancelarDoble(wrapper).vm.$emit('confirmar', 'r1');
    await flushPromises();

    expect(cancelarDoble(wrapper).props('modelValue')).toBe(true);
    expect(cancelarDoble(wrapper).props('error')).toBe(
      'Ya no se puede cancelar: la hora de la cita ya pasó.'
    );
    expect(wrapper.find('[data-test="aviso-pagina"]').exists()).toBe(false);
  });

  it('al abrir otra cancelación no arrastra el error de la anterior', async () => {
    mockCancelar.mockRejectedValue({ response: { status: 409, data: {} } });
    const wrapper = montar();
    await wrapper.findAll('[data-test="abrir-cancelar"]')[0].trigger('click');
    cancelarDoble(wrapper).vm.$emit('confirmar', 'r1');
    await flushPromises();

    cancelarDoble(wrapper).vm.$emit('update:modelValue', false);
    await nextTick();
    await wrapper.findAll('[data-test="abrir-cancelar"]')[1].trigger('click');

    expect(cancelarDoble(wrapper).props('reserva').id).toBe('r2');
    expect(cancelarDoble(wrapper).props('error')).toBe('');
  });
});

describe('MyReservationsPage · cambiar fecha (M3)', () => {
  it('«Cambiar fecha» abre el diálogo con esa cita', async () => {
    const wrapper = montar();
    expect(moverDoble(wrapper).exists()).toBe(false);

    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[0]
      .trigger('click');

    expect(moverDoble(wrapper).props('modelValue')).toBe(true);
    expect(moverDoble(wrapper).props('reserva').id).toBe('r1');
  });

  it('movida sin cambio de estilista: «Tu cita quedó movida.»', async () => {
    const wrapper = montar();
    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[0]
      .trigger('click');

    moverDoble(wrapper).vm.$emit('reprogramada', 'r1', 'w1');
    await nextTick();

    expect(wrapper.get('[data-test="aviso-texto"]').text()).toBe(
      'Tu cita quedó movida.'
    );
  });

  it('si el sistema la reasignó, nombra a la estilista nueva de la lista refrescada', async () => {
    const wrapper = montar();
    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[1]
      .trigger('click');
    // r2 la repartió el sistema; el diálogo espera a la lista antes de avisar.
    mockQuery.data.value = lista().map((r) =>
      r.id === 'r2'
        ? { ...r, workerId: 'w2', worker: { id: 'w2', name: 'Sonia' } }
        : r
    );

    moverDoble(wrapper).vm.$emit('reprogramada', 'r2', 'w2');
    await nextTick();

    expect(wrapper.get('[data-test="aviso-texto"]').text()).toBe(
      'Tu cita quedó movida. Ahora te atiende Sonia.'
    );
  });

  /** Revisión final I2: la lista refrescada falló y sigue con la estilista vieja. */
  it('si la lista refrescada no llegó, igual dice que cambió la estilista', async () => {
    const wrapper = montar();
    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[1]
      .trigger('click');

    // La lista sigue como antes (w3, Alejandro); el PATCH dijo w2.
    moverDoble(wrapper).vm.$emit('reprogramada', 'r2', 'w2');
    await nextTick();

    expect(wrapper.get('[data-test="aviso-texto"]').text()).toBe(
      'Tu cita quedó movida. Te atenderá otra estilista.'
    );
  });

  it('un oyente antiguo de «reprogramada(id)» sin estilista sigue funcionando', async () => {
    const wrapper = montar();
    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[0]
      .trigger('click');

    moverDoble(wrapper).vm.$emit('reprogramada', 'r1');
    await nextTick();

    expect(wrapper.get('[data-test="aviso-texto"]').text()).toBe(
      'Tu cita quedó movida.'
    );
  });

  it('el aviso se puede descartar', async () => {
    const wrapper = montar();
    await wrapper
      .findAll('[data-test="abrir-cambiar-fecha"]')[0]
      .trigger('click');
    moverDoble(wrapper).vm.$emit('reprogramada', 'r1', 'w1');
    await nextTick();

    const descartar = wrapper.get('[data-test="descartar-aviso"]');
    expect(descartar.attributes('aria-label')).toBe('Descartar el aviso');
    await descartar.trigger('click');

    expect(wrapper.find('[data-test="aviso-pagina"]').exists()).toBe(false);
  });
});

describe('MyReservationsPage · reseña (M6)', () => {
  it('«Deja tu reseña» de una pasada cumplida pide el diálogo de reseña', async () => {
    const wrapper = montar();
    await wrapper.get('[data-test="plegar-pasadas"]').trigger('click');

    const botones = wrapper.findAll('[data-test="deja-resena"]');
    expect(botones).toHaveLength(1);
    await botones[0].trigger('click');

    expect(mockSolicitarResena).toHaveBeenCalledTimes(1);
  });
});
