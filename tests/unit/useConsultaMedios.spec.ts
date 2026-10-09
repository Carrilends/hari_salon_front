/**
 * M11: una consulta de medios que no descuadra la hidratación ni revienta en
 * Safari 13.1. El valor de `setup` es el que el SSG prerenderizó —el que pasa
 * quien llama—, y el de la ventana real llega en `onMounted`.
 */
import { defineComponent, h, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { fijarViewport } from '../viewportMock';

const FUENTE = readFileSync(
  join(__dirname, '../../src/composables/shared/useConsultaMedios.ts'),
  'utf8'
);

const matchMediaOriginal = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

function montar(consulta: string, inicial: boolean) {
  const capturado: { valor?: Ref<boolean>; enSetup?: boolean } = {};
  const wrapper = mount(
    defineComponent({
      setup() {
        capturado.valor = useConsultaMedios(consulta, inicial);
        capturado.enSetup = capturado.valor.value;
        return () => h('div');
      },
    })
  );
  return {
    valor: capturado.valor as Ref<boolean>,
    enSetup: capturado.enSetup,
    wrapper,
  };
}

describe('useConsultaMedios', () => {
  it('en setup vale el inicial aunque la ventana diga otra cosa, y tras montar se sincroniza', () => {
    fijarViewport({ ancho: 390 });

    const { valor, enSetup } = montar('(max-width: 699px)', false);

    expect(enSetup).toBe(false);
    expect(valor.value).toBe(true);
  });

  it('con inicial true y una ventana estrecha, baja a false al montar', () => {
    fijarViewport({ ancho: 800 });

    const { valor, enSetup } = montar('(min-width: 1171px)', true);

    expect(enSetup).toBe(true);
    expect(valor.value).toBe(false);
  });

  it('sigue a la ventana cuando cambia de tamaño', () => {
    const viewport = fijarViewport({ ancho: 1280 });
    const { valor } = montar('(max-width: 699px)', false);
    expect(valor.value).toBe(false);

    viewport.cambiar({ ancho: 390 });

    expect(valor.value).toBe(true);
  });

  it('Safari 13.1: sin addEventListener, escucha con addListener', () => {
    const escuchas: Array<() => void> = [];
    const estado = { coincide: false };
    window.matchMedia = (() => ({
      get matches() {
        return estado.coincide;
      },
      media: '(max-width: 699px)',
      addListener: (fn: () => void) => escuchas.push(fn),
      removeListener: () => undefined,
    })) as unknown as typeof window.matchMedia;

    const { valor } = montar('(max-width: 699px)', false);
    estado.coincide = true;
    escuchas.forEach((fn) => fn());

    expect(escuchas).toHaveLength(1);
    expect(valor.value).toBe(true);
  });

  it('sin matchMedia no revienta y se queda con el inicial', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    expect(montar('(max-width: 699px)', true).valor.value).toBe(true);
  });

  it('al desmontar suelta la escucha', () => {
    const quitadas: Array<() => void> = [];
    window.matchMedia = (() => ({
      matches: false,
      media: '(max-width: 699px)',
      addEventListener: () => undefined,
      removeEventListener: (_tipo: string, fn: () => void) => quitadas.push(fn),
    })) as unknown as typeof window.matchMedia;

    const { wrapper } = montar('(max-width: 699px)', false);
    wrapper.unmount();

    expect(quitadas).toHaveLength(1);
  });

  it('no consulta la ventana en setup: solo dentro de onMounted', () => {
    const antesDeMontar = FUENTE.slice(0, FUENTE.indexOf('onMounted(() =>'));

    expect(antesDeMontar).not.toContain('window.matchMedia(');
    expect(FUENTE).toContain('escucharConsulta(');
  });
});
