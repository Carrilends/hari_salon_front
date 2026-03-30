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
    mq.addEventListener('change', sync);
    removeMqListener = () => mq.removeEventListener('change', sync);
  });

  onUnmounted(() => {
    removeMqListener?.();
  });

  return { maximized };
}
