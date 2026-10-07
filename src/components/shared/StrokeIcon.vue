<template>
  <svg
    :width="tamano"
    :height="tamano"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(trazo, i) in trazos" :key="i" :d="trazo" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Los iconos de trazo de la remodelación.
 *
 * Existe porque el proyecto solo carga `material-icons` —la variante rellena—
 * y no la de contorno: los iconos de Material desentonaban con el resto del
 * portal, que es todo trazo fino (el globo del asistente, las flechas, las
 * tijeras). Añadir otro set de iconos serían más kilobytes que descargar para
 * NF02; dibujarlos aquí no cuesta ninguno.
 *
 * Heredan el color (`currentColor`), así que quien los coloca manda.
 */
const TRAZOS: Record<string, string[]> = {
  cuenta: [
    'M15.2 8.2a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0',
    'M5.5 19.8a6.5 6.5 0 0 1 13 0',
  ],
  reservas: [
    'M4.5 6.8h15v12.7h-15z',
    'M4.5 10.3h15',
    'M8.3 3.8v4M15.7 3.8v4',
    'M9.5 14.3l2 2 3.3-3.6',
  ],
  agenda: [
    'M4.5 6.8h15v12.7h-15z',
    'M4.5 10.3h15',
    'M8.3 3.8v4M15.7 3.8v4',
    'M8 13.6h8M8 16.6h5',
  ],
  testimonios: [
    'M20.5 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-2.8-.4L3 21l1.6-4.6A8.3 8.3 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 8.5 8.4z',
    'M8.4 10.4h7.2M8.4 13.8h4.6',
  ],
  equipo: [
    'M14.4 8.4a2.9 2.9 0 1 1-5.8 0 2.9 2.9 0 0 1 5.8 0',
    'M4.6 19.4a6.9 6.9 0 0 1 13.8 0',
    'M17.4 7.7a2.4 2.4 0 0 1 0 4.8',
    'M19.4 19.4a5.6 5.6 0 0 0-1.8-4.1',
  ],
  estilistas: [
    'M14.8 8a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0',
    'M5.4 19.6a6.6 6.6 0 0 1 10.1-5.6',
    'M21 17.6a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    'M16.8 17.6l1.1 1.1 2.1-2.2',
  ],
  horario: [
    'M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
    'M12 7.4V12l3 1.9',
  ],
  ayuda: [
    'M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
    'M9.7 9.5a2.4 2.4 0 1 1 3.1 2.3c-.6.2-.9.7-.9 1.3v.4',
    'M11.95 16.6h.1',
  ],
  privacidad: [
    'M12 3.3l7 2.7v5.2c0 4.2-2.9 7.5-7 9.5-4.1-2-7-5.3-7-9.5V6z',
    'M12 9v3.6',
    'M11.95 15.7h.1',
  ],
  /** Elipse de trazo: la línea «Favorece a rostros …» de la ficha del servicio. */
  rostro: ['M12 3.4a6.4 8.6 0 1 1 0 17.2 6.4 8.6 0 1 1 0-17.2'],
  entrar: [
    'M13.8 4.5h4.4A1.8 1.8 0 0 1 20 6.3v11.4a1.8 1.8 0 0 1-1.8 1.8h-4.4',
    'M10.2 15.5 13.7 12l-3.5-3.5',
    'M13.7 12H4',
  ],
  salir: [
    'M10.2 4.5H5.8A1.8 1.8 0 0 0 4 6.3v11.4a1.8 1.8 0 0 0 1.8 1.8h4.4',
    'M16.5 15.5 20 12l-3.5-3.5',
    'M20 12h-9.7',
  ],
  lapiz: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
  etiqueta: [
    'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z',
    'M7 7h.01',
  ],
  papelera: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
    'M10 11v6M14 11v6',
  ],
};

const props = withDefaults(defineProps<{ nombre: string; tamano?: number }>(), {
  tamano: 20,
});

defineOptions({ name: 'StrokeIcon' });

/**
 * Un nombre que no existe no pinta nada en vez de reventar: el menú se arma por
 * datos, y perder una fila entera por una errata de icono sería peor que una
 * fila sin icono.
 */
const trazos = computed(() => TRAZOS[props.nombre] ?? []);
</script>
