<template>
  <picture>
    <source type="image/webp" :srcset="srcset('webp')" :sizes="medidas" />
    <img
      :src="foto"
      :srcset="srcset('jpg')"
      :sizes="medidas"
      :alt="alt"
      :data-foto="foto"
      :loading="prioritaria ? 'eager' : 'lazy'"
      :fetchpriority="prioritaria ? 'high' : undefined"
      decoding="async"
      @load="emit('cargada')"
      @error="emit('cargada')"
    />
  </picture>
</template>

<script setup lang="ts">
/**
 * Una foto servida en WebP a quien puede y en JPEG a quien no.
 *
 * El respaldo no es prudencia de más: NF06 (Tabla 44) promete **Safari 13.1+**
 * y WebP llega en Safari 14. Un `.webp` como `src` suelto dejaría un hueco roto
 * en un navegador que la tesis dice soportar.
 *
 * `error` emite igual que `load`: una foto que ya no está tiene que apagar el
 * hueco de espera, o se quedaría latiendo para siempre. Y el `<img>` lleva
 * `data-foto` porque `useImagenesEnEspera` repasa al montar los `img[data-foto]`
 * que ya estén completos: sin eso, una foto servida desde la caché dejaría el
 * hueco latiendo debajo de una imagen ya pintada.
 */
const props = withDefaults(
  defineProps<{
    /** Ruta del JPEG de respaldo, absoluta desde la raíz. */
    foto: string;
    alt: string;
    anchos: number[];
    /** El `sizes`: cuánto ocupará en cada ancho de pantalla. */
    medidas: string;
    /** Solo la del LCP. Las demás se aplazan. */
    prioritaria?: boolean;
  }>(),
  { prioritaria: false }
);

const emit = defineEmits<{ (e: 'cargada'): void }>();

defineOptions({ name: 'FotoResponsiva' });

/**
 * Rutas absolutas desde la raíz, nunca relativas: `/` se prerenderiza con SSG y
 * este marcado viaja tal cual en el HTML publicado, donde no hay un componente
 * desde el que resolver una ruta relativa.
 */
function srcset(formato: 'webp' | 'jpg'): string {
  const base = props.foto.replace(/\.jpe?g$/i, '');
  return props.anchos
    .map((ancho) => `${base}-${ancho}.${formato} ${ancho}w`)
    .join(', ');
}
</script>
