/**
 * El campo de los formularios de acceso (A3): rótulo en versalitas encima,
 * input de 48 px, error en línea ligado con `aria-describedby`, y un ojo de
 * 44 px para las contraseñas.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/auth/CampoAcceso.vue'),
  'utf8'
);
const ESTILOS = FUENTE.slice(FUENTE.indexOf('<style'));

type Extra = {
  id?: string;
  rotulo?: string;
  modelValue?: string;
  tipo?: 'email' | 'password' | 'text';
  autocomplete?: string;
  marcador?: string;
  error?: string;
  describedby?: string;
};

const montar = (extra: Extra = {}, slots: Record<string, string> = {}) =>
  mount(CampoAcceso, {
    props: { id: 'correo', rotulo: 'Correo', modelValue: '', ...extra },
    slots,
  });

describe('CampoAcceso', () => {
  it('el rótulo va encima, asociado al campo por su id', () => {
    const wrapper = montar();
    const html = wrapper.html();

    expect(wrapper.find('label[for="correo"]').text()).toBe('Correo');
    expect(wrapper.find('[data-test="campo-correo"]').attributes('id')).toBe(
      'correo'
    );
    expect(html.indexOf('<label')).toBeLessThan(html.indexOf('<input'));
  });

  it('escribir emite update:modelValue con el texto', async () => {
    const wrapper = montar();

    await wrapper.find('[data-test="campo-correo"]').setValue('ana@correo.com');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      'ana@correo.com',
    ]);
  });

  it('salir del campo emite blur', async () => {
    const wrapper = montar();

    await wrapper.find('[data-test="campo-correo"]').trigger('blur');

    expect(wrapper.emitted('blur')).toHaveLength(1);
  });

  it('el tipo, el autocompletado y el marcador llegan al input', () => {
    const input = montar({
      tipo: 'email',
      autocomplete: 'email',
      marcador: 'tu@correo.com',
    }).find('[data-test="campo-correo"]');

    expect(input.attributes('type')).toBe('email');
    expect(input.attributes('autocomplete')).toBe('email');
    expect(input.attributes('placeholder')).toBe('tu@correo.com');
  });

  it('sin error: ni aria-invalid, ni mensaje, ni descripción colgante', () => {
    const wrapper = montar();
    const input = wrapper.find('[data-test="campo-correo"]');

    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.find('[data-test="campo-correo-error"]').exists()).toBe(false);
  });

  it('con error: aria-invalid y mensaje ligado por aria-describedby', () => {
    const wrapper = montar({ error: 'Escribe tu correo.' });
    const input = wrapper.find('[data-test="campo-correo"]');
    const mensaje = wrapper.find('[data-test="campo-correo-error"]');

    expect(input.attributes('aria-invalid')).toBe('true');
    expect(mensaje.text()).toBe('Escribe tu correo.');
    expect(mensaje.attributes('id')).toBe('correo-error');
    expect(input.attributes('aria-describedby')).toBe('correo-error');
    expect(wrapper.classes()).toContain('campo-acceso--error');
  });

  it('una descripción externa (las reglas) se conserva, sola o junto al error', () => {
    const sinError = montar({ describedby: 'reglas-contrasena' });
    const conError = montar({
      describedby: 'reglas-contrasena',
      error: 'Usa 8 caracteres o más.',
    });

    expect(
      sinError.find('[data-test="campo-correo"]').attributes('aria-describedby')
    ).toBe('reglas-contrasena');
    expect(
      conError.find('[data-test="campo-correo"]').attributes('aria-describedby')
    ).toBe('reglas-contrasena correo-error');
  });

  it('la contraseña se oculta y el ojo la enseña, con aria-pressed y rótulo que cambia', async () => {
    const wrapper = montar({
      id: 'contrasena',
      rotulo: 'Contraseña',
      tipo: 'password',
    });
    const input = () => wrapper.find('[data-test="campo-contrasena"]');
    const ojo = () => wrapper.find('[data-test="ver-contrasena"]');

    expect(input().attributes('type')).toBe('password');
    expect(ojo().attributes('aria-pressed')).toBe('false');
    expect(ojo().attributes('aria-label')).toBe('Mostrar la contraseña');

    await ojo().trigger('click');

    expect(input().attributes('type')).toBe('text');
    expect(ojo().attributes('aria-pressed')).toBe('true');
    expect(ojo().attributes('aria-label')).toBe('Ocultar la contraseña');
  });

  /** Foco de revisión 1: un `<button>` sin tipo dentro de un form envía. */
  it('el ojo es type="button": pulsarlo no envía el formulario', async () => {
    const Formulario = defineComponent({
      components: { CampoAcceso },
      setup() {
        const enviados = ref(0);
        return { enviados };
      },
      template: `
        <form @submit.prevent="enviados++">
          <CampoAcceso id="contrasena" rotulo="Contraseña" model-value="x" tipo="password" />
          <button data-test="control">Enviar</button>
          <span data-test="enviados">{{ enviados }}</span>
        </form>`,
    });
    const wrapper = mount(Formulario, { attachTo: document.body });

    // Control: en este entorno, un botón sin tipo sí envía.
    await wrapper.find('[data-test="control"]').trigger('click');
    expect(wrapper.find('[data-test="enviados"]').text()).toBe('1');

    await wrapper.find('[data-test="ver-contrasena"]').trigger('click');

    expect(wrapper.find('[data-test="ver-contrasena"]').attributes('type')).toBe(
      'button'
    );
    expect(wrapper.find('[data-test="enviados"]').text()).toBe('1');
    wrapper.unmount();
  });

  it('los campos que no son contraseña no llevan ojo', () => {
    expect(montar({ tipo: 'email' }).find('[data-test="ver-contrasena"]').exists()).toBe(
      false
    );
    expect(montar().find('[data-test="ver-contrasena"]').exists()).toBe(false);
  });

  it('la ranura accesorio se pinta en la línea del rótulo', () => {
    const wrapper = montar(
      {},
      { accesorio: '<a data-test="olvidaste">¿La olvidaste?</a>' }
    );
    const html = wrapper.html();

    expect(wrapper.find('[data-test="olvidaste"]').exists()).toBe(true);
    // Entre el rótulo y el input: en la línea del rótulo, no debajo del campo.
    expect(html.indexOf('</label>')).toBeLessThan(html.indexOf('olvidaste'));
    expect(html.indexOf('olvidaste')).toBeLessThan(html.indexOf('<input'));
  });
});

