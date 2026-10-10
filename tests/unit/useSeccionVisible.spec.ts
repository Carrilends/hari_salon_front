/**
 * Qué sección de la política está leyendo la persona, para marcarla en el
 * índice (S4: «la visible marcada con un punto»). Lo que más importa aquí es lo
 * que NO puede pasar: reventar sin `IntersectionObserver` (jsdom, el SSG en
 * Node, un navegador viejo) y dejar el observador vivo al salir de la página.
 */
import { defineComponent, h } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import {
  useSeccionVisible,
  type SeccionVisible,
} from 'src/composables/politica/useSeccionVisible';
import {
  ObservadorFalso,
  instalarObservadorFalso,
} from './fixtures/observador-falso';

const IDS = ['s1', 's2', 's3', 's4'];

let envoltorio: VueWrapper | null = null;
let quitar: () => void = () => undefined;

function montar(): SeccionVisible {
  const capturado: { api?: SeccionVisible } = {};
  envoltorio = mount(
    defineComponent({
      setup() {
        capturado.api = useSeccionVisible(IDS);
        return () =>
          h(
            'div',
            IDS.map((id) => h('section', { id }))
          );
      },
    }),
    { attachTo: document.body }
  );
  return capturado.api as SeccionVisible;
}

afterEach(() => {
  envoltorio?.unmount();
  envoltorio = null;
  quitar();
  quitar = () => undefined;
  Object.assign(window, { scrollY: 0, innerHeight: 768 });
  delete (document.documentElement as unknown as { scrollHeight?: number })
    .scrollHeight;
});

describe('useSeccionVisible', () => {
  /** Foco de revisión 5. */
  it('sin IntersectionObserver monta igual y marca la primera', () => {
    expect(
      (window as unknown as { IntersectionObserver?: unknown })
        .IntersectionObserver
    ).toBeUndefined();

    expect(montar().activa.value).toBe('s1');
  });

  it('observa cada sección, con la cabecera descontada arriba', () => {
    quitar = instalarObservadorFalso();
    montar();
    const observador = ObservadorFalso.ultimo as ObservadorFalso;

    expect(observador.observados.map((e) => e.id)).toEqual(IDS);
    expect(observador.opciones.rootMargin).toMatch(/^-96px /);
  });

  it('marca la primera visible en el orden del documento, no en el del aviso', () => {
    quitar = instalarObservadorFalso();
    const { activa } = montar();

    ObservadorFalso.ultimo?.emitir([
      ['s3', true],
      ['s2', true],
    ]);

    expect(activa.value).toBe('s2');
  });

  it('cuando la de arriba sale, pasa a la siguiente visible', () => {
    quitar = instalarObservadorFalso();
    const { activa } = montar();
    ObservadorFalso.ultimo?.emitir([
      ['s2', true],
      ['s3', true],
    ]);

    ObservadorFalso.ultimo?.emitir([['s2', false]]);

    expect(activa.value).toBe('s3');
  });

  it('si no queda ninguna en la franja, conserva la última marcada', () => {
    quitar = instalarObservadorFalso();
    const { activa } = montar();
    ObservadorFalso.ultimo?.emitir([['s3', true]]);

    ObservadorFalso.ultimo?.emitir([['s3', false]]);

    expect(activa.value).toBe('s3');
  });

  it('al final de la página marca la última sección', () => {
    quitar = instalarObservadorFalso();
    const { activa } = montar();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.assign(window, { innerHeight: 800, scrollY: 1200 });

    ObservadorFalso.ultimo?.emitir([['s2', true]]);

    expect(activa.value).toBe('s4');
  });

  it('marcar fija la sección pedida e ignora una que no existe', () => {
    const { activa, marcar } = montar();

    marcar('s3');
    expect(activa.value).toBe('s3');
    marcar('no-existe');
    expect(activa.value).toBe('s3');
  });

  it('al final de la página no pisa una sección pulsada que no puede llegar arriba', () => {
    quitar = instalarObservadorFalso();
    const { activa, marcar } = montar();
    marcar('s3');
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.assign(window, { innerHeight: 800, scrollY: 1200 });

    ObservadorFalso.ultimo?.emitir([['s2', true]]);

    expect(activa.value).toBe('s3');
  });

  /** Foco de revisión 5. */
  it('al desmontar desconecta el observador', () => {
    quitar = instalarObservadorFalso();
    montar();
    const observador = ObservadorFalso.ultimo as ObservadorFalso;

    envoltorio?.unmount();
    envoltorio = null;

    expect(observador.desconectado).toBe(true);
  });
});
