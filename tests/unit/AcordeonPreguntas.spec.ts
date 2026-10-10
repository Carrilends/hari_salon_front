/**
 * F1: el acordeón público. Las respuestas están en el DOM desde el principio
 * (una vez cargadas las preguntas), pero escondidas con
 * `v-show` hasta que la clienta abre su pregunta.
 */
import { mount } from '@vue/test-utils';
import AcordeonPreguntas from 'src/components/preguntas/AcordeonPreguntas.vue';
import { PREGUNTAS } from './fixtures/preguntas';

const montar = (preguntas = PREGUNTAS) =>
  mount(AcordeonPreguntas, { props: { preguntas } });

const escondida = (elemento: Element) =>
  (elemento as HTMLElement).style.display === 'none';

describe('AcordeonPreguntas', () => {
  it('pinta las preguntas en el orden recibido', () => {
    const textos = montar()
      .findAll('[data-test="pregunta-boton"]')
      .map((b) => b.text());

    expect(textos).toEqual([
      '¿Cómo reservo una cita?',
      '¿Puedo cambiar o cancelar mi cita?',
      '¿Cuál es el horario?',
    ]);
  });

  it('empieza con todas las respuestas cerradas, pero presentes', () => {
    const wrapper = montar();
    const respuestas = wrapper.findAll('[data-test="respuesta"]');

    expect(respuestas).toHaveLength(3);
    expect(respuestas.every((r) => escondida(r.element))).toBe(true);
    expect(respuestas[1].text()).toContain('Mis reservas');
  });

  it('abrir una pregunta muestra su respuesta y lo dice con aria-expanded', async () => {
    const wrapper = montar();
    const boton = wrapper.findAll('[data-test="pregunta-boton"]')[1];

    expect(boton.attributes('aria-expanded')).toBe('false');
    await boton.trigger('click');

    expect(boton.attributes('aria-expanded')).toBe('true');
    expect(
      escondida(wrapper.findAll('[data-test="respuesta"]')[1].element)
    ).toBe(false);
  });

  it('volver a pulsarla la cierra', async () => {
    const wrapper = montar();
    const boton = wrapper.findAll('[data-test="pregunta-boton"]')[0];

    await boton.trigger('click');
    await boton.trigger('click');

    expect(boton.attributes('aria-expanded')).toBe('false');
  });

  it('se pueden tener dos abiertas a la vez', async () => {
    const wrapper = montar();
    const botones = wrapper.findAll('[data-test="pregunta-boton"]');

    await botones[0].trigger('click');
    await botones[2].trigger('click');

    expect(botones[0].attributes('aria-expanded')).toBe('true');
    expect(botones[2].attributes('aria-expanded')).toBe('true');
  });

  it('cada botón controla su región, y la región se nombra por su pregunta', () => {
    const wrapper = montar();
    const boton = wrapper.findAll('[data-test="pregunta-boton"]')[0];
    const region = wrapper.findAll('[data-test="respuesta"]')[0];

    expect(boton.attributes('aria-controls')).toBe(region.attributes('id'));
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-labelledby')).toBe(boton.attributes('id'));
  });

  it('las preguntas son encabezados de segundo nivel', () => {
    expect(montar().findAll('h2 [data-test="pregunta-boton"]')).toHaveLength(3);
  });

  it('cuenta las preguntas, en singular cuando es una', () => {
    expect(montar().get('[data-test="total-preguntas"]').text()).toBe(
      '3 preguntas'
    );
    expect(
      montar([PREGUNTAS[0]]).get('[data-test="total-preguntas"]').text()
    ).toBe('1 pregunta');
  });

  it('ya no enseña la línea «Orden: N»', () => {
    expect(montar().text()).not.toMatch(/Orden:/);
  });
});
