/**
 * La bandeja montada (spec §3, A1–A5). Se corta por `useAdminReservations`
 * (consulta y mutaciones dobladas) y por `CambiarFechaDialog` (del plan 2, que
 * arrastra `import.meta`); lo demás es real, incluido el almacén de avisos y
 * el diálogo de cancelar (`CancelarReservaBandeja`).
 * «Hoy» es el miércoles 7 de octubre de 2026 en Bogotá.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type { ReservationDto } from 'src/interfaces/booking';

const mockAdmin = {
  query: {
    data: ref<ReservationDto[] | undefined>(undefined),
    isLoading: ref(false),
    isError: ref(false),
    isFetching: ref(false),
    refetch: jest.fn(),
  },
  confirm: { mutateAsync: jest.fn(), isPending: ref(false) },
  cancel: { mutateAsync: jest.fn(), isPending: ref(false) },
  refrescar: jest.fn(() => Promise.resolve()),
};

jest.mock('src/composables/reservations/useAdminReservations', () => ({
  useAdminReservations: () => mockAdmin,
}));
jest.mock('src/api/reservations-api', () => ({}));
jest.mock('src/helpers/businessHours', () => ({
  ...jest.requireActual('src/helpers/businessHours'),
  getSalonNowParts: () => ({
    ymd: '2026-10-07',
    qDate: '2026/10/07',
    minOfDay: 600,
  }),
}));
jest.mock('src/components/reservations/CambiarFechaDialog.vue', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { defineComponent, h } = require('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'CambiarFechaDialog',
      props: {
        reserva: { type: Object, required: true },
        modelValue: { type: Boolean, default: false },
        permitirEstilista: { type: Boolean, default: false },
      },
      emits: ['update:modelValue', 'reprogramada'],
      setup(props: { modelValue: boolean }) {
        return () =>
          h('div', {
            'data-test': 'cambiar-fecha-doble',
            'data-abierto': String(props.modelValue),
          });
      },
    }),
  };
});

import AdminReservationsPage from 'src/pages/AdminReservationsPage.vue';
import FilaReserva from 'src/components/admin-reservas/FilaReserva.vue';
import { useAvisosEnVivo } from 'src/composables/notifications/avisosEnVivo';
import { reservationEventEffects } from 'src/composables/notifications/reservationEventEffects';
import type { ReservationEvent } from 'src/interfaces/booking';
import { bandeja } from './fixtures/bandeja';
import { errorDeRed, errorHttp } from './fixtures/acceso';
import { confirmedEvent, createdEvent } from './fixtures/reservation-events';
import { fijarViewport } from '../viewportMock';

const QPage = {
  name: 'QPage',
  template: '<main class="q-page-doble"><slot /></main>',
};
const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'position', 'persistent', 'maximized'],
  emits: ['update:modelValue'],
  template:
    '<div v-if="modelValue" class="q-dialog-doble" :data-posicion="position"><slot /></div>',
};

const montar = () =>
  mount(AdminReservationsPage, { global: { components: { QPage, QDialog } } });

type Montada = ReturnType<typeof montar>;

const ids = (w: Montada) =>
  w.findAll('[data-test="fila-reserva"]').map((f) => f.attributes('data-id'));
const abrir = (w: Montada, id: string) =>
  w.find(`[data-id="${id}"] [data-test="abrir-reserva"]`).trigger('click');
const fila = (w: Montada, id: string) => {
  const encontrada = w
    .findAllComponents(FilaReserva)
    .find((f) => (f.props('reserva') as ReservationDto).id === id);
  if (!encontrada) throw new Error(`No hay fila para ${id}`);
  return encontrada;
};
const registrar = (evento: ReservationEvent) =>
  useAvisosEnVivo().registrar(evento, reservationEventEffects(evento).notice);
/** La lista que devuelve el servidor tras el refresco: `id` ya pasó a `status`. */
const conEstado = (id: string, status: ReservationDto['status']) =>
  bandeja().map((r) => (r.id === id ? { ...r, status } : r));

