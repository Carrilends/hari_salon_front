/**
 * F2: la lista de la dueña. jsdom 20 no trae `PointerEvent`: `trigger` cae en
 * un `Event` genérico y le copia `clientY`, que es lo único que el componente
 * lee. Tampoco calcula cajas: `getBoundingClientRect` se dobla para que cada
 * fila mida 60 px y vaya debajo de la anterior.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { flushPromises, mount } from '@vue/test-utils';
import ListaPreguntasDuena from 'src/components/preguntas/ListaPreguntasDuena.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { PREGUNTAS } from './fixtures/preguntas';

const montar = (preguntas: FaqItem[] = PREGUNTAS, attachTo?: HTMLElement) =>
  mount(ListaPreguntasDuena, { props: { preguntas }, attachTo });

type Montado = ReturnType<typeof montar>;

const asa = (wrapper: Montado, indice: number) =>
  wrapper.findAll('[data-test="asa"]')[indice];

const filas = (wrapper: Montado) =>
  wrapper.findAll('[data-test="fila-pregunta"]');

const anuncio = (wrapper: Montado) =>
  wrapper.get('[data-test="anuncio-orden"]').text();

/** La fila del puesto i ocupa [60·i, 60·i + 60): centros en 30, 90 y 150. */
function filasDeSesentaPx() {
  jest
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: Element) {
      const puesto = Number(this.getAttribute('data-puesto') ?? 0);
      return {
        top: puesto * 60,
        bottom: puesto * 60 + 60,
        height: 60,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: puesto * 60,
        toJSON: () => ({}),
      } as DOMRect;
    });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ListaPreguntasDuena · la fila', () => {
  it('cada pregunta trae asa, editar y borrar, con nombre accesible', () => {
    const wrapper = montar();

    expect(asa(wrapper, 1).attributes('aria-label')).toBe(
      'Mover «¿Puedo cambiar o cancelar mi cita?». Arrastra, o usa las flechas del teclado'
    );
    expect(
      wrapper
        .findAll('[data-test="editar-pregunta"]')[1]
        .attributes('aria-label')
    ).toBe('Editar «¿Puedo cambiar o cancelar mi cita?»');
    expect(
      wrapper
        .findAll('[data-test="borrar-pregunta"]')[1]
        .attributes('aria-label')
    ).toBe('Borrar «¿Puedo cambiar o cancelar mi cita?»');
  });

  it('editar y borrar avisan con la pregunta', async () => {
    const wrapper = montar();

    await wrapper.findAll('[data-test="editar-pregunta"]')[2].trigger('click');
    await wrapper.findAll('[data-test="borrar-pregunta"]')[0].trigger('click');

    expect(wrapper.emitted('editar')).toEqual([[PREGUNTAS[2]]]);
    expect(wrapper.emitted('borrar')).toEqual([[PREGUNTAS[0]]]);
  });

  it('la pregunta abre y cierra su respuesta', async () => {
    const wrapper = montar();
    const boton = wrapper.findAll('[data-test="pregunta-boton"]')[1];
    const respuesta = wrapper.findAll('[data-test="respuesta"]')[1];

    expect((respuesta.element as HTMLElement).style.display).toBe('none');
    await boton.trigger('click');

    expect(boton.attributes('aria-expanded')).toBe('true');
    expect((respuesta.element as HTMLElement).style.display).toBe('');
  });

  it('cuenta las preguntas y dice que es el orden en que se ven', () => {
    expect(montar().get('[data-test="total-preguntas"]').text()).toBe(
      '3 preguntas · en el orden en que se ven'
    );
  });

  it('el anuncio es una región viva', () => {
    const region = montar().get('[data-test="anuncio-orden"]');

    expect(region.attributes('role')).toBe('status');
    expect(region.attributes('aria-live')).toBe('polite');
  });
});

