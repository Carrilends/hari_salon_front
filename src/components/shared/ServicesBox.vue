<template>
  <div
    class="caja col-12"
    :class="[`caja--${variante}`, { 'caja--contenida': containedScroll }]"
  >
    <div v-if="sectionTitle || haySeleccion" class="caja__cabecera">
      <p v-if="sectionTitle" class="caja__titulo">{{ sectionTitle }}</p>
      <button
        v-if="haySeleccion"
        type="button"
        class="caja__limpiar"
        data-test="limpiar-categoria"
        aria-label="Quitar la categoría elegida"
        @click="clear"
      >
        <svg
          width="18"
          height="18"
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
    </div>

    <div
      class="caja__panel"
      :class="{ 'caja__panel--contenida': containedScroll }"
    >
      <div
        class="caja__principales"
        role="radiogroup"
        aria-label="Categoría principal"
      >
        <label
          v-for="opcion in principalOptions"
          :key="opcion.value"
          class="caja__radio"
        >
          <input
            type="radio"
            :name="grupoPrincipal"
            :value="opcion.value"
            :checked="principalId === opcion.value"
            data-test="principal"
            @change="() => onPrincipalChange(opcion.value)"
          />
          <span>{{ opcion.label }}</span>
        </label>
      </div>

      <template v-for="(fila, nivel) in levelRows" :key="'nivel-' + nivel">
        <div v-if="fila.length > 0" class="caja__fila">
          <hr class="caja__filete" />
          <button
            v-for="tag in fila"
            :key="tag.id"
            type="button"
            class="caja__chip"
            :class="{ 'caja__chip--activo': tag.selected }"
            :aria-pressed="tag.selected ? 'true' : 'false'"
            :disabled="nivel === 0 && hasRootSelection && !tag.selected"
            data-test="categoria-chip"
            @click="() => toggleAtLevel(nivel, tag, !tag.selected)"
          >
            {{ tag.name }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useOptionsStore } from 'src/stores/options-store';
import { useServicesBoxSelection } from 'src/composables/shared/useServicesBoxSelection';

const props = defineProps({
  /** IDs de tags de servicio (sin géneros). En edición vienen del backend; al montar se hidrata el árbol. */
  initialSelectedIds: {
    type: Array,
    default: () => [],
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  /** Título de la cabecera (filtros vs crear/editar). Vacío = sin cabecera. */
  sectionTitle: {
    type: String,
    default: 'Tu servicio es:',
  },
  /**
   * Móvil / diálogo maximizado: el panel de categorías y chips hace scroll interno
   * sin empujar el resto del layout.
   */
  containedScroll: {
    type: Boolean,
    default: false,
  },
  /**
   * `claro` (defecto) es el de crear/editar, que vive sobre tarjeta blanca;
   * `oscuro` es el del filtro, que vive sobre tinta. El defecto NO se cambia:
   * `serviceCreateEdit.vue` monta este componente sin pasar nada.
   */
  variante: {
    type: String,
    default: 'claro',
  },
});

const emit = defineEmits(['selectedServices']);

const optionsStore = useOptionsStore();

const {
  principalId,
  levelRows,
  selectedServicesIDs,
  principalOptions,
  hasRootSelection,
  onPrincipalChange,
  toggleAtLevel,
  hydrateFromIds,
  resetLocalState,
  clear,
} = useServicesBoxSelection(() => [...optionsStore.principalServices], emit);

const haySeleccion = computed(
  () => Object.keys(selectedServicesIDs.value).length > 0
);

/**
 * El `name` agrupa los radios para que las flechas del teclado funcionen. Se
 * deriva de la variante y no de un contador ni de un aleatorio: tiene que valer
 * lo mismo en el prerenderizado de `build:ssg` y en el navegador, o la
 * hidratación avisa. Dos cajas de la misma variante no coexisten (el carril y la
 * hoja se excluyen por ancho; crear/editar es la clara).
 */
const grupoPrincipal = `caja-principal-${props.variante}`;

onMounted(async () => {
  if (props.isEditMode && props.initialSelectedIds?.length > 0) {
    await hydrateFromIds(props.initialSelectedIds);
  }
});

/** Si `/filters` llega después del primer montaje, los principales estaban vacíos y hydrate falló. */
watch(
  () => optionsStore.principalServices.length,
  async (len, prevLen) => {
    if (!props.isEditMode || !props.initialSelectedIds?.length) return;
    if (len === 0) return;
    if (prevLen !== 0) return;
    await hydrateFromIds(props.initialSelectedIds);
  }
);

watch(
  () => props.initialSelectedIds,
  (ids) => {
    /* Misma ref que emite el padre: no llamar a clear() aquí (emitiría otra vez y dispara bucle). */
    if (!ids?.length) resetLocalState();
  },
  { deep: true, immediate: true }
);

defineExpose({ clear, hydrateFromIds, resetLocalState });
</script>

<style lang="scss" scoped>
/**
 * Dos variantes del mismo árbol. Lo único que cambia son los colores: el
 * marcado, las medidas y la lógica son los mismos, porque el componente lo
 * comparten el filtro (sobre tinta) y crear/editar (sobre tarjeta blanca).
 */
.caja {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-family: var(--m-font-sans);
}

.caja--contenida {
  flex: 1 1 auto;
  min-height: 0;
}

.caja__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 10px;
}