beforeEach(() => {
  // Escritorio (1280) salvo que la prueba diga otra cosa.
  fijarViewport({ ancho: 1280 });
  mockAdmin.query.data.value = bandeja();
  mockAdmin.query.isLoading.value = false;
  mockAdmin.query.isError.value = false;
  mockAdmin.query.refetch.mockReset();
  mockAdmin.confirm.mutateAsync.mockReset();
  mockAdmin.cancel.mutateAsync.mockReset();
  mockAdmin.refrescar.mockClear();
  const vivos = useAvisosEnVivo();
  vivos.vaciar();
  vivos.marcarBandeja(false);
  vivos.marcarEnVivo(true);
});

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe('la bandeja · lista (A1–A2)', () => {
  it('arranca en Pendientes con la cuenta de cada pestaña', () => {
    const w = montar();

    expect(w.findAll('[data-test="cuenta"]').map((c) => c.text())).toEqual([
      '3',
      '2',
      '1',
      '5',
    ]);
    expect(
      w.find('[data-test="pestana-pendientes"]').attributes('aria-selected')
    ).toBe('true');
  });

  it('la lista es el panel de la pestaña activa', async () => {
    const w = montar();
    const panel = w.find('#bandeja-panel');

    expect(panel.attributes('role')).toBe('tabpanel');
    expect(panel.attributes('aria-labelledby')).toBe('pestana-pendientes');

    await w.find('[data-test="pestana-hoy"]').trigger('click');
    expect(w.find('#bandeja-panel').attributes('aria-labelledby')).toBe(
      'pestana-hoy'
    );
  });

  it('agrupa por día en hora de Bogotá, de la más próxima a la más lejana', () => {
    const w = montar();

    expect(w.findAll('[data-test="titulo-dia"]').map((t) => t.text())).toEqual([
      'Mañana · jueves 8 de octubre',
      'Viernes 9 de octubre',
    ]);
    expect(ids(w)).toEqual(['res-1', 'res-2', 'res-5']);
  });

  it('«Hoy» deja solo las de hoy', async () => {
    const w = montar();

    await w.find('[data-test="pestana-hoy"]').trigger('click');

    expect(w.findAll('[data-test="titulo-dia"]').map((t) => t.text())).toEqual([
      'Hoy · miércoles 7 de octubre',
    ]);
    expect(ids(w)).toEqual(['res-3']);
  });

  it('una pestaña sin reservas lo dice, con la nota de las canceladas', async () => {
    mockAdmin.query.data.value = [];
    const w = montar();
    await nextTick();

    expect(w.find('[data-test="bandeja-vacia"]').text()).toBe(
      'No hay reservas pendientes.'
    );
    expect(w.find('[data-test="bandeja-pie"]').text()).toContain(
      'Las canceladas salen de la lista'
    );
  });

  it('mientras carga pinta esqueletos; si falla, lo dice y deja reintentar', async () => {
    mockAdmin.query.isLoading.value = true;
    const cargando = montar();
    expect(cargando.find('[data-test="bandeja-cargando"]').exists()).toBe(true);

    mockAdmin.query.isLoading.value = false;
    mockAdmin.query.isError.value = true;
    mockAdmin.query.data.value = undefined;
    const fallida = montar();
    expect(fallida.find('[data-test="bandeja-error"]').text()).toContain(
      'No se pudieron cargar las reservas.'
    );
    await fallida.find('[data-test="reintentar"]').trigger('click');
    expect(mockAdmin.query.refetch).toHaveBeenCalledTimes(1);
  });

  it('si falla un refresco con la lista ya cargada, la conserva y avisa encima', async () => {
    mockAdmin.query.isError.value = true;
    const w = montar();

    expect(w.find('[data-test="bandeja-error"]').exists()).toBe(false);
    expect(ids(w)).toEqual(['res-1', 'res-2', 'res-5']);
    expect(w.find('[data-test="bandeja-error-refresco"]').text()).toContain(
      'No se pudo actualizar la lista.'
    );
    await w.find('[data-test="reintentar"]').trigger('click');
    expect(mockAdmin.query.refetch).toHaveBeenCalledTimes(1);

    mockAdmin.query.isError.value = false;
    await nextTick();
    expect(w.find('[data-test="bandeja-error-refresco"]').exists()).toBe(false);
  });

  it('dice si está en vivo; si no, ofrece actualizar', async () => {
    const w = montar();
    expect(w.find('[data-test="en-vivo"]').text()).toContain('En vivo');
    expect(w.find('[data-test="actualizar"]').exists()).toBe(false);

    useAvisosEnVivo().marcarEnVivo(false);
    await nextTick();
    expect(w.find('[data-test="en-vivo"]').text()).toContain('Sin tiempo real');
    await w.find('[data-test="actualizar"]').trigger('click');
    expect(mockAdmin.refrescar).toHaveBeenCalledTimes(1);
  });
});

