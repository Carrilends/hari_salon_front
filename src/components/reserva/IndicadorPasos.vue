<template>
  <ol
    class="pasos"
    data-test="indicador-pasos"
    aria-label="Pasos de la reserva"
  >
    <li
      v-for="(rotulo, i) in ROTULOS"
      :key="rotulo"
      class="pasos__paso"
      :class="`pasos__paso--${estadoDe(i + 1)}`"
      :data-test="`paso-${estadoDe(i + 1)}`"
      :aria-current="i + 1 === actual ? 'step' : undefined"
    >
      <span class="pasos__marca" aria-hidden="true">
        <StrokeIcon
          v-if="estadoDe(i + 1) === 'hecho'"
          nombre="check"
          :tamano="12"
        />
        <template v-else>{{ i + 1 }}</template>
      </span>
      {{ rotulo }}
      <span v-if="estadoDe(i + 1) === 'hecho'" class="sr"> (hecho)</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

/**
 * Los tres pasos del cajón (B2), sobre la cabecera tinta. Informa, no navega:
 * para volver está «← Atrás» y, en «Tus datos», «Cambiar».
 */
defineOptions({ name: 'IndicadorPasos' });

const props = defineProps<{ actual: 1 | 2 | 3 }>();

const ROTULOS = ['Servicios', 'Cuándo', 'Tus datos'] as const;

function estadoDe(paso: number): 'hecho' | 'actual' | 'pendiente' {
  if (paso < props.actual) return 'hecho';
  return paso === props.actual ? 'actual' : 'pendiente';
}
</script>

<style scoped lang="scss">
/** Tablero ReservaCajonPasos: 52 px (46 en móvil), versalitas, raya inferior. */
.pasos {
  display: flex;
  gap: 8px;
  height: 52px;
  margin: 0;
  padding: 0 16px 0 0;
  list-style: none;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pasos__paso {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--m-piedra-clara);
  border-bottom: 2px solid var(--m-carbon);
}

.pasos__paso--actual {
  color: var(--m-hueso);
  border-bottom-color: var(--m-oro);
}

.pasos__marca {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--m-filete-grosor) solid var(--m-piedra);
  border-radius: 50%;
  font-size: 11px;
  letter-spacing: 0;
}

.pasos__paso--hecho .pasos__marca {
  border-color: var(--m-oro);
  color: var(--m-oro);
}

.pasos__paso--actual .pasos__marca {
  border-color: var(--m-hueso);
  background: var(--m-hueso);
  color: var(--m-tinta);
}

@media (max-width: 699px) {
  .pasos {
    gap: 6px;
    height: 46px;
    padding-right: 14px;
    font-size: 10.5px;
    letter-spacing: 0.1em;
  }

  .pasos__marca {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
}
</style>
