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

const estado = { resena: null as unknown, total: 0, pausar: jest.fn(), reanudar: jest.fn() };

// El doble devuelve refs de verdad, no objetos `{ value }`: el composable real
// devuelve `ComputedRef`, y la plantilla cuenta con que Vue los desenvuelva.
// Un doble que no respeta esa forma deja la banda en blanco sin que falle nada.
jest.mock('src/composables/reviews/useRotatingReview', () => ({
  useRotatingReview: () => ({
    resena: computed(() => estado.resena),
    total: computed(() => estado.total),
    indice: computed(() => 0),
    rotando: computed(() => estado.total >= 3),
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

  it('«Deja la tuya» abre el diálogo de reseña del armazón', async () => {
    const wrapper = mount(ReviewAssistantBand);

    await wrapper.get('[data-test="dejar-resena"]').trigger('click');

    expect(useReviewDialog().abierto.value).toBe(true);
  });

  it('la tarjeta del asistente abre el panel que ya está montado', async () => {
    const wrapper = mount(ReviewAssistantBand);

    await wrapper.get('[data-test="abrir-asistente"]').trigger('click');

    expect(useAssistantPanel().abierto.value).toBe(true);
  });

  it('una reseña larguísima no se sale: se recorta con elipsis', () => {
    estado.resena = { ...RESENA, description: 'palabra '.repeat(200) };

    const cita = mount(ReviewAssistantBand).get('[data-test="cita"]');

    expect(cita.classes()).toContain('review-band__cita');
  });
});
