<template>
  <section ref="banda" class="hero-band">
    <div class="hero-band__texto">
      <p class="hero-band__etiqueta">Peluquería Marlene · Sopó</p>
      <h1 class="hero-band__titular">Cortes, color<br />y estética</h1>
      <p class="hero-band__lede">
        Elige servicio, día y estilista. Te confirmamos el mismo día.
      </p>
      <button
        type="button"
        class="hero-band__enlace"
        data-test="ver-servicios"
        @click="emit('ver-servicios')"
      >
        Ver servicios →
      </button>
    </div>
    <FotoResponsiva
      class="hero-band__foto"
      :class="{ 'm-foto--esperando': !llego(foto) }"
      :foto="foto"
      :alt="fotoAlt"
      :anchos="ANCHOS_PORTADA"
      medidas="(max-width: 699px) 100vw, 53vw"
      prioritaria
      @cargada="marcar(foto)"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import FotoResponsiva from 'src/components/shared/FotoResponsiva.vue';
import { ANCHOS_PORTADA } from 'src/constants/anchos-de-foto';
import { useImagenesEnEspera } from 'src/composables/shared/useImagenesEnEspera';

defineProps<{ foto: string; fotoAlt: string }>();
const emit = defineEmits<{ (e: 'ver-servicios'): void }>();

/**
 * Las fotos de `public/people/` pesan y se ven aparecer: hasta que llegan, el
 * hueco espera con vida en vez de quedarse en blanco.
 */
const banda = ref<HTMLElement | null>(null);
const { marcar, llego } = useImagenesEnEspera(banda);

defineOptions({ name: 'HeroBand' });
</script>

<style scoped lang="scss">
.hero-band {
  position: relative;
  display: flex;
  // El texto se centra en vertical: la portada es la que absorbe el aire que
  // sobra en la página, y con el texto arriba ese aire se lee como un hueco
  // olvidado en vez de como margen.
  align-items: center;
  // El tablero da 268 px a la portada. Sin este suelo, la banda se queda en el
  // alto del texto.
  min-height: 268px;
  background: var(--m-hueso);
}

.hero-band__texto {
  flex: 0 0 47%;
  padding: 38px var(--m-banda-margen) 32px;
}

.hero-band__etiqueta {
  margin: 0 0 14px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.hero-band__titular {
  margin: 0 0 14px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 42px;
  line-height: 1.1;
  color: var(--m-tinta);
}

.hero-band__lede {
  margin: 0 0 18px;
  max-width: 430px;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--m-piedra);
}

.hero-band__enlace {
  padding: 0 0 5px;
  min-height: var(--m-tactil-min);
  background: none;
  border: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-oro);
  font: inherit;
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-tinta);
  cursor: pointer;
}

/**
 * La foto ocupa la mitad derecha **de borde a borde**, pegada abajo a la banda
 * oscura que viene después.
 *
 * Va absoluta, y es lo que lo hace posible: como elemento de flex traía su alto
 * natural (unos 450 px), así que había que ponerle un tope de 268 — y en cuanto
 * la banda crecía, por el texto o por el reparto vertical de la página, la foto
 * se quedaba corta y parecía flotar sobre una franja de hueso. Sacada del flujo
 * no impone alto ninguno y se estira con la banda, pase lo que pase.
 */
.hero-band__foto {
  position: absolute;
  top: 0;
  right: 0;
  width: 53%;
  // `height: 100%` explícito y no `bottom: 0`: una imagen es un elemento
  // reemplazado, y con el alto en `auto` usa el suyo intrínseco e ignora el
  // `bottom` — se quedaba 283 px corta del borde de la banda oscura.
  height: 100%;
  // El `<picture>` es un contenedor en línea: sin esto no toma el alto.
  display: block;
}

.hero-band__foto :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 699px) {
  .hero-band {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .hero-band__texto {
    flex: 0 0 auto;
    padding: 20px var(--m-banda-margen-movil) 18px;
  }

  .hero-band__titular {
    font-size: 29px;
  }

  // En móvil vuelve al flujo: la banda es una columna y la foto va arriba.
  .hero-band__foto {
    position: static;
    width: 100%;
    height: 186px;
  }
}
</style>
