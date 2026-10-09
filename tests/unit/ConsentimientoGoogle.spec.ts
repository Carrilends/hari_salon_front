/**
 * El diálogo propio de consentimiento para Google (A11): texto de la Ley 1581,
 * «Acepto» macizo y «Cancelar» de contorno. Sustituye al diálogo de plugin.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, RouterLinkStub } from '@vue/test-utils';
import ConsentimientoGoogle from 'src/components/auth/ConsentimientoGoogle.vue';

const FUENTE = readFileSync(
  join(__dirname, '../../src/components/auth/ConsentimientoGoogle.vue'),
  'utf8'
);

const QDialog = {
  name: 'QDialog',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
};

const montar = (abierto: boolean) =>
  mount(ConsentimientoGoogle, {
    props: { abierto },
    global: {
      components: { QDialog },
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe('ConsentimientoGoogle', () => {
  it('cerrado no pinta nada', () => {
    expect(
      montar(false).find('[data-test="consentimiento-google"]').exists()
    ).toBe(false);
  });

  it('abierto explica la Ley 1581 y enlaza la política en otra pestaña', () => {
    const wrapper = montar(true);
    const enlace = wrapper.findComponent(RouterLinkStub);

    expect(wrapper.find('[data-test="consentimiento-google"]').text()).toContain(
      'Ley 1581 de 2012'
    );
    expect(enlace.props('to')).toEqual({ name: 'privacy-policy' });
    expect(enlace.attributes('target')).toBe('_blank');
  });

  it('«Acepto» emite aceptar', async () => {
    const wrapper = montar(true);

    await wrapper.find('[data-test="aceptar-consentimiento"]').trigger('click');

    expect(wrapper.emitted('aceptar')).toHaveLength(1);
    expect(wrapper.emitted('cancelar')).toBeUndefined();
  });

  it('«Cancelar» emite cancelar', async () => {
    const wrapper = montar(true);

    await wrapper.find('[data-test="cancelar-consentimiento"]').trigger('click');

    expect(wrapper.emitted('cancelar')).toHaveLength(1);
  });

  it('cerrar con Escape o con el velo cuenta como cancelar', async () => {
    const wrapper = montar(true);

    await wrapper
      .findComponent({ name: 'QDialog' })
      .vm.$emit('update:modelValue', false);

    expect(wrapper.emitted('cancelar')).toHaveLength(1);
  });

  it('los dos botones son type="button" y anchos', () => {
    const wrapper = montar(true);
    ['aceptar-consentimiento', 'cancelar-consentimiento'].forEach((gancho) => {
      const boton = wrapper.find(`[data-test="${gancho}"]`);
      expect(boton.attributes('type')).toBe('button');
      expect(boton.classes()).toContain('m-boton--ancho');
    });
  });

  it('la raíz devuelve los clics (Quasar se los quita a lo que no es <div>)', () => {
    expect(FUENTE).toMatch(/\.consentimiento\s*\{[^}]*pointer-events: all;/);
  });

  it('sin hexadecimales; el enlace en rosa profundo con filete rosa', () => {
    expect(FUENTE).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
    expect(FUENTE).toMatch(
      /\.consentimiento__enlace\s*\{[^}]*color: var\(--m-rosa-profundo\);[^}]*border-bottom: var\(--m-filete-grosor\) solid var\(--m-filete-rosa\);/
    );
  });

  /** §4: el velo es el de la paleta, no el gris de Quasar (como la hoja del menú). */
  it('el velo es el de la paleta, en un bloque sin scoped y prefijado', () => {
    const libre = FUENTE.slice(FUENTE.indexOf('<style lang="scss">'));

    expect(FUENTE).toMatch(/<q-dialog\b[^>]*class="consentimiento-dialogo"/);
    expect(FUENTE.indexOf('<style lang="scss">')).toBeGreaterThan(
      FUENTE.indexOf('<style scoped lang="scss">')
    );
    expect(libre).toMatch(
      /\.consentimiento-dialogo \.q-dialog__backdrop\s*\{[^}]*background: var\(--m-velo\);/
    );
  });
});
