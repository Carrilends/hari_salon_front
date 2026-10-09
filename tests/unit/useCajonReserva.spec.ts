/**
 * El estado del cajón de reserva (spec §1). Se corta por las consultas
 * (`useWorkerAvailability`, `useOcupacionDeLaTira`) y por `enviarReserva`;
 * la bolsa y la sesión son las de verdad (Pinia).
 *
 * El reloj es el de los tableros: miércoles 7 de octubre de 2026, 9:00 en
 * Bogotá. Las pruebas reservan el jueves 8 a las 10:30 (1 h, «Bob clásico»).
 */
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import type { WorkerAvailabilityResponse } from 'src/api/workers-api';
import type { ReservationOccupancyResponse } from 'src/helpers/booking-occupancy';
import { conMonicaOcupada, disponibilidad } from './fixtures/reserva';
import { servicio } from './fixtures/servicios';

const mockDisponibilidad = {
  data: ref<WorkerAvailabilityResponse | undefined>(undefined),
  isError: ref(false),
  refetch: jest.fn(),
};
const mockOcupacion = {
  data: ref<ReservationOccupancyResponse | undefined>(undefined),
  refetch: jest.fn(),
};
const mockEnviar = jest.fn();
const mockInvalidar = jest.fn();

jest.mock('src/composables/booking/useWorkerAvailability', () => ({
  useWorkerAvailability: () => mockDisponibilidad,
}));
jest.mock('src/composables/booking/useOcupacionDeLaTira', () => ({
  useOcupacionDeLaTira: () => mockOcupacion,
}));
jest.mock('src/composables/booking/enviarReserva', () => ({
  enviarReserva: (...args: unknown[]) => mockEnviar(...args),
}));
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidar }),
}));

