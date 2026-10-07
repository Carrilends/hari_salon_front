<template>
  <q-dialog
    v-if="esHoja"
    v-model="dialog"
    position="bottom"
    :maximized="pantallaCompleta"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <section
      class="hoja"
      :class="{ 'hoja--completa': pantallaCompleta }"
      role="group"
      aria-label="Filtros de servicios"
      data-test="hoja-filtros"
    >
      <span class="hoja__tirador" data-test="tirador" aria-hidden="true" />

      <header class="hoja__cabecera">
        <h2 class="hoja__titulo">Filtros</h2>
        <button
          type="button"
          class="hoja__limpiar m-boton-plano"
          data-test="limpiar"
          @click="limpiar"
        >
          Limpiar
        </button>
        <button
          type="button"
          class="hoja__cerrar"
          data-test="cerrar"
          aria-label="Cerrar filtros"
          @click="hide"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="hoja__cuerpo">
        <service-filter-fields
          ref="camposRef"
          :compacto="true"
          @aplicar="alAplicar"
          @cuenta="alContar"
        />
      </div>

      <footer class="hoja__pie">
        <button
          type="button"
          class="hoja__ver m-boton--ancho"
          data-test="aplicar"
          @click="verResultados"
        >
          {{ rotuloVer }}
        </button>
      </footer>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import ServiceFilterFields from 'src/components/servicePage/ServiceFilterFields.vue';
import { useDialog } from 'src/composables/dialogs/useDialogService';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import {
  ANCHO_CARRIL_PX,
  CONSULTA_PANTALLA_BAJA,
} from 'src/stores/filters-store';
import { escucharConsulta } from 'src/helpers/escuchar-consulta';
import type { FilterService } from 'src/composables/dialogs/useServiceFilter';

defineOptions({ name: 'ServiceFilterDialog' });

const props = withDefaults(
  defineProps<{ dialog: boolean; total?: number }>(),
  { total: 0 }
);
/**
 * Los mismos emits que `DialogEmits & FiltersEmits`, escritos aquí: el
 * compilador de SFC de jest no resuelve tipos importados en `defineEmits`.
 */
const emit = defineEmits<{
  (e: 'update:dialog', value: boolean): void;
  (e: 'update:amount', value: number): void;
  (e: 'update:services', value: FilterService): void;
}>();

const { dialog, hide } = useDialog(props, emit);

/**
 * Por encima de este ancho manda el carril (D1) y esta hoja no existe. La
 * consulta es la misma que usa el carril, importada del mismo sitio: dos
 * literales distintos dejarían un ancho sin ninguno de los dos, o con los dos.
 */
const { maximized: esHoja } = useDialogMaximizedBelow(ANCHO_CARRIL_PX);

/**
 * Teléfono tumbado: con 400 px de alto, una hoja al 85 % deja el pie —el botón
 * «Ver N servicios»— fuera de la pantalla. Por debajo de 560 px de alto pasa a
 * pantalla completa. Detrás de la guarda de SSG porque `build:ssg`
 * prerenderiza sin `window`, y de la de `matchMedia` porque jsdom no siempre lo
 * trae. El corte viene del store: es el mismo en que la página de servicios
 * vuelve a desplazar entera.
 */
const hayMatchMedia = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const pantallaCompleta = ref(
  hayMatchMedia() ? window.matchMedia(CONSULTA_PANTALLA_BAJA).matches : false
);

let dejarDeEscuchar: (() => void) | null = null;

onMounted(() => {
  if (!hayMatchMedia()) return;
  const consulta = window.matchMedia(CONSULTA_PANTALLA_BAJA);
  const sincronizar = () => {
    pantallaCompleta.value = consulta.matches;
  };
  sincronizar();
  // Con respaldo para Safari 13.1, donde la consulta no tiene addEventListener.
  dejarDeEscuchar = escucharConsulta(consulta, sincronizar);
});

onUnmounted(() => dejarDeEscuchar?.());

/**
 * Al ensanchar la ventana toma el relevo el carril. Si la hoja estaba abierta
 * se cierra sola: dejar `dialog` en `true` haría que volviese a saltar al
 * estrechar la ventana sin que nadie la pidiera — y eso es exactamente lo que
 * pasa al llegar del inicio con el atajo, que enciende esa bandera. Vigila
 * también `dialog`: si alguien lo enciende ya en escritorio, se apaga en el acto.
 */
watch(
  [esHoja, () => props.dialog],
  ([hoja, abierto]) => {
    if (!hoja && abierto) emit('update:dialog', false);
  },
  { immediate: true }
);

const camposRef = ref<{ limpiar: () => void; aplicar: () => void } | null>(null);

const alAplicar = (filtro: FilterService) => emit('update:services', filtro);
const alContar = (cantidad: number) => emit('update:amount', cantidad);
const limpiar = () => camposRef.value?.limpiar();

const rotuloVer = computed(() => {
  if (props.total === 0) return 'Sin resultados';
  if (props.total === 1) return 'Ver 1 servicio';
  return `Ver ${props.total} servicios`;
});

/**
 * «Cierra y aplica»: los campos ya aplican en cada cambio, pero mandar el
 * filtro una vez más al cerrar deja la lista y el cuerpo sincronizados sin que
 * el botón dependa de si algo cambió o no.
 */
function verResultados() {
  camposRef.value?.aplicar();
  hide();
}
</script>

<style scoped lang="scss">
/**
 * Hoja inferior sobre tinta. El 85 % del alto es el techo: por debajo de 560 px
 * de alto el diálogo se maximiza y esta regla deja de aplicarse.
 */
.hoja {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  max-height: 85vh;
  padding: 0;
  border-top-left-radius: var(--m-radio-panel);
  border-top-right-radius: var(--m-radio-panel);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.hoja--completa {
  max-height: 100%;
  min-height: 100%;
  border-radius: 0;
}

.hoja__tirador {
  flex: 0 0 auto;
  width: 44px;
  height: 4px;
  margin: 10px auto 2px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-filete-oscuro);
}

.hoja__cabecera {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: 8px 12px 12px 20px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.hoja__titulo {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 22px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--m-hueso);
}

.hoja__limpiar {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.hoja__cerrar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: 50%;
  background: transparent;
  color: var(--m-hueso);
  cursor: pointer;
}

.hoja__limpiar:focus-visible,
.hoja__cerrar:focus-visible,
.hoja__ver:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/// El desplazamiento es de la hoja, no de la página: aquí el riel dorado sí va
/// dentro (la página de detrás está quieta mientras la hoja está abierta).
.hoja__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px 22px;
  scrollbar-width: thin;
  scrollbar-color: var(--m-oro) var(--m-carbon);
}

.hoja__cuerpo::-webkit-scrollbar {
  width: 6px;
}

.hoja__cuerpo::-webkit-scrollbar-track {
  background: var(--m-carbon);
}

.hoja__cuerpo::-webkit-scrollbar-thumb {
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
}

.hoja__pie {
  flex: 0 0 auto;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  background: var(--m-tinta);
}

.hoja__ver {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--m-tactil-min);
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .hoja__cerrar:hover {
    border-color: var(--m-oro);
  }

  .hoja__limpiar:hover {
    color: var(--m-oro-claro);
  }

  .hoja__ver:hover {
    background: var(--m-oro-claro);
  }
}
</style>
