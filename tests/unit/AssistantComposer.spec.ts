/**
 * El redactor: la fila de chips y el campo. Hereda de `AssistantChat.spec.ts`
 * los casos del campo de texto.
 *
 * Los chips suben aquí desde dentro del hilo, que es lo que pide el tablero: así
 * se ven siempre, y no solo mientras el último mensaje sea el último.
 */
import { mount } from '@vue/test-utils';
import AssistantComposer from 'src/components/assistant/AssistantComposer.vue';
import type { IntentChip } from 'src/composables/assistant/intentChips';

const CHIPS: IntentChip[] = [
  {
    label: 'Ver disponibilidad',
    prompt: '¿Qué horarios tienen disponibles mañana?',
    tool: 'consultarDisponibilidad',
  },
];

const montar = (props = {}) =>
  mount(AssistantComposer, { props: { chips: CHIPS, cargando: false, ...props } });

describe('AssistantComposer', () => {
  it('el campo tiene etiqueta, aunque no se vea', () => {
    const wrapper = montar();
    const id = wrapper.get('input').attributes('id');

    expect(wrapper.get('label').attributes('for')).toBe(id);
  });

  it('enviar manda el texto y vacía el campo', async () => {
    const wrapper = montar();
    await wrapper.get('input').setValue('hola');

    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('enviar')?.[0]).toEqual(['hola']);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
  });

  it('no manda mensajes vacíos ni de solo espacios', async () => {
    const wrapper = montar();
    await wrapper.get('input').setValue('   ');

    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('enviar')).toBeUndefined();
  });

  it('mientras el asistente responde no se puede enviar otro', async () => {
    const wrapper = montar({ cargando: true });
    await wrapper.get('input').setValue('otra cosa');

    await wrapper.get('form').trigger('submit');

    expect(wrapper.emitted('enviar')).toBeUndefined();
  });

  it('el chip manda su intención entera, no su rótulo', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="chip"]').trigger('click');

    expect(wrapper.emitted('chip')?.[0]).toEqual([CHIPS[0]]);
  });

  it('sin chips no deja una fila vacía ocupando sitio', () => {
    expect(
      mount(AssistantComposer, { props: { chips: [], cargando: false } })
        .find('[data-test="fila-chips"]')
        .exists()
    ).toBe(false);
  });

  it('el botón de enviar se nombra, que su icono no dice nada', () => {
    expect(montar().get('button[type="submit"]').attributes('aria-label')).toBe(
      'Enviar mensaje'
    );
  });

  it('el campo vacío no deja pulsar enviar', () => {
    expect(
      montar().get('button[type="submit"]').attributes('disabled')
    ).toBeDefined();
  });
});
