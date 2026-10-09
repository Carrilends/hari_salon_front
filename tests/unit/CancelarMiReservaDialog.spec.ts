/**
 * Confirmar la cancelación (M4, tablero MisReservasA · Móvil 3): hoja inferior
 * en móvil, diálogo pequeño en escritorio, el botón en `--m-peligro`, y el
 * error en línea dentro del propio diálogo (antes era un aviso flotante que
 * desaparecía solo).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CancelarReservaDialog from 'src/components/reservations/CancelarReservaDialog.vue';
import type { ReservationDto } from 'src/interfaces/booking';
import { fijarViewport } from '../viewportMock';

const FUENTE = readFileSync(
  join(
    __dirname,
    '../../src/components/reservations/CancelarReservaDialog.vue'
  ),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'position'],
  emits: ['update:modelValue'],
  template:
    '<div class="q-dialog-doble" :data-posicion="position"><slot v-if="modelValue" /></div>',
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

const montar = (
  cambios: Partial<{
    reserva: ReservationDto | null;
    modelValue: boolean;
    cancelando: boolean;
    error: string;
  }> = {}
) =>
  mount(CancelarReservaDialog, {
    props: {
      reserva: RESERVA,
      modelValue: true,
      cancelando: false,
      error: '',
      ...cambios,
    },
    global: { components: { QDialog } },
  });

beforeEach(() => fijarViewport({ ancho: 1280 }));

describe('CancelarReservaDialog (de Mis reservas)', () => {
  it('cerrado no pinta nada', () => {
    expect(
      montar({ modelValue: false })
        .find('[data-test="cancelar-reserva"]')
        .exists()
    ).toBe(false);
  });

  it('dice qué cita se cancela: día, horas, estilista y servicios', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="cancelar-titulo"]').text()).toBe(
      '¿Cancelar tu cita del jueves 8?'
    );
    const ficha = wrapper.get('[data-test="cancelar-ficha"]').text();
    expect(ficha).toContain('10:30 – 11:30 · con Monica');
    expect(ficha).toContain('Wolf cut mujer, Uñas de gel');
    expect(wrapper.text()).toContain('No se puede deshacer');
  });

  it('«Sí, cancelar la cita» emite el id', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="confirmar-cancelacion"]').trigger('click');

    expect(wrapper.emitted('confirmar')).toEqual([['r1']]);
  });

  it('mientras cancela, el botón se deshabilita y lo dice', () => {
    const boton = montar({ cancelando: true }).get(
      '[data-test="confirmar-cancelacion"]'
    );

    expect(boton.attributes('disabled')).toBeDefined();
    expect(boton.attributes('aria-busy')).toBe('true');
    expect(boton.text()).toBe('Cancelando…');
  });

  it('el error se lee en línea, como alerta', () => {
    const wrapper = montar({
      error: 'Ya no se puede cancelar: la hora de la cita ya pasó.',
    });
    const error = wrapper.get('[data-test="error-cancelacion"]');

    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toBe(
      'Ya no se puede cancelar: la hora de la cita ya pasó.'
    );
  });

  it('sin error no hay alerta vacía', () => {
    expect(montar().find('[data-test="error-cancelacion"]').exists()).toBe(
      false
    );
  });

  it('«Volver» cierra sin cancelar', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="volver-cancelacion"]').trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    expect(wrapper.emitted('confirmar')).toBeUndefined();
  });

  it('cerrar por el velo o Escape se reenvía tal cual', async () => {
    const wrapper = montar();

    wrapper
      .findComponent({ name: 'QDialog' })
      .vm.$emit('update:modelValue', false);
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('en escritorio es un diálogo centrado; en móvil, una hoja inferior', async () => {
    const escritorio = montar();
    await nextTick();
    expect(escritorio.get('.q-dialog-doble').attributes('data-posicion')).toBe(
      'standard'
    );

    fijarViewport({ ancho: 390 });
    const movil = montar();
    await nextTick();
    expect(movil.get('.q-dialog-doble').attributes('data-posicion')).toBe(
      'bottom'
    );
    expect(movil.get('[data-test="cancelar-reserva"]').classes()).toContain(
      'cancelar-reserva--hoja'
    );
  });

  it('los dos botones van a lo ancho y el de cancelar en peligro', () => {
    const wrapper = montar();

    for (const gancho of ['confirmar-cancelacion', 'volver-cancelacion']) {
      const boton = wrapper.get(`[data-test="${gancho}"]`);
      expect(boton.classes()).toContain('m-boton--ancho');
      expect(boton.attributes('type')).toBe('button');
    }
    expect(ESTILOS).toMatch(
      /\.cancelar-reserva__confirmar\s*\{[^}]*background: var\(--m-peligro\);[^}]*color: var\(--m-peligro-texto\);/
    );
  });
});
