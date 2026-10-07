import { ref, onMounted, onUnmounted } from 'vue';

const DEFAULT_BREAKPOINT_PX = 550;

/**
 * Ref reactiva: true cuando el viewport es estrictamente menor a `breakpointPx`
 * (p. ej. 550 → `max-width: 549px`). Pensado para `maximized` en QDialog.
 */
export function useDialogMaximizedBelow(
  breakpointPx: number = DEFAULT_BREAKPOINT_PX,
) {
  const maximized = ref(
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches
      : false,
  );

  let removeMqListener: (() => void) | null = null;

  onMounted(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const sync = () => {
      maximized.value = mq.matches;
    };
    sync();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync);
      removeMqListener = () => mq.removeEventListener('change', sync);
    } else if (typeof mq.addListener === 'function') {
      // Safari 13.1 (NF06): MediaQueryList todavía no es un EventTarget.
      mq.addListener(sync);
      removeMqListener = () => mq.removeListener(sync);
    }
  });

  onUnmounted(() => {
    removeMqListener?.();
  });

  return { maximized };
}
