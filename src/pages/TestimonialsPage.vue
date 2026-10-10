<template>
  <q-page class="testimonios">
    <section class="testimonios__banda" data-test="banda-destacada">
      <div
        class="testimonios__destacada"
        data-test="zona-destacada"
        @mouseenter="pausar"
        @mouseleave="reanudar"
        @focusin="pausar"
        @focusout="reanudar"
      >
        <h1 class="testimonios__etiqueta">Testimonios</h1>

        <div v-if="destacada" class="testimonios__cita-marco">
          <span class="testimonios__comillas" aria-hidden="true">“</span>
          <!--
            La llave es el índice: obliga a Vue a montar un nodo nuevo y el cruce
            se ve (mismo patrón que la banda de reseñas del inicio).
          -->
          <Transition name="testimonios__cruce" mode="out-in">
            <figure :key="indice" class="testimonios__figura">
              <blockquote class="testimonios__cita" data-test="cita-destacada">
                {{ destacada.description }}
              </blockquote>
              <figcaption
                class="testimonios__autor"
                data-test="autor-destacado"
              >
                <span class="testimonios__nombre">{{ destacada.name }}</span>
                <span class="testimonios__guion" aria-hidden="true" />
                <EstrellasValoracion
                  class="testimonios__estrellas"
                  :valor="Number(destacada.score)"
                  :tamano="13"
                />
                <time
                  class="testimonios__fecha"
                  :datetime="destacada.createdAt"
                  >{{ fechaCorta(destacada.createdAt) }}</time
                >
              </figcaption>
            </figure>
          </Transition>
        </div>
        <!--
          `isPending` y no `isLoading`: sin red la consulta queda en pausa
          (pendiente, sin cargar ni fallar) y no se puede afirmar «no hay».
        -->
        <div
          v-else-if="isPending"
          class="testimonios__esqueleto"
          data-test="destacada-cargando"
          aria-hidden="true"
        >
          <span
            class="testimonios__esqueleto-linea testimonios__esqueleto-linea--oscura"
          />
          <span
            class="testimonios__esqueleto-linea testimonios__esqueleto-linea--oscura testimonios__esqueleto-linea--corta"
          />
        </div>
        <p
          v-else-if="isError"
          class="testimonios__vacio"
          data-test="destacada-error"
        >
          Las reseñas no cargaron esta vez.
        </p>
        <p v-else class="testimonios__vacio" data-test="destacada-vacia">
          Todavía no hay reseñas publicadas. La tuya puede ser la primera.
        </p>
      </div>

      <div v-if="resumen.total > 0" class="testimonios__nota" data-test="nota">
        <p class="testimonios__etiqueta testimonios__etiqueta--nota">La nota</p>
        <div class="testimonios__media-fila">
          <p class="testimonios__media" data-test="media">
            {{ resumen.mediaTexto }}
          </p>
          <div class="testimonios__media-detalle">
            <EstrellasValoracion
              class="testimonios__estrellas"
              :valor="resumen.media"
              :tamano="15"
            />
            <p class="testimonios__total" data-test="total">
              {{ textoTotal(resumen.total) }}
            </p>
          </div>
        </div>
        <ol class="testimonios__barras" aria-label="Reseñas por estrellas">
          <li
            v-for="barra in resumen.barras"
            :key="barra.estrellas"
            class="testimonios__barra"
            data-test="barra-estrellas"
          >
            <span class="sr">
              {{ barra.estrellas }}
              {{ barra.estrellas === 1 ? 'estrella' : 'estrellas' }}:
              {{ textoTotal(barra.cuantas) }}
            </span>
            <span class="testimonios__barra-etiqueta" aria-hidden="true"
              >{{ barra.estrellas }} ★</span
            >
            <span class="testimonios__barra-canal" aria-hidden="true">
              <span
                class="testimonios__barra-relleno"
                :style="{ width: `${barra.porcentaje}%` }"
              />
            </span>
            <span class="testimonios__barra-cuenta" aria-hidden="true">{{
              barra.cuantas
            }}</span>
          </li>
        </ol>
      </div>
    </section>

    <section class="testimonios__muro" aria-labelledby="testimonios-muro">
      <div class="testimonios__muro-cabecera">
        <h2
          id="testimonios-muro"
          ref="tituloMuro"
          class="testimonios__muro-titulo"
          tabindex="-1"
        >
          Todas las reseñas
        </h2>
        <span v-if="reviews.length" class="testimonios__orden"
          >Más recientes primero</span
        >
        <button
          v-if="puedeResenar"
          type="button"
          class="testimonios__dejar m-boton-plano"
          data-test="dejar-resena"
          @click="pedirResena()"
        >
          Deja tu reseña →
        </button>
      </div>

      <!-- Los esqueletos callan; esto es lo que oye el lector de pantalla. -->
      <p class="sr" role="status" aria-live="polite" data-test="anuncio-carga">
        {{ isPending ? 'Cargando reseñas…' : '' }}
      </p>
      <div
        v-if="isPending"
        class="testimonios__rejilla"
        data-test="muro-cargando"
        aria-hidden="true"
      >
        <div
          v-for="n in 6"
          :key="n"
          class="testimonios__tarjeta-esqueleto"
          data-test="tarjeta-cargando"
        >
          <span class="testimonios__esqueleto-circulo" />
          <span class="testimonios__esqueleto-linea" />
          <span class="testimonios__esqueleto-linea" />
          <span
            class="testimonios__esqueleto-linea testimonios__esqueleto-linea--corta"
          />
        </div>
      </div>
      <!--
        Solo sin nada que enseñar: con reseñas en caché, un refresco fallido pone
        el error pero conserva la lista, y el muro la sigue pintando.
      -->
      <div
        v-else-if="isError && !reviews.length"
        class="testimonios__aviso"
        data-test="muro-error"
      >
        <p class="testimonios__aviso-texto">
          No pudimos cargar las reseñas. Revisa tu conexión e inténtalo otra
          vez.
        </p>
        <button
          type="button"
          class="testimonios__reintentar"
          data-test="reintentar"
          :disabled="isFetching"
          :aria-busy="isFetching"
          @click="reintentar"
        >
          Reintentar
        </button>
      </div>
      <p
        v-else-if="!reviews.length"
        class="testimonios__aviso-texto testimonios__aviso-texto--suelto"
        data-test="muro-vacio"
      >
        Sé la primera persona en compartir su experiencia.
      </p>
      <div v-else class="testimonios__rejilla" data-test="rejilla">
        <TarjetaResena
          v-for="resena in reviews"
          :key="resena.id"
          :resena="resena"
        />
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EstrellasValoracion from 'src/components/testimonios/EstrellasValoracion.vue';
import TarjetaResena from 'src/components/testimonios/TarjetaResena.vue';
import { useReviews } from 'src/composables/reviews/useReviews';
import { useRotatingReview } from 'src/composables/reviews/useRotatingReview';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { useSeo } from 'src/composables/seo/useSeo';
import { reviewsSchema } from 'src/composables/seo/structuredData';
import {
  fechaCorta,
  resumenDeResenas,
  textoTotal,
} from 'src/helpers/resumen-resenas';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * Testimonios (S1, tablero TestimoniosMuroTinta). La destacada rota con las
 * mismas reglas que el inicio porque ES el mismo composable: ~8 s, pausa al
 * pasar o enfocar, respeta el movimiento reducido, no rota con menos de tres y
 * con SSG se prerenderiza fija (el temporizador arranca en `onMounted`).
 */
