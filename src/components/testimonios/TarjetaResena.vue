<template>
  <article class="tarjeta-resena" data-test="tarjeta-resena">
    <header class="tarjeta-resena__cabecera">
      <span
        class="tarjeta-resena__inicial"
        aria-hidden="true"
        data-test="inicial"
      >
        {{ inicialDe(resena.name) }}
      </span>
      <div class="tarjeta-resena__quien">
        <p class="tarjeta-resena__nombre" data-test="nombre">
          {{ resena.name }}
        </p>
        <time
          class="tarjeta-resena__fecha"
          :datetime="resena.createdAt"
          data-test="fecha"
          >{{ fechaCorta(resena.createdAt) }}</time
        >
      </div>
      <EstrellasValoracion
        class="tarjeta-resena__estrellas"
        :valor="Number(resena.score)"
        :tamano="12"
      />
    </header>
    <p class="tarjeta-resena__texto" data-test="texto">
      {{ resena.description }}
    </p>
  </article>
</template>

<script setup lang="ts">
import EstrellasValoracion from 'src/components/testimonios/EstrellasValoracion.vue';
import { fechaCorta, inicialDe } from 'src/helpers/resumen-resenas';
import type { ReviewItem } from 'src/api/apiTypes';

/**
 * Una reseña del muro (tablero TestimoniosMuroTinta). El texto va entero: en el
 * muro se viene a leer. El nombre y el texto los escribe la clienta, así que
 * parten donde haga falta (`overflow-wrap: break-word` con `min-width: 0`; no
 * `anywhere`, que Safari 13.1 —NF06— no tiene: llega en 15.4).
 */
defineProps<{ resena: ReviewItem }>();

defineOptions({ name: 'TarjetaResena' });
</script>

<style scoped lang="scss">
.tarjeta-resena {
  box-sizing: border-box;
  min-width: 0;
  padding: 22px 22px 24px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  color: var(--m-tinta);
}

.tarjeta-resena__cabecera {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tarjeta-resena__inicial {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 17px;
}

.tarjeta-resena__quien {
  flex: 1 1 auto;
  min-width: 0;
}

.tarjeta-resena__nombre {
  margin: 0;
  font-size: 14.5px;
  font-weight: 500;
  overflow-wrap: break-word;
}

.tarjeta-resena__fecha {
  display: block;
  font-size: 12px;
  color: var(--m-piedra);
}

/* Sobre nieve, el dorado legible es el profundo (6,20:1). */
.tarjeta-resena__estrellas {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
}

.tarjeta-resena__texto {
  margin: 16px 0 0;
  font-size: 15px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

@media (max-width: 699px) {
  .tarjeta-resena {
    padding: 16px;
  }

  .tarjeta-resena__inicial {
    width: 36px;
    height: 36px;
    font-size: 15px;
  }

  .tarjeta-resena__nombre {
    font-size: 14px;
  }

  .tarjeta-resena__fecha {
    font-size: 11.5px;
  }

  .tarjeta-resena__texto {
    margin-top: 12px;
    font-size: 14.5px;
    line-height: 1.6;
  }
}
</style>
