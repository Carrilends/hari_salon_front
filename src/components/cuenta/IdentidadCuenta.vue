<template>
  <div class="identidad" data-test="identidad-cuenta">
    <span class="identidad__avatar" aria-hidden="true" data-test="iniciales">
      <template v-if="iniciales">{{ iniciales }}</template>
      <stroke-icon v-else nombre="cuenta" :tamano="22" />
    </span>
    <span class="identidad__textos">
      <span class="identidad__nombre" data-test="identidad-nombre">{{
        nombre.trim() || 'Tu cuenta'
      }}</span>
      <span class="identidad__correo" data-test="identidad-correo">{{
        correo
      }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * La identidad de la cuenta (tablero, columna izquierda y móvil 1): el avatar
 * con las MISMAS iniciales que el botón «Más» de la cabecera (`inicialesDe`),
 * el nombre en Marcellus y el correo.
 */
import { computed } from 'vue';
import { inicialesDe } from 'src/composables/shared/menuMas';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

const props = defineProps<{ nombre: string; correo: string }>();

const iniciales = computed(() => inicialesDe(props.nombre, props.correo));
</script>

<style scoped lang="scss">
.identidad {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 18px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  font-family: var(--m-font-sans);
}

.identidad__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 18px;
}

.identidad__textos {
  min-width: 0;
}

.identidad__nombre {
  display: block;
  font-family: var(--m-font-display);
  font-size: 18px;
  color: var(--m-tinta);
}

.identidad__correo {
  display: block;
  font-size: 12.5px;
  color: var(--m-piedra);
  overflow-wrap: anywhere;
}
</style>