describe('CampoAcceso · la pintura, leída de la fuente', () => {
  const regla = (selector: string) =>
    ESTILOS.match(
      new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`)
    )?.[1] ?? '';

  it('sin hexadecimales', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
  });

  it('el input mide 48 px, con filete, sobre nieve y en Jost', () => {
    const cuerpo = regla('.campo-acceso__entrada');
    expect(cuerpo).toMatch(/height: 48px;/);
    expect(cuerpo).toMatch(/border: var\(--m-filete-grosor\) solid var\(--m-filete\);/);
    expect(cuerpo).toMatch(/background: var\(--m-nieve\);/);
    expect(cuerpo).toMatch(/font-family: var\(--m-font-sans\);/);
  });

  it('16 px de letra por debajo de 1024 (iOS no hace zoom), 15 px desde 1024', () => {
    expect(regla('.campo-acceso__entrada')).toMatch(/font-size: 16px;/);
    expect(ESTILOS).toMatch(
      /@media \(min-width: 1024px\)\s*\{\s*\.campo-acceso__entrada\s*\{\s*font-size: 15px;/
    );
  });

  it('el foco es el anillo de oro', () => {
    expect(regla('.campo-acceso__entrada:focus')).toMatch(
      /outline: 2px solid var\(--m-oro\);[\s\S]*outline-offset: 2px;/
    );
  });

  it('en error, borde y mensaje en peligro', () => {
    expect(regla('.campo-acceso--error .campo-acceso__entrada')).toMatch(
      /border-color: var\(--m-peligro\);/
    );
    expect(regla('.campo-acceso__error')).toMatch(/color: var\(--m-peligro\);/);
  });

  it('el rótulo va en versalitas, en piedra', () => {
    const cuerpo = regla('.campo-acceso__rotulo');
    expect(cuerpo).toMatch(/text-transform: uppercase;/);
    expect(cuerpo).toMatch(/color: var\(--m-piedra\);/);
  });

  it('el marcador es piedra atenuada', () => {
    expect(regla('.campo-acceso__entrada::placeholder')).toMatch(
      /color: var\(--m-piedra\);[\s\S]*opacity: 0\.75;/
    );
  });

  it('el ojo mide 44 px y tiene foco visible', () => {
    expect(regla('.campo-acceso__ojo')).toMatch(
      /width: var\(--m-tactil-min\);[\s\S]*height: var\(--m-tactil-min\);/
    );
    expect(regla('.campo-acceso__ojo:focus-visible')).toMatch(
      /outline: 2px solid var\(--m-oro\);/
    );
  });
});
