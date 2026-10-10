/**
 * A1: Pendientes · Confirmadas · Hoy · Todas, con contador. Patrón ARIA de
 * pestañas: una sola en el orden de tabulación, flechas para moverse, Inicio y
 * Fin. Elegir la pestaña la activa (no hay que pulsar Intro después).
 */
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import PestanasBandeja from 'src/components/admin-reservas/PestanasBandeja.vue';
import type { PestanaBandeja } from 'src/helpers/admin-reservation-filter';

const CUENTAS = { pendientes: 3, confirmadas: 5, hoy: 3, todas: 8 };

const montados: VueWrapper[] = [];

const montar = (activa: PestanaBandeja = 'pendientes') => {
  const w = mount(PestanasBandeja, {
    props: { activa, cuentas: CUENTAS },
    attachTo: document.body,
  });
  montados.push(w);
  return w;
};

afterEach(() => {
  while (montados.length) montados.pop()?.unmount();
});

describe('PestanasBandeja', () => {
  it('pinta las cuatro pestañas con su cuenta', () => {
    const pestanas = montar().findAll('[role="tab"]');

    expect(pestanas.map((p) => p.text().replace(/\s+/g, ' '))).toEqual([
      'Pendientes 3',
      'Confirmadas 5',
      'Hoy 3',
      'Todas 8',
    ]);
  });

  it('marca la activa y solo ella entra en la tabulación', () => {
    const w = montar('hoy');

    expect(
      w.find('[data-test="pestana-hoy"]').attributes('aria-selected')
    ).toBe('true');
    expect(w.find('[data-test="pestana-hoy"]').attributes('tabindex')).toBe(
      '0'
    );
    expect(
      w.find('[data-test="pestana-pendientes"]').attributes('aria-selected')
    ).toBe('false');
    expect(
      w.find('[data-test="pestana-pendientes"]').attributes('tabindex')
    ).toBe('-1');
  });

  it('cada pestaña controla el panel de la lista', () => {
    expect(
      montar().find('[data-test="pestana-todas"]').attributes('aria-controls')
    ).toBe('bandeja-panel');
  });

  it('son botones de texto: no dibujan la sombra del realce global', () => {
    const pestanas = montar().findAll('[role="tab"]');

    expect(pestanas).toHaveLength(4);
    pestanas.forEach((p) => expect(p.classes()).toContain('m-boton-plano'));
  });

  it('un clic elige la pestaña', async () => {
    const w = montar();

    await w.find('[data-test="pestana-confirmadas"]').trigger('click');

    expect(w.emitted('elegir')).toEqual([['confirmadas']]);
  });

  it('las flechas, Inicio y Fin eligen la vecina y dan la vuelta', async () => {
    const w = montar('pendientes');
    const pendientes = w.find('[data-test="pestana-pendientes"]');

    await pendientes.trigger('keydown', { key: 'ArrowRight' });
    await pendientes.trigger('keydown', { key: 'ArrowLeft' });
    await pendientes.trigger('keydown', { key: 'End' });
    await w
      .find('[data-test="pestana-hoy"]')
      .trigger('keydown', { key: 'Home' });

    expect(w.emitted('elegir')).toEqual([
      ['confirmadas'],
      ['todas'],
      ['todas'],
      ['pendientes'],
    ]);
  });

  it('la flecha lleva el foco a la pestaña elegida', async () => {
    const w = montar('pendientes');

    await w.find('[data-test="pestana-pendientes"]').trigger('keydown', {
      key: 'ArrowRight',
    });
    await nextTick();

    expect(document.activeElement?.id).toBe('pestana-confirmadas');
  });

  it('otras teclas no eligen nada', async () => {
    const w = montar();

    await w.find('[data-test="pestana-pendientes"]').trigger('keydown', {
      key: 'a',
    });

    expect(w.emitted('elegir')).toBeUndefined();
  });
});
