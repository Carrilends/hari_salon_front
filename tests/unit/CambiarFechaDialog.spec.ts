/**
 * «Cambiar fecha» (M3, tablero MisReservasA · Móvil 2): la tira de días y las
 * fichas de hora del cajón dentro de un diálogo; «Con quién» fijo (el PATCH
 * solo lleva la fecha); el aviso real cuando la estilista la repartió el
 * sistema; el choque del backend en línea.
 *
 * Las piezas del plan 1 se doblan como módulo (declaran sus props y emits de
 * §4.1) y `huecosDelDia` se sustituye para ver con qué se la llama: lo que se
 * prueba aquí es el diálogo, no el cálculo de huecos.
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import CambiarFechaDialog from 'src/components/reservations/CambiarFechaDialog.vue';
import { MENSAJE_SIN_CONEXION_RESERVAS } from 'src/helpers/my-reservations';
import type { DiaDeTira, HuecoDeHora } from 'src/helpers/reserva-huecos';
import type { WorkerAvailabilityResponse } from 'src/api/workers-api';
import type { ReservationDto } from 'src/interfaces/booking';
import { fijarViewport } from '../viewportMock';

const mockReprogramar = jest.fn();
jest.mock('src/api/reservations-api', () => ({
  rescheduleReservation: (...args: unknown[]) => mockReprogramar(...args),
}));

const mockInvalidar = jest.fn(() => Promise.resolve());
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidar }),
}));

const mockDisponibilidad = {
  data: ref<WorkerAvailabilityResponse | undefined>(undefined),
  isLoading: ref(false),
  isError: ref(false),
  refetch: jest.fn(),
};
jest.mock('src/composables/booking/useWorkerAvailability', () => ({
  useWorkerAvailability: () => mockDisponibilidad,
}));

const mockBYDATE = {
  '2026/10/08': { usedMinutes: 300, capacityMinutes: 1440 },
};
const mockOcupacion = {
  data: ref<{ byDate: typeof mockBYDATE } | undefined>({ byDate: mockBYDATE }),
};
const mockUsarOcupacion = jest.fn<typeof mockOcupacion, unknown[]>(
  () => mockOcupacion
);
jest.mock('src/composables/booking/useOcupacionDeLaTira', () => ({
  useOcupacionDeLaTira: (...args: unknown[]) => mockUsarOcupacion(...args),
}));

const mockRANGO = { desde: '2026-10-07', hasta: '2026-10-20' };
const mockDiasDeLaTira = jest.fn();
const mockHuecosDelDia = jest.fn();
jest.mock('src/helpers/reserva-huecos', () => ({
  diasDeLaTira: (...args: unknown[]) => mockDiasDeLaTira(...args),
  huecosDelDia: (args: unknown) => mockHuecosDelDia(args),
  rangoDeLaTira: () => mockRANGO,
}));

jest.mock('src/components/reserva/TiraDeDias.vue', () => ({
  __esModule: true,
  default: {
    name: 'TiraDeDias',
    props: ['dias', 'seleccionado'],
    emits: ['elegir'],
    template: '<div data-test="tira-dias" />',
  },
}));
jest.mock('src/components/reserva/FichasDeHora.vue', () => ({
  __esModule: true,
  default: {
    name: 'FichasDeHora',
    props: ['huecos', 'seleccionada', 'cargando'],
    emits: ['elegir'],
    template: '<div data-test="fichas-hora" />',
  },
}));
jest.mock('src/components/reserva/FichasDeEstilista.vue', () => ({
  __esModule: true,
  default: {
    name: 'FichasDeEstilista',
    props: ['estilistas', 'seleccionada', 'duracionMin', 'fija'],
    emits: ['elegir'],
    template: '<div data-test="fichas-estilista" />',
  },
}));

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position'],
  emits: ['update:modelValue'],
  template:
    '<div class="q-dialog-doble" :data-posicion="position" :data-maximizado="maximized ? \'si\' : \'no\'"><slot v-if="modelValue" /></div>',
};

const DIAS: DiaDeTira[] = ['2026/10/07', '2026/10/08', '2026/10/09'].map(
  (fecha, i): DiaDeTira => ({
    fecha,
    diaSemanaCorto: ['MIÉ', 'JUE', 'VIE'][i],
    numero: 7 + i,
    esHoy: i === 0,
    esFestivo: false,
    horario: { abre: '8:00', cierra: '20:00' },
    disponibilidad: 'desconocida',
  })
);

const HUECOS: HuecoDeHora[] = [
  { hora: '08:00', minutoDelDia: 480, franja: 'manana', libre: true },
  { hora: '10:30', minutoDelDia: 630, franja: 'manana', libre: true },
  { hora: '15:00', minutoDelDia: 900, franja: 'tarde', libre: true },
  { hora: '16:00', minutoDelDia: 960, franja: 'tarde', libre: false },
];

const DISPONIBILIDAD: WorkerAvailabilityResponse = {
  workers: [
    {
      id: 'w1',
      name: 'Monica',
      isDefault: false,
      assignable: true,
      usedMinutes: 90,
      capacityMinutes: 720,
      availableMinutes: 630,
      reservations: [
        { startMin: 630, endMin: 690 }, // la propia cita
        { startMin: 900, endMin: 930 },
      ],
    },
    {
      id: 'w2',
      name: 'Sonia',
      isDefault: false,
      assignable: true,
      usedMinutes: 0,
      capacityMinutes: 720,
      availableMinutes: 720,
      reservations: [],
    },
  ],
  dayBounds: {
    openMin: 480,
    closeMin: 1200,
    effectiveStartMin: 480,
    isToday: false,
  },
  salonNow: { ymd: '2026-10-07', minOfDay: 720, tz: 'America/Bogota' },
};

const RESERVA: ReservationDto = {
  id: 'r1',
  scheduledAt: '2026-10-08T15:30:00.000Z', // jueves 8, 10:30 en Bogotá
  endedAt: '2026-10-08T16:30:00.000Z',
  workerId: 'w1',
  worker: { id: 'w1', name: 'Monica' },
  workerPinned: true,
  totalDurationMinutes: 60,
  status: 'confirmada',
  userId: 'u1',
  contact: null,
  services: [
    { serviceId: 's1', name: 'Wolf cut mujer', price: 1, durationMinutes: 30 },
    { serviceId: 's2', name: 'Uñas de gel', price: 1, durationMinutes: 30 },
  ],
};

type Props = {
  reserva: ReservationDto;
  modelValue: boolean;
  permitirEstilista: boolean;
};

const montar = (cambios: Partial<Props> = {}) =>
  mount(CambiarFechaDialog, {
    props: { reserva: RESERVA, modelValue: true, ...cambios },
    global: { components: { QDialog } },
  });
type Dialogo = ReturnType<typeof montar>;

async function elegir(wrapper: Dialogo, fecha: string | null, hora: string) {
  if (fecha) {
    wrapper.findComponent({ name: 'TiraDeDias' }).vm.$emit('elegir', fecha);
    await nextTick();
  }
  wrapper.findComponent({ name: 'FichasDeHora' }).vm.$emit('elegir', hora);
  await nextTick();
}

const ultimaLlamadaAHuecos = () =>
  mockHuecosDelDia.mock.calls[mockHuecosDelDia.mock.calls.length - 1][0] as {
    fecha: string;
    duracionMin: number;
    disponibilidad: WorkerAvailabilityResponse;
    estilistaId: string | null;
  };

// Un diálogo de la prueba anterior que siguiera montado volvería a pintarse
// al cambiar el doble compartido de la ocupación y ensuciaría las llamadas.
enableAutoUnmount(afterEach);

beforeEach(() => {
  fijarViewport({ ancho: 1280 });
  mockReprogramar.mockReset();
  mockInvalidar.mockClear();
  mockDiasDeLaTira.mockReset().mockReturnValue(DIAS);
  mockHuecosDelDia.mockReset().mockReturnValue(HUECOS);
  mockDisponibilidad.data.value = DISPONIBILIDAD;
  mockDisponibilidad.isLoading.value = false;
  mockDisponibilidad.isError.value = false;
  mockDisponibilidad.refetch.mockReset();
  mockUsarOcupacion.mockClear();
  mockOcupacion.data.value = { byDate: mockBYDATE };
});

describe('CambiarFechaDialog · lo que enseña', () => {
  it('cerrado no pinta nada', () => {
    expect(
      montar({ modelValue: false }).find('[data-test="cambiar-fecha"]').exists()
    ).toBe(false);
  });

  it('la cabecera dice la cita actual', () => {
    expect(montar().get('[data-test="cita-actual"]').text()).toBe(
      'Ahora: jueves 8 · 10:30 a 11:30 · Wolf cut mujer, Uñas de gel · 60 min'
    );
  });

  it('abre en el día de la cita, sin hora elegida y sin poder guardar', () => {
    const wrapper = montar();

    expect(
      wrapper.findComponent({ name: 'TiraDeDias' }).props('seleccionado')
    ).toBe('2026/10/08');
    expect(
      wrapper.findComponent({ name: 'FichasDeHora' }).props('seleccionada')
    ).toBeNull();
    expect(
      wrapper.get('[data-test="guardar-fecha"]').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.find('[data-test="cita-nueva"]').exists()).toBe(false);
  });

  it('la tira es la de 14 días del cajón, con la ocupación real y la duración de la cita', () => {
    montar();

    const [ahora, ocupacion, duracion] = mockDiasDeLaTira.mock.calls[0];
    expect(ahora).toHaveProperty('qDate');
    // `byDate` tal cual llega (hoja de ruta §4.1): sin transformar (el `ref`
    // del doble lo envuelve en un proxy, por eso `toEqual` y no `toBe`).
    expect(ocupacion).toEqual(mockBYDATE);
    expect(duracion).toBe(60);
  });

  it('pide la ocupación del rango de la tira, y solo con el diálogo abierto', async () => {
    const wrapper = montar();

    const [rango, activo] = mockUsarOcupacion.mock.calls[0] as [
      () => { desde: string; hasta: string },
      () => boolean
    ];
    expect(rango()).toEqual(mockRANGO);
    expect(activo()).toBe(true);

    await wrapper.setProps({ modelValue: false });
    expect(activo()).toBe(false);
  });

  it('sin ocupación todavía, la tira sale igual (días sin punto)', () => {
    mockOcupacion.data.value = undefined;
    montar();

    expect(mockDiasDeLaTira.mock.calls[0][1]).toBeUndefined();
  });

  it('la etiqueta del día dice el mes y la de la hora la duración', () => {
    const texto = montar().text();

    expect(texto).toContain('Qué día · octubre');
    expect(texto).toContain('A qué hora · caben 60 min');
  });

  it('«Con quién» va fijo con su estilista (M3)', () => {
    const fichas = montar().findComponent({ name: 'FichasDeEstilista' });

    expect(fichas.props('fija')).toBe(true);
    expect(fichas.props('seleccionada')).toBe('w1');
    expect(fichas.props('duracionMin')).toBe(60);
    expect(fichas.props('estilistas')).toHaveLength(1);
    expect(fichas.props('estilistas')[0].name).toBe('Monica');
  });

  it('si la eligió ella, se le dice que se mantiene y no se la alarma', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="nota-elegida"]').text()).toBe(
      'La elegiste tú: se mantiene.'
    );
    expect(wrapper.find('[data-test="aviso-asignada"]').exists()).toBe(false);
  });

  it('si la repartió el sistema, se avisa con el texto real (M3)', () => {
    const wrapper = montar({ reserva: { ...RESERVA, workerPinned: false } });

    expect(wrapper.get('[data-test="aviso-asignada"]').text()).toBe(
      'Cambiar la hora puede significar que te atienda otra estilista.'
    );
    expect(wrapper.find('[data-test="nota-elegida"]').exists()).toBe(false);
  });

  it('las fichas de hora muestran el esqueleto mientras llega el día', () => {
    mockDisponibilidad.isLoading.value = true;

    expect(
      montar().findComponent({ name: 'FichasDeHora' }).props('cargando')
    ).toBe(true);
  });

  it('si el día no llega, lo dice y deja reintentar', async () => {
    mockDisponibilidad.isError.value = true;
    const wrapper = montar();

    expect(wrapper.get('[data-test="error-huecos"]').attributes('role')).toBe(
      'alert'
    );
    await wrapper.get('[data-test="reintentar-huecos"]').trigger('click');

    expect(mockDisponibilidad.refetch).toHaveBeenCalled();
  });
});

describe('CambiarFechaDialog · los huecos', () => {
  it('con estilista elegida, los huecos son los de ella', () => {
    montar();

    expect(ultimaLlamadaAHuecos()).toMatchObject({
      fecha: '2026/10/08',
      duracionMin: 60,
      estilistaId: 'w1',
    });
  });

  it('si la repartió el sistema, vale cualquiera (como al reservar sin preferencia)', () => {
    montar({ reserva: { ...RESERVA, workerPinned: false } });

    expect(ultimaLlamadaAHuecos().estilistaId).toBeNull();
  });

  /** Foco de revisión 1. */
  it('la propia cita no le ocupa el hueco a su estilista', () => {
    montar();

    const monica = ultimaLlamadaAHuecos().disponibilidad.workers.find(
      (w) => w.id === 'w1'
    );
    expect(monica?.reservations).toEqual([{ startMin: 900, endMin: 930 }]);
  });

  it('otro día la disponibilidad pasa entera', async () => {
    const wrapper = montar();

    wrapper
      .findComponent({ name: 'TiraDeDias' })
      .vm.$emit('elegir', '2026/10/09');
    await nextTick();

    expect(ultimaLlamadaAHuecos().fecha).toBe('2026/10/09');
    expect(
      ultimaLlamadaAHuecos().disponibilidad.workers[0].reservations
    ).toHaveLength(2);
  });

  it('cambiar de día borra la hora elegida', async () => {
    const wrapper = montar();
    await elegir(wrapper, null, '15:00');

    wrapper
      .findComponent({ name: 'TiraDeDias' })
      .vm.$emit('elegir', '2026/10/09');
    await nextTick();

    expect(
      wrapper.findComponent({ name: 'FichasDeHora' }).props('seleccionada')
    ).toBeNull();
  });
});