import {
  MENSAJE_ERROR_ENVIO,
  MENSAJE_SESION_CERRADA,
  PAUSA_TRAS_CAMBIO_DE_PASO_MS,
  useCajonReserva,
} from 'src/composables/booking/useCajonReserva';
import { useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { MENSAJES_DATOS } from 'src/helpers/reserva-envio';

type Cajon = ReturnType<typeof useCajonReserva>;

const CREADA = {
  tipo: 'creada',
  reserva: { id: 'r1', workerId: 'w-alejandro' },
};

let pinia: Pinia;
const montados: VueWrapper[] = [];
const AHORA_EN_BOGOTA = new Date('2026-10-07T14:00:00Z');

beforeAll(() => {
  jest.useFakeTimers({
    doNotFake: [
      'nextTick',
      'setImmediate',
      'setTimeout',
      'clearTimeout',
      'queueMicrotask',
    ],
  });
  jest.setSystemTime(AHORA_EN_BOGOTA);
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  // Las pausas entre pasos adelantan el reloj: cada prueba vuelve a las 9:00.
  jest.setSystemTime(AHORA_EN_BOGOTA);
  pinia = createPinia();
  setActivePinia(pinia);
  mockDisponibilidad.data.value = disponibilidad();
  mockDisponibilidad.isError.value = false;
  mockDisponibilidad.refetch.mockReset();
  mockDisponibilidad.refetch.mockImplementation(async () => ({
    data: mockDisponibilidad.data.value,
  }));
  mockOcupacion.data.value = undefined;
  mockOcupacion.refetch.mockReset();
  mockEnviar.mockReset();
  mockInvalidar.mockReset();
});

afterEach(() => {
  // Sin desmontar, los `visibilitychange` de pruebas anteriores seguirían
  // escuchando.
  montados.splice(0).forEach((w) => w.unmount());
  delete (document as { visibilityState?: unknown }).visibilityState;
});

/** Lo que tarda la clienta en leer un paso antes de pulsar «Continuar». */
const dejarPasarLaPausa = () =>
  jest.advanceTimersByTime(PAUSA_TRAS_CAMBIO_DE_PASO_MS);

/** Monta el cajón (abierto, por defecto) y deja pasar la pausa de abrirlo. */
function montar(abiertoAlInicio = true) {
  const abierto = ref(abiertoAlInicio);
  let cajon!: Cajon;
  const wrapper = mount(
    defineComponent({
      setup() {
        cajon = useCajonReserva(abierto);
        return () => h('div');
      },
    }),
    { global: { plugins: [pinia] } }
  );
  montados.push(wrapper);
  dejarPasarLaPausa();
  return { cajon, abierto };
}

const conBolsa = () => useBookStore().addBooking(servicio());

const iniciarSesion = (fullName = 'Laura Gómez') =>
  useAuthStore().setSession(
    'token',
    { fullName, email: 'laura@correo.com', roles: ['user'] },
    Date.now() + 10 * 60_000
  );

/** Bolsa → jueves 8 → (estilista) → hora → «Tus datos». */
async function hastaDatos(
  cajon: Cajon,
  opciones: { estilista?: string | null; hora?: string } = {}
) {
  conBolsa();
  cajon.continuar();
  await nextTick();
  cajon.elegirFecha('2026/10/08');
  await nextTick();
  if (opciones.estilista !== undefined) {
    cajon.elegirEstilista(opciones.estilista);
    await nextTick();
  }
  cajon.elegirHora(opciones.hora ?? '10:30');
  await nextTick();
  dejarPasarLaPausa();
  cajon.continuar();
  await nextTick();
  expect(cajon.paso.value).toBe('datos');
}

const datosSinSesion = (cajon: Cajon) => {
  cajon.nombre.value = '  Ana María ';
  cajon.telefono.value = '300 123 4567';
  cajon.consentimiento.value = true;
};

describe('useCajonReserva · pasos', () => {
  it('empieza en «Tus servicios» y, con la bolsa vacía, no deja seguir', () => {
    const { cajon } = montar();

    expect(cajon.paso.value).toBe('servicios');
    expect(cajon.puedeContinuar.value).toBe(false);
  });

  it('con bolsa pasa a «Cuándo» y elige el primer día con hueco', async () => {
    mockOcupacion.data.value = {
      parallelStylists: 3,
      salonTimeZone: 'America/Bogota',
      salonNow: { ymd: '2026-10-07', minOfDay: 540 },
      byDate: { '2026/10/07': { usedMinutes: 660, capacityMinutes: 660 } },
    };
    const { cajon } = montar();
    conBolsa();

    cajon.continuar();

    expect(cajon.paso.value).toBe('cuando');
    expect(cajon.fecha.value).toBe('2026/10/08');
  });

  it('en «Cuándo» no sigue sin una hora libre elegida', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    cajon.elegirFecha('2026/10/08');
    await nextTick();

    expect(cajon.puedeContinuar.value).toBe(false);
    cajon.elegirEstilista('w-monica');
    cajon.elegirHora('09:00'); // Monica está ocupada a las 9
    expect(cajon.hora.value).toBeNull();
    cajon.elegirHora('10:30');
    expect(cajon.puedeContinuar.value).toBe(true);
  });

  it('«Atrás» deshace un paso', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon);

    cajon.atras();
    expect(cajon.paso.value).toBe('cuando');
    cajon.atras();
    expect(cajon.paso.value).toBe('servicios');
  });

  it('resume la cita para el pie y para «Tus datos»', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon, { estilista: 'w-monica' });

    expect(cajon.cita.value).toEqual({
      cuando: 'Jueves 8 de octubre · 10:30',
      detalle: 'Hasta las 11:30 · con Monica',
      servicios: 'Bob clásico',
    });
    expect(cajon.lineaResumen.value).toBe(
      'Jueves 8 de octubre · 10:30 a 11:30 · Monica'
    );
  });

  it('sin hora, el pie pide elegirla', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    cajon.elegirFecha('2026/10/08');
    await nextTick();

    expect(cajon.lineaResumen.value).toBe(
      'Jueves 8 de octubre · elige una hora'
    );
  });

  it('las estilistas son solo las asignables del día', () => {
    const { cajon } = montar();
    cajon.fecha.value = '2026/10/08';

    expect(cajon.estilistas.value.map((e) => e.id)).toEqual([
      'w-monica',
      'w-alejandro',
      'w-sonia',
    ]);
  });

  it('mientras no hay horas del día, carga; si fallan, lo dice', () => {
    mockDisponibilidad.data.value = undefined;
    const { cajon } = montar();
    cajon.fecha.value = '2026/10/08';

    expect(cajon.cargandoHuecos.value).toBe(true);
    mockDisponibilidad.isError.value = true;
    expect(cajon.cargandoHuecos.value).toBe(false);
    expect(cajon.errorHuecos.value).toBe(true);
    cajon.reintentarHuecos();
    expect(mockDisponibilidad.refetch).toHaveBeenCalled();
  });
});

