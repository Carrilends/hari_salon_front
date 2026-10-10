/**
 * F2/F4: el diálogo de crear y editar. Valida igual que el backend, con
 * contadores y errores en línea; no guarda por su cuenta: emite `guardar` y
 * la página llama a la mutación.
 */
import { mount } from '@vue/test-utils';
import PreguntaDialog from 'src/components/preguntas/PreguntaDialog.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { PREGUNTAS } from './fixtures/preguntas';

type Props = {
  abierto: boolean;
  pregunta: FaqItem | null;
  puesto: number | null;
  total: number;
  guardando: boolean;
  error: string | null;
};

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position', 'persistent'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
};

const montar = (props: Partial<Props> = {}, attachTo?: HTMLElement) =>
  mount(PreguntaDialog, {
    props: {
      abierto: true,
      pregunta: null,
      puesto: null,
      total: 3,
      guardando: false,
      error: null,
      ...props,
    },
    global: { components: { QDialog } },
    attachTo,
  });

describe('PreguntaDialog · crear', () => {
  it('se titula «Nueva pregunta», empieza vacío y avisa de que entra al final', () => {
    const wrapper = montar();

    expect(wrapper.get('h2').text()).toBe('Nueva pregunta');
    expect(
      (wrapper.get('[data-test="campo-pregunta"]').element as HTMLInputElement)
        .value
    ).toBe('');
    expect(wrapper.get('[data-test="pista-puesto"]').text()).toContain(
      'Las nuevas se añaden al final'
    );
    expect(wrapper.get('[data-test="guardar-pregunta"]').text()).toBe(
      'Crear pregunta'
    );
  });

  it('cada campo tiene su etiqueta de verdad y su tope del backend', () => {
    const wrapper = montar();

    expect(wrapper.get('label[for="campo-pregunta"]').text()).toBe('Pregunta');
    expect(wrapper.get('label[for="campo-respuesta"]').text()).toBe(
      'Respuesta'
    );
    expect(wrapper.get('#campo-pregunta').attributes('maxlength')).toBe('180');
    expect(wrapper.get('#campo-respuesta').attributes('maxlength')).toBe(
      '5000'
    );
  });

  it('los contadores siguen lo que se escribe', async () => {
    const wrapper = montar();

    await wrapper
      .get('[data-test="campo-pregunta"]')
      .setValue('¿Hay parqueadero?');

    expect(wrapper.get('[data-test="contador-pregunta"]').text()).toBe(
      '17 / 180'
    );
    expect(wrapper.get('[data-test="contador-respuesta"]').text()).toBe(
      '0 / 5000'
    );
  });

  it('enviar vacío muestra los errores en línea y no guarda', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(wrapper.get('[data-test="error-pregunta"]').text()).toBe(
      'Escribe la pregunta.'
    );
    expect(wrapper.get('[data-test="error-respuesta"]').text()).toBe(
      'Escribe la respuesta.'
    );
    expect(
      wrapper.get('[data-test="campo-pregunta"]').attributes('aria-invalid')
    ).toBe('true');
    expect(
      wrapper.get('[data-test="campo-pregunta"]').attributes('aria-describedby')
    ).toBe('contador-pregunta error-pregunta');
    expect(wrapper.emitted('guardar')).toBeUndefined();
  });

  it('el primer campo con error recibe el foco', async () => {
    const wrapper = montar({}, document.body);

    await wrapper
      .get('[data-test="campo-pregunta"]')
      .setValue('¿Hay parqueadero?');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(document.activeElement?.id).toBe('campo-respuesta');
    wrapper.unmount();
  });

  it('menos de 5 caracteres tras recortar no vale', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="campo-pregunta"]').setValue('  ¿Si?  ');
    await wrapper
      .get('[data-test="campo-respuesta"]')
      .setValue('Sí, claro que sí.');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(wrapper.get('[data-test="error-pregunta"]').text()).toBe(
      'Escribe al menos 5 caracteres.'
    );
    expect(wrapper.emitted('guardar')).toBeUndefined();
  });

  it('con datos válidos emite guardar con los textos recortados', async () => {
    const wrapper = montar();

    await wrapper
      .get('[data-test="campo-pregunta"]')
      .setValue('  ¿Hay parqueadero?  ');
    await wrapper
      .get('[data-test="campo-respuesta"]')
      .setValue(' Sí, en la calle. ');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(wrapper.emitted('guardar')).toEqual([
      [{ question: '¿Hay parqueadero?', answer: 'Sí, en la calle.' }],
    ]);
  });

  it('mientras guarda, el botón se desactiva y no emite otra vez', async () => {
    const wrapper = montar({ guardando: true });

    await wrapper
      .get('[data-test="campo-pregunta"]')
      .setValue('¿Hay parqueadero?');
    await wrapper
      .get('[data-test="campo-respuesta"]')
      .setValue('Sí, en la calle.');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(
      wrapper.get('[data-test="guardar-pregunta"]').attributes('disabled')
    ).toBeDefined();
    expect(wrapper.emitted('guardar')).toBeUndefined();
  });

  it('el error del servidor se ve en línea', () => {
    const wrapper = montar({ error: 'No se pudo guardar la pregunta.' });
    const fallo = wrapper.get('[data-test="error-guardar"]');

    expect(fallo.text()).toBe('No se pudo guardar la pregunta.');
    expect(fallo.attributes('role')).toBe('alert');
  });

  it('Cancelar y la X cierran sin guardar', async () => {
    const wrapper = montar();

    await wrapper.get('[data-test="cancelar-pregunta"]').trigger('click');
    await wrapper.get('[data-test="cerrar-dialogo"]').trigger('click');

    expect(wrapper.emitted('update:abierto')).toEqual([[false], [false]]);
    expect(wrapper.emitted('guardar')).toBeUndefined();
    expect(
      wrapper.get('[data-test="cerrar-dialogo"]').attributes('aria-label')
    ).toBe('Cerrar sin guardar');
  });
});

