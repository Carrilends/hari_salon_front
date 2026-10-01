import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ReviewItem } from 'src/api/apiTypes';
import { useReviews } from 'src/composables/reviews/useReviews';

/** Por debajo de esto la rotación se nota repetitiva y molesta más que aporta. */
const MINIMO_PARA_ROTAR = 3;

/**
 * Una reseña visible que se cambia sola cada `intervaloMs`, con tres frenos:
 * poco material, `prefers-reduced-motion`, y la persona leyendo (ratón encima o
 * foco dentro, que la banda conecta con `pausar`/`reanudar`).
 *
 * El temporizador arranca en `onMounted` a propósito: la ruta `/` se
 * prerenderiza con SSG y este código corre en Node durante la build.
 */
export const useRotatingReview = (intervaloMs = 8000) => {
  const { reviews, isLoading } = useReviews();

  const indice = ref(0);
  const pausado = ref(false);
  const montado = ref(false);
  const movimientoReducido = ref(false);

  const total = computed(() => reviews.value.length);
  const resena = computed<ReviewItem | null>(
    () => reviews.value[indice.value % Math.max(total.value, 1)] ?? null,
  );

  const rotando = computed(
    () =>
      montado.value &&
      !pausado.value &&
      !movimientoReducido.value &&
      total.value >= MINIMO_PARA_ROTAR,
  );

  let temporizador: ReturnType<typeof setInterval> | null = null;

  const parar = () => {
    if (temporizador !== null) {
      clearInterval(temporizador);
      temporizador = null;
    }
  };

  const arrancar = () => {
    parar();
    if (!rotando.value) return;
    temporizador = setInterval(() => {
      indice.value = (indice.value + 1) % total.value;
    }, intervaloMs);
  };

  onMounted(() => {
    movimientoReducido.value =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    montado.value = true;
    arrancar();
  });

  // El watcher cubre los cambios que no provoca el usuario: las reseñas llegan
  // de la petición después del montaje y `total` pasa de 0 a N.
  watch(rotando, arrancar);
  onUnmounted(parar);

  return {
    resena,
    indice,
    total,
    rotando,
    /**
     * Con SSG esto es `true` en el HTML publicado: Vue Query no resuelve
     * durante `quasar ssg generate`. La banda lo usa para enseñar un hueco
     * neutro en vez de afirmar que el salón no tiene reseñas.
     */
    cargando: isLoading,
    // `pausar` y `reanudar` tocan el temporizador a mano en vez de confiar en
    // el watcher: el de Vue se ejecuta en el siguiente flush, y para entonces
    // la reseña que la persona estaba leyendo ya habría cambiado bajo su
    // puntero. Parar tiene que surtir efecto en el mismo instante.
    pausar: () => {
      pausado.value = true;
      parar();
    },
    reanudar: () => {
      pausado.value = false;
      arrancar();
    },
  };
};
