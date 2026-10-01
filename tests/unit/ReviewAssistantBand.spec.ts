/**
 * La banda muestra una reseña que rota y, al lado, la invitación al asistente.
 * Lo que más importa aquí es el caso vacío: un portal recién desplegado no
 * tiene reseñas, y unas comillas vacías son peor que no enseñar nada.
 */
import { computed } from 'vue';
import { mount } from '@vue/test-utils';
import ReviewAssistantBand from 'src/components/index/ReviewAssistantBand.vue';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { INTENT_CHIPS } from 'src/composables/assistant/intentChips';

const estado = {
  resena: null as unknown,
  total: 0,
  cargando: false,
  pausar: jest.fn(),
  reanudar: jest.fn(),
};

// El doble devuelve refs de verdad, no objetos `{ value }`: el composable real
// devuelve `ComputedRef`, y la plantilla cuenta con que Vue los desenvuelva.
// Un doble que no respeta esa forma deja la banda en blanco sin que falle nada.
jest.mock('src/composables/reviews/useRotatingReview', () => ({
  useRotatingReview: () => ({
    resena: computed(() => estado.resena),
    total: computed(() => estado.total),
    indice: computed(() => 0),
    rotando: computed(() => estado.total >= 3),
    cargando: computed(() => estado.cargando),
    pausar: estado.pausar,
    reanudar: estado.reanudar,
  }),
}));

const RESENA = {
  id: 'r1',
  name: 'Daniel',
  description: 'Buen servicio de barbería, muchas gracias',
  score: 5,
  createdAt: '2026-04-09T04:21:20.668Z',
};

beforeEach(() => {
  estado.resena = RESENA;
  estado.total = 4;
  estado.cargando = false;
  useAssistantPanel().cerrar();
  useReviewDialog().cerrar();
});

describe('ReviewAssistantBand', () => {
  it('muestra la reseña con su autor', () => {
    const texto = mount(ReviewAssistantBand).text();

    expect(texto).toContain('Buen servicio de barbería');
    expect(texto).toContain('Daniel');
  });

  it('sin reseñas no deja comillas vacías', () => {
    estado.resena = null;
    estado.total = 0;

    const wrapper = mount(ReviewAssistantBand);

    expect(wrapper.find('[data-test="cita"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('«»');
  });

  it('pausa la rotación cuando el puntero entra y la retoma al salir', async () => {
    const wrapper = mount(ReviewAssistantBand);
    const zona = wrapper.get('[data-test="zona-resena"]');

    await zona.trigger('mouseenter');
    expect(estado.pausar).toHaveBeenCalled();

    await zona.trigger('mouseleave');
    expect(estado.reanudar).toHaveBeenCalled();
  });

  /**
   * El armazón no abre el formulario a cualquiera: sin sesión manda al login,
   * y con sesión rellena el nombre antes de abrir. La banda tiene que pedirlo
   * por el mismo sitio; abrir el diálogo por su cuenta deja a una visitante
   * anónima rellenando un formulario cuyo envío no hace nada.
   */
  it('«Deja la tuya» pide la reseña al armazón, no abre el diálogo por su cuenta', async () => {
    const politica = jest.fn();
    useReviewDialog().registrarSolicitud(politica);

    const wrapper = mount(ReviewAssistantBand);
    await wrapper.get('[data-test="dejar-resena"]').trigger('click');

    expect(politica).toHaveBeenCalledTimes(1);
    expect(useReviewDialog().abierto.value).toBe(false);
  });

  it('la tarjeta del asistente abre el panel que ya está montado', async () => {
    const wrapper = mount(ReviewAssistantBand);

    await wrapper.get('[data-test="abrir-asistente"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
  });

  /**
   * Un punto por reseña y sin tope: en cuanto el negocio acumule reseñas, la
   * fila de puntos es más ancha que el teléfono y arrastra la página entera
   * en horizontal. Medido: con 40 reseñas la fila pedía 445 px sobre 350.
   */
  it('con muchas reseñas no pinta una fila de puntos que desborde', () => {
    estado.total = 40;

    const puntos = mount(ReviewAssistantBand).findAll('[data-test="punto"]');

    expect(puntos.length).toBeLessThanOrEqual(6);
  });

  it('con pocas reseñas sí los pinta, uno por reseña', () => {
    estado.total = 4;

    expect(mount(ReviewAssistantBand).findAll('[data-test="punto"]')).toHaveLength(4);
  });

  /**
   * La ruta `/` se prerenderiza y Vue Query no resuelve durante la build: el
   * HTML publicado se queda con lo que se pinte mientras se carga. Si eso es
   * la frase de «todavía no hay reseñas», el portal afirma a los buscadores y
   * al primer pintado que no tiene ninguna, teniéndolas.
   */
  it('mientras carga muestra un hueco neutro, sin afirmar que no hay reseñas', () => {
    estado.cargando = true;
    estado.resena = null;
    estado.total = 0;

    const wrapper = mount(ReviewAssistantBand);

    expect(wrapper.find('[data-test="esqueleto"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Todavía no hay reseñas');
  });

  it('cuando ya respondió y no hay ninguna, entonces sí lo dice', () => {
    estado.cargando = false;
    estado.resena = null;
    estado.total = 0;

    const wrapper = mount(ReviewAssistantBand);

    expect(wrapper.find('[data-test="esqueleto"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Todavía no hay reseñas');
  });

  /**
   * `intentChips.ts` fija la regla con prueba propia: cada chip corresponde a
   * una herramienta que el asistente tiene de verdad. Unos rótulos escritos a
   * mano en esta tarjeta se saltan esa red, y además abrían un panel vacío:
   * quien tocaba «¿Hay cupo hoy?» tenía que escribir la pregunta igual.
   */
  it('los chips salen del catálogo de intenciones, no de rótulos sueltos', () => {
    const wrapper = mount(ReviewAssistantBand);
    const rotulos = wrapper.findAll('[data-test="chip-intencion"]').map((c) => c.text());

    expect(rotulos.length).toBeGreaterThan(0);
    for (const rotulo of rotulos) {
      expect(INTENT_CHIPS.map((c) => c.label)).toContain(rotulo);
    }
  });

  it('tocar un chip deja su pregunta lista para el panel', async () => {
    const wrapper = mount(ReviewAssistantBand);

    await wrapper.findAll('[data-test="chip-intencion"]')[0].trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
    expect(useAssistantPanel().consumirPendiente()).toBe(INTENT_CHIPS[1].prompt);
  });

  it('una reseña larguísima no se sale: se recorta con elipsis', () => {
    estado.resena = { ...RESENA, description: 'palabra '.repeat(200) };

    const cita = mount(ReviewAssistantBand).get('[data-test="cita"]');

    expect(cita.classes()).toContain('review-band__cita');
  });
});
