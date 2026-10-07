/**
 * En una tableta o un móvil no hay ratón: sin esto, la lista de servicios se
 * queda sin nombres porque el velo de la tarjeta solo aparece con `:hover`
 * (D5 de la hoja de ruta). La consulta es `(hover: none)`, no un ancho: hay
 * portátiles táctiles anchos y hay ratones conectados a tabletas.
 */
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCoarsePointer } from 'src/composables/shared/useCoarsePointer';

const FUENTE = readFileSync(
  join(__dirname, '../../src/composables/shared/useCoarsePointer.ts'),
  'utf8'
);

type Escucha = (evento: { matches: boolean }) => void;

/** Doble de `matchMedia`: guarda los escuchas para poder disparar el cambio. */
function dobleDeMatchMedia(coincide: boolean, conEventTarget = true) {
  const escuchas: Escucha[] = [];
  const quitados: Escucha[] = [];
  const consulta = {
    matches: coincide,
    media: '(hover: none)',
    addEventListener: conEventTarget
      ? (_tipo: string, fn: Escucha) => escuchas.push(fn)
      : undefined,
    removeEventListener: conEventTarget
      ? (_tipo: string, fn: Escucha) => quitados.push(fn)
      : undefined,
    addListener: (fn: Escucha) => escuchas.push(fn),
    removeListener: (fn: Escucha) => quitados.push(fn),
  };
  window.matchMedia = (() => consulta) as unknown as typeof window.matchMedia;
  return { consulta, escuchas, quitados };
}

function montar() {
  const capturado: { grueso?: ReturnType<typeof useCoarsePointer> } = {};
  const wrapper = mount(
    defineComponent({
      setup() {
        capturado.grueso = useCoarsePointer();
        return () => h('div');
      },
    })
  );
  return { grueso: capturado.grueso!, wrapper };
}

const matchMediaOriginal = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe('useCoarsePointer', () => {
  it('con un puntero grueso dice que sí', () => {
    dobleDeMatchMedia(true);

    expect(montar().grueso.value).toBe(true);
  });

  it('con ratón dice que no', () => {
    dobleDeMatchMedia(false);

    expect(montar().grueso.value).toBe(false);
  });

  it('se entera si el puntero cambia a mitad de sesión', () => {
    const { consulta, escuchas } = dobleDeMatchMedia(false);
    const { grueso } = montar();

    consulta.matches = true;
    escuchas.forEach((fn) => fn({ matches: true }));

    expect(grueso.value).toBe(true);
  });

  it('al desmontarse deja de escuchar', () => {
    const { quitados } = dobleDeMatchMedia(true);
    const { wrapper } = montar();

    wrapper.unmount();

    expect(quitados).toHaveLength(1);
  });

  /**
   * NF06 promete Safari 13.1, y ahí `MediaQueryList` todavía no es un
   * `EventTarget`: solo tiene `addListener`. Sin este respaldo, en ese Safari la
   * lista no reaccionaría nunca al cambio de puntero.
   */
  it('sin addEventListener recurre al escucha obsoleto', () => {
    const { consulta, escuchas } = dobleDeMatchMedia(false, false);
    const { grueso } = montar();

    consulta.matches = true;
    escuchas.forEach((fn) => fn({ matches: true }));

    expect(grueso.value).toBe(true);
  });

  /**
   * `build:ssg` prerenderiza sin `window`. La guarda no se puede comprobar
   * montando (jsdom siempre trae `window`), así que se lee en la fuente.
   */
  it('lleva la guarda de SSG escrita', () => {
    expect(FUENTE).toContain("typeof window === 'undefined'");
    expect(FUENTE).toContain("typeof window.matchMedia !== 'function'");
  });

  it('sin matchMedia no revienta: devuelve que el puntero es fino', () => {
    (window as unknown as { matchMedia?: unknown }).matchMedia = undefined;

    expect(montar().grueso.value).toBe(false);
  });
});
