<template>
  <section class="hero-band">
    <div class="hero-band__texto">
      <p class="hero-band__etiqueta">Peluquería en Sopó</p>
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
    <img class="hero-band__foto" :src="foto" :alt="fotoAlt" decoding="async" />
  </section>
</template>

<script setup lang="ts">
defineProps<{ foto: string; fotoAlt: string }>();
const emit = defineEmits<{ (e: 'ver-servicios'): void }>();

defineOptions({ name: 'HeroBand' });
</script>

<style scoped lang="scss">
.hero-band {
  display: flex;
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

.hero-band__foto {
  flex: 1 1 auto;
  min-width: 0;
  object-fit: cover;
}

@media (max-width: 699px) {
  .hero-band {
    flex-direction: column-reverse;
  }

  .hero-band__texto {
    flex: 0 0 auto;
    padding: 20px var(--m-banda-margen-movil) 18px;
  }

  .hero-band__titular {
    font-size: 29px;
  }

  .hero-band__foto {
    height: 186px;
  }
}
</style>
