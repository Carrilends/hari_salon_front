<template>
  <picture>
    <source type="image/webp" :srcset="srcset('webp')" :sizes="medidas" />
    <source type="image/jpeg" :srcset="srcset('jpg')" :sizes="medidas" />
    <!--
      `loading` va ANTES de `src` a propósito: ver el comentario de abajo. Y el
      `src` es la variante más pequeña, no el original.
    -->
    <img
      :loading="prioritaria ? 'eager' : 'lazy'"
      :fetchpriority="prioritaria ? 'high' : undefined"
      decoding="async"
      :src="respaldo"
      :alt="alt"
      :data-foto="foto"
      @load="emit('cargada')"
      @error="emit('cargada')"
    />
  </picture>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Una foto servida en WebP a quien puede y en JPEG a quien no.
 *
 * El respaldo no es prudencia de más: NF06 (Tabla 44) promete **Safari 13.1+**
 * y WebP llega en Safari 14. Un `.webp` como `src` suelto dejaría un hueco roto
 * en un navegador que la tesis dice soportar.
 *
 * **Dos `<source>` y un `src` mínimo, por una razón medida.** Un `<img>` empieza a
 * cargar en cuanto se le pone el `src`, y Vue le pone los atributos mientras
 * todavía está fuera del `<picture>`: en WebKit eso arrancaba una descarga del
 * `src` y otra del `srcset` del propio `<img>` que nadie llegaba a usar —tres
 * ficheros por foto, 640 KB en la portada— antes de insertarlo y elegir el WebP.
 * De ahí las tres decisiones de este marcado:
 *
 * 1. El JPEG responsivo vive en su propio `<source type="image/jpeg">`, no en el
 *    `srcset` del `<img>`. Safari 13.1 lo toma igual —y encima del tamaño que
 *    pinta— y el `<img>` se queda sin `srcset` que disparar antes de tiempo.
 * 2. `loading` se declara **antes** de `src`. Con `lazy` ya puesto, el navegador
 *    aplaza esa descarga suelta en vez de lanzarla.
 * 3. El `src` es la variante más pequeña. Es el último recurso —un navegador sin
 *    `srcset`, que no está en la matriz de NF06—, así que la foto de la portada,
 *    que va `eager` y no puede aplazarse, paga 17 KB y no 131.
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
function variante(ancho: number, formato: 'webp' | 'jpg'): string {
  return `${props.foto.replace(/\.jpe?g$/i, '')}-${ancho}.${formato}`;
}

function srcset(formato: 'webp' | 'jpg'): string {
  return props.anchos
    .map((ancho) => `${variante(ancho, formato)} ${ancho}w`)
    .join(', ');
}

/** El último recurso: la variante más pequeña, en JPEG. */
const respaldo = computed(() => variante(Math.min(...props.anchos), 'jpg'));
</script>
