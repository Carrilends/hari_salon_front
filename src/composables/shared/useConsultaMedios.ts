import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { escucharConsulta } from 'src/helpers/escuchar-consulta';

/**
 * ¿La ventana casa con esta consulta de medios? (M11 de
 * `docs/superpowers/specs/2026-10-07-menu-y-acceso-design.md`).
 *
 * Vale `inicial` en `setup`, también en el cliente: quien llama pasa lo que el
 * SSG prerenderiza (en el servidor no hay ventana), y si el primer render del
 * cliente calculara otra cosa la hidratación no repararía las clases. La
 * ventana real se lee en `onMounted`, y los cambios se escuchan con
 * `escucharConsulta`, que trae el respaldo de Safari 13.1 (NF06).
 *
 * Sin `window` (`build:ssg`) o sin `matchMedia` (un jsdom a medias) se queda
 * con `inicial`.
 */
export function useConsultaMedios(
  consulta: string,
  inicial: boolean
): Ref<boolean> {
  const coincide = ref(inicial);
  let soltar: (() => void) | null = null;

  onMounted(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const lista = window.matchMedia(consulta);
    const sincronizar = () => {
      coincide.value = lista.matches;
    };
    sincronizar();
    soltar = escucharConsulta(lista, sincronizar);
  });

  onUnmounted(() => {
    soltar?.();
    soltar = null;
  });

  return coincide;
}
