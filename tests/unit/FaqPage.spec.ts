/**
 * La página entera, con `useFaqs` doblado: aquí se prueba la orquestación
 * (qué se pinta para quién, qué mutación se llama, dónde se ve cada error),
 * no Vue Query, que tiene su propia suite.
 */
const crear = jest.fn();
const editar = jest.fn();
const borrar = jest.fn();
const reordenar = jest.fn();
const refetch = jest.fn();
const useSeoMock = jest.fn();
const authState = { isAdmin: false };
const estado: { faqs: unknown[]; isLoading: boolean; isError: boolean } = {
  faqs: [],
  isLoading: false,
  isError: false,
};

jest.mock('src/composables/faqs/useFaqs', () => {
  const { ref } = require('vue');
  return {
    useFaqs: () => ({
      faqs: ref(estado.faqs),
      isLoading: ref(estado.isLoading),
      isFetching: ref(false),
      isError: ref(estado.isError),
      refetch: (...a: unknown[]) => refetch(...a),
      createFaqMutation: {
        mutateAsync: (...a: unknown[]) => crear(...a),
        isPending: ref(false),
      },
      updateFaqMutation: {
        mutateAsync: (...a: unknown[]) => editar(...a),
        isPending: ref(false),
      },
      removeFaqMutation: {
        mutateAsync: (...a: unknown[]) => borrar(...a),
        isPending: ref(false),
      },
      reordenar: (...a: unknown[]) => reordenar(...a),
      guardandoOrden: ref(false),
    }),
  };
});
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => authState }));
jest.mock('src/composables/seo/useSeo', () => ({
  useSeo: (...a: unknown[]) => useSeoMock(...a),
}));

import { flushPromises, mount } from '@vue/test-utils';
import FaqPage from 'src/pages/FaqPage.vue';
import { PREGUNTAS, pregunta } from './fixtures/preguntas';

const QDialog = {
  name: 'QDialog',
  props: ['modelValue', 'maximized', 'position'],
  emits: ['update:modelValue'],
  template: '<div v-if="modelValue" class="q-dialog"><slot /></div>',
};
const QPage = { name: 'QPage', template: '<main class="q-page"><slot /></main>' };

const montar = () =>
  mount(FaqPage, { global: { components: { QDialog, QPage } } });

async function rellenarYEnviar(
  wrapper: ReturnType<typeof montar>,
  textoPregunta: string,
  textoRespuesta: string
) {
  await wrapper.get('[data-test="campo-pregunta"]').setValue(textoPregunta);
  await wrapper.get('[data-test="campo-respuesta"]').setValue(textoRespuesta);
  await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  jest.clearAllMocks();
  authState.isAdmin = false;
  estado.faqs = PREGUNTAS;
  estado.isLoading = false;
  estado.isError = false;
});

