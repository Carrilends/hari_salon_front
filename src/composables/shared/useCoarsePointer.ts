import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * ¿El puntero de esta pantalla puede posarse encima de algo?
 *
 * `(hover: none)` es la pregunta correcta, y no un ancho de ventana: hay
 * portátiles táctiles de 1400 px y tabletas con ratón conectado. De esto cuelga
 * que la tarjeta de servicio muestre su velo **siempre** en vez de solo al pasar
 * el ratón (D5): sin ello, en una tableta la lista se queda sin nombres.
 *
 * Vale `false` en `setup` (también en el cliente, para que coincida con el HTML
 * prerenderizado) y se sincroniza en `onMounted`. Sigue en `false` cuando no hay
 * `window` (`build:ssg` prerenderiza) o cuando el
 * navegador no sabe de `matchMedia`: el velo tiene además una red de seguridad
 * en CSS (`@media (hover: none)`), así que equivocarse por abajo no deja a nadie
 * sin información.
 */
const CONSULTA = '(hover: none)';

function sePuedeConsultar(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return true;
}

export function useCoarsePointer(): ComputedRef<boolean> {
  // Siempre `false` hasta montar: el servidor prerenderiza con `false` y, si el
  // primer render del cliente calculara `true`, la hidratación no repara las
  // clases y el velo quedaría sin la clase de «siempre visible».
  const grueso = ref(false);

  let soltar: (() => void) | null = null;

  onMounted(() => {
    if (!sePuedeConsultar()) return;
    const consulta = window.matchMedia(CONSULTA);
    const sincronizar = () => {
      grueso.value = consulta.matches;
    };
    sincronizar();

    if (typeof consulta.addEventListener === 'function') {
      consulta.addEventListener('change', sincronizar);
      soltar = () => consulta.removeEventListener('change', sincronizar);
    } else if (typeof consulta.addListener === 'function') {
      // Safari 13.1 (NF06): MediaQueryList todavía no es un EventTarget.
      consulta.addListener(sincronizar);
      soltar = () => consulta.removeListener(sincronizar);
    }
  });

  onUnmounted(() => {
    soltar?.();
    soltar = null;
  });

  return computed(() => grueso.value);
}
