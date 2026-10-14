<template>
  <div class="vacio-servicios" data-test="vacio">
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>

    <p class="vacio-servicios__titulo">
      {{
        hayFiltros
          ? 'Ningún servicio coincide con estos filtros'
          : 'Todavía no hay servicios publicados'
      }}
    </p>
    <p class="vacio-servicios__pie">
      {{
        hayFiltros
          ? 'Prueba quitando alguno, o busca el servicio por su nombre.'
          : 'El mostrador se está preparando. Vuelve pronto.'
      }}
    </p>

    <button
      v-if="hayFiltros"
      type="button"
      class="vacio-servicios__limpiar"
      data-test="limpiar-filtros"
      @click="emit('limpiar-filtros')"
    >
      Limpiar filtros
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ServiceListEmpty' });

/**
 * Dos vacíos distintos, porque son dos problemas distintos: uno lo resuelve la
 * clienta quitando un filtro, el otro no lo resuelve nadie desde aquí. Ofrecer
 * «Limpiar filtros» sin filtros puestos sería un botón que no hace nada.
 */
defineProps<{ hayFiltros: boolean }>();

const emit = defineEmits<{ (e: 'limpiar-filtros'): void }>();
</script>

<style scoped lang="scss">
/** Sobre la lista en hueso (paleta A, 2026-10-11): tarjeta nieve con filete. */
.vacio-servicios {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 56px 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-piedra);
  text-align: center;
}

.vacio-servicios__titulo {
  margin: 4px 0 0;
  font-family: var(--m-font-display);
  font-size: 19px;
  color: var(--m-tinta);
}

.vacio-servicios__pie {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  color: var(--m-piedra);
}

.vacio-servicios__limpiar {
  min-height: var(--m-tactil-min);
  margin-top: 8px;
  padding: 0 26px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.vacio-servicios__limpiar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  // Texto sobre claro: al pasar, el oro profundo (el claro daría 3,2:1).
  .vacio-servicios__limpiar:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
