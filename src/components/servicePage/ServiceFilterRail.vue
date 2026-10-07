<template>
  <aside
    v-if="hayCarril"
    class="carril"
    data-test="carril-filtros"
    aria-label="Filtros de servicios"
  >
    <header class="carril__cabecera">
      <h2 class="carril__titulo">
        <svg
          class="carril__icono"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
          <path d="M15 5.4v5.2M9 13.4v5.2" />
        </svg>
        Filtros
      </h2>
      <button
        type="button"
        class="carril__limpiar"
        data-test="limpiar"
        @click="limpiar"
      >
        Limpiar
      </button>
    </header>

    <service-filter-fields
      ref="camposRef"
      :compacto="false"
      @aplicar="alAplicar"
      @cuenta="alContar"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ServiceFilterFields from 'src/components/servicePage/ServiceFilterFields.vue';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { ANCHO_CARRIL_PX, useFiltersStore } from 'src/stores/filters-store';
import type { FilterService } from 'src/composables/dialogs/useServiceFilter';

defineOptions({ name: 'ServiceFilterRail' });

const emit = defineEmits<{
  (e: 'aplicar', filtro: FilterService): void;
  (e: 'update:amount', cantidad: number): void;
}>();

/**
 * El carril y la hoja se reparten los anchos con la MISMA consulta, y cada uno
 * decide por su cuenta: así no existe un tercer sitio que pueda decir «carril»
 * y «hoja» a la vez. `useDialogMaximizedBelow` ya trae la guarda de SSG y la
 * escucha de `matchMedia`.
 */
const { maximized: esHoja } = useDialogMaximizedBelow(ANCHO_CARRIL_PX);
const hayCarril = computed(() => !esHoja.value);

const camposRef = ref<{ limpiar: () => void } | null>(null);

const alAplicar = (filtro: FilterService) => emit('aplicar', filtro);
const alContar = (cantidad: number) => emit('update:amount', cantidad);

/**
 * Los campos solo emiten `cuenta` cuando la cifra CAMBIA, así que un filtro
 * restaurado del store (recarga, vuelta atrás) dejaría el contador de la barra
 * a cero hasta el primer cambio. Se avisa una vez al montar, con la misma suma
 * que hacen los campos.
 */
const filtersStore = useFiltersStore();
onMounted(() => {
  if (!hayCarril.value) return;
  const cantidad =
    filtersStore.selectedGenres.length +
    filtersStore.selectedServicesIDs.length +
    (filtersStore.includePriceRange ? 1 : 0) +
    (filtersStore.includePromotionsOnly ? 1 : 0);
  if (cantidad > 0) emit('update:amount', cantidad);
});

/** Con el carril oculto la referencia es nula y esto no hace nada: correcto. */
const limpiar = () => camposRef.value?.limpiar();
</script>

<style scoped lang="scss">
/**
 * 226 px fijos. No es una caja: es una columna separada de la lista por un
 * filete vertical, como las bandas del resto del portal.
 */
.carril {
  flex: 0 0 226px;
  width: 226px;
  align-self: stretch;
  padding: 4px 20px 24px 0;
  border-right: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  font-family: var(--m-font-sans);
}

.carril__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.carril__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 19px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--m-hueso);
}

.carril__icono {
  flex: 0 0 auto;
  color: var(--m-oro);
}

.carril__limpiar {
  flex: 0 0 auto;
  min-height: 28px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.carril__limpiar:hover {
  text-decoration: underline;
}

.carril__limpiar:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}
</style>