const { reviews, isPending, isError, isFetching, refetch } = useReviews();
const { resena: destacada, indice, pausar, reanudar } = useRotatingReview();

/**
 * Al reintentar sin datos, la consulta vuelve a `pending` y el aviso —con
 * este botón dentro— se desmonta: el foco caería al `<body>`. Se lleva al
 * título del muro, que sigue ahí, para que el teclado no vuelva a empezar.
 */
const tituloMuro = ref<HTMLElement | null>(null);
const reintentar = () => {
  tituloMuro.value?.focus();
  void refetch();
};

/**
 * Se pide al armazón, que tiene la regla de quién puede reseñar (sin sesión →
 * login con `redirect`). La dueña no reseña: el enlace ni se le pinta.
 */
const { solicitar: pedirResena } = useReviewDialog();
const authStore = useAuthStore();
const puedeResenar = computed(() => !authStore.isAdmin);

const resumen = computed(() => resumenDeResenas(reviews.value));

useSeo({
  title: 'Testimonios | Peluquería Marlene',
  description:
    'Lo que dicen nuestros clientes sobre la experiencia en Peluquería Marlene: reseñas, calificaciones y opiniones reales.',
  path: '/testimonios',
  jsonLd: computed(() =>
    reviewsSchema(
      (reviews.value || []).map((review) => ({
        author: review.name,
        body: review.description,
        rating: Number(review.score) || undefined,
        date: review.createdAt,
      }))
    )
  ),
});