describe('CambiarFechaDialog · mover', () => {
  it('con día y hora nuevos dice la cita nueva y la mueve', async () => {
    mockReprogramar.mockResolvedValue({ id: 'r1', workerId: 'w1' });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    expect(wrapper.get('[data-test="cita-nueva"]').text()).toBe(
      'Nueva: viernes 9 · 15:00 a 16:00 · Monica'
    );
    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    expect(mockReprogramar).toHaveBeenCalledWith(
      'r1',
      '2026-10-09T20:00:00.000Z'
    );
    expect(mockInvalidar).toHaveBeenCalledWith({ queryKey: ['reservations'] });
    expect(mockInvalidar).toHaveBeenCalledWith({
      queryKey: ['worker-availability'],
    });
    expect(mockInvalidar).toHaveBeenCalledWith({
      queryKey: ['reservation-occupancy'],
    });
    expect(wrapper.emitted('reprogramada')).toEqual([['r1']]);
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('avisa a la página solo cuando la lista ya está refrescada', async () => {
    let terminar: () => void = () => undefined;
    mockInvalidar.mockImplementationOnce(
      () => new Promise<void>((r) => (terminar = r))
    );
    mockReprogramar.mockResolvedValue({ id: 'r1', workerId: 'w1' });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('reprogramada')).toBeUndefined();

    terminar();
    await flushPromises();
    expect(wrapper.emitted('reprogramada')).toEqual([['r1']]);
  });

  it('sin estilista elegida la cita nueva no promete un nombre', async () => {
    const wrapper = montar({ reserva: { ...RESERVA, workerPinned: false } });
    await elegir(wrapper, '2026/10/09', '15:00');

    expect(wrapper.get('[data-test="cita-nueva"]').text()).toBe(
      'Nueva: viernes 9 · 15:00 a 16:00'
    );
  });

  /** Foco de revisión 3. */
  it('con la misma fecha y hora que ya tiene no deja mover', async () => {
    const wrapper = montar();
    await elegir(wrapper, null, '10:30');

    expect(
      wrapper.get('[data-test="guardar-fecha"]').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.find('[data-test="cita-nueva"]').exists()).toBe(false);
  });

  it('una hora ocupada no se puede guardar aunque llegue elegida', async () => {
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '16:00');

    expect(
      wrapper.get('[data-test="guardar-fecha"]').attributes('disabled')
    ).toBeDefined();
  });

  /** Foco de revisión 2. */
  it('dos toques seguidos mandan un solo PATCH', async () => {
    mockReprogramar.mockReturnValue(new Promise(() => undefined));
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');
    const boton = wrapper.get('[data-test="guardar-fecha"]');

    void boton.trigger('click');
    void boton.trigger('click');
    await flushPromises();

    expect(mockReprogramar).toHaveBeenCalledTimes(1);
    expect(boton.attributes('aria-busy')).toBe('true');
    expect(boton.text()).toBe('Moviendo…');
  });

  it('el choque con su estilista se dice en línea y se vuelve a pedir el día', async () => {
    mockReprogramar.mockRejectedValue({
      response: { status: 409, data: { reason: 'estilista_ocupada' } },
    });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    const aviso = wrapper.get('[data-test="aviso-choque"]');
    expect(aviso.attributes('role')).toBe('alert');
    expect(aviso.text()).toBe(
      'Monica no tiene ese hueco. Prueba otra hora, o reserva de nuevo sin preferencia de estilista.'
    );
    expect(mockDisponibilidad.refetch).toHaveBeenCalled();
    expect(wrapper.emitted('reprogramada')).toBeUndefined();
    expect(
      wrapper.get('[data-test="guardar-fecha"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('elegir otra hora quita el aviso del choque', async () => {
    mockReprogramar.mockRejectedValue({
      response: { status: 409, data: { reason: 'hora_ocupada' } },
    });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');
    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="aviso-choque"]').exists()).toBe(true);

    await elegir(wrapper, null, '08:00');

    expect(wrapper.find('[data-test="aviso-choque"]').exists()).toBe(false);
  });

  /** Foco de revisión 4. */
  it('sin conexión lo dice así y conserva lo elegido', async () => {
    mockReprogramar.mockRejectedValue({
      isAxiosError: true,
      code: 'ERR_NETWORK',
      request: {},
    });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-test="aviso-choque"]').text()).toBe(
      MENSAJE_SIN_CONEXION_RESERVAS
    );
    expect(
      wrapper.findComponent({ name: 'FichasDeHora' }).props('seleccionada')
    ).toBe('15:00');
    expect(wrapper.find('[data-test="cita-nueva"]').exists()).toBe(true);
  });

  /** Foco de revisión 5. */
  it('al reabrir con otra cita no arrastra el aviso ni la hora de la anterior', async () => {
    mockReprogramar.mockRejectedValue({
      response: { status: 409, data: { reason: 'estilista_ocupada' } },
    });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');
    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({
      reserva: { ...RESERVA, id: 'r2' },
      modelValue: true,
    });

    expect(wrapper.find('[data-test="aviso-choque"]').exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: 'FichasDeHora' }).props('seleccionada')
    ).toBeNull();
    expect(
      wrapper.findComponent({ name: 'TiraDeDias' }).props('seleccionado')
    ).toBe('2026/10/08');
  });

  it('si la lista se refresca con la misma cita abierta, no borra lo elegido', async () => {
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    // El canal en tiempo real invalida «mis reservas»: llega otro objeto
    // para la MISMA cita.
    await wrapper.setProps({ reserva: { ...RESERVA } });

    expect(
      wrapper.findComponent({ name: 'TiraDeDias' }).props('seleccionado')
    ).toBe('2026/10/09');
    expect(
      wrapper.findComponent({ name: 'FichasDeHora' }).props('seleccionada')
    ).toBe('15:00');
  });

  it('un 400 (en el pasado, fuera de horario) no culpa a la conexión', async () => {
    mockReprogramar.mockRejectedValue({
      response: {
        status: 400,
        data: { message: 'La reserva no puede programarse en el pasado' },
      },
    });
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');

    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-test="aviso-choque"]').text()).toBe(
      'No se pudo cambiar la fecha. Revisa el horario e intenta de nuevo.'
    );
  });

  it('si se reabre con otra cita mientras mueve, avisa de la que movió y no cierra la nueva', async () => {
    let terminar: (valor: unknown) => void = () => undefined;
    mockReprogramar.mockReturnValueOnce(new Promise((r) => (terminar = r)));
    const wrapper = montar();
    await elegir(wrapper, '2026/10/09', '15:00');
    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');

    await wrapper.setProps({ modelValue: false });
    await wrapper.setProps({
      reserva: { ...RESERVA, id: 'r2' },
      modelValue: true,
    });
    terminar({ id: 'r1', workerId: 'w1' });
    await flushPromises();

    expect(wrapper.emitted('reprogramada')).toEqual([['r1']]);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(
      wrapper.get('[data-test="guardar-fecha"]').attributes('aria-busy')
    ).toBe('false');
  });

  it('«permitirEstilista» no cambia nada mientras el PATCH no admita estilista', async () => {
    mockReprogramar.mockResolvedValue({ id: 'r1', workerId: 'w1' });
    const wrapper = montar({ permitirEstilista: true });

    expect(
      wrapper.findComponent({ name: 'FichasDeEstilista' }).props('fija')
    ).toBe(true);
    await elegir(wrapper, '2026/10/09', '15:00');
    await wrapper.get('[data-test="guardar-fecha"]').trigger('click');
    await flushPromises();

    expect(mockReprogramar.mock.calls[0]).toHaveLength(2);
  });
});

