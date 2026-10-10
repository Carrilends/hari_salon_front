import { mount } from '@vue/test-utils';
import AyudaPreguntas from 'src/components/preguntas/AyudaPreguntas.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';

afterEach(() => useAssistantPanel().cerrar());

describe('AyudaPreguntas', () => {
  it('pregunta «¿No está tu duda?»', () => {
    expect(mount(AyudaPreguntas).get('h2').text()).toBe('¿No está tu duda?');
  });

  it('«Pregúntale al asistente» abre el panel del asistente', async () => {
    const wrapper = mount(AyudaPreguntas);

    await wrapper.get('[data-test="preguntar-asistente"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
  });

  it('es un botón, no un enlace a «#»', () => {
    const boton = mount(AyudaPreguntas).get('[data-test="preguntar-asistente"]');

    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('type')).toBe('button');
    expect(boton.text()).toBe('Pregúntale al asistente →');
  });

  it('WhatsApp abre el chat del salón con un saludo, en otra pestaña', () => {
    const enlace = mount(AyudaPreguntas).get('[data-test="ayuda-whatsapp"]');
    const href = enlace.attributes('href') ?? '';

    expect(href).toContain('wa.me/573208977471?text=');
    expect(decodeURIComponent(href)).toContain('tengo una pregunta');
    expect(enlace.attributes('target')).toBe('_blank');
    expect(enlace.attributes('rel')).toContain('noopener');
    expect(enlace.text()).toBe('Escríbenos por WhatsApp');
  });

  it('no escribe el teléfono a la vista', () => {
    expect(mount(AyudaPreguntas).text()).not.toMatch(/\d{3}\s?\d{3}\s?\d{4}/);
  });
});
