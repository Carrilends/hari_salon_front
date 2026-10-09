/**
 * El cajón entero, montado con sus piezas de verdad y su composable de
 * verdad. Se cortan las consultas, el envío y el router. Comprueba lo que la
 * spec §1 cambia de conducta: un solo diálogo sin pestaña de administración
 * (B1, B7), WhatsApp que ya no se abre solo (B5) y «la disponibilidad cambió»
 * en línea (B6).
 */
import { nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
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
const mockPush = jest.fn();

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
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ fullPath: '/services?pagina=2', path: '/services' }),
}));

import CajonReserva from 'src/components/reserva/CajonReserva.vue';
import { useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { PAUSA_TRAS_CAMBIO_DE_PASO_MS } from 'src/composables/booking/useCajonReserva';

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'persistent'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
};

let pinia: Pinia;

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
  mockEnviar.mockReset();
  mockPush.mockReset();
  useAssistantPanel().cerrar();
});

const montar = () =>
  mount(CajonReserva, {
    props: { abierto: true },
    global: { plugins: [pinia], components: { QDialog } },
  });

type Cajon = ReturnType<typeof montar>;

/**
 * Tras cambiar de paso (abrir el cajón cuenta), «Continuar» espera
 * `PAUSA_TRAS_CAMBIO_DE_PASO_MS`: un doble toque no confirma sin ver «Tus
 * datos». Una clienta de verdad tarda más que eso en tocar otra vez.
 */
const dejarPasarLaPausa = () =>
  jest.advanceTimersByTime(PAUSA_TRAS_CAMBIO_DE_PASO_MS);

const pulsar = async (wrapper: Cajon, selector: string) => {
  await wrapper.get(selector).trigger('click');
  await flushPromises();
};

/** Bolsa → jueves 8 → (estilista) → 10:30 → «Tus datos». */
async function hastaDatos(wrapper: Cajon, estilista?: string) {
  dejarPasarLaPausa();
  await pulsar(wrapper, '[data-test="continuar"]');
  await wrapper.findAll('[data-test="dia"]')[1].trigger('click');
  await nextTick();
  if (estilista) {
    const ficha = wrapper
      .findAll('[data-test="ficha-estilista"]')
      .find((f) => f.text().includes(estilista));
    await ficha?.trigger('click');
    await nextTick();
  }
  const diezYMedia = wrapper
    .findAll('[data-test="ficha-hora"]')
    .find((f) => f.text() === '10:30');
  await diezYMedia?.trigger('click');
  await nextTick();
  dejarPasarLaPausa();
  await pulsar(wrapper, '[data-test="continuar"]');
}

async function rellenarSinSesion(wrapper: Cajon) {
  await wrapper.get('[data-test="campo-nombre"]').setValue('Ana María');
  await wrapper.get('[data-test="campo-telefono"]').setValue('3001234567');
  await wrapper.get('[data-test="casilla-consentimiento"]').setValue(true);
}

