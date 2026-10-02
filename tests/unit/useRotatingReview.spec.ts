/**
 * La reseña del inicio rota sola. Rotar es moverse en la pantalla de alguien
 * sin que lo haya pedido, así que aquí lo que se prueba sobre todo es cuándo
 * NO se mueve: con poco material, con el movimiento desactivado por sistema, y
 * mientras la persona está leyendo.
 */
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import type { ReviewItem } from 'src/api/apiTypes';
import { useRotatingReview } from 'src/composables/reviews/useRotatingReview';

const resena = (n: number): ReviewItem => ({
  id: `r${n}`,
  name: `Clienta ${n}`,
  description: `Reseña ${n}`,
  score: 5,
  createdAt: '2026-09-01T12:00:00.000Z',
});

let lista: ReviewItem[] = [];
jest.mock('src/composables/reviews/useReviews', () => ({
  useReviews: () => ({ reviews: { value: lista } }),
}));

function conMovimientoReducido(reducido: boolean) {
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('prefers-reduced-motion') ? reducido : false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function montar(intervaloMs = 8000) {
  const capturado: { api?: ReturnType<typeof useRotatingReview> } = {};
  const wrapper = mount(
    defineComponent({
      setup() {
        capturado.api = useRotatingReview(intervaloMs);
        return () => h('div');
      },
    }),
  );
  return { api: capturado.api!, wrapper };
}

beforeEach(() => {
  jest.useFakeTimers();
  conMovimientoReducido(false);
  lista = [resena(1), resena(2), resena(3), resena(4)];
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRotatingReview', () => {
  it('avanza a la siguiente reseña al cumplirse el intervalo', () => {
    const { api } = montar();

    expect(api.resena.value?.id).toBe('r1');
    jest.advanceTimersByTime(8000);
    expect(api.resena.value?.id).toBe('r2');
  });

  it('da la vuelta al llegar al final', () => {
    const { api } = montar();

    jest.advanceTimersByTime(8000 * 4);
    expect(api.resena.value?.id).toBe('r1');
  });

  it('con menos de tres reseñas no rota', () => {
    lista = [resena(1), resena(2)];
    const { api } = montar();

    jest.advanceTimersByTime(8000 * 3);
    expect(api.rotando.value).toBe(false);
    expect(api.resena.value?.id).toBe('r1');
  });

  it('sin reseñas devuelve null y no explota', () => {
    lista = [];
    const { api } = montar();

    jest.advanceTimersByTime(8000);
    expect(api.resena.value).toBeNull();
    expect(api.total.value).toBe(0);
  });

  it('con prefers-reduced-motion no rota', () => {
    conMovimientoReducido(true);
    const { api } = montar();

    jest.advanceTimersByTime(8000 * 3);
    expect(api.rotando.value).toBe(false);
    expect(api.resena.value?.id).toBe('r1');
  });

  it('pausar detiene la rotación y reanudar la retoma', () => {
    const { api } = montar();

    api.pausar();
    jest.advanceTimersByTime(8000 * 2);
    expect(api.resena.value?.id).toBe('r1');

    api.reanudar();
    jest.advanceTimersByTime(8000);
    expect(api.resena.value?.id).toBe('r2');
  });

  it('al desmontar no queda ningún temporizador vivo', async () => {
    const { wrapper } = montar();

    wrapper.unmount();
    await nextTick();
    expect(jest.getTimerCount()).toBe(0);
  });
});