describe('FaqPage · la clienta', () => {
  it('pinta la columna con antetítulo, título, entrada y la caja de ayuda', () => {
    const wrapper = montar();
    const cabeza = wrapper.get('[data-test="cabeza-preguntas"]');

    expect(cabeza.text()).toContain('Preguntas frecuentes');
    expect(cabeza.text()).not.toContain('vista de la dueña');
    expect(wrapper.get('h1').text()).toBe('Lo que más nos preguntan');
    expect(cabeza.text()).toContain(
      'Resolvemos las dudas más comunes para que reserves con confianza.'
    );
    expect(wrapper.find('[data-test="ayuda-preguntas"]').exists()).toBe(true);
  });

  it('lista las preguntas en acordeón, sin asas ni «Orden:»', () => {
    const wrapper = montar();

    expect(wrapper.findAll('[data-test="pregunta-boton"]')).toHaveLength(3);
    expect(wrapper.find('[data-test="asa"]').exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/Orden:/);
  });

  it('no ofrece agregar, editar ni borrar', () => {
    const wrapper = montar();

    expect(wrapper.find('[data-test="agregar-pregunta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="editar-pregunta"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="dialogo-pregunta"]').exists()).toBe(false);
  });

  it('mientras carga enseña el esqueleto y marca la lista como ocupada', () => {
    estado.isLoading = true;
    const wrapper = montar();

    expect(wrapper.find('[data-test="preguntas-cargando"]').exists()).toBe(true);
    expect(
      wrapper.get('section[aria-label="Preguntas"]').attributes('aria-busy')
    ).toBe('true');
  });

  it('si la carga falla lo dice y deja reintentar', async () => {
    estado.isError = true;
    const wrapper = montar();

    expect(wrapper.get('[data-test="preguntas-error"]').text()).toContain(
      'No pudimos cargar las preguntas.'
    );
    await wrapper.get('[data-test="reintentar"]').trigger('click');
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sin preguntas, a la clienta le dice que vuelva pronto', () => {
    estado.faqs = [];

    expect(montar().get('[data-test="preguntas-vacio"]').text()).toBe(
      'Aún no hay preguntas frecuentes. Vuelve pronto.'
    );
  });

  it('publica el marcado FAQPage para buscadores, con las preguntas', () => {
    montar();
    const opciones = useSeoMock.mock.calls[0][0];

    expect(opciones.path).toBe('/preguntas-frecuentes');
    expect(JSON.stringify(opciones.jsonLd.value)).toContain(
      '¿Cómo reservo una cita?'
    );
  });
});

