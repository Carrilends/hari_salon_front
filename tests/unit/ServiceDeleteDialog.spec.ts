/**
 * La confirmación de borrado, con ficha.
 *
 * El `$q.dialog` de antes decía «¿Está seguro de que desea eliminar este
 * servicio?» sin decir cuál: con dos servicios de nombre parecido, eso es una
 * ruleta. Ahora la ficha enseña foto, nombre y precio.
 *
 * Review Focus 5: con la conexión lenta, un dedo nervioso pulsa dos veces.
 */
const ocultar = jest.fn();

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
import ServiceDeleteDialog from 'src/components/dialogs/ServiceDeleteDialog.vue';
import type Service from 'src/interfaces/service';

const QDialog = {
  name: 'QDialog',
  template: '<div class="q-dialog"><slot /></div>',
};

const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/bob.jpg';

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
  images: [
    {
      id: 'i1',
      url: CLOUDINARY,
      isPrincipal: true,
      publicId: 'bob',
      version: '1',
    },
  ],
  detail: {
    id: 'd1',
    description: 'Corte recto a la mandíbula',
    specifications: {},
  },
} as unknown as Service;

const SIN_FOTO = { ...SERVICIO, images: [] } as unknown as Service;

const montar = (service: Service = SERVICIO) =>
  mount(ServiceDeleteDialog, {
    props: { service },
    global: { components: { QDialog } },
  });

beforeEach(() => ocultar.mockReset());

describe('ServiceDeleteDialog', () => {
  it('se titula y conserva el texto que la dueña ya conocía', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="dialogo-borrado"]').text()).toContain(
      'Eliminar servicio'
    );
    expect(wrapper.text()).toContain(
      '¿Está seguro de que desea eliminar este servicio?'
    );
  });

  it('enseña de qué servicio se trata: nombre y precio', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="nombre"]').text()).toBe('Bob clásico');
    expect(wrapper.text()).toContain('45.000');
  });

  it('pide la foto a Cloudinary al tamaño de la ficha, no cruda', () => {
    const img = montar().get('img');

    expect(img.attributes('src')).toContain('/upload/f_auto,q_auto,w_112');
  });

  it('sin foto no deja un hueco roto: usa el marcador de posición', () => {
    expect(montar(SIN_FOTO).get('img').attributes('src')).toMatch(
      /^data:image\/svg\+xml/
    );
  });

  it('la foto no se nombra dos veces al lector de pantalla', () => {
    expect(montar().get('img').attributes('alt')).toBe('');
  });

  it('no borra nada hasta que se confirma', async () => {
    const wrapper = montar();

    expect(wrapper.emitted('ok')).toBeUndefined();

    await wrapper.get('[data-test="cancelar"]').trigger('click');

    expect(wrapper.emitted('ok')).toBeUndefined();
    expect(ocultar).toHaveBeenCalledTimes(1);
  });

  it('al confirmar avisa una sola vez', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="eliminar"]').trigger('click');

    expect(wrapper.emitted('ok')).toHaveLength(1);
  });

  /** Review Focus 5: dos toques, un solo borrado. */
  it('el doble toque no manda dos borrados', async () => {
    const wrapper = montar();
    const boton = wrapper.get('[data-test="eliminar"]');

    await boton.trigger('click');
    await boton.trigger('click');

    expect(wrapper.emitted('ok')).toHaveLength(1);
    expect(boton.attributes('disabled')).toBeDefined();
  });
});
