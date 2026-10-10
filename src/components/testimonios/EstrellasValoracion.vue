<template>
  <span
    class="estrellas"
    role="img"
    :aria-label="etiqueta"
    data-test="estrellas"
  >
    <svg
      v-for="(tipo, i) in tipos"
      :key="i"
      :width="tamano"
      :height="tamano"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      :data-test="`estrella-${tipo}`"
    >
      <path
        :d="ESTRELLA"
        :fill="tipo === 'llena' ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <path v-if="tipo === 'media'" :d="MEDIA_ESTRELLA" fill="currentColor" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Cinco estrellas de trazo, llenas, medias o vacías. Heredan el color: sobre
 * tinta las pone en oro quien las coloca, sobre nieve en oro profundo (el oro
 * claro no se lee sobre claro). Para el lector de pantalla son UNA imagen con
 * su etiqueta, no cinco dibujos.
 */
type TipoEstrella = 'llena' | 'media' | 'vacia';

const props = withDefaults(defineProps<{ valor: number; tamano?: number }>(), {
  tamano: 12,
});

const ESTRELLA =
  'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z';
const MEDIA_ESTRELLA = 'M12 3.5v13.4l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z';

/** Al medio más cercano, entre 0 y 5; lo que no es número cuenta como 0. */
const redondeado = computed(() => {
  const n = Number(props.valor);
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n * 2) / 2));
});

const tipos = computed<TipoEstrella[]>(() =>
  [1, 2, 3, 4, 5].map((i) => {
    if (redondeado.value >= i) return 'llena';
    if (redondeado.value >= i - 0.5) return 'media';
    return 'vacia';
  })
);

const etiqueta = computed(
  () => `${String(redondeado.value).replace('.', ',')} de 5 estrellas`
);

defineOptions({ name: 'EstrellasValoracion' });
</script>

<style scoped lang="scss">
.estrellas {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.estrellas svg {
  flex: 0 0 auto;
  display: block;
}
</style>
