/**
 * La banda muestra una reseña que rota y, al lado, la invitación al asistente.
 * Lo que más importa aquí es el caso vacío: un portal recién desplegado no
 * tiene reseñas, y unas comillas vacías son peor que no enseñar nada.
 */
import { computed } from 'vue';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// Estado de la consulta compartida (`useReviews`) y de la sesión. Con `isPending`
// verdadero y `cargando` falso se reproduce la consulta pausada sin red; con
// `isError`, la petición que falló.
const mockConsulta = { pendiente: false, error: false };
jest.mock('src/composables/reviews/useReviews', () => ({
  useReviews: () => ({
    isPending: computed(() => mockConsulta.pendiente),
    isError: computed(() => mockConsulta.error),
  }),
}));

const mockAuth = { isAdmin: false };
jest.mock('src/stores/auth-store', () => ({ useAuthStore: () => mockAuth }));

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
  mockConsulta.pendiente = false;
  mockConsulta.error = false;
  mockAuth.isAdmin = false;
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

  it('con la consulta pausada sin red no afirma que no hay reseñas', () => {
    estado.cargando = false;
    mockConsulta.pendiente = true;
    estado.resena = null;
    estado.total = 0;

    const wrapper = mount(ReviewAssistantBand);

    expect(wrapper.find('[data-test="esqueleto"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Todavía no hay reseñas');
  });

  /** Un fallo de la API no es «no hay reseñas»: la portada no lo afirma. */
  it('si la consulta falló no afirma que no hay reseñas', () => {
    estado.cargando = false;
    mockConsulta.error = true;
    estado.resena = null;
    estado.total = 0;

    const wrapper = mount(ReviewAssistantBand);

    expect(wrapper.find('[data-test="esqueleto"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Todavía no hay reseñas');
  });

  it('con sesión de la dueña no ofrece «Deja la tuya»', () => {
    mockAuth.isAdmin = true;

    expect(
      mount(ReviewAssistantBand).find('[data-test="dejar-resena"]').exists()
    ).toBe(false);
  });

  it('sin ser la dueña sí ofrece «Deja la tuya»', () => {
    expect(
      mount(ReviewAssistantBand).find('[data-test="dejar-resena"]').exists()
    ).toBe(true);
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

/**
 * El texto no salta de una reseña a otra: se cruza con un desvanecido. Lo pedía
 * la especificación del inicio desde el principio («una cada ~8 s con
 * desvanecido») y se había quedado sin hacer.
 *
 * La transición va **con llave en el índice**: sin ella Vue repinta el mismo
 * nodo con otro texto y no hay entrada ni salida que animar.
 */
describe('el cambio de reseña', () => {
  const FUENTE = readFileSync(
    join(__dirname, '../../src/components/index/ReviewAssistantBand.vue'),
    'utf8'
  );

  it('se cruza con una transición con llave en el índice', () => {
    expect(FUENTE).toMatch(/<Transition[\s\S]{0,120}name="review-band__cruce"/);
    expect(FUENTE).toMatch(/<Transition[\s\S]{0,160}mode="out-in"/);
    expect(FUENTE).toMatch(/:key="indice"/);
  });

  it('declara el desvanecido y lo anula si se pidió menos movimiento', () => {
    expect(FUENTE).toContain('.review-band__cruce-enter-active');
    expect(FUENTE).toContain('.review-band__cruce-leave-active');

    const reducido = FUENTE.slice(
      FUENTE.indexOf('@media (prefers-reduced-motion')
    );
    expect(reducido).toContain('review-band__cruce');
  });

  it('la cita sigue siendo la misma pieza, con su recorte de tres líneas', () => {
    estado.resena = RESENA;

    const cita = mount(ReviewAssistantBand).get('[data-test="cita"]');

    expect(cita.classes()).toContain('review-band__cita');
    expect(cita.text()).toContain(RESENA.description);
  });
});
