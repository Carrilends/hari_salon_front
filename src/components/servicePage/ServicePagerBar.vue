<template>
  <footer class="pie" data-test="pie">
    <p class="pie__resumen" data-test="resumen">{{ resumen }}</p>

    <nav
      v-if="hayQuePaginar"
      class="pie__paginacion"
      aria-label="Paginación de servicios"
      data-test="paginacion"
    >
      <button
        v-if="ventana[0] > 1"
        type="button"
        class="pie__numero"
        aria-label="Ir a la página 1"
        data-test="pagina"
        @click="ir(1)"
      >
        1
      </button>
      <span
        v-if="ventana[0] > 2"
        class="pie__elipsis"
        aria-hidden="true"
        data-test="elipsis"
        >…</span
      >

      <button
        v-for="numero in ventana"
        :key="numero"
        type="button"
        class="pie__numero"
        :class="{ 'pie__numero--activa': numero === paginaActual }"
        :aria-current="numero === paginaActual ? 'page' : undefined"
        :aria-label="`Ir a la página ${numero}`"
        data-test="pagina"
        @click="ir(numero)"
      >
        {{ numero }}
      </button>

      <span
        v-if="ultimaDeLaVentana < totalPaginasReal - 1"
        class="pie__elipsis"
        aria-hidden="true"
        data-test="elipsis"
        >…</span
      >
      <button
        v-if="ultimaDeLaVentana < totalPaginasReal"
        type="button"
        class="pie__numero"
        :aria-label="`Ir a la página ${totalPaginasReal}`"
        data-test="pagina"
        @click="ir(totalPaginasReal)"
      >
        {{ totalPaginasReal }}
      </button>

      <button
        type="button"
        class="pie__siguiente"
        :disabled="paginaActual >= totalPaginasReal"
        data-test="siguiente"
        @click="ir(paginaActual + 1)"
      >
        Siguiente →
      </button>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * El pie del mostrador: el resumen y la paginación.
 *
 * El paginador está escrito a mano (D8). `q-pagination` pinta los números con
 * `<div>` y hay que pelear con `:deep()` contra sus tripas para cambiarles la
 * tipografía o el filete de la activa; aquí son `<button>` de verdad, con su
 * nombre accesible y sus 44 px de área táctil.
 *
 * No hay «Anterior» a propósito: el lienzo pone «Siguiente», y el enlace a la
 * primera página más los números cubren el retroceso.
 */
const props = defineProps<{
  pagina: number;
  totalPaginas: number;
  mostrados: number;
  /**
   * `null` mientras la primera respuesta no ha llegado: el HTML prerenderizado
   * no puede decir «0 de 0 servicios».
   */
  total: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:pagina', valor: number): void;
}>();

/** Cuántos números se ven a la vez, sin contar la primera ni la última. */
const VENTANA = 5;

const rango = (desde: number, hasta: number): number[] =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

/**
 * Un catálogo vacío devuelve `totalPages: 1`, pero un cero por la puerta de
 * atrás dejaría la ventana en negativo.
 */
const totalPaginasReal = computed(() => Math.max(1, props.totalPaginas));

/**
 * La página pedida puede quedarse fuera de rango: la dueña borra servicios y la
 * 9 de 9 pasa a ser la 9 de 5. Se pinta la última que existe.
 */
const paginaActual = computed(() =>
  Math.min(Math.max(1, props.pagina), totalPaginasReal.value)
);

const hayQuePaginar = computed(() => totalPaginasReal.value > 1);

const ventana = computed(() => {
  const total = totalPaginasReal.value;
  if (total <= VENTANA) return rango(1, total);
  const centrado = paginaActual.value - Math.floor(VENTANA / 2);
  const inicio = Math.max(1, Math.min(centrado, total - VENTANA + 1));
  return rango(inicio, inicio + VENTANA - 1);
});

const ultimaDeLaVentana = computed(
  () => ventana.value[ventana.value.length - 1]
);

// Espacio duro: el pie conserva su alto y no salta al llegar la cifra.
const resumen = computed(() =>
  props.total === null
    ? '\u00a0'
    : `${props.mostrados} de ${props.total} ${
        props.total === 1 ? 'servicio' : 'servicios'
      }`
);

const ir = (destino: number) => {
  const pedida = Math.min(Math.max(1, destino), totalPaginasReal.value);
  // Pulsar la página en la que ya estás no debe disparar otra consulta.
  if (pedida === props.pagina) return;
  emit('update:pagina', pedida);
};

defineOptions({ name: 'ServicePagerBar' });
</script>

<style scoped lang="scss">
.pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 18px 0 8px;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.pie__resumen {
  margin: 0;
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.pie__paginacion {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.pie__numero {
  min-width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0 6px;
  background: none;
  border: 0;
  // El filete de la activa se reserva en todas para que la fila no salte.
  border-bottom: var(--m-filete-grosor) solid transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 16px;
  cursor: pointer;
}

.pie__numero--activa {
  border-bottom-color: var(--m-oro);
  color: var(--m-oro);
}

.pie__elipsis {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: var(--m-tactil-min);
  color: var(--m-piedra-clara);
  font-family: var(--m-font-display);
  font-size: 16px;
}

.pie__siguiente {
  min-height: var(--m-tactil-min);
  margin-left: 10px;
  padding: 0 18px;
  background: none;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.pie__siguiente:disabled {
  opacity: 0.45;
  cursor: default;
}

.pie__numero:focus-visible,
.pie__siguiente:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 3px;
}

@media (max-width: 699px) {
  .pie {
    justify-content: center;
    padding: 16px 0 6px;
  }

  .pie__siguiente {
    margin-left: 4px;
  }
}
</style>
