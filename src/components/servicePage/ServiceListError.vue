<template>
  <div
    class="error-lista"
    :class="{ 'error-lista--compacto': compacto }"
    role="alert"
    data-test="error"
  >
    <p class="error-lista__texto">
      No pudimos cargar los servicios. Revisa tu conexión e inténtalo de nuevo.
    </p>
    <button
      type="button"
      class="error-lista__reintentar m-boton--ancho"
      data-test="reintentar"
      @click="emit('reintentar')"
    >
      Reintentar
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ServiceListError' });

/**
 * `compacto` es el caso que importa: si la red falla **con filas ya en
 * pantalla**, el aviso va arriba en una banda y la lista se queda donde está.
 * Tapar lo que la clienta estaba mirando con un panel a página completa es
 * perder información por un fallo que a lo mejor se arregla al segundo toque.
 */
withDefaults(defineProps<{ compacto?: boolean }>(), { compacto: false });

const emit = defineEmits<{ (e: 'reintentar'): void }>();
</script>

<style scoped lang="scss">
.error-lista {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 20px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  text-align: center;
}

.error-lista--compacto {
  flex-direction: row;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: var(--m-rejilla-gap-movil);
  text-align: left;
}

.error-lista__texto {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  color: var(--m-hueso);
}

.error-lista--compacto .error-lista__texto {
  font-size: 12.5px;
}

.error-lista__reintentar {
  flex: 0 0 auto;
  min-height: var(--m-tactil-min);
  padding: 0 24px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.error-lista__reintentar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .error-lista__reintentar:hover {
    border-color: var(--m-oro-claro);
    background: var(--m-oro-claro);
  }
}
</style>
