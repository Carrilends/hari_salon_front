/**
 * Piezas comunes de Mi cuenta (plan 6, C1; tablero MiCuentaA):
 * - el marco de cada sección: antetítulo, título y entradilla; ficha nieve con
 *   `h2` en escritorio, pantalla completa con `h1` en móvil;
 * - la fila de acciones: «Descartar» (tipo button) y el «Guardar…» que envía;
 * - la identidad: iniciales del menú «Más», nombre y correo.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import MarcoSeccion from 'src/components/cuenta/MarcoSeccion.vue';
import AccionesCuenta from 'src/components/cuenta/AccionesCuenta.vue';
import IdentidadCuenta from 'src/components/cuenta/IdentidadCuenta.vue';

describe('MarcoSeccion', () => {
  it('en escritorio el título es un h2 que la página puede enfocar', () => {
    const w = mount(MarcoSeccion, {
      props: {
        antetitulo: 'Correo',
        titulo: 'Cambiar tu correo',
        entradilla: 'Te enviaremos un enlace.',
      },
    });

    const titulo = w.find('[data-test="titulo-seccion"]');
    expect(titulo.element.tagName).toBe('H2');
    expect(titulo.text()).toBe('Cambiar tu correo');
    expect(titulo.attributes('id')).toBe('cuenta-titulo-seccion');
    expect(titulo.attributes('tabindex')).toBe('-1');
    expect(w.find('[data-test="antetitulo-seccion"]').text()).toBe('Correo');
    expect(w.find('[data-test="entradilla-seccion"]').text()).toBe(
      'Te enviaremos un enlace.'
    );
    expect(w.find('section').attributes('aria-labelledby')).toBe(
      'cuenta-titulo-seccion'
    );
    expect(w.find('section').classes()).not.toContain('marco-seccion--movil');
  });

  it('en móvil el título es el h1 de la pantalla', () => {
    const w = mount(MarcoSeccion, {
      props: {
        antetitulo: 'Contraseña',
        titulo: 'Entras con Google',
        movil: true,
      },
    });

    expect(w.find('[data-test="titulo-seccion"]').element.tagName).toBe('H1');
    expect(w.find('section').classes()).toContain('marco-seccion--movil');
  });

  it('sin entradilla no pinta un párrafo vacío', () => {
    const w = mount(MarcoSeccion, {
      props: { antetitulo: 'Perfil', titulo: 'Tu nombre' },
    });

    expect(w.find('[data-test="entradilla-seccion"]').exists()).toBe(false);
  });

  it('pinta lo que se le pone dentro', () => {
    const w = mount(MarcoSeccion, {
      props: { antetitulo: 'Perfil', titulo: 'Tu nombre' },
      slots: { default: '<form data-test="dentro"></form>' },
    });

    expect(w.find('[data-test="dentro"]').exists()).toBe(true);
  });
});

describe('AccionesCuenta', () => {
  it('«Descartar» es type=button y emite; «Guardar…» es el submit', async () => {
    const w = mount(AccionesCuenta, {
      props: { textoGuardar: 'Guardar correo' },
    });

    const descartar = w.find('[data-test="descartar"]');
    expect(descartar.attributes('type')).toBe('button');
    expect(descartar.text()).toBe('Descartar');
    expect(descartar.classes()).toContain('m-boton-plano');
    await descartar.trigger('click');
    expect(w.emitted('descartar')).toHaveLength(1);

    const guardar = w.find('[data-test="guardar"]');
    expect(guardar.attributes('type')).toBe('submit');
    expect(guardar.text()).toBe('Guardar correo');
    expect(guardar.attributes('disabled')).toBeUndefined();
  });

  it('«Descartar» dentro de un formulario no lo envía', async () => {
    const envios = ref(0);
    const Envoltorio = defineComponent({
      setup: () => () =>
        h(
          'form',
          {
            onSubmit: (e: Event) => {
              e.preventDefault();
              envios.value += 1;
            },
          },
          [h(AccionesCuenta, { textoGuardar: 'Guardar' })]
        ),
    });
    const w = mount(Envoltorio, { attachTo: document.body });

    await w.find('[data-test="descartar"]').trigger('click');

    expect(envios.value).toBe(0);
    w.unmount();
  });

  it('mientras envía: el texto de espera, desactivado y aria-busy', () => {
    const w = mount(AccionesCuenta, {
      props: { textoGuardar: 'Guardar nombre', enviando: true },
    });

    const guardar = w.find('[data-test="guardar"]');
    expect(guardar.text()).toBe('Guardando…');
    expect(guardar.attributes('disabled')).toBeDefined();
    expect(guardar.attributes('aria-busy')).toBe('true');
    expect(
      w.find('[data-test="descartar"]').attributes('disabled')
    ).toBeDefined();
  });

  it('sin cambios, «Guardar…» está desactivado', () => {
    const w = mount(AccionesCuenta, {
      props: { textoGuardar: 'Guardar nombre', sinCambios: true },
    });

    expect(
      w.find('[data-test="guardar"]').attributes('disabled')
    ).toBeDefined();
  });

  it('a lo ancho (móvil): sin «Descartar» y con m-boton--ancho', () => {
    const w = mount(AccionesCuenta, {
      props: {
        textoGuardar: 'Guardar contraseña',
        ancho: true,
        conDescartar: false,
      },
    });

    expect(w.find('[data-test="descartar"]').exists()).toBe(false);
    expect(w.find('[data-test="guardar"]').classes()).toContain(
      'm-boton--ancho'
    );
  });
});

describe('IdentidadCuenta', () => {
  it('las iniciales de las dos primeras palabras útiles, el nombre y el correo', () => {
    const w = mount(IdentidadCuenta, {
      props: { nombre: 'Laura Gómez', correo: 'laura@correo.com' },
    });

    expect(w.find('[data-test="iniciales"]').text()).toBe('LG');
    expect(w.find('[data-test="identidad-nombre"]').text()).toBe('Laura Gómez');
    expect(w.find('[data-test="identidad-correo"]').text()).toBe(
      'laura@correo.com'
    );
  });

  it('sin nombre: la inicial del correo y «Tu cuenta»', () => {
    const w = mount(IdentidadCuenta, {
      props: { nombre: '  ', correo: 'laura@correo.com' },
    });

    expect(w.find('[data-test="iniciales"]').text()).toBe('L');
    expect(w.find('[data-test="identidad-nombre"]').text()).toBe('Tu cuenta');
  });

  it('el lector no lee las iniciales: ya lee el nombre', () => {
    const w = mount(IdentidadCuenta, {
      props: { nombre: 'Laura Gómez', correo: 'laura@correo.com' },
    });

    expect(w.find('[data-test="iniciales"]').attributes('aria-hidden')).toBe(
      'true'
    );
  });
});