describe('useCajonReserva · lo que se envía (B4)', () => {
  it('con sesión y sin teléfono: sin contact y sin pedir la casilla', async () => {
    iniciarSesion();
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);

    await cajon.confirmar();

    const [solicitud, conSesion] = mockEnviar.mock.calls[0];
    expect(solicitud).toEqual({
      scheduledAt: '2026-10-08T15:30:00.000Z',
      serviceIds: ['s1'],
    });
    expect(conSesion).toBe(true);
  });

  it('con sesión y teléfono: contact con el nombre de la cuenta', async () => {
    iniciarSesion();
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    cajon.telefono.value = '3001234567';

    await cajon.confirmar();

    expect(mockEnviar.mock.calls[0][0].contact).toEqual({
      name: 'Laura Gómez',
      phone: '3001234567',
    });
  });

  it('con sesión, teléfono y nombre de cuenta corto: la parte local del correo', async () => {
    iniciarSesion('Al');
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    cajon.telefono.value = '3001234567';

    await cajon.confirmar();

    expect(mockEnviar.mock.calls[0][0].contact).toEqual({
      name: 'laura',
      phone: '3001234567',
    });
  });

  it('sin sesión y con datos a medias: errores en línea y no envía', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon);

    await cajon.confirmar();

    expect(mockEnviar).not.toHaveBeenCalled();
    expect(cajon.paso.value).toBe('datos');
    expect(cajon.errores.value).toEqual({
      nombre: MENSAJES_DATOS.nombre,
      telefono: MENSAJES_DATOS.telefono,
      consentimiento: MENSAJES_DATOS.consentimiento,
    });
  });

  it('sin sesión: contact con lo escrito, y sin workerId si es sin preferencia', async () => {
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    const [solicitud, conSesion] = mockEnviar.mock.calls[0];
    expect(solicitud.contact).toEqual({
      name: 'Ana María',
      phone: '300 123 4567',
    });
    expect(solicitud).not.toHaveProperty('workerId');
    expect(conSesion).toBe(false);
  });

  it('con estilista elegida, la manda', async () => {
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon, { estilista: 'w-monica' });
    datosSinSesion(cajon);

    await cajon.confirmar();

    expect(mockEnviar.mock.calls[0][0].workerId).toBe('w-monica');
  });
});

