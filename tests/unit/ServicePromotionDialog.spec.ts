/**
 * El diálogo de la promoción, que sustituye al `$q.dialog` con `prompt` de
 * Quasar. Lo que se vigila: que el precio resultante se calcule con la misma
 * función que cobra la bolsa (`effectiveServiceUnitPrice`) y que no se cuele un
 * porcentaje imposible, que es lo que el `isValid` del `prompt` hacía.
 */
const ocultar = jest.fn();

/**
 * `useDialogPluginComponent` son treinta líneas: `emit('ok')` + `hide()` sobre
 * la referencia al `q-dialog`. Se dobla aquí en vez de importar el paquete de
 * Quasar entero, que en Jest arrastra el bundle completo para nada.
 */
jest.mock('quasar', () => {
  const { getCurrentInstance, ref } = require('vue');
  const useDialogPluginComponent = () => {
    const instancia = getCurrentInstance();
    const emit = instancia.emit;
    return {
      dialogRef: ref(null),
      onDialogHide: () => emit('hide'),
      onDialogOK: (payload: unknown) => {
        emit('ok', payload);
        ocultar();
      },
      onDialogCancel: () => ocultar(),
    };
  };
  useDialogPluginComponent.emits = ['ok', 'hide'];
  return { useDialogPluginComponent };
});

import { mount } from '@vue/test-utils';
import ServicePromotionDialog from 'src/components/dialogs/ServicePromotionDialog.vue';
import type Service from 'src/interfaces/service';

/** Pasarela del `q-dialog`: deja ver lo que lleva dentro. */
const QDialog = {
  name: 'QDialog',
  template: '<div class="q-dialog"><slot /></div>',
};

const SERVICIO = {
  id: 's1',
  name: 'Bob clásico',
  gender: 'femenino',
  type: 'corte',
  price: 45000,
  isSpecial: false,
  duration: 60,
  slug: 'bob-clasico',
  tags: ['t1'],
  images: [],
  detail: {
    id: 'd1',
    description: 'Corte recto a la mandíbula',
    specifications: {},
  },
} as unknown as Service;

/** Como lo devuelve el API: el porcentaje llega como cadena. */
const EN_PROMOCION = {
  ...SERVICIO,
  havePromotion: true,
  porcentageDiscount: '30',
} as unknown as Service;

const montar = (service: Service = SERVICIO) =>
  mount(ServicePromotionDialog, {
    props: { service },
    global: { components: { QDialog } },
  });

beforeEach(() => ocultar.mockReset());

describe('ServicePromotionDialog · poner promoción', () => {
  it('ofrece un campo numérico con su rótulo, no un cuadro suelto', () => {
    const wrapper = montar();
    const campo = wrapper.get('[data-test="porcentaje"]');

    expect(campo.element.tagName).toBe('INPUT');
    expect(campo.attributes('type')).toBe('number');
    expect(wrapper.get('label').attributes('for')).toBe(campo.attributes('id'));
  });

  it('dice en qué precio queda el servicio, en vivo, mientras se escribe', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('20');

    // 45.000 con 20 % menos: la misma cuenta que cobra la bolsa.
    expect(wrapper.get('[data-test="precio-resultante"]').text()).toContain(
      '36.000'
    );
  });

  it('aplica el porcentaje escrito, redondeado a entero', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('25');
    await wrapper.get('[data-test="aplicar"]').trigger('click');

    expect(wrapper.emitted('ok')?.[0]).toEqual([25]);
  });

  it.each(['0', '101', '', '1e2'])(
    'no deja aplicar «%s», y lo dice junto al campo',
    async (escrito) => {
      const wrapper = montar();

      await wrapper.get('[data-test="porcentaje"]').setValue(escrito);
      await wrapper.get('[data-test="aplicar"]').trigger('click');

      expect(wrapper.emitted('ok')).toBeUndefined();
      expect(
        wrapper.get('[data-test="aplicar"]').attributes('disabled')
      ).toBeDefined();
      expect(wrapper.get('[data-test="error-porcentaje"]').text()).toMatch(
        /entre 1 y 100/
      );
      expect(wrapper.find('[data-test="precio-resultante"]').exists()).toBe(
        false
      );
    }
  );

  it('marca el campo como inválido para quien usa lector de pantalla', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="porcentaje"]').setValue('250');

    expect(
      wrapper.get('[data-test="porcentaje"]').attributes('aria-invalid')
    ).toBe('true');
  });

  it('cancelar cierra sin aplicar nada', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cancelar"]').trigger('click');

    expect(wrapper.emitted('ok')).toBeUndefined();
    expect(ocultar).toHaveBeenCalledTimes(1);
  });

  it('no ofrece el control de quitar cuando no hay promoción', () => {
    expect(montar().find('[data-test="quitar"]').exists()).toBe(false);
  });
});

describe('ServicePromotionDialog · quitar promoción', () => {
  /** Review Focus 4: el porcentaje llega como cadena desde el API. */
  it('con promoción activa pregunta si se quita, y no pide porcentaje', () => {
    const wrapper = montar(EN_PROMOCION);

    expect(wrapper.text()).toContain(
      '¿Deseas quitar la promoción de este servicio?'
    );
    expect(wrapper.find('[data-test="porcentaje"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="quitar"]').text()).toBe('Quitar');
  });

  it('quitar avisa por su propio canal y resuelve con un cero', async () => {
    const wrapper = montar(EN_PROMOCION);

    await wrapper.get('[data-test="quitar"]').trigger('click');

    expect(wrapper.emitted('quitar')).toHaveLength(1);
    expect(wrapper.emitted('ok')?.[0]).toEqual([0]);
  });
});