describe('ListaPreguntasDuena · con el teclado', () => {
  it('↓ sobre el asa la baja un puesto y lo anuncia', async () => {
    const wrapper = montar();

    await asa(wrapper, 0).trigger('keydown', { key: 'ArrowDown' });

    expect(wrapper.emitted('reordenar')).toEqual([
      [['p-cambiar', 'p-reservar', 'p-horario']],
    ]);
    expect(anuncio(wrapper)).toBe(
      '«¿Cómo reservo una cita?» está ahora en el puesto 2 de 3.'
    );
  });

  it('↑ sobre el asa la sube un puesto', async () => {
    const wrapper = montar();

    await asa(wrapper, 2).trigger('keydown', { key: 'ArrowUp' });

    expect(wrapper.emitted('reordenar')).toEqual([
      [['p-reservar', 'p-horario', 'p-cambiar']],
    ]);
  });

  it('↑ en la primera no reordena y lo dice', async () => {
    const wrapper = montar();

    await asa(wrapper, 0).trigger('keydown', { key: 'ArrowUp' });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(anuncio(wrapper)).toBe(
      '«¿Cómo reservo una cita?» ya es la primera.'
    );
  });

  it('↓ en la última no reordena y lo dice', async () => {
    const wrapper = montar();

    await asa(wrapper, 2).trigger('keydown', { key: 'ArrowDown' });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(anuncio(wrapper)).toBe('«¿Cuál es el horario?» ya es la última.');
  });

  it('otras teclas no reordenan', async () => {
    const wrapper = montar();

    await asa(wrapper, 0).trigger('keydown', { key: 'Enter' });
    await asa(wrapper, 0).trigger('keydown', { key: 'Tab' });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
  });

  /** Foco de revisión 4: Vue mueve el nodo y el navegador le quita el foco. */
  it('tras moverla, el foco vuelve a su asa', async () => {
    const wrapper = montar(PREGUNTAS, document.body);
    (asa(wrapper, 2).element as HTMLElement).focus();

    await asa(wrapper, 2).trigger('keydown', { key: 'ArrowUp' });
    const nuevo = wrapper.emitted('reordenar')![0][0] as string[];
    await wrapper.setProps({
      preguntas: nuevo.map((id) => PREGUNTAS.find((p) => p.id === id)!),
    });
    await flushPromises();

    expect(document.activeElement?.getAttribute('data-asa')).toBe('p-horario');
    wrapper.unmount();
  });
});

describe('ListaPreguntasDuena · arrastrando', () => {
  it('arrastrar hacia abajo levanta la fila, marca el destino y al soltar reordena', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    expect(anuncio(wrapper)).toBe(
      'Arrastrando «¿Cómo reservo una cita?», puesto 1 de 3.'
    );

    await asa(wrapper, 0).trigger('pointermove', { clientY: 170 });
    expect(anuncio(wrapper)).toBe('Suelta para dejarla en el puesto 3');
    expect(filas(wrapper)[0].classes()).toContain('fila--arrastrada');
    expect(filas(wrapper)[0].attributes('style')).toContain(
      'translateY(140px)'
    );
    expect(filas(wrapper)[2].classes()).toContain('fila--destino-abajo');
    expect(asa(wrapper, 0).classes()).toContain('fila__asa--activa');

    await asa(wrapper, 0).trigger('pointerup', { clientY: 170 });
    expect(wrapper.emitted('reordenar')).toEqual([
      [['p-cambiar', 'p-horario', 'p-reservar']],
    ]);
    expect(anuncio(wrapper)).toBe(
      '«¿Cómo reservo una cita?» está ahora en el puesto 3 de 3.'
    );
    expect(wrapper.findAll('.fila--arrastrada')).toHaveLength(0);
  });

  it('arrastrar hacia arriba marca la línea encima del destino', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 2).trigger('pointerdown', { clientY: 150 });
    await asa(wrapper, 2).trigger('pointermove', { clientY: 10 });
    expect(filas(wrapper)[0].classes()).toContain('fila--destino-arriba');

    await asa(wrapper, 2).trigger('pointerup', { clientY: 10 });
    expect(wrapper.emitted('reordenar')).toEqual([
      [['p-horario', 'p-reservar', 'p-cambiar']],
    ]);
  });

  it('soltar en el mismo sitio no reordena', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 1).trigger('pointerdown', { clientY: 90 });
    await asa(wrapper, 1).trigger('pointermove', { clientY: 100 });
    await asa(wrapper, 1).trigger('pointerup', { clientY: 100 });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(anuncio(wrapper)).toBe(
      '«¿Puedo cambiar o cancelar mi cita?» se queda en el puesto 2.'
    );
  });

  it('si el sistema cancela el puntero, no reordena y suelta la fila', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    await asa(wrapper, 0).trigger('pointermove', { clientY: 170 });
    await asa(wrapper, 0).trigger('pointercancel');

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(wrapper.findAll('.fila--arrastrada')).toHaveLength(0);
    expect(anuncio(wrapper)).toBe(
      'Orden sin cambios: «¿Cómo reservo una cita?» se queda en el puesto 1.'
    );
  });

  it('Escape durante el arrastre lo cancela', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    await asa(wrapper, 0).trigger('pointermove', { clientY: 170 });
    await asa(wrapper, 0).trigger('keydown', { key: 'Escape' });
    await asa(wrapper, 0).trigger('pointerup', { clientY: 170 });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
  });

  it('las flechas no reordenan mientras se arrastra', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    await asa(wrapper, 0).trigger('keydown', { key: 'ArrowDown' });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
  });
});

