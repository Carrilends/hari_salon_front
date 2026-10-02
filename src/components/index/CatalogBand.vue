<template>
  <section class="catalog-band">
    <div class="catalog-band__cabecera">
      <h2 class="catalog-band__titulo">La carta</h2>
      <button
        type="button"
        class="catalog-band__ver-todo"
        data-test="ver-todo"
        @click="emit('ver-todo')"
      >
        Ver todo →
      </button>
    </div>

    <div
      v-if="secciones.length"
      class="catalog-band__rejilla"
      ref="rejilla"
      data-test="rejilla"
    >
      <button
        v-for="seccion in secciones"
        :key="seccion.title"
        type="button"
        class="catalog-band__seccion"
        data-test="seccion"
        @click="emit('abrir', seccion)"
      >
        <img
          class="catalog-band__foto"
          :class="{ 'm-foto--esperando': !llego(seccion.imgPath) }"
          :data-foto="seccion.imgPath"
          :src="seccion.imgPath"
          :alt="seccion.title"
          loading="lazy"
          decoding="async"
          @load="marcar(seccion.imgPath)"
          @error="marcar(seccion.imgPath)"
        />
        <span class="catalog-band__nombre">{{ seccion.title }}</span>
        <!--
          Aquí va el «desde $X» de las maquetas. No se pinta todavía: ese dato
          no está en `INDEX_SECTIONS` y calcularlo exigiría pedir el catálogo
          entero en el inicio o un endpoint nuevo. Ver la Tarea 4 del plan de
          remodelación del inicio.
        -->
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import type { IndexSection } from 'src/constants/index-sections';
import { useImagenesEnEspera } from 'src/composables/shared/useImagenesEnEspera';

defineProps<{ secciones: IndexSection[] }>();
const emit = defineEmits<{
  (e: 'abrir', seccion: IndexSection): void;
  (e: 'ver-todo'): void;
}>();

/**
 * Las fotos de `public/people/` pesan y se ven aparecer: hasta que llegan, el
 * hueco espera con vida en vez de quedarse en blanco.
 */
const rejilla = ref<HTMLElement | null>(null);
const { marcar, llego } = useImagenesEnEspera(rejilla);

defineOptions({ name: 'CatalogBand' });
</script>

<style scoped lang="scss">
.catalog-band {
  padding: 26px var(--m-banda-margen) 30px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.catalog-band__cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.catalog-band__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 24px;
  color: var(--m-hueso);
}

.catalog-band__ver-todo {
  padding: 0;
  background: none;
  border: 0;
  font: inherit;
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  // Sobre tinta el oro claro da 5,7:1: aquí sí es color de texto.
  color: var(--m-oro);
  cursor: pointer;
}

.catalog-band__rejilla {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--m-rejilla-gap);
}

.catalog-band__seccion {
  display: block;
  padding: 0;
  min-height: var(--m-tactil-min);
  background: none;
  border: 0;
  font: inherit;
  text-align: left;
  color: var(--m-hueso);
  cursor: pointer;
}

.catalog-band__foto {
  display: block;
  width: 100%;
  height: 122px;
  object-fit: cover;
  border-radius: var(--m-radio-foto);
  // El hueco mientras la foto llega: carbón, que es la superficie de esta banda.
  background: var(--m-carbon);
}

.catalog-band__nombre {
  display: block;
  margin-top: 11px;
  font-family: var(--m-font-display);
  font-size: 17px;
  line-height: 1.3;
}

@media (max-width: 699px) {
  .catalog-band {
    padding: 18px var(--m-banda-margen-movil) 20px;
  }

  .catalog-band__titulo {
    font-size: 19px;
  }

  .catalog-band__rejilla {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--m-rejilla-gap-movil);
  }

  .catalog-band__foto {
    height: 86px;
  }

  .catalog-band__nombre {
    margin-top: 8px;
    font-size: 14px;
  }
}
</style>