describe('useCajonReserva · éxito (B5)', () => {
  it('pasa a éxito, vacía la bolsa y los datos, y NO abre WhatsApp', async () => {
    const abrir = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    expect(cajon.paso.value).toBe('exito');
    expect(abrir).not.toHaveBeenCalled();
    expect(useBookStore().bookings).toHaveLength(0);
    expect(cajon.nombre.value).toBe('');
    expect(cajon.telefono.value).toBe('');
    expect(cajon.consentimiento.value).toBe(false);
    abrir.mockRestore();
  });

  it('el resumen nombra a quien asignó el sistema y lleva el wa.me de siempre', async () => {
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    const resumen = cajon.resumen.value;
    expect(resumen?.fechaTexto).toBe('Jueves 8 de octubre');
    expect(resumen?.franja).toBe('10:30 a 11:30');
    expect(resumen?.estilista).toBe('Alejandro');
    expect(resumen?.total).toBe(45000);
    expect(resumen?.lineas).toEqual([
      { nombre: 'Bob clásico', cantidad: 1, precio: 45000 },
    ]);
    expect(resumen?.conSesion).toBe(false);
    expect(resumen?.avisoPorWhatsApp).toBe(true);
    expect(resumen?.urlWhatsApp).toMatch(
      /^https:\/\/wa\.me\/573208977471\?text=/
    );
    expect(decodeURIComponent(resumen?.urlWhatsApp ?? '')).toContain(
      '*Fecha y Hora:* Jueves 8 de octubre de 2026 a las 10:30'
    );
  });

  it('invalida horas, ocupación y «mis reservas»', async () => {
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();
    await flushPromises();

    const claves = mockInvalidar.mock.calls.map(([o]) => o.queryKey);
    expect(claves).toEqual(
      expect.arrayContaining([
        ['worker-availability'],
        ['reservation-occupancy'],
        ['reservations', 'me'],
      ])
    );
  });
});

describe('useCajonReserva · «la disponibilidad cambió» (B6)', () => {
  it('si la hora ya no está libre antes de enviar, vuelve a «Cuándo» sin enviar', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon, { estilista: 'w-monica' });
    datosSinSesion(cajon);
    mockDisponibilidad.refetch.mockImplementationOnce(async () => {
      mockDisponibilidad.data.value = conMonicaOcupada();
      return { data: mockDisponibilidad.data.value };
    });

    await cajon.confirmar();

    expect(mockEnviar).not.toHaveBeenCalled();
    expect(cajon.paso.value).toBe('cuando');
    expect(cajon.hora.value).toBeNull();
    expect(cajon.aviso.value).toEqual({
      texto:
        'La disponibilidad cambió y ya no hay tiempo suficiente con Monica a las 10:30.',
      ofrecerSinPreferencia: true,
    });
    expect(cajon.nombre.value).toBe('  Ana María ');
  });

  it('«Probar sin preferencia» recupera la hora si otra estilista puede', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon, { estilista: 'w-monica' });
    datosSinSesion(cajon);
    mockDisponibilidad.refetch.mockImplementationOnce(async () => {
      mockDisponibilidad.data.value = conMonicaOcupada();
      return { data: mockDisponibilidad.data.value };
    });
    await cajon.confirmar();

    cajon.probarSinPreferencia();
    await nextTick();

    expect(cajon.estilistaId.value).toBeNull();
    expect(cajon.hora.value).toBe('10:30');
    expect(cajon.aviso.value).toBeNull();
    expect(cajon.puedeContinuar.value).toBe(true);
  });

  it('«Elegir otra hora» quita el aviso y deja elegir', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon, { estilista: 'w-monica' });
    datosSinSesion(cajon);
    mockDisponibilidad.refetch.mockImplementationOnce(async () => {
      mockDisponibilidad.data.value = conMonicaOcupada();
      return { data: mockDisponibilidad.data.value };
    });
    await cajon.confirmar();

    cajon.elegirOtraHora();

    expect(cajon.aviso.value).toBeNull();
    expect(cajon.estilistaId.value).toBe('w-monica');
    expect(cajon.hora.value).toBeNull();
  });

  it('un 409 del servidor hace lo mismo; sin preferencia no ofrece pasar a ella', async () => {
    mockEnviar.mockResolvedValue({ tipo: 'conflicto' });
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    expect(cajon.paso.value).toBe('cuando');
    expect(cajon.aviso.value).toEqual({
      texto: 'La disponibilidad cambió y ya no queda hueco a las 10:30.',
      ofrecerSinPreferencia: false,
    });
    // Una recarga antes de enviar y otra después del 409.
    expect(mockDisponibilidad.refetch).toHaveBeenCalledTimes(2);
    expect(useBookStore().bookings).toHaveLength(1);
  });

  it('elegir una hora nueva quita el aviso', async () => {
    mockEnviar.mockResolvedValue({ tipo: 'conflicto' });
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);
    await cajon.confirmar();

    cajon.elegirHora('11:00');

    expect(cajon.aviso.value).toBeNull();
    expect(cajon.hora.value).toBe('11:00');
  });
});

