/**
 * `useDialogMaximizedBelow` decide hoja o carril, diálogo a pantalla completa o
 * no. NF06 promete Safari 13.1, donde `MediaQueryList` todavía no es un
 * `EventTarget`: solo tiene `addListener`. Sin respaldo, `addEventListener` no
 * existe y el montaje revienta.
 */
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';

type Escucha = (evento: { matches: boolean }) => void;

function dobleDeMatchMedia(coincide: boolean, conEventTarget: boolean) {
  const escuchas: Escucha[] = [];
  const quitados: Escucha[] = [];
  const consulta = {
    matches: coincide,
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
  const capturado: { maximized?: { value: boolean } } = {};
  const wrapper = mount(
    defineComponent({
      setup() {
        capturado.maximized = useDialogMaximizedBelow(1024).maximized;
        return () => h('div');
      },
    })
  );
  return { maximized: capturado.maximized!, wrapper };
}

const matchMediaOriginal = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe('useDialogMaximizedBelow', () => {
  it('se entera del cambio de tamaño con addEventListener', () => {
    const { consulta, escuchas } = dobleDeMatchMedia(false, true);
    const { maximized } = montar();

    consulta.matches = true;
    escuchas.forEach((fn) => fn({ matches: true }));

    expect(maximized.value).toBe(true);
  });

  it('al desmontarse deja de escuchar', () => {
    const { quitados } = dobleDeMatchMedia(false, true);

    montar().wrapper.unmount();

    expect(quitados).toHaveLength(1);
  });

  it('sin addEventListener (Safari 13.1) recurre al escucha obsoleto', () => {
    const { consulta, escuchas } = dobleDeMatchMedia(false, false);
    const { maximized } = montar();

    consulta.matches = true;
    escuchas.forEach((fn) => fn({ matches: true }));

    expect(maximized.value).toBe(true);
  });

  it('sin addEventListener también quita el escucha obsoleto al desmontarse', () => {
    const { quitados } = dobleDeMatchMedia(false, false);

    montar().wrapper.unmount();

    expect(quitados).toHaveLength(1);
  });
});
