<template>
  <section
    class="marco-seccion"
    :class="{ 'marco-seccion--movil': movil }"
    aria-labelledby="cuenta-titulo-seccion"
    data-test="marco-seccion"
  >
    <p class="marco-seccion__antetitulo" data-test="antetitulo-seccion">
      {{ antetitulo }}
    </p>
    <component
      :is="movil ? 'h1' : 'h2'"
      id="cuenta-titulo-seccion"
      class="marco-seccion__titulo"
      tabindex="-1"
      data-test="titulo-seccion"
    >
      {{ titulo }}
    </component>
    <p
      v-if="entradilla"
      class="marco-seccion__entradilla"
      data-test="entradilla-seccion"
    >
      {{ entradilla }}
    </p>
    <slot />
  </section>
</template>

<script setup lang="ts">
/**
 * El marco de cada sección de Mi cuenta (tablero MiCuentaA): antetítulo en
 * versalitas oro profundo, título en Marcellus y entradilla. En escritorio es
 * la ficha nieve a la derecha del índice y el título es un `h2` (el `h1` es
 * «Mi cuenta»); en móvil la sección ocupa la pantalla, va sobre el hueso y su
 * título es el `h1`. El `id` es fijo porque solo hay una sección a la vez: la
 * página le manda el foco al cambiar de sección.
 */
withDefaults(
  defineProps<{
    antetitulo: string;
    titulo: string;
    entradilla?: string;
    movil?: boolean;
  }>(),
  { entradilla: '', movil: false }
);
</script>

<style scoped lang="scss">
.marco-seccion {
  box-sizing: border-box;
  padding: 30px 34px 32px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.marco-seccion--movil {
  padding: 0;
  border: 0;
  background: transparent;
}

.marco-seccion__antetitulo {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.marco-seccion__titulo {
  margin: 0 0 6px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.2;
}

/* Recibe el foco por programa al cambiar de sección; no es un control. */
.marco-seccion__titulo:focus {
  outline: none;
}

.marco-seccion--movil .marco-seccion__titulo {
  margin-bottom: 18px;
}

.marco-seccion__entradilla {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}
</style>
