<template>
  <div class="rejilla-servicios">
    <ServiceListError
      v-if="error"
      :compacto="hayFilas"
      @reintentar="emit('reintentar')"
    />

    <!--
      Sin columnas ni renglones: el esqueleto viaja en el HTML prerenderizado a
      1280 px y su forma la decide el CSS (ver ServiceListSkeleton.vue).
    -->
    <ServiceListSkeleton v-if="muestraEsqueleto" />

    <ServiceListEmpty
      v-if="muestraVacio"
      :hay-filtros="hayFiltros"
      @limpiar-filtros="emit('limpiar-filtros')"
    />

    <p
      v-if="recargando && hayFilas"
      class="rejilla-servicios__recarga"
      role="status"
      data-test="recarga"
    >
      Actualizando…
    </p>

    <ul
      v-if="hayFilas"
      class="rejilla-servicios__lista"
      :class="{ 'rejilla-servicios__lista--una': columnas === 1 }"
      :style="{ '--columnas': String(columnas) }"
      :aria-busy="recargando ? 'true' : undefined"
      data-test="rejilla"
    >
      <li
        v-for="(servicio, indice) in servicios"
        :key="`${indice}_${servicio.id}`"
        class="rejilla-servicios__celda"
      >
        <ServiceRow
          v-if="renglones"
          :servicio="servicio"
          @detalle="emit('detalle', $event)"
        >
          <template v-if="$slots.acciones" #acciones>
            <slot name="acciones" :servicio="servicio" :compacto="true" />
          </template>
        </ServiceRow>
        <ServiceCard
          v-else
          :servicio="servicio"
          :mostrar-siempre="punteroGrueso"
          @detalle="emit('detalle', $event)"
        >
          <template v-if="$slots.acciones" #acciones>
            <slot name="acciones" :servicio="servicio" :compacto="false" />
          </template>
        </ServiceCard>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type Service from 'src/interfaces/service';
import ServiceCard from 'src/components/servicePage/ServiceCard.vue';
import ServiceRow from 'src/components/servicePage/ServiceRow.vue';
import ServiceListSkeleton from 'src/components/servicePage/ServiceListSkeleton.vue';
import ServiceListEmpty from 'src/components/servicePage/ServiceListEmpty.vue';
import ServiceListError from 'src/components/servicePage/ServiceListError.vue';
import { useCoarsePointer } from 'src/composables/shared/useCoarsePointer';

defineOptions({ name: 'ServiceCardsGrid' });

/**
 * `cargando` es la **primera** carga (`isLoading`) y `recargando` la recarga
 * (`isFetching` sin `isLoading`). Son dos cosas distintas porque
 * `placeholderData: previousData` deja las filas anteriores puestas: tratar la
 * segunda como la primera cambia la lista entera por cajas grises en cada página
 * (§6.3 de la hoja de ruta).
 */
const props = withDefaults(
  defineProps<{
    servicios: Service[];
    columnas: 1 | 2 | 3;
    cargando: boolean;
    error: boolean;
    hayFiltros: boolean;
    recargando?: boolean;
    /** Renglones solo en móvil estrecho (≤ 500 px); con una columna más ancha, tarjetas. */
    renglones?: boolean;
  }>(),
  { recargando: false, renglones: false }
);

const emit = defineEmits<{
  (e: 'detalle', id: string): void;
  (e: 'limpiar-filtros'): void;
  (e: 'reintentar'): void;
}>();

/** D5: en una pantalla sin ratón el velo de la tarjeta está puesto desde el principio. */
const punteroGrueso = useCoarsePointer();

const hayFilas = computed(() => props.servicios.length > 0);

// El esqueleto solo con la pantalla vacía: si quedan filas de la visita anterior
// es mejor enseñarlas mientras llega lo nuevo.
const muestraEsqueleto = computed(
  () => !props.error && props.cargando && !hayFilas.value
);

const muestraVacio = computed(
  () => !props.error && !props.cargando && !hayFilas.value
);
</script>

<style scoped lang="scss">
.rejilla-servicios {
  width: 100%;
  min-width: 0;
}

.rejilla-servicios__lista {
  display: grid;
  grid-template-columns: repeat(var(--columnas, 3), minmax(0, 1fr));
  gap: var(--m-rejilla-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.rejilla-servicios__lista--una {
  display: flex;
  flex-direction: column;
  gap: var(--m-rejilla-gap-movil);
}

.rejilla-servicios__celda {
  min-width: 0;
}

/**
 * La señal de recarga es esto y nada más: una línea discreta. La alternativa
 * —volver al esqueleto— hace parpadear toda la lista al pasar de página.
 */
.rejilla-servicios__recarga {
  margin: 0 0 10px;
  text-align: right;
  font-family: var(--m-font-sans);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  // Sobre hueso: el oro claro daría 2,8:1.
  color: var(--m-oro-profundo);
}
</style>