describe('PreguntaDialog · mientras guarda', () => {
  it('la X y Cancelar se desactivan y el cierre del q-dialog no emite', async () => {
    const wrapper = montar({ guardando: true });

    expect(
      wrapper.get('[data-test="cerrar-dialogo"]').attributes('disabled')
    ).toBeDefined();
    expect(
      wrapper.get('[data-test="cancelar-pregunta"]').attributes('disabled')
    ).toBeDefined();
    await wrapper.get('[data-test="cancelar-pregunta"]').trigger('click');
    wrapper.getComponent(QDialog).vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('update:abierto')).toBeUndefined();
    expect(wrapper.getComponent(QDialog).props('persistent')).toBe(true);
  });

  it('sin guardar, el cierre del q-dialog sí se emite', () => {
    const wrapper = montar();

    wrapper.getComponent(QDialog).vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('update:abierto')).toEqual([[false]]);
  });
});

describe('PreguntaDialog · editar', () => {
  it('se titula «Editar pregunta», trae los textos y dice el puesto', () => {
    const wrapper = montar({ pregunta: PREGUNTAS[1], puesto: 2, total: 3 });

    expect(wrapper.get('h2').text()).toBe('Editar pregunta');
    expect(
      (wrapper.get('[data-test="campo-pregunta"]').element as HTMLInputElement)
        .value
    ).toBe('¿Puedo cambiar o cancelar mi cita?');
    expect(wrapper.get('[data-test="contador-pregunta"]').text()).toBe(
      '34 / 180'
    );
    expect(wrapper.get('[data-test="contador-respuesta"]').text()).toBe(
      '74 / 5000'
    );
    expect(wrapper.get('[data-test="pista-puesto"]').text()).toContain(
      'Está en el puesto 2 de 3.'
    );
    expect(wrapper.get('[data-test="guardar-pregunta"]').text()).toBe(
      'Guardar cambios'
    );
  });

  it('reabierto para otra pregunta, carga la nueva y olvida los errores', async () => {
    const wrapper = montar({ pregunta: PREGUNTAS[1], puesto: 2 });
    await wrapper.get('[data-test="campo-pregunta"]').setValue('');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');
    expect(wrapper.find('[data-test="error-pregunta"]').exists()).toBe(true);

    await wrapper.setProps({ abierto: false });
    await wrapper.setProps({
      abierto: true,
      pregunta: PREGUNTAS[2],
      puesto: 3,
    });

    expect(
      (wrapper.get('[data-test="campo-pregunta"]').element as HTMLInputElement)
        .value
    ).toBe('¿Cuál es el horario?');
    expect(wrapper.find('[data-test="error-pregunta"]').exists()).toBe(false);
  });
});
