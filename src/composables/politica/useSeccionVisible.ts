import { onMounted, onUnmounted, ref, type Ref } from 'vue';

export interface SeccionVisible {
  activa: Ref<string>;
  marcar: (id: string) => void;
}

/**
 * Qué sección de un documento largo está leyendo la persona (S4: el índice de
 * la política marca la visible con un punto).
 *
 * La franja de lectura va de `margenSuperiorPx` bajo el borde superior —lo que
 * tapa la cabecera fija, con aire— hasta el 45 % de la ventana. De las
 * secciones que la tocan manda la primera en el orden del documento. Si no
 * queda ninguna (un hueco entre dos), se conserva la anterior. Al final de la
 * página manda la última (una sección corta del final no llega nunca arriba),
 * salvo que la persona haya pulsado una posterior a la primera visible. Esa
 * regla se mira también al desplazarse (un cuadro por tanda): al llegar abajo
 * puede no cambiar ninguna intersección y el observador no avisaría.
 *
 * El observador y la escucha del desplazamiento se crean en `onMounted` y solo
 * si el observador existe: la página se prerenderiza en Node (SSG) y jsdom no
 * lo trae. Sin él, el índice marca la primera y sigue funcionando por clics
 * (`marcar`). Al desmontar se desconecta y se deja de escuchar.
 */
export function useSeccionVisible(
  ids: readonly string[],
  margenSuperiorPx = 96
): SeccionVisible {
  const activa = ref(ids[0] ?? '');
  const visibles = new Set<string>();
  let observador: IntersectionObserver | null = null;
  let esperandoCuadro = false;
  let cuadro = 0;

  const alFinalDeLaPagina = (): boolean => {
    const alto = document.documentElement.scrollHeight;
    return (
      alto > window.innerHeight &&
      window.innerHeight + window.scrollY >= alto - 2
    );
  };

  const recalcular = (): void => {
    const primera = ids.find((id) => visibles.has(id));
    if (alFinalDeLaPagina()) {
      // Una sección pulsada que no puede llegar arriba (las cortas del final)
      // se respeta si va después de la primera visible; si no, manda la última.
      const yaMarcadaMasAbajo =
        primera !== undefined &&
        ids.indexOf(activa.value) > ids.indexOf(primera);
      if (!yaMarcadaMasAbajo) activa.value = ids[ids.length - 1];
      return;
    }
    if (primera) activa.value = primera;
  };

  /** Solo la regla del final: a media página manda el observador. */
  const alDesplazar = (): void => {
    if (esperandoCuadro) return;
    esperandoCuadro = true;
    cuadro = window.requestAnimationFrame(() => {
      esperandoCuadro = false;
      if (alFinalDeLaPagina()) recalcular();
    });
  };

  onMounted(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver !== 'function'
    ) {
      return;
    }
    observador = new window.IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const id = (entrada.target as HTMLElement).id;
          if (entrada.isIntersecting) visibles.add(id);
          else visibles.delete(id);
        }
        recalcular();
      },
      { rootMargin: `-${margenSuperiorPx}px 0px -55% 0px`, threshold: 0 }
    );
    for (const id of ids) {
      const seccion = document.getElementById(id);
      if (seccion) observador.observe(seccion);
    }
    window.addEventListener('scroll', alDesplazar, { passive: true });
  });

  onUnmounted(() => {
    if (!observador) return;
    observador.disconnect();
    observador = null;
    window.removeEventListener('scroll', alDesplazar);
    if (esperandoCuadro) {
      window.cancelAnimationFrame(cuadro);
      esperandoCuadro = false;
    }
  });

  return {
    activa,
    marcar: (id: string) => {
      if (ids.includes(id)) activa.value = id;
    },
  };
}
