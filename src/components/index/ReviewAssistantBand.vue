<template>
  <section class="review-band">
    <div
      class="review-band__resena"
      data-test="zona-resena"
      @mouseenter="pausar"
      @mouseleave="reanudar"
      @focusin="pausar"
      @focusout="reanudar"
    >
      <div class="review-band__encabezado">
        <span class="review-band__etiqueta">Lo que dicen</span>
        <span v-if="hayPuntos" class="review-band__puntos" aria-hidden="true">
          <span
            v-for="(_, posicion) in total"
            :key="posicion"
            class="review-band__punto"
            :class="{ 'review-band__punto--activo': posicion === indice % total }"
            data-test="punto"
          />
        </span>
      </div>

      <!--
        La llave es el índice, no la reseña: es lo que hace que Vue monte un
        nodo nuevo en vez de repintar el mismo con otro texto, que es lo que
        había y por eso el cambio era un salto seco. `out-in` para que no se
        solapen dos reseñas a media opacidad, que se lee fatal.
      -->
      <Transition name="review-band__cruce" mode="out-in">
        <div v-if="resena" :key="indice" class="review-band__texto">
          <blockquote class="review-band__cita" data-test="cita">
            «{{ resena.description }}»
          </blockquote>
          <p class="review-band__autor">
            {{ resena.name }} · reseña publicada en el portal
          </p>
        </div>
      </Transition>
      <div v-if="!resena && cargando" class="review-band__esqueleto" data-test="esqueleto" aria-hidden="true">
        <span class="review-band__barra" />
        <span class="review-band__barra review-band__barra--corta" />
      </div>
      <p v-else-if="!resena" class="review-band__vacio">
        Todavía no hay reseñas publicadas. La tuya puede ser la primera.
      </p>

      <button
        type="button"
        class="review-band__dejar"
        data-test="dejar-resena"
        @click="pedirResena()"
      >
        Deja la tuya →
      </button>
    </div>

    <div class="review-band__asistente">
      <div>
        <div class="review-band__encabezado">
          <svg
            class="review-band__icono"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-2.8-.4L3 21l1.6-4.6A8.3 8.3 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"
            />
          </svg>
          <span class="review-band__etiqueta">Asistente</span>
        </div>
        <p class="review-band__invitacion">¿No sabes qué pedir?</p>
        <p class="review-band__apoyo">Pregúntale y te arma la cita.</p>
      </div>

      <div class="review-band__chips">
        <button
          v-for="chip in chips"
          :key="chip.tool"
          type="button"
          class="review-band__chip"
          data-test="chip-intencion"
          @click="abrirConPregunta(chip.prompt)"
        >
          {{ chip.label }}
        </button>
        <button
          type="button"
          class="review-band__chip review-band__chip--solido"
          data-test="abrir-asistente"
          @click="abrirAsistente()"
        >
          Preguntar
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRotatingReview } from 'src/composables/reviews/useRotatingReview';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { INTENT_CHIPS } from 'src/composables/assistant/intentChips';

/**
 * Pasados de aquí, la fila de puntos es más ancha que un teléfono y arrastra
 * la página en horizontal. Con tantas reseñas el indicador tampoco dice nada.
 */
const MAX_PUNTOS = 6;

const { resena, indice, total, cargando, pausar, reanudar } = useRotatingReview();
const { abrir: abrirAsistente, abrirCon } = useAssistantPanel();
const { solicitar: pedirResena } = useReviewDialog();

const hayPuntos = computed(() => total.value > 1 && total.value <= MAX_PUNTOS);

/**
 * Los chips salen del catálogo de intenciones, que es el que la prueba
 * `intentChips.spec.ts` contrasta con las herramientas que el asistente tiene
 * de verdad. Escribir aquí rótulos sueltos se saltaría esa red y prometería
 * cosas que ninguna herramienta sabe hacer. Los que piden sesión se quedan
 * fuera: esta tarjeta la ve cualquiera que llegue al portal.
 */
const chips = computed(() =>
  INTENT_CHIPS.filter((chip) => !chip.requiresAuth).slice(1, 3),
);

function abrirConPregunta(prompt: string) {
  abrirCon(prompt);
}

