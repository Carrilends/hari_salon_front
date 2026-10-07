<template>
  <div
    class="esqueleto-servicios"
    :class="{ 'esqueleto-servicios--lista': columnas === 1 }"
    :style="{ '--columnas': String(columnas) }"
    role="status"
    aria-label="Cargando servicios"
    data-test="esqueleto"
  >
    <div
      v-for="hueco in cuantos"
      :key="hueco"
      class="esqueleto-servicios__hueco"
      aria-hidden="true"
      data-test="hueco"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'ServiceListSkeleton' });

/**
 * Solo para la **primera** carga. En una recarga de página las filas anteriores
 * siguen en pantalla (`placeholderData: previousData`) y cambiarlas por cajas
 * grises haría parpadear la lista entera en cada página (§6.3).
 */
const props = defineProps<{ columnas: 1 | 2 | 3 }>();

/** Dos filas de la rejilla, o cuatro renglones en móvil: ni una pantalla vacía ni una falsa. */
const cuantos = computed(() => (props.columnas === 1 ? 4 : props.columnas * 2));
</script>

<style scoped lang="scss">
.esqueleto-servicios {
  display: grid;
  grid-template-columns: repeat(var(--columnas, 3), minmax(0, 1fr));
  gap: var(--m-rejilla-gap);
}

.esqueleto-servicios--lista {
  display: flex;
  flex-direction: column;
  gap: var(--m-rejilla-gap-movil);
}

.esqueleto-servicios__hueco {
  height: 252px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  animation: esqueleto-latido 1.4s ease-in-out infinite;
}

.esqueleto-servicios--lista .esqueleto-servicios__hueco {
  height: 104px;
}

@keyframes esqueleto-latido {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .esqueleto-servicios__hueco {
    animation: none;
    opacity: 0.7;
  }
}
</style>
