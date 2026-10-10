/**
 * Cerrar sesión (plan 6, C4): en este dispositivo o en todos. La sección solo
 * pinta y avisa; la página hace el trabajo.
 */
import { mount } from '@vue/test-utils';
import SeccionSesion from 'src/components/cuenta/SeccionSesion.vue';

const montar = (
  props: {
    movil?: boolean;
    ocupado?: 'aqui' | 'todas' | null;
    error?: string;
  } = {}
) => mount(SeccionSesion, { props });

describe('SeccionSesion', () => {
  it('dos maneras de salir, cada una con su explicación', () => {
    const w = montar();

    expect(w.find('[data-test="titulo-seccion"]').text()).toBe('Cerrar sesión');
    expect(w.find('[data-test="bloque-aqui"]').text()).toContain(
      'En este dispositivo'
    );
    expect(w.find('[data-test="bloque-todas"]').text()).toContain(
      'En todos tus dispositivos'
    );
    expect(w.find('[data-test="bloque-todas"]').text()).toContain(
      'Los demás dispositivos pierden el acceso en unos minutos.'
    );
    expect(w.find('[data-test="cerrar-aqui"]').text()).toBe('Cerrar sesión');
    expect(w.find('[data-test="cerrar-todas"]').text()).toBe(
      'Cerrar sesión en todos los dispositivos'
    );
  });

  it('cada botón emite lo suyo', async () => {
    const w = montar();

    await w.find('[data-test="cerrar-aqui"]').trigger('click');
    await w.find('[data-test="cerrar-todas"]').trigger('click');

    expect(w.emitted('cerrar')).toHaveLength(1);
    expect(w.emitted('cerrar-todas')).toHaveLength(1);
    expect(w.find('[data-test="cerrar-aqui"]').attributes('type')).toBe(
      'button'
    );
    expect(w.find('[data-test="cerrar-todas"]').attributes('type')).toBe(
      'button'
    );
  });

  it('saliendo de aquí: «Cerrando…» en su botón y los dos desactivados', () => {
    const w = montar({ ocupado: 'aqui' });

    expect(w.find('[data-test="cerrar-aqui"]').text()).toBe('Cerrando…');
    expect(w.find('[data-test="cerrar-aqui"]').attributes('aria-busy')).toBe(
      'true'
    );
    expect(
      w.find('[data-test="cerrar-aqui"]').attributes('disabled')
    ).toBeDefined();
    expect(
      w.find('[data-test="cerrar-todas"]').attributes('disabled')
    ).toBeDefined();
  });

  it('saliendo de todos: el texto de espera va en el suyo', () => {
    const w = montar({ ocupado: 'todas' });

    expect(w.find('[data-test="cerrar-todas"]').text()).toBe('Cerrando…');
    expect(w.find('[data-test="cerrar-todas"]').attributes('aria-busy')).toBe(
      'true'
    );
    expect(w.find('[data-test="cerrar-aqui"]').text()).toBe('Cerrar sesión');
  });

  it('un error se pinta en línea, encima de su botón', () => {
    const w = montar({ error: 'No pudimos cerrar las demás sesiones.' });

    const bloque = w.find('[data-test="bloque-todas"]');
    const aviso = bloque.find('[data-test="aviso-acceso"]');
    expect(aviso.text()).toBe('No pudimos cerrar las demás sesiones.');
    expect(aviso.attributes('role')).toBe('alert');
    const html = bloque.html();
    expect(html.indexOf('aviso-acceso')).toBeLessThan(
      html.indexOf('cerrar-todas')
    );
  });

  it('sin error no hay aviso', () => {
    expect(montar().find('[data-test="aviso-acceso"]').exists()).toBe(false);
  });

  it('en móvil, los dos botones a lo ancho', () => {
    const w = montar({ movil: true });

    expect(w.find('[data-test="cerrar-aqui"]').classes()).toContain(
      'm-boton--ancho'
    );
    expect(w.find('[data-test="cerrar-todas"]').classes()).toContain(
      'm-boton--ancho'
    );
  });
});
