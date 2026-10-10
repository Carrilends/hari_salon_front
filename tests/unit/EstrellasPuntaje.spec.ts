/**
 * El puntaje deja de ser un `select` que venía en 5 (R1): cinco estrellas que
 * son radios de verdad —el teclado las recorre con las flechas— y que empiezan
 * sin valor. Y la línea de error que comparten los tres campos.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import EstrellasPuntaje from 'src/components/resena/EstrellasPuntaje.vue';
import ErrorCampo from 'src/components/resena/ErrorCampo.vue';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/resena/EstrellasPuntaje.vue'),
  'utf8'
);

const crear = (
  props: Partial<{ modelValue: number | null; error: string; idError: string }> = {}
) =>
  mount(EstrellasPuntaje, {
    props: { modelValue: null, nombre: 'puntaje-prueba', ...props },
    attachTo: document.body,
  });
type Estrellas = ReturnType<typeof crear>;

let wrapper: Estrellas | undefined;

const montar = (
  props: Partial<{ modelValue: number | null; error: string; idError: string }> = {}
): Estrellas => {
  wrapper = crear(props);
  return wrapper;
};

const radios = (w: Estrellas) => w.findAll('input[type="radio"]');

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('EstrellasPuntaje', () => {
  it('son cinco radios del mismo grupo, cada uno con su nombre accesible', () => {
    const w = montar();

    expect(radios(w)).toHaveLength(5);
    radios(w).forEach((radio, i) => {
      expect(radio.attributes('name')).toBe('puntaje-prueba');
      expect(radio.attributes('aria-label')).toBe(`${i + 1} de 5`);
      expect(radio.classes()).toContain('sr');
    });
    expect(w.find('legend').text()).toBe('Tu puntaje, de 1 a 5');
  });

  it('sin valor: ninguna marcada, ninguna llena, y lo dice', () => {
    const w = montar();

    expect(
      radios(w).some((r) => (r.element as HTMLInputElement).checked)
    ).toBe(false);
    expect(w.findAll('.estrellas__icono--llena')).toHaveLength(0);
    expect(w.find('[data-test="puntaje-texto"]').text()).toBe('Elige de 1 a 5');
  });

  it('con 4: la cuarta marcada y cuatro llenas', () => {
    const w = montar({ modelValue: 4 });

    expect((radios(w)[3].element as HTMLInputElement).checked).toBe(true);
    expect(w.findAll('.estrellas__icono--llena')).toHaveLength(4);
    expect(w.find('[data-test="puntaje-texto"]').text()).toBe(
      '4 de 5 · Muy bien'
    );
  });

  it('elegir la tercera emite 3', async () => {
    const w = montar();

    await radios(w)[2].setValue(true);

    expect(w.emitted('update:modelValue')).toEqual([[3]]);
  });

  it('el error se enlaza al grupo; sin error no queda nada colgando', () => {
    const conError = montar({ error: 'Elige un puntaje de 1 a 5.', idError: 'e1' });
    expect(
      conError.find('[data-test="estrellas-puntaje"]').attributes('aria-describedby')
    ).toBe('e1');
    radios(conError).forEach((r) => {
      expect(r.attributes('aria-invalid')).toBe('true');
      expect(r.attributes('aria-describedby')).toBe('e1');
    });
    conError.unmount();
    wrapper = undefined;

    const sinError = montar({ idError: 'e1' });
    expect(
      sinError.find('[data-test="estrellas-puntaje"]').attributes('aria-describedby')
    ).toBeUndefined();
    radios(sinError).forEach((r) => {
      expect(r.attributes('aria-invalid')).toBeUndefined();
      expect(r.attributes('aria-describedby')).toBeUndefined();
    });
  });

  it('enfocar() lleva el foco a la marcada, o a la primera', async () => {
    const w = montar();
    (w.vm as unknown as { enfocar: () => void }).enfocar();
    expect(document.activeElement).toBe(radios(w)[0].element);

    await w.setProps({ modelValue: 4 });
    (w.vm as unknown as { enfocar: () => void }).enfocar();
    expect(document.activeElement).toBe(radios(w)[3].element);
  });

  it('cada estrella es una casilla táctil de 52 px y el foco se ve en la estrella', () => {
    expect(FUENTE).toMatch(
      /\.estrellas__opcion\s*\{[^}]*position: relative;[^}]*width: 52px;[^}]*height: 52px;/
    );
    expect(FUENTE).toMatch(
      /\.estrellas__radio:focus-visible \+ \.estrellas__icono\s*\{[^}]*outline: 2px solid var\(--m-tinta\);[^}]*outline-offset: 2px;/
    );
    expect(FUENTE).toMatch(/color: var\(--m-oro-profundo\);/);
  });
});

describe('ErrorCampo', () => {
  it('no es una región viva (el foco y aria-describedby lo anuncian) y hereda id y data-test', () => {
    const w = mount(ErrorCampo, {
      slots: { default: 'Escribe al menos 5 caracteres.' },
      attrs: { id: 'resena-error-texto', 'data-test': 'error-texto' },
    });

    expect(w.element.tagName).toBe('P');
    expect(w.attributes('role')).toBeUndefined();
    expect(w.attributes('id')).toBe('resena-error-texto');
    expect(w.attributes('data-test')).toBe('error-texto');
    expect(w.text()).toBe('Escribe al menos 5 caracteres.');
  });
});