defineOptions({ name: 'ReviewAssistantBand' });
</script>

<style scoped lang="scss">
.review-band {
  display: flex;
  gap: 36px;
  padding: 24px var(--m-banda-margen) 30px;
  background: var(--m-hueso);
}

/**
 * La reseña es la que crece. El reparto estaba al revés —la tarjeta del
 * asistente se quedaba con 591 px de 1184 y la reseña con 556— y la caja blanca
 * pesaba más que lo que de verdad cuenta la banda: lo que dice una clienta.
 */
.review-band__resena {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  // Reserva el alto de la cita para que la banda no dé un salto cuando la
  // reseña llega del servidor: la ruta `/` se prerenderiza sin ella.
  min-height: 150px;
}

.review-band__encabezado {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.review-band__etiqueta {
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.review-band__puntos {
  display: flex;
  align-items: center;
  gap: 5px;
}

.review-band__punto {
  width: 6px;
  height: 2px;
  border-radius: 2px;
  background: var(--m-filete);
}

.review-band__punto--activo {
  width: 16px;
  background: var(--m-tinta);
}

/**
 * El cruce entre una reseña y la siguiente. Se desvanece y se desplaza un pelo:
 * el movimiento da sensación de relevo, que un desvanecido a secas no tiene.
 * Son 0,25 s de ida y 0,25 de vuelta, muy por debajo de los 8 s que tarda en
 * rotar, así que nunca se pisan.
 */
.review-band__cruce-enter-active,
.review-band__cruce-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.review-band__cruce-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.review-band__cruce-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .review-band__cruce-enter-active,
  .review-band__cruce-leave-active {
    transition: none;
  }
}

.review-band__cita {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 22px;
  line-height: 1.45;
  color: var(--m-tinta);
  // El freno de la reseña larguísima: tres líneas y elipsis, para que no
  // empuje la tarjeta del asistente fuera de la pantalla.
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.review-band__autor,
.review-band__apoyo {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--m-piedra);
}

/* El nombre lo escribe la clienta y el backend acepta 120 caracteres sin
   exigir espacios: sin esto, uno largo y sin espacios arrastra la página
   entera en horizontal a 390 px. */
.review-band__autor {
  overflow-wrap: anywhere;
}

/* Mientras la petición viaja no se afirma nada: con SSG este es el HTML que se
   publica y se indexa, y decir ahí «no hay reseñas» sería mentir. */
.review-band__esqueleto {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-band__barra {
  height: 18px;
  border-radius: 2px;
  background: var(--m-filete);
}

.review-band__barra--corta {
  width: 55%;
}

.review-band__vacio {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.review-band__dejar {
  align-self: flex-start;
  margin-top: auto;
  padding: 14px 0 4px;
  min-height: var(--m-tactil-min);
  background: none;
  border: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
  font: inherit;
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-rosa-profundo);
  cursor: pointer;
}

.review-band__asistente {
  // Unos 50 px menos de los que tenía; se los lleva la columna de la reseña.
  flex: 0 0 46%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
}

.review-band__icono {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
}

.review-band__invitacion {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 19px;
  line-height: 1.3;
  color: var(--m-tinta);
}

.review-band__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.review-band__chip {
  padding: 7px 13px;
  min-height: var(--m-tactil-min);
  background: none;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  font: inherit;
  font-size: 11.5px;
  color: var(--m-tinta);
  cursor: pointer;
}

.review-band__chip--solido {
  padding: 7px 15px;
  background: var(--m-tinta);
  border-color: var(--m-tinta);
  color: var(--m-hueso);
}

@media (max-width: 699px) {
  .review-band {
    flex-direction: column;
    gap: 14px;
    padding: 16px var(--m-banda-margen-movil) 20px;
  }

  .review-band__resena {
    flex: 0 0 auto;
    /* Más bajo que en escritorio, pero NO cero: sin reserva, la banda daba un
       salto de 53 px al llegar las reseñas y el pie brincaba con ella. */
    min-height: 118px;
  }

  .review-band__cita {
    font-size: 17px;
    line-height: 1.4;
  }

  .review-band__asistente {
    padding: 14px 16px;
  }

  .review-band__invitacion {
    font-size: 16px;
  }
}
</style>