describe('CambiarFechaDialog · cerrar y tamaño', () => {
  it('la X y «Volver» cierran sin mover', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cerrar-cambiar-fecha"]').trigger('click');
    await wrapper.get('[data-test="volver-cambiar-fecha"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]]);
    expect(mockReprogramar).not.toHaveBeenCalled();
  });

  it('la X tiene nombre: es un botón de solo icono', () => {
    expect(
      montar()
        .get('[data-test="cerrar-cambiar-fecha"]')
        .attributes('aria-label')
    ).toBe('Cerrar');
  });

  it('la X y «Volver» son botones planos: suben sin dibujar una caja', () => {
    const wrapper = montar();

    expect(
      wrapper.get('[data-test="cerrar-cambiar-fecha"]').classes()
    ).toContain('m-boton-plano');
    expect(
      wrapper.get('[data-test="volver-cambiar-fecha"]').classes()
    ).toContain('m-boton-plano');
  });

  it('en escritorio es un diálogo; en móvil, a pantalla completa desde abajo', async () => {
    const escritorio = montar();
    await nextTick();
    const capaEscritorio = escritorio.get('.q-dialog-doble');
    expect(capaEscritorio.attributes('data-posicion')).toBe('standard');
    expect(capaEscritorio.attributes('data-maximizado')).toBe('no');

    fijarViewport({ ancho: 390 });
    const movil = montar();
    await nextTick();
    const capaMovil = movil.get('.q-dialog-doble');
    expect(capaMovil.attributes('data-posicion')).toBe('bottom');
    expect(capaMovil.attributes('data-maximizado')).toBe('si');
    expect(movil.get('[data-test="cambiar-fecha"]').classes()).toContain(
      'cambiar-fecha--hoja'
    );
  });
});