describe('useCajonReserva · «Esa hora ya pasó»', () => {
  /** La disponibilidad de HOY (miércoles 7) a la hora del salón dada. */
  const deHoyALas = (minOfDay: number) =>
    disponibilidad({
      dayBounds: {
        openMin: 480,
        closeMin: 1200,
        effectiveStartMin: Math.max(480, minOfDay),
        isToday: true,
      },
      salonNow: { ymd: '2026-10-07', minOfDay, tz: 'America/Bogota' },
    });

  /** Bolsa → hoy, con Monica → 10:30 → «Tus datos». */
  async function hastaDatosHoy(cajon: Cajon) {
    mockDisponibilidad.data.value = deHoyALas(540);
    conBolsa();
    cajon.continuar();
    await nextTick();
    cajon.elegirFecha('2026/10/07');
    await nextTick();
    cajon.elegirEstilista('w-monica');
    await nextTick();
    cajon.elegirHora('10:30');
    await nextTick();
    dejarPasarLaPausa();
    cajon.continuar();
    await nextTick();
    expect(cajon.paso.value).toBe('datos');
  }

  it('si el backend dice que la hora ya pasó, vuelve a «Cuándo» con su aviso y recarga las horas', async () => {
    mockEnviar.mockResolvedValue({ tipo: 'hora-pasada' });
    const { cajon } = montar();
    await hastaDatosHoy(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    expect(cajon.paso.value).toBe('cuando');
    expect(cajon.hora.value).toBeNull();
    expect(cajon.aviso.value).toEqual({
      texto: 'Esa hora ya pasó. Elige otra.',
      ofrecerSinPreferencia: false,
    });
    expect(cajon.errorEnvio.value).toBeNull();
    // Una recarga antes de enviar y otra después del rechazo.
    expect(mockDisponibilidad.refetch).toHaveBeenCalledTimes(2);
    expect(mockInvalidar).toHaveBeenCalledWith({
      queryKey: ['reservation-occupancy'],
    });
    // Nada se pierde: ni los datos, ni la estilista, ni la bolsa.
    expect(cajon.nombre.value).toBe('  Ana María ');
    expect(cajon.telefono.value).toBe('300 123 4567');
    expect(cajon.consentimiento.value).toBe(true);
    expect(cajon.estilistaId.value).toBe('w-monica');
    expect(useBookStore().bookings).toHaveLength(1);
  });

  it('si al recargar antes de enviar la hora ya pasó, lo dice así (no «la disponibilidad cambió»)', async () => {
    const { cajon } = montar();
    await hastaDatosHoy(cajon);
    datosSinSesion(cajon);
    mockDisponibilidad.refetch.mockImplementationOnce(async () => {
      mockDisponibilidad.data.value = deHoyALas(631); // 10:31
      return { data: mockDisponibilidad.data.value };
    });

    await cajon.confirmar();

    expect(mockEnviar).not.toHaveBeenCalled();
    expect(cajon.paso.value).toBe('cuando');
    expect(cajon.aviso.value).toEqual({
      texto: 'Esa hora ya pasó. Elige otra.',
      ofrecerSinPreferencia: false,
    });
    expect(cajon.nombre.value).toBe('  Ana María ');
  });
});

describe('useCajonReserva · Foco de revisión', () => {
  it('1 · si la sesión se cerró al enviar, lo dice en línea', async () => {
    iniciarSesion();
    mockEnviar.mockResolvedValue({ tipo: 'sesion-cerrada' });
    const { cajon } = montar();
    await hastaDatos(cajon);

    await cajon.confirmar();

    expect(cajon.paso.value).toBe('datos');
    expect(cajon.errorEnvio.value).toBe(MENSAJE_SESION_CERRADA);
  });

  it('2 · dos toques en «Confirmar» mandan una sola reserva', async () => {
    let soltar!: (valor: unknown) => void;
    mockEnviar.mockImplementation(
      () =>
        new Promise((resolver) => {
          soltar = resolver;
        })
    );
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    const primera = cajon.confirmar();
    const segunda = cajon.confirmar();
    expect(cajon.puedeContinuar.value).toBe(false);
    await flushPromises();
    soltar(CREADA);
    await Promise.all([primera, segunda]);

    expect(mockEnviar).toHaveBeenCalledTimes(1);
    expect(cajon.paso.value).toBe('exito');
  });

  it('3a · si la bolsa crece y la hora ya no cabe, se borra la hora', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    cajon.elegirFecha('2026/10/08');
    await nextTick();
    cajon.elegirEstilista('w-monica');
    cajon.elegirHora('08:00'); // 8:00–9:00 le cabe justo a Monica
    await nextTick();

    useBookStore().addBooking(
      servicio({ id: 's2', name: 'Cejas', duration: 30 })
    );
    await nextTick();

    expect(cajon.hora.value).toBeNull();
  });

  it('3b · si la bolsa se vacía en «Cuándo» o «Tus datos», vuelve a la bolsa', async () => {
    const { cajon } = montar();
    await hastaDatos(cajon);

    useBookStore().removeBooking('s1');
    await nextTick();

    expect(cajon.paso.value).toBe('servicios');
  });

  it('4a · cerrar en el éxito deja el cajón limpio', async () => {
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon, abierto } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);
    await cajon.confirmar();

    abierto.value = false;
    await nextTick();
    abierto.value = true;
    await nextTick();

    expect(cajon.paso.value).toBe('servicios');
    expect(cajon.resumen.value).toBeNull();
  });

  it('4d · si algo lo cerró mientras registraba y la reserva quedó, al abrir se ve el éxito', async () => {
    let soltar!: (valor: unknown) => void;
    mockEnviar.mockImplementation(
      () =>
        new Promise((resolver) => {
          soltar = resolver;
        })
    );
    const { cajon, abierto } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    const envio = cajon.confirmar();
    await flushPromises();
    abierto.value = false;
    await nextTick();
    soltar(CREADA);
    await envio;
    abierto.value = true;
    await nextTick();

    expect(cajon.paso.value).toBe('exito');
    expect(cajon.resumen.value).not.toBeNull();
  });

  it('4b · abrir empieza en la bolsa y conserva lo elegido', async () => {
    const { cajon, abierto } = montar();
    await hastaDatos(cajon);

    abierto.value = false;
    await nextTick();
    abierto.value = true;
    await nextTick();

    expect(cajon.paso.value).toBe('servicios');
    expect(cajon.fecha.value).toBe('2026/10/08');
    expect(cajon.hora.value).toBe('10:30');
  });

  it('4c · una fecha que ya salió de la tira se cambia al seguir', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.fecha.value = '2026/10/01';
    await nextTick();

    cajon.continuar();

    expect(cajon.fecha.value).toBe('2026/10/07');
  });

  it('5 · un error de red no se lleva los datos ni la bolsa, ni abre WhatsApp', async () => {
    const abrir = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockEnviar.mockResolvedValue({ tipo: 'error' });
    const { cajon } = montar();
    await hastaDatos(cajon);
    datosSinSesion(cajon);

    await cajon.confirmar();

    expect(cajon.paso.value).toBe('datos');
    expect(cajon.errorEnvio.value).toBe(MENSAJE_ERROR_ENVIO);
    expect(cajon.nombre.value).toBe('  Ana María ');
    expect(cajon.telefono.value).toBe('300 123 4567');
    expect(cajon.consentimiento.value).toBe(true);
    expect(useBookStore().bookings).toHaveLength(1);
    expect(cajon.resumen.value).toBeNull();
    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('volver a la pestaña con el cajón abierto recarga ocupación y horas', async () => {
    const { cajon } = montar();
    cajon.fecha.value = '2026/10/08';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockOcupacion.refetch).toHaveBeenCalled();
    expect(mockDisponibilidad.refetch).toHaveBeenCalled();
  });

  it('con el cajón cerrado, volver a la pestaña no recarga nada', () => {
    const { cajon } = montar(false);
    cajon.fecha.value = '2026/10/08';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockOcupacion.refetch).not.toHaveBeenCalled();
    expect(mockDisponibilidad.refetch).not.toHaveBeenCalled();
  });

  it('2b · un doble toque en «Continuar» desde «Cuándo» no confirma sin ver «Tus datos»', async () => {
    // Con sesión y sin teléfono los datos ya son válidos: el caso peligroso.
    iniciarSesion();
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    await nextTick();
    cajon.elegirFecha('2026/10/08');
    await nextTick();
    cajon.elegirHora('10:30');
    await nextTick();
    dejarPasarLaPausa();

    cajon.continuar();
    cajon.continuar(); // en el mismo evento
    await nextTick();
    cajon.continuar(); // en el siguiente tic
    await flushPromises();

    expect(mockEnviar).not.toHaveBeenCalled();
    expect(cajon.paso.value).toBe('datos');
  });

  it('2c · pasada la pausa, «Continuar» en «Tus datos» sí confirma', async () => {
    iniciarSesion();
    mockEnviar.mockResolvedValue(CREADA);
    const { cajon } = montar();
    await hastaDatos(cajon);

    jest.advanceTimersByTime(PAUSA_TRAS_CAMBIO_DE_PASO_MS - 1);
    cajon.continuar();
    await flushPromises();
    expect(mockEnviar).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    cajon.continuar();
    await flushPromises();
    expect(mockEnviar).toHaveBeenCalledTimes(1);
    expect(cajon.paso.value).toBe('exito');
  });

  it('2d · abrir el cajón también cuenta como cambio de paso', async () => {
    const { cajon, abierto } = montar(false);
    conBolsa();
    abierto.value = true;
    await nextTick();

    cajon.continuar();
    expect(cajon.paso.value).toBe('servicios');
    dejarPasarLaPausa();
    cajon.continuar();
    expect(cajon.paso.value).toBe('cuando');
  });

  it('3c · si la bolsa crece y a la estilista ya no le alcanza, vuelve a «Sin preferencia»', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    cajon.elegirFecha('2026/10/08');
    await nextTick();
    cajon.elegirEstilista('w-monica'); // 180 min libres
    await nextTick();

    useBookStore().addBooking(
      servicio({ id: 's2', name: 'Cejas', duration: 30 })
    );
    await nextTick();
    expect(cajon.estilistaId.value).toBe('w-monica'); // 90 min: aún le alcanza

    useBookStore().addBooking(
      servicio({ id: 's3', name: 'Mechas', duration: 120 })
    );
    await nextTick();
    expect(cajon.estilistaId.value).toBeNull(); // 210 min: ya no
  });

  it('3d · si llega disponibilidad nueva sin tiempo para la estilista, vuelve a «Sin preferencia»', async () => {
    const { cajon } = montar();
    conBolsa();
    cajon.continuar();
    cajon.elegirFecha('2026/10/08');
    await nextTick();
    cajon.elegirEstilista('w-monica');
    await nextTick();

    const base = disponibilidad();
    mockDisponibilidad.data.value = {
      ...base,
      workers: base.workers.map((w) =>
        w.id === 'w-monica' ? { ...w, availableMinutes: 30 } : w
      ),
    };
    await nextTick();

    expect(cajon.estilistaId.value).toBeNull();
  });
});
