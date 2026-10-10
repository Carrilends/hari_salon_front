import { mount } from '@vue/test-utils';
import BorrarPreguntaDialog from 'src/components/preguntas/BorrarPreguntaDialog.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { PREGUNTAS } from './fixtures/preguntas';

type Props = {
  abierta: boolean;
  pregunta: FaqItem | null;
  borrando: boolean;
  error: string | null;
};

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position', 'persistent'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
};

const montar = (props: Partial<Props> = {}) =>
  mount(BorrarPreguntaDialog, {
    props: {
      abierta: true,
      pregunta: PREGUNTAS[2],
      borrando: false,
      error: null,
      ...props,
    },
    global: { components: { QDialog } },
  });

describe('BorrarPreguntaDialog', () => {
  it('pregunta si borrar y dice cuál, entre comillas', () => {
    const wrapper = montar();

    expect(wrapper.get('h2').text()).toBe('¿Borrar esta pregunta?');
    expect(wrapper.get('[data-test="pregunta-a-borrar"]').text()).toBe(
      '«¿Cuál es el horario?»'
    );
    expect(wrapper.text()).toContain(
      'Las clientas dejarán de verla. No se puede deshacer.'
    );
  });

  it('no borra nada hasta que se confirma', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cancelar-borrado"]').trigger('click');

    expect(wrapper.emitted('confirmar')).toBeUndefined();
    expect(wrapper.emitted('update:abierta')).toEqual([[false]]);
  });

  it('confirmar avisa una vez', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="confirmar-borrado"]').trigger('click');

    expect(wrapper.emitted('confirmar')).toHaveLength(1);
  });

  it('mientras borra, el botón se desactiva y no vuelve a avisar', async () => {
    const wrapper = montar({ borrando: true });
    const boton = wrapper.get('[data-test="confirmar-borrado"]');

    await boton.trigger('click');

    expect(boton.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('confirmar')).toBeUndefined();
  });

  it('el error del servidor se ve dentro de la confirmación', () => {
    const fallo = montar({ error: 'No se pudo borrar la pregunta.' }).get(
      '[data-test="error-borrar"]'
    );

    expect(fallo.text()).toBe('No se pudo borrar la pregunta.');
    expect(fallo.attributes('role')).toBe('alert');
  });

  it('mientras borra, Cancelar se desactiva y el cierre del q-dialog no emite', async () => {
    const wrapper = montar({ borrando: true });

    expect(
      wrapper.get('[data-test="cancelar-borrado"]').attributes('disabled')
    ).toBeDefined();
    await wrapper.get('[data-test="cancelar-borrado"]').trigger('click');
    wrapper.getComponent(QDialog).vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('update:abierta')).toBeUndefined();
    expect(wrapper.getComponent(QDialog).props('persistent')).toBe(true);
  });
});