describe('ListaPreguntasDuena · arrastre robusto', () => {
  it('captura el puntero en el asa', async () => {
    filasDeSesentaPx();
    const captura = jest.fn();
    (
      HTMLElement.prototype as unknown as Record<string, unknown>
    ).setPointerCapture = captura;
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30, pointerId: 1 });

    expect(captura).toHaveBeenCalledWith(1);
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .setPointerCapture;
  });

  it('si la lista cambia a mitad del arrastre, lo cancela y no reordena', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    await asa(wrapper, 0).trigger('pointermove', { clientY: 170 });
    await wrapper.setProps({
      preguntas: [PREGUNTAS[2], PREGUNTAS[0], PREGUNTAS[1]],
    });
    await flushPromises();
    await asa(wrapper, 0).trigger('pointerup', { clientY: 170 });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(wrapper.findAll('.fila--arrastrada')).toHaveLength(0);
  });

  it('si la lista se acorta a mitad del arrastre, no lanza ni reordena', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 2).trigger('pointerdown', { clientY: 150 });
    await wrapper.setProps({ preguntas: [PREGUNTAS[0]] });
    await flushPromises();
    await asa(wrapper, 0).trigger('pointerup', { clientY: 10 });

    expect(wrapper.emitted('reordenar')).toBeUndefined();
    expect(anuncio(wrapper)).toContain('¿Cuál es el horario?');
  });

  it('un segundo puntero no le quita el arrastre al primero', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30, pointerId: 1 });
    await asa(wrapper, 1).trigger('pointerdown', { clientY: 90, pointerId: 2 });
    await asa(wrapper, 1).trigger('pointerup', { clientY: 90, pointerId: 2 });

    expect(filas(wrapper)[0].classes()).toContain('fila--arrastrada');
    expect(wrapper.emitted('reordenar')).toBeUndefined();

    await asa(wrapper, 0).trigger('pointermove', {
      clientY: 170,
      pointerId: 1,
    });
    await asa(wrapper, 0).trigger('pointerup', { clientY: 170, pointerId: 1 });
    expect(wrapper.emitted('reordenar')).toHaveLength(1);
  });

  it('perder la captura del puntero cancela el arrastre', async () => {
    filasDeSesentaPx();
    const wrapper = montar();

    await asa(wrapper, 0).trigger('pointerdown', { clientY: 30 });
    await asa(wrapper, 0).trigger('lostpointercapture');

    expect(wrapper.findAll('.fila--arrastrada')).toHaveLength(0);
    expect(wrapper.emitted('reordenar')).toBeUndefined();
  });

  it('el asa lleva touch-action: none', () => {
    const fuente = readFileSync(
      join(__dirname, '../../src/components/preguntas/ListaPreguntasDuena.vue'),
      'utf8'
    );
    expect(fuente).toMatch(/\.fila__asa\s*\{[^}]*touch-action:\s*none/);
  });
});
