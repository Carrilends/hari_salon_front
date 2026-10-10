<template>
  <span
    class="barra-carga"
    :class="[
      `barra-carga--${variante}`,
      { 'barra-carga--sobre-carbon': sobreCarbon },
    ]"
    data-test="barra-carga"
    :role="variante === 'tabla' ? 'img' : undefined"
    :aria-label="variante === 'tabla' ? texto : undefined"
    :aria-hidden="variante === 'mini' ? 'true' : undefined"
    :title="texto"
  >
    <span
      class="barra-carga__relleno"
      data-test="barra-relleno"
      :style="{ height: `${porcentaje}%` }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { porcentajeDeCarga, textoCarga } from 'src/helpers/semana-estilistas';

/**
 * Una barra vertical: horas reservadas de un día sobre el horario del salón.
 * El relleno crece desde abajo y nunca pasa del 100 %; el texto (lector de
 * pantalla y `title`) dice siempre las horas reales.
 */
const props = withDefaults(
  defineProps<{
    usados: number;
    capacidad: number;
    variante?: 'tabla' | 'mini';
    sobreCarbon?: boolean;
  }>(),
  { variante: 'tabla', sobreCarbon: false }
);

const porcentaje = computed(() =>
  porcentajeDeCarga(props.usados, props.capacidad)
);
const texto = computed(() => textoCarga(props.usados, props.capacidad));

defineOptions({ name: 'BarraCarga' });
</script>

<style lang="scss" scoped>
.barra-carga {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: var(--m-radio-tarjeta);
  /* Canal sobre la tinta de la página. */
  background: var(--m-carbon);
}

.barra-carga--tabla {
  width: 30px;
  height: 64px;
  margin: 0 auto;
}

.barra-carga--mini {
  width: 100%;
  height: 44px;
  border-radius: var(--m-radio-foto);
}

/* Sobre carbón (fila elegida, tarjeta de móvil) el canal pasa a tinta. */
.barra-carga--sobre-carbon {
  background: var(--m-tinta);
}

/* Cuatro lados a mano: `inset` no existe en Safari 13.1 (NF06). */
.barra-carga__relleno {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--m-oro);
}
</style>