describe('la bandeja · acciones (A2–A3)', () => {
  it('elegir una fila abre su detalle en el panel', async () => {
    const w = montar();
    expect(w.find('[data-test="detalle-vacio"]').exists()).toBe(true);

    await abrir(w, 'res-1');

    expect(w.find('[data-test="detalle-nombre"]').text()).toBe('Andrea Ruiz');
    expect(
      w
        .find('[data-id="res-1"] [data-test="abrir-reserva"]')
        .attributes('aria-current')
    ).toBe('true');
  });

  it('confirmar desde la fila manda una sola petición aunque se pida dos veces (Foco 2)', async () => {
    mockAdmin.confirm.mutateAsync.mockReturnValue(new Promise(() => undefined));
    const w = montar();

    // Dos `confirmar` antes de que vuelva el primero: los recibe la página,
    // no un botón ya apagado.
    fila(w, 'res-1').vm.$emit('confirmar', 'res-1');
    fila(w, 'res-1').vm.$emit('confirmar', 'res-1');
    await nextTick();

    expect(mockAdmin.confirm.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mockAdmin.confirm.mutateAsync).toHaveBeenCalledWith('res-1');
    expect(
      w
        .find('[data-id="res-1"] [data-test="confirmar-fila"]')
        .attributes('disabled')
    ).toBeDefined();
  });

  it('con una acción en vuelo, la otra fila tampoco manda la suya', async () => {
    mockAdmin.confirm.mutateAsync.mockReturnValue(new Promise(() => undefined));
    const w = montar();

    fila(w, 'res-1').vm.$emit('confirmar', 'res-1');
    fila(w, 'res-2').vm.$emit('confirmar', 'res-2');
    await nextTick();

    expect(mockAdmin.confirm.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('si otra vía ya la confirmó, lo dice en la fila y refresca (Foco 3)', async () => {
    mockAdmin.confirm.mutateAsync.mockRejectedValue(
      errorHttp(400, 'Transición de estado inválida')
    );
    const w = montar();

    await w
      .find('[data-id="res-1"] [data-test="confirmar-fila"]')
      .trigger('click');
    await flushPromises();

    expect(w.find('[data-id="res-1"] [data-test="error-fila"]').text()).toBe(
      'Esta reserva ya no estaba pendiente. La lista se actualizó.'
    );
    expect(mockAdmin.refrescar).toHaveBeenCalledTimes(1);
  });

  it('el aviso del fallo sobrevive al refresco que se lleva la fila de «Pendientes» (Foco 3)', async () => {
    mockAdmin.confirm.mutateAsync.mockRejectedValue(
      errorHttp(400, 'Transición de estado inválida')
    );
    // El refresco trae la verdad: res-1 ya estaba confirmada.
    mockAdmin.refrescar.mockImplementationOnce(() => {
      mockAdmin.query.data.value = conEstado('res-1', 'confirmada');
      return Promise.resolve();
    });
    const w = montar();

    await w
      .find('[data-id="res-1"] [data-test="confirmar-fila"]')
      .trigger('click');
    await flushPromises();

    expect(ids(w)).toEqual(['res-2', 'res-5']);
    expect(w.find('[data-test="error-fila"]').exists()).toBe(false);
    expect(w.find('[data-test="aviso-accion"]').text()).toContain(
      'Esta reserva ya no estaba pendiente. La lista se actualizó.'
    );

    // Se va al cerrarlo…
    await w.find('[data-test="cerrar-aviso-accion"]').trigger('click');
    expect(w.find('[data-test="aviso-accion"]').exists()).toBe(false);
  });

  it('el aviso del fallo se va con la acción siguiente', async () => {
    mockAdmin.confirm.mutateAsync
      .mockRejectedValueOnce(errorDeRed())
      .mockReturnValueOnce(new Promise(() => undefined));
    const w = montar();

    await w
      .find('[data-id="res-1"] [data-test="confirmar-fila"]')
      .trigger('click');
    await flushPromises();
    expect(w.find('[data-test="aviso-accion"]').text()).toContain(
      'No se pudo confirmar: revisa la conexión e inténtalo de nuevo.'
    );

    await w
      .find('[data-id="res-2"] [data-test="confirmar-fila"]')
      .trigger('click');
    expect(w.find('[data-test="aviso-accion"]').exists()).toBe(false);
  });

  it('Mover abre «Cambiar fecha» sin elegir estilista (el backend no lo admite)', async () => {
    const w = montar();
    await abrir(w, 'res-1');

    await w.find('[data-test="mover"]').trigger('click');

    const dialogo = w.findComponent({ name: 'CambiarFechaDialog' });
    expect(dialogo.props('modelValue')).toBe(true);
    expect(dialogo.props('permitirEstilista')).toBe(false);
    expect((dialogo.props('reserva') as ReservationDto).id).toBe('res-1');

    dialogo.vm.$emit('reprogramada', 'res-1', 'w-monica');
    expect(mockAdmin.refrescar).toHaveBeenCalledTimes(1);
  });

  it('Cancelar pide confirmación, cancela y suelta la ficha', async () => {
    mockAdmin.cancel.mutateAsync.mockResolvedValue(undefined);
    const w = montar();
    await abrir(w, 'res-1');

    await w.find('[data-test="cancelar-detalle"]').trigger('click');
    expect(w.find('[data-test="cancelar-resumen"]').text()).toContain(
      'Andrea Ruiz'
    );
    await w.find('[data-test="confirmar-cancelacion"]').trigger('click');
    await flushPromises();

    expect(mockAdmin.cancel.mutateAsync).toHaveBeenCalledWith('res-1');
    expect(w.find('[data-test="cancelar-reserva"]').exists()).toBe(false);
    expect(w.find('[data-test="detalle-vacio"]').exists()).toBe(true);
  });

  it('si cancelar falla, el error queda en el diálogo, que sigue abierto', async () => {
    mockAdmin.cancel.mutateAsync.mockRejectedValue(errorDeRed());
    const w = montar();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    await w.find('[data-test="confirmar-cancelacion"]').trigger('click');
    await flushPromises();

    expect(w.find('[data-test="error-cancelar"]').text()).toBe(
      'No se pudo cancelar: revisa la conexión e inténtalo de nuevo.'
    );
    expect(w.find('[data-test="cancelar-reserva"]').exists()).toBe(true);
  });

  it('si ya estaba cancelada, el refresco cierra el diálogo y el aviso queda sobre la lista (Foco 3)', async () => {
    mockAdmin.cancel.mutateAsync.mockRejectedValue(
      errorHttp(400, 'Transición de estado inválida')
    );
    // Las canceladas no vienen en `GET /reservations`.
    mockAdmin.refrescar.mockImplementationOnce(() => {
      mockAdmin.query.data.value = bandeja().filter((r) => r.id !== 'res-1');
      return Promise.resolve();
    });
    const w = montar();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    await w.find('[data-test="confirmar-cancelacion"]').trigger('click');
    await flushPromises();

    expect(w.find('[data-test="cancelar-reserva"]').exists()).toBe(false);
    expect(w.find('[data-test="detalle-vacio"]').exists()).toBe(true);
    expect(w.find('[data-test="aviso-accion"]').text()).toContain(
      'Esta reserva ya no se puede cancelar. La lista se actualizó.'
    );
  });

  it('con otra reserva en vuelo, la ficha y las demás filas se apagan sin cambiar su rótulo', async () => {
    mockAdmin.confirm.mutateAsync.mockReturnValue(new Promise(() => undefined));
    const w = montar();
    await w
      .find('[data-id="res-2"] [data-test="confirmar-fila"]')
      .trigger('click');

    await abrir(w, 'res-1');

    for (const gancho of ['confirmar-detalle', 'mover', 'cancelar-detalle']) {
      expect(
        w.find(`[data-test="${gancho}"]`).attributes('disabled')
      ).toBeDefined();
    }
    expect(w.find('[data-test="confirmar-detalle"]').text()).toBe('Confirmar');
    expect(w.find('[data-test="cancelar-detalle"]').text()).toBe('Cancelar');
    const otraFila = w.find('[data-id="res-1"] [data-test="confirmar-fila"]');
    expect(otraFila.attributes('disabled')).toBeDefined();
    expect(otraFila.text()).toBe('Confirmar');
    expect(
      w.find('[data-id="res-2"] [data-test="confirmar-fila"]').text()
    ).toBe('Confirmando…');
  });

  it('si otra acción arranca con «Cancelar» abierto, solo se apaga el botón: se puede volver', async () => {
    mockAdmin.confirm.mutateAsync.mockReturnValue(new Promise(() => undefined));
    const w = montar();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    // La carrera: un `confirmar` de otra fila llega con el diálogo abierto.
    fila(w, 'res-2').vm.$emit('confirmar', 'res-2');
    await nextTick();

    const dialogo = w.findComponent({ name: 'CancelarReservaBandeja' });
    expect(dialogo.props('ocupada')).toBe(false);
    expect(dialogo.props('bloqueada')).toBe(true);
    const confirmar = w.find('[data-test="confirmar-cancelacion"]');
    expect(confirmar.attributes('disabled')).toBeDefined();
    expect(confirmar.text()).toBe('Cancelar la cita');
    await confirmar.trigger('click');
    expect(mockAdmin.cancel.mutateAsync).not.toHaveBeenCalled();

    await w.find('[data-test="volver-cancelar"]').trigger('click');
    expect(w.find('[data-test="cancelar-reserva"]').exists()).toBe(false);
  });

  it('mientras cancela, el diálogo lo dice y no se cierra', async () => {
    mockAdmin.cancel.mutateAsync.mockReturnValue(new Promise(() => undefined));
    const w = montar();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    await w.find('[data-test="confirmar-cancelacion"]').trigger('click');

    const dialogo = w.findComponent({ name: 'CancelarReservaBandeja' });
    expect(dialogo.props('ocupada')).toBe(true);
    expect(w.find('[data-test="confirmar-cancelacion"]').text()).toBe(
      'Cancelando…'
    );
    expect(
      w.find('[data-test="volver-cancelar"]').attributes('disabled')
    ).toBeDefined();
  });

  it('si la reserva desaparece con la ficha y el diálogo abiertos, los suelta (Foco 1)', async () => {
    const w = montar();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    mockAdmin.query.data.value = bandeja().filter((r) => r.id !== 'res-1');
    await nextTick();
    await nextTick();

    expect(w.find('[data-test="cancelar-reserva"]').exists()).toBe(false);
    expect(w.find('[data-test="confirmar-detalle"]').exists()).toBe(false);
    expect(w.find('[data-test="detalle-vacio"]').exists()).toBe(true);
    expect(mockAdmin.cancel.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('la bandeja · el foco no se pierde', () => {
  // Con el control enfocado fuera del documento, el foco cae al <body> y
  // quien navega con teclado vuelve a empezar desde arriba: la lista lo recoge.
  const montarEnDocumento = () =>
    mount(AdminReservationsPage, {
      attachTo: document.body,
      global: { components: { QPage, QDialog } },
    });
  const enfocado = () => (document.activeElement as HTMLElement | null)?.id;

  it('tras cancelar, el foco vuelve a la lista', async () => {
    mockAdmin.cancel.mutateAsync.mockResolvedValue(undefined);
    const w = montarEnDocumento();
    await abrir(w, 'res-1');
    await w.find('[data-test="cancelar-detalle"]').trigger('click');
    const boton = w.find('[data-test="confirmar-cancelacion"]');
    (boton.element as HTMLElement).focus();

    await boton.trigger('click');
    await flushPromises();

    expect(enfocado()).toBe('bandeja-panel');
    w.unmount();
  });

  it('si la fila confirmada sale de la pestaña, el foco pasa a la lista', async () => {
    mockAdmin.confirm.mutateAsync.mockImplementation(async () => {
      // La mutación espera al refresco: al volver, la lista ya es la nueva.
      mockAdmin.query.data.value = conEstado('res-1', 'confirmada');
    });
    const w = montarEnDocumento();
    const boton = w.find('[data-id="res-1"] [data-test="confirmar-fila"]');
    (boton.element as HTMLElement).focus();

    await boton.trigger('click');
    await flushPromises();

    expect(w.find('[data-id="res-1"]').exists()).toBe(false);
    expect(enfocado()).toBe('bandeja-panel');
    w.unmount();
  });

  it('si la reserva desaparece con el foco en la ficha, el foco pasa a la lista (Foco 1)', async () => {
    const w = montarEnDocumento();
    await abrir(w, 'res-1');
    (w.find('[data-test="mover"]').element as HTMLElement).focus();

    mockAdmin.query.data.value = bandeja().filter((r) => r.id !== 'res-1');
    await flushPromises();

    expect(enfocado()).toBe('bandeja-panel');
    w.unmount();
  });

  it('sin acción de por medio no le roba el foco a nadie', async () => {
    const w = montarEnDocumento();
    const pestana = w.find('[data-test="pestana-todas"]');
    (pestana.element as HTMLElement).focus();

    mockAdmin.query.data.value = bandeja().filter((r) => r.id !== 'res-2');
    await flushPromises();

    expect(document.activeElement).toBe(pestana.element);
    w.unmount();
  });
});

describe('la bandeja · avisos fijados (A5)', () => {
  it('marca la bandeja abierta mientras está montada', () => {
    const w = montar();
    expect(useAvisosEnVivo().bandejaAbierta.value).toBe(true);

    w.unmount();
    expect(useAvisosEnVivo().bandejaAbierta.value).toBe(false);
  });

  it('una reserva nueva se marca «Nueva» y «Ver» la abre y descarta el aviso', async () => {
    const w = montar();
    registrar({
      ...createdEvent,
      reservationId: 'res-5',
      customerName: 'Paula R.',
    });
    await nextTick();

    expect(
      w.find('[data-id="res-5"] [data-test="etiqueta-nueva"]').exists()
    ).toBe(true);
    await w.find('[data-test="ver-aviso"]').trigger('click');

    expect(w.find('[data-test="detalle-nombre"]').text()).toBe('Paula R.');
    expect(w.find('[data-test="aviso"]').exists()).toBe(false);
    expect(
      w.find('[data-id="res-5"] [data-test="etiqueta-nueva"]').exists()
    ).toBe(false);
  });

  it('«Ver» cambia a «Todas» si la reserva no está en la pestaña', async () => {
    const w = montar();
    registrar({ ...confirmedEvent, reservationId: 'res-4' });
    await nextTick();

    await w.find('[data-test="ver-aviso"]').trigger('click');

    expect(
      w.find('[data-test="pestana-todas"]').attributes('aria-selected')
    ).toBe('true');
    expect(w.find('[data-test="detalle-nombre"]').text()).toBe(
      'Clienta con cuenta'
    );
  });

  it('descartar quita el aviso', async () => {
    const w = montar();
    registrar(createdEvent);
    await nextTick();

    await w.find('[data-test="descartar-aviso"]').trigger('click');

    expect(w.find('[data-test="aviso"]').exists()).toBe(false);
  });
});

describe('la bandeja · móvil (390)', () => {
  it('filas compactas sin «Confirmar» y la ficha a pantalla completa', async () => {
    fijarViewport({ ancho: 390 });
    const w = montar();
    await nextTick();

    expect(w.find('[data-test="confirmar-fila"]').exists()).toBe(false);
    expect(w.find('[data-test="detalle-vacio"]').exists()).toBe(false);

    await abrir(w, 'res-1');
    expect(
      w.find('.q-dialog-doble [data-test="volver-a-la-lista"]').exists()
    ).toBe(true);

    await w.find('[data-test="volver-a-la-lista"]').trigger('click');
    expect(w.find('[data-test="detalle-reserva"]').exists()).toBe(false);
  });

  it('cancelar es una hoja inferior', async () => {
    fijarViewport({ ancho: 390 });
    const w = montar();
    await nextTick();
    await abrir(w, 'res-1');

    await w.find('[data-test="cancelar-detalle"]').trigger('click');

    const hoja = w.find('[data-test="cancelar-reserva"]').element.parentElement;
    expect(hoja?.getAttribute('data-posicion')).toBe('bottom');
  });

  it('si la ficha a pantalla completa se cierra y el foco cae al body, lo recoge la lista (Foco 1)', async () => {
    fijarViewport({ ancho: 390 });
    const w = mount(AdminReservationsPage, {
      attachTo: document.body,
      global: { components: { QPage, QDialog } },
    });
    await nextTick();
    await abrir(w, 'res-1');

    // La clienta la cancela con la ficha abierta: la ficha sale con la
    // transición del diálogo y, al acabar (`hide`), el foco ya no tiene dónde
    // estar.
    mockAdmin.query.data.value = bandeja().filter((r) => r.id !== 'res-1');
    await flushPromises();
    (document.activeElement as HTMLElement | null)?.blur();
    const ficha = w
      .findAllComponents(QDialog)
      .find((d) => d.props('maximized') !== undefined);
    ficha?.vm.$emit('hide');
    await flushPromises();

    expect((document.activeElement as HTMLElement | null)?.id).toBe(
      'bandeja-panel'
    );
    w.unmount();
  });
});