defineOptions({
  name: 'TestimonialsPage',
});
</script>

<style scoped lang="scss">
/**
 * Tablero TestimoniosMuroTinta. La banda tinta aparece una sola vez; las
 * comillas rosa son su único acento (11,47:1 sobre tinta).
 */
.testimonios {
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.testimonios__banda {
  display: flex;
  align-items: stretch;
  gap: 64px;
  box-sizing: border-box;
  min-height: 400px;
  padding: 52px 96px 48px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.testimonios__destacada {
  flex: 0 0 60%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.testimonios__etiqueta {
  margin: 0 0 22px;
  font-family: var(--m-font-sans);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.testimonios__cita-marco {
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  gap: 18px;
  min-width: 0;
}

.testimonios__comillas {
  flex: 0 0 auto;
  font-family: var(--m-font-display);
  font-size: 96px;
  line-height: 0.8;
  color: var(--m-rosa);
}

.testimonios__figura {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
}

.testimonios__cita {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 40px;
  line-height: 1.22;
  overflow-wrap: break-word;
  // El freno de la reseña de 1 000 caracteres: cuatro líneas y elipsis.
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.testimonios__autor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: auto;
  padding-top: 24px;
}

.testimonios__nombre {
  min-width: 0;
  font-size: 14px;
  letter-spacing: 0.04em;
  overflow-wrap: break-word;
}

.testimonios__guion {
  width: 18px;
  height: 1px;
  background: var(--m-oro);
}

.testimonios__estrellas {
  color: var(--m-oro);
}

.testimonios__fecha {
  font-size: 12.5px;
  color: var(--m-piedra-clara);
}

.testimonios__vacio {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 24px;
  line-height: 1.35;
  color: var(--m-piedra-clara);
}

.testimonios__esqueleto {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.testimonios__nota {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 18px;
  padding-left: 48px;
  border-left: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.testimonios__etiqueta--nota {
  margin: 0;
  font-size: 10.5px;
}

.testimonios__media-fila {
  display: flex;
  align-items: flex-end;
  gap: 18px;
}

.testimonios__media {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 64px;
  line-height: 0.9;
  color: var(--m-hueso);
}

.testimonios__media-detalle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 4px;
}

.testimonios__total {
  margin: 0;
  font-size: 13px;
  color: var(--m-piedra-clara);
}

.testimonios__barras {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--m-piedra-clara);
}

.testimonios__barra {
  display: flex;
  align-items: center;
  gap: 12px;
}

.testimonios__barra-etiqueta {
  flex: 0 0 26px;
}

.testimonios__barra-canal {
  position: relative;
  flex: 1 1 auto;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--m-carbon);
}

.testimonios__barra-relleno {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 2px;
  background: var(--m-oro);
}

.testimonios__barra-cuenta {
  flex: 0 0 auto;
  min-width: 10px;
  text-align: right;
}

.testimonios__muro {
  padding: 26px 96px var(--m-flotante-despeje);
}

.testimonios__muro-cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 20px;
  padding-bottom: 14px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.testimonios__muro-titulo {
  flex: 1 1 auto;
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

/* Foco programático (tabindex="-1"): no se alcanza con el teclado. */
.testimonios__muro-titulo:focus {
  outline: none;
}

.testimonios__orden {
  font-size: 12px;
  color: var(--m-piedra);
}

.testimonios__dejar {
  min-height: var(--m-tactil-min);
  padding: 14px 0 4px;
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

.testimonios__rejilla {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
  padding-top: 24px;
}

.testimonios__tarjeta-esqueleto {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
}

.testimonios__esqueleto-circulo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--m-filete);
}

.testimonios__esqueleto-linea {
  display: block;
  height: 12px;
  border-radius: 2px;
  background: var(--m-filete);
}

.testimonios__esqueleto-linea--oscura {
  height: 24px;
  background: var(--m-carbon);
}

.testimonios__esqueleto-linea--corta {
  width: 55%;
}

.testimonios__aviso {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding-top: 24px;
}

.testimonios__aviso-texto {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.testimonios__aviso-texto--suelto {
  padding-top: 24px;
}

.testimonios__reintentar {
  min-height: var(--m-tactil-min);
  padding: 0 22px;
  background: none;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  font: inherit;
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-tinta);
  cursor: pointer;
}

/* Mientras reintenta: cursor de espera (el movimiento ya lo quita `app.scss`). */
.testimonios__reintentar:disabled {
  cursor: progress;
}

.testimonios__dejar:focus-visible,
.testimonios__reintentar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/**
 * El cruce entre una destacada y la siguiente, como en la banda del inicio:
 * 0,25 s de ida y de vuelta, muy por debajo de los 8 s del turno.
 */
.testimonios__cruce-enter-active,
.testimonios__cruce-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.testimonios__cruce-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.testimonios__cruce-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .testimonios__cruce-enter-active,
  .testimonios__cruce-leave-active {
    transition: none;
  }
}

@media (max-width: 1099px) {
  .testimonios__banda {
    gap: 40px;
    padding: 44px var(--m-banda-margen);
  }

  .testimonios__muro {
    padding-left: var(--m-banda-margen);
    padding-right: var(--m-banda-margen);
  }

  .testimonios__rejilla {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 699px) {
  .testimonios__banda {
    flex-direction: column;
    gap: 0;
    min-height: 0;
    padding: 24px var(--m-banda-margen-movil) 22px;
  }

  .testimonios__destacada {
    flex: 0 0 auto;
  }

  .testimonios__etiqueta {
    margin-bottom: 14px;
    font-size: 10px;
  }

  .testimonios__cita-marco {
    display: block;
  }

  .testimonios__comillas {
    display: block;
    height: 30px;
    font-size: 60px;
    line-height: 0.6;
  }

  .testimonios__cita {
    font-size: 25px;
    line-height: 1.28;
    -webkit-line-clamp: 6;
  }

  .testimonios__autor {
    gap: 10px;
    margin-top: 14px;
    padding-top: 0;
  }

  .testimonios__nombre {
    font-size: 13px;
  }

  .testimonios__guion {
    display: none;
  }

  .testimonios__fecha {
    font-size: 11.5px;
  }

  .testimonios__vacio {
    font-size: 19px;
  }

  .testimonios__nota {
    flex-direction: row;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
    padding: 18px 0 0;
    border-left: 0;
    border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  }

  .testimonios__etiqueta--nota {
    display: none;
  }

  .testimonios__media-fila {
    flex: 0 0 auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .testimonios__media {
    font-size: 38px;
  }

  .testimonios__barras {
    flex: 1 1 auto;
    gap: 5px;
    font-size: 10.5px;
  }

  .testimonios__barra {
    gap: 8px;
  }

  .testimonios__barra-etiqueta {
    flex-basis: 22px;
  }

  .testimonios__barra-canal {
    height: 3px;
  }

  .testimonios__muro {
    padding: 18px var(--m-banda-margen-movil) var(--m-flotante-despeje);
  }

  .testimonios__muro-titulo {
    font-size: 10px;
  }

  .testimonios__rejilla {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding-top: 12px;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .testimonios__dejar:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }

  .testimonios__reintentar:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>
