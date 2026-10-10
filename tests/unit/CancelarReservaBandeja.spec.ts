/**
 * Cancelar desde la bandeja pide confirmación (sustituye al `$q.dialog` de la
 * página vieja): dice qué cita se cancela y que no se deshace. Hoja inferior
 * en móvil, diálogo pequeño en escritorio.
 */
import { mount } from '@vue/test-utils';
import CancelarReservaBandeja from 'src/components/admin-reservas/CancelarReservaBandeja.vue';
import type { ReservationDto } from 'src/interfaces/booking';
import { reserva } from './fixtures/bandeja';

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'position', 'persistent'],
  emits: ['update:modelValue'],
  template:
    '<div v-if="modelValue" class="q-dialog-doble" :data-posicion="position" :data-persistente="String(persistent)"><slot /></div>',
};

type Props = {
  modelValue: boolean;
  reserva: ReservationDto | null;
  hoja: boolean;
  ocupada: boolean;
  error: string | null;
};

const montar = (props: Partial<Props> = {}) =>
  mount(CancelarReservaBandeja, {
    props: { modelValue: true, reserva: reserva(), ...props },
    global: { components: { QDialog } },
  });

describe('CancelarReservaBandeja', () => {
  it('dice qué cita se cancela', () => {
    expect(montar().find('[data-test="cancelar-resumen"]').text()).toBe(
      'Andrea Ruiz · Jueves 8 de octubre · 10:30'
    );
  });

  it('confirmar avisa una vez; volver cierra', async () => {
    const w = montar();

    await w.find('[data-test="confirmar-cancelacion"]').trigger('click');
    await w.find('[data-test="volver-cancelar"]').trigger('click');

    expect(w.emitted('confirmar')).toHaveLength(1);
    expect(w.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('mientras cancela, los botones están desactivados', () => {
    const w = montar({ ocupada: true });
    const confirmar = w.find('[data-test="confirmar-cancelacion"]');

    expect(confirmar.attributes('disabled')).toBeDefined();
    expect(confirmar.text()).toBe('Cancelando…');
    expect(
      w.find('[data-test="volver-cancelar"]').attributes('disabled')
    ).toBeDefined();
    expect(w.find('.q-dialog-doble').attributes('data-persistente')).toBe('true');
  });

  it('mientras cancela, una petición de cierre del diálogo no lo cierra', () => {
    const w = montar({ ocupada: true });

    w.findComponent({ name: 'QDialog' }).vm.$emit('update:modelValue', false);

    expect(w.emitted('update:modelValue')).toBeUndefined();
  });

  it('sin cancelar en curso, una petición de cierre sí lo cierra', () => {
    const w = montar();

    w.findComponent({ name: 'QDialog' }).vm.$emit('update:modelValue', false);

    expect(w.emitted('update:modelValue')).toEqual([[false]]);
  });

  it('un fallo se lee dentro del diálogo', () => {
    const error = montar({ error: 'No se pudo cancelar.' }).find(
      '[data-test="error-cancelar"]'
    );

    expect(error.attributes('role')).toBe('alert');
    expect(error.text()).toBe('No se pudo cancelar.');
  });

  it('en móvil es una hoja inferior', () => {
    expect(montar({ hoja: true }).find('.q-dialog-doble').attributes('data-posicion')).toBe(
      'bottom'
    );
    expect(montar().find('.q-dialog-doble').attributes('data-posicion')).toBe(
      'standard'
    );
  });

  it('sin reserva no pinta un resumen a medias', () => {
    expect(montar({ reserva: null }).find('[data-test="cancelar-resumen"]').text()).toBe('');
  });
});