.caja__titulo {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
}

.caja__limpiar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.caja__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/// Con `containedScroll` el panel desplaza por dentro, con el riel dorado. Sin
/// él, desplaza la página (D4): dos scrolls anidados es lo que se quita.
.caja__panel--contenida {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 260px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.caja__panel--contenida::-webkit-scrollbar {
  width: 6px;
}

.caja__panel--contenida::-webkit-scrollbar-thumb {
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
}

.caja__principales {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.caja__radio {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  font-size: 13px;
  cursor: pointer;
}

.caja__radio input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--m-oro);
  cursor: pointer;
}

.caja__fila {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.caja__filete {
  flex: 1 0 100%;
  height: 0;
  margin: 2px 0;
  border: 0;
}

.caja__chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  font-family: var(--m-font-sans);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.caja__chip:disabled {
  opacity: 0.4;
  cursor: default;
}

.caja__chip:focus-visible,
.caja__limpiar:focus-visible,
.caja__radio input:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

// --- Variante clara: crear y editar, sobre tarjeta blanca --------------------

.caja--claro {
  color: var(--m-tinta);
}

.caja--claro .caja__titulo,
.caja--claro .caja__limpiar {
  color: var(--m-piedra);
}

.caja--claro .caja__filete {
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.caja--claro .caja__chip {
  border-color: var(--m-filete);
  color: var(--m-tinta);
}

.caja--claro .caja__chip--activo {
  border-color: var(--m-oro-profundo);
  background: var(--m-oro-profundo);
  color: var(--m-nieve);
}

.caja--claro .caja__panel--contenida {
  scrollbar-color: var(--m-oro-profundo) var(--m-riel-canal-claro, transparent);
}

// --- Variante oscura: el filtro, sobre tinta --------------------------------

.caja--oscuro {
  color: var(--m-hueso);
}

.caja--oscuro .caja__titulo,
.caja--oscuro .caja__limpiar {
  color: var(--m-piedra-clara);
}

.caja--oscuro .caja__filete {
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.caja--oscuro .caja__chip {
  border-color: var(--m-filete-oscuro);
  color: var(--m-hueso);
}

.caja--oscuro .caja__chip--activo {
  border-color: var(--m-oro);
  background: var(--m-oro);
  color: var(--m-tinta);
}

.caja--oscuro .caja__panel--contenida {
  scrollbar-color: var(--m-oro) var(--m-carbon);
}
</style>