describe('CajonReserva', () => {
  it('es un solo diálogo, sin pestaña de administración, ni para la dueña (B7)', () => {
    useAuthStore().setSession(
      'token',
      { fullName: 'Marlene', email: 'marlene@correo.com', roles: ['admin'] },
      Date.now() + 10 * 60_000
    );
    useBookStore().addBooking(servicio());
    const wrapper = montar();

    expect(wrapper.findAll('.q-dialog')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Administración de reservas');
    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Elegir Fecha y Hora');
  });

  it('la cabecera dice cuántos servicios y en qué paso va', () => {
    useBookStore().addBooking(servicio());
    const wrapper = montar();

    expect(wrapper.get('[data-test="cuenta-servicios"]').text()).toBe(
      '1 servicio'
    );
    expect(wrapper.get('h2').text()).toBe('Tu reserva');
    expect(wrapper.get('[data-test="paso-actual"]').text()).toContain(
      'Servicios'
    );
  });

  it('el pie lleva el total y la duración aproximada', () => {
    useBookStore().addBooking(servicio());
    const wrapper = montar();

    expect(wrapper.get('[data-test="total"]').text()).toBe('$ 45.000');
    expect(wrapper.text()).toContain('aprox. 1 h');
    expect(wrapper.find('[data-test="atras"]').exists()).toBe(false);
  });

  it('con la bolsa vacía, «Continuar» no deja seguir', () => {
    const wrapper = montar();

    expect(wrapper.find('[data-test="bolsa-vacia"]').exists()).toBe(true);
    expect(
      wrapper.get('[data-test="continuar"]').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.text()).toContain('sin servicios');
  });

  it('recorre los tres pasos y confirma; WhatsApp no se abre solo (B5)', async () => {
    const abrir = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockEnviar.mockResolvedValue({
      tipo: 'creada',
      reserva: { id: 'r1', workerId: 'w-alejandro' },
    });
    useBookStore().addBooking(servicio());
    const wrapper = montar();

    await hastaDatos(wrapper);
    expect(wrapper.get('[data-test="paso-actual"]').text()).toContain(
      'Tus datos'
    );
    expect(wrapper.get('[data-test="continuar"]').text()).toBe(
      'Confirmar reserva'
    );
    await rellenarSinSesion(wrapper);
    dejarPasarLaPausa();
    await pulsar(wrapper, '[data-test="continuar"]');

    expect(wrapper.find('[data-test="pantalla-exito"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="indicador-pasos"]').exists()).toBe(false);
    expect(abrir).not.toHaveBeenCalled();
    expect(
      wrapper.get('[data-test="avisar-whatsapp"]').attributes('href')
    ).toMatch(/^https:\/\/wa\.me\/573208977471\?text=/);
    expect(useBookStore().bookings).toHaveLength(0);
    abrir.mockRestore();
  });

  it('la disponibilidad cambió: vuelve a «Cuándo» con el aviso y sus dos salidas (B6)', async () => {
    useBookStore().addBooking(servicio());
    const wrapper = montar();
    await hastaDatos(wrapper, 'Monica');
    await rellenarSinSesion(wrapper);
    mockDisponibilidad.refetch.mockImplementationOnce(async () => {
      mockDisponibilidad.data.value = conMonicaOcupada();
      return { data: mockDisponibilidad.data.value };
    });

    dejarPasarLaPausa();
    await pulsar(wrapper, '[data-test="continuar"]');

    expect(wrapper.find('[data-test="paso-cuando"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="aviso-disponibilidad"]').text()).toContain(
      'La disponibilidad cambió y ya no hay tiempo suficiente con Monica a las 10:30.'
    );
    expect(wrapper.get('[data-test="linea-resumen"]').text()).toContain(
      'elige otra hora'
    );
    expect(mockEnviar).not.toHaveBeenCalled();

    await pulsar(wrapper, '[data-test="probar-sin-preferencia"]');

    expect(wrapper.find('[data-test="aviso-disponibilidad"]').exists()).toBe(
      false
    );
    expect(
      wrapper
        .get('[data-test="ficha-sin-preferencia"]')
        .attributes('aria-pressed')
    ).toBe('true');
    const diezYMedia = wrapper
      .findAll('[data-test="ficha-hora"]')
      .find((f) => f.text() === '10:30');
    expect(diezYMedia?.attributes('aria-pressed')).toBe('true');
  });

  it('con sesión, «Tus datos» no pide nombre ni casilla', async () => {
    useAuthStore().setSession(
      'token',
      { fullName: 'Laura Gómez', email: 'laura@correo.com', roles: ['user'] },
      Date.now() + 10 * 60_000
    );
    useBookStore().addBooking(servicio());
    const wrapper = montar();

    await hastaDatos(wrapper);

    expect(wrapper.find('[data-test="reservas-como"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="campo-nombre"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="casilla-consentimiento"]').exists()).toBe(
      false
    );
  });

  it('mientras registra no se cierra: ni la X, ni Escape, ni el velo; luego se ve el éxito', async () => {
    let soltar!: (valor: unknown) => void;
    mockEnviar.mockImplementation(
      () =>
        new Promise((resolver) => {
          soltar = resolver;
        })
    );
    useBookStore().addBooking(servicio());
    const wrapper = montar();
    await hastaDatos(wrapper);
    await rellenarSinSesion(wrapper);
    dejarPasarLaPausa();
    await pulsar(wrapper, '[data-test="continuar"]');
    expect(wrapper.get('[data-test="continuar"]').text()).toBe('Registrando…');

    const dialogo = wrapper.findComponent({ name: 'QDialog' });
    // `persistent`: QDialog ignora Escape, el velo y el cambio de ruta.
    expect(dialogo.props('persistent')).toBe(true);
    const cerrarCajon = wrapper.get('[data-test="cerrar-cajon"]');
    expect(cerrarCajon.attributes('disabled')).toBeDefined();
    await cerrarCajon.trigger('click');
    dialogo.vm.$emit('update:modelValue', false);
    await nextTick();
    expect(wrapper.emitted('update:abierto')).toBeUndefined();

    soltar({ tipo: 'creada', reserva: { id: 'r1', workerId: 'w-alejandro' } });
    await flushPromises();

    expect(wrapper.find('[data-test="pantalla-exito"]').exists()).toBe(true);
    expect(dialogo.props('persistent')).toBe(false);
    expect(
      wrapper.get('[data-test="cerrar-cajon"]').attributes('disabled')
    ).toBeUndefined();
  });

  it('cerrar emite update:abierto con false', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cerrar-cajon"]').trigger('click');

    expect(wrapper.emitted('update:abierto')?.[0]).toEqual([false]);
    expect(
      wrapper.get('[data-test="cerrar-cajon"]').attributes('aria-label')
    ).toBe('Cerrar');
  });

  it('«Ver servicios» cierra y lleva a servicios', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="ver-servicios"]').trigger('click');

    expect(wrapper.emitted('update:abierto')?.[0]).toEqual([false]);
    expect(mockPush).toHaveBeenCalledWith('/services');
  });

  it('el asistente se abre desde la bolsa vacía', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="abrir-asistente"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
    expect(wrapper.emitted('update:abierto')?.[0]).toEqual([false]);
  });

  it('«Entra» lleva al acceso y vuelve a donde estaba', async () => {
    useBookStore().addBooking(servicio());
    const wrapper = montar();
    await hastaDatos(wrapper);

    await wrapper.get('[data-test="entrar"]').trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/services?pagina=2' },
    });
  });
});
