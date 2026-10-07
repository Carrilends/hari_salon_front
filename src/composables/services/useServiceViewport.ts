import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue';

/**
 * Los cortes de ancho de la página de servicios, en un solo sitio.
 *
 * Los tres primeros son los que `ServicePage.vue` llevaba sueltos y no se
 * tocan: cambiarlos cambiaría una página que funciona. El cuarto, el número de
 * columnas, es nuevo (decisión D9 de la hoja de ruta) y lo consume la rejilla
 * de la fase B.
 *
 * `desktopScrollBodyPx` NO está aquí y no vuelve: la lista desplaza dentro de
 * su caja, pero el alto de la página lo da el `style-fn` de Quasar en
 * `ServicePage.vue`, no una cuenta a mano. El riel dorado es una clase de
 * utilidad que llevan la lista y el carril, no el documento.
 */

/** Por debajo de esto los botones de la barra pierden la etiqueta. */
const CORTE_ETIQUETAS = 1100;

/** Por debajo de esto el buscador se colapsa a un botón redondo. */
const CORTE_BUSQUEDA_COMPACTA = 550;

/** Por debajo de esto la rejilla de tarjetas pasa a ficha tumbada. */
const CORTE_LISTA_MOVIL = 501;

/** D9: tres columnas desde aquí. */
const CORTE_TRES_COLUMNAS = 1240;

/** D9: dos columnas desde aquí; por debajo, una. */
const CORTE_DOS_COLUMNAS = 760;

/**
 * Ancho que se supone cuando no hay ventana, es decir durante `build:ssg`.
 * 1280 es el escritorio del lienzo: el HTML prerenderizado sale en su versión
 * ancha y la hidratación lo corrige en cuanto el navegador mide de verdad.
 * Suponer 0 generaría la versión de móvil para todo el mundo.
 */
export const ANCHO_SSG = 1280;

/**
 * Se recibe la ventana por parámetro para que la rama sin ventana se pueda
 * probar: en jsdom no se puede borrar `window`. `undefined` significa «no hay
 * ventana»; quien llama pasa la real con `ventanaActual()`. (Un valor por
 * defecto con `window` haría que `anchoDeVentana(undefined)` midiera la
 * ventana de jsdom en vez de caer al respaldo.)
 */
export function anchoDeVentana(ventana?: { innerWidth: number }): number {
  return ventana ? ventana.innerWidth : ANCHO_SSG;
}

const ventanaActual = () =>
  typeof window === 'undefined' ? undefined : window;

export function useServiceViewport(): {
  anchoVentana: Ref<number>;
  esListaMovil: ComputedRef<boolean>;
  esBusquedaCompacta: ComputedRef<boolean>;
  muestraEtiquetas: ComputedRef<boolean>;
  columnas: ComputedRef<1 | 2 | 3>;
} {
  const anchoVentana = ref(anchoDeVentana(ventanaActual()));

  const sincronizar = () => {
    anchoVentana.value = anchoDeVentana(ventanaActual());
  };

  onMounted(() => {
    // Se vuelve a medir al montar: el valor inicial puede venir del
    // prerenderizado, que no sabe nada de esta pantalla.
    sincronizar();
    window.addEventListener('resize', sincronizar);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', sincronizar);
  });

  return {
    anchoVentana,
    esListaMovil: computed(() => anchoVentana.value < CORTE_LISTA_MOVIL),
    esBusquedaCompacta: computed(
      () => anchoVentana.value < CORTE_BUSQUEDA_COMPACTA
    ),
    muestraEtiquetas: computed(() => anchoVentana.value >= CORTE_ETIQUETAS),
    columnas: computed<1 | 2 | 3>(() => {
      if (anchoVentana.value >= CORTE_TRES_COLUMNAS) return 3;
      if (anchoVentana.value >= CORTE_DOS_COLUMNAS) return 2;
      return 1;
    }),
  };
}