describe('FaqPage · la dueña', () => {
  beforeEach(() => {
    authState.isAdmin = true;
  });

  it('se marca como vista de la dueña y cada fila trae asa, editar y borrar', () => {
    const wrapper = montar();

    expect(wrapper.get('[data-test="cabeza-preguntas"]').text()).toContain(
      'Preguntas frecuentes · vista de la dueña'
    );
    expect(wrapper.findAll('[data-test="asa"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-test="editar-pregunta"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-test="borrar-pregunta"]')).toHaveLength(3);
  });

  it('sin preguntas, la invita a agregar la primera', () => {
    estado.faqs = [];

    expect(montar().get('[data-test="preguntas-vacio"]').text()).toBe(
      'Todavía no hay preguntas. Agrega la primera con «Agregar pregunta».'
    );
  });

  it('«Agregar pregunta» crea sin mandar el orden y lo dice en línea', async () => {
    crear.mockResolvedValue(pregunta('p-nueva', '¿Hay parqueadero?', 3));
    const wrapper = montar();

    await wrapper.get('[data-test="agregar-pregunta"]').trigger('click');
    expect(wrapper.get('[data-test="dialogo-pregunta"]').text()).toContain(
      'Nueva pregunta'
    );
    await rellenarYEnviar(wrapper, '  ¿Hay parqueadero?  ', 'Sí, en la calle.');

    expect(crear).toHaveBeenCalledWith({
      question: '¿Hay parqueadero?',
      answer: 'Sí, en la calle.',
    });
    expect(wrapper.find('[data-test="dialogo-pregunta"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="estado-preguntas"]').text()).toBe(
      'Pregunta añadida al final de la lista.'
    );
  });

  it('editar abre con la pregunta y su puesto, y guarda por id', async () => {
    editar.mockResolvedValue(PREGUNTAS[1]);
    const wrapper = montar();

    await wrapper.findAll('[data-test="editar-pregunta"]')[1].trigger('click');
    expect(wrapper.get('[data-test="pista-puesto"]').text()).toContain(
      'Está en el puesto 2 de 3.'
    );
    await rellenarYEnviar(
      wrapper,
      '¿Puedo cambiar o cancelar mi cita?',
      'Sí, desde «Mis reservas».'
    );

    expect(editar).toHaveBeenCalledWith({
      id: 'p-cambiar',
      body: {
        question: '¿Puedo cambiar o cancelar mi cita?',
        answer: 'Sí, desde «Mis reservas».',
      },
    });
    expect(wrapper.get('[data-test="estado-preguntas"]').text()).toBe(
      'Pregunta guardada.'
    );
  });

  it('si guardar falla, el diálogo sigue abierto con lo escrito y el error en línea', async () => {
    crear.mockRejectedValue(new Error('red'));
    const wrapper = montar();

    await wrapper.get('[data-test="agregar-pregunta"]').trigger('click');
    await rellenarYEnviar(wrapper, '¿Hay parqueadero?', 'Sí, en la calle.');

    expect(wrapper.get('[data-test="error-guardar"]').text()).toBe(
      'No se pudo guardar la pregunta. Revisa la conexión e inténtalo otra vez.'
    );
    expect(
      (wrapper.get('[data-test="campo-pregunta"]').element as HTMLInputElement).value
    ).toBe('¿Hay parqueadero?');
  });

  /** Foco de revisión 5: dos `Enter` con la red lenta, una sola pregunta. */
  it('dos envíos seguidos crean una sola pregunta', async () => {
    crear.mockReturnValue(new Promise(() => undefined));
    const wrapper = montar();

    await wrapper.get('[data-test="agregar-pregunta"]').trigger('click');
    await wrapper.get('[data-test="campo-pregunta"]').setValue('¿Hay parqueadero?');
    await wrapper.get('[data-test="campo-respuesta"]').setValue('Sí, en la calle.');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');
    await wrapper.get('[data-test="formulario-pregunta"]').trigger('submit');

    expect(crear).toHaveBeenCalledTimes(1);
  });

  it('borrar pide confirmación, borra por id y lo dice', async () => {
    borrar.mockResolvedValue({ deleted: true });
    const wrapper = montar();

    await wrapper.findAll('[data-test="borrar-pregunta"]')[2].trigger('click');
    expect(wrapper.get('[data-test="pregunta-a-borrar"]').text()).toBe(
      '«¿Cuál es el horario?»'
    );
    expect(borrar).not.toHaveBeenCalled();

    await wrapper.get('[data-test="confirmar-borrado"]').trigger('click');
    await flushPromises();

    expect(borrar).toHaveBeenCalledWith('p-horario');
    expect(wrapper.find('[data-test="dialogo-borrar"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="estado-preguntas"]').text()).toBe(
      'Pregunta borrada: «¿Cuál es el horario?».'
    );
  });

  it('si borrar falla, lo dice dentro de la confirmación', async () => {
    borrar.mockRejectedValue(new Error('500'));
    const wrapper = montar();

    await wrapper.findAll('[data-test="borrar-pregunta"]')[0].trigger('click');
    await wrapper.get('[data-test="confirmar-borrado"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-test="error-borrar"]').text()).toBe(
      'No se pudo borrar la pregunta. Inténtalo otra vez.'
    );
  });

  it('mover con el teclado guarda el orden nuevo', async () => {
    reordenar.mockResolvedValue(true);
    const wrapper = montar();

    await wrapper.findAll('[data-test="asa"]')[0].trigger('keydown', {
      key: 'ArrowDown',
    });
    await flushPromises();

    expect(reordenar).toHaveBeenCalledWith(['p-cambiar', 'p-reservar', 'p-horario']);
    expect(wrapper.find('[data-test="fallo-orden"]').exists()).toBe(false);
  });

  it('si el orden no se guarda, lo dice en línea', async () => {
    reordenar.mockResolvedValue(false);
    const wrapper = montar();

    await wrapper.findAll('[data-test="asa"]')[0].trigger('keydown', {
      key: 'ArrowDown',
    });
    await flushPromises();

    const fallo = wrapper.get('[data-test="fallo-orden"]');
    expect(fallo.text()).toBe(
      'No se pudo guardar el orden. La lista volvió a como estaba; inténtalo otra vez.'
    );
    expect(fallo.attributes('role')).toBe('alert');
  });
});
