<template>
  <article class="tarjeta-servicio" data-test="tarjeta">
    <img
      v-if="tieneFoto"
      class="tarjeta-servicio__foto"
      :src="foto"
      :srcset="fotoSrcset || undefined"
      :sizes="MEDIDAS"
      :alt="`Foto del servicio ${servicio.name}`"
      loading="lazy"
      decoding="async"
      @error="fotoRota = true"
    />
    <div v-else class="tarjeta-servicio__sin-foto" data-test="sin-foto">
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3 5h18v14H3z" />
        <path d="M3 16l5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="9.5" r="1.4" />
      </svg>
      <span class="tarjeta-servicio__sin-foto-rotulo">Sin foto</span>
    </div>

    <p
      v-if="enPromocion"
      class="tarjeta-servicio__promo"
      data-test="promo-pildora"
    >
      −{{ porcentaje }} %
    </p>

    <div
      v-if="$slots.acciones"
      class="tarjeta-servicio__acciones"
      data-test="acciones"
    >
      <slot name="acciones" />
    </div>

    <div
      class="tarjeta-servicio__velo"
      :class="{ 'tarjeta-servicio__velo--fijo': mostrarSiempre }"
      data-test="velo"
    >
      <p
        v-if="categoria"
        class="tarjeta-servicio__categoria"
        data-test="categoria"
      >
        {{ categoria }}
      </p>
      <h3 class="tarjeta-servicio__nombre" data-test="nombre">
        {{ servicio.name }}
      </h3>
      <p class="tarjeta-servicio__linea">
        <span class="tarjeta-servicio__precio" data-test="precio">
          ${{ precioEfectivo }}
        </span>
        <span
          v-if="enPromocion"
          class="tarjeta-servicio__precio-base"
          data-test="precio-base"
        >
          <!-- El tachado solo se ve: el lector de pantalla oye «antes». -->
          <span class="sr">antes</span>
          ${{ precioBase }}
        </span>
        <span class="tarjeta-servicio__detalle">Detalle</span>
      </p>
    </div>

    <button
      type="button"
      class="tarjeta-servicio__enlace"
      data-test="tarjeta-enlace"
      :aria-label="`Ver el detalle de ${servicio.name}`"
      @click="emit('detalle', servicio.id)"
    ></button>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type Service from 'src/interfaces/service';
import {
  buildCloudinarySrcset,
  optimizeCloudinaryUrl,
} from 'src/helpers/cloudinaryUrl';
import { formatCopDisplay } from 'src/helpers/price-display';
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';

defineOptions({ name: 'ServiceCard' });

/**
 * `mostrarSiempre` lo calcula el padre con `useCoarsePointer`: en una pantalla
 * táctil no hay `:hover`, así que el velo tiene que estar puesto desde el
 * principio o la lista se queda sin nombres (D5).
 */
const props = withDefaults(
  defineProps<{ servicio: Service; mostrarSiempre?: boolean }>(),
  { mostrarSiempre: false }
);

const emit = defineEmits<{ (e: 'detalle', id: string): void }>();

/**
 * La tarjeta mide 282 px en la rejilla de tres columnas: se piden 560 para que
 * una pantalla de 2× no vea una foto blanda, y el `srcset` deja que el navegador
 * elija. Jamás la URL cruda: son fotos de mil y pico píxeles (§6.5).
 */
const ANCHO = 560;
const ANCHOS_SRCSET = [282, 560, 846];
const MEDIDAS =
  '(max-width: 759px) calc(100vw - 40px), (max-width: 1239px) 46vw, 282px';

/** Una foto borrada en Cloudinary responde 404: mejor «Sin foto» que un hueco roto. */
const fotoRota = ref(false);

const urlOriginal = computed(() => urlDeFotoPrincipal(props.servicio));

// La rejilla reutiliza instancias al cambiar de página: si no se reinicia, una
// tarjeta que tuvo una foto rota se quedaría sin foto para el servicio siguiente.
watch(urlOriginal, () => {
  fotoRota.value = false;
});

const tieneFoto = computed(() => Boolean(urlOriginal.value) && !fotoRota.value);
const foto = computed(() => optimizeCloudinaryUrl(urlOriginal.value, ANCHO));
const fotoSrcset = computed(() =>
  buildCloudinarySrcset(urlOriginal.value, ANCHOS_SRCSET)
);

const categoria = computed(() => etiquetaDeCategoria(props.servicio));
const enPromocion = computed(() => serviceIsOnPromotion(props.servicio));
const porcentaje = computed(() => promotionPercentDisplay(props.servicio));

// La cuenta no se reimplementa: `effectiveServiceUnitPrice` es la misma que usa
// la bolsa, y es justo la cifra que la clienta acabará pagando.
const precioEfectivo = computed(() =>
  formatCopDisplay(effectiveServiceUnitPrice(props.servicio))
);
const precioBase = computed(() =>
  formatCopDisplay(Number(props.servicio.price ?? 0))
);
</script>

<style scoped lang="scss">
/**
 * Medidas del lienzo (tablero «Servicios · mostrador en tinta»): 252 px de alto,
 * filete de oro al 35 %, radio de 3 px y la foto a sangre. Nada de bloque de
 * texto debajo: la tarjeta **es** la foto.
 */
.tarjeta-servicio {
  position: relative;
  height: 252px;
  overflow: hidden;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
}

.tarjeta-servicio:hover,
.tarjeta-servicio:focus-within {
  border-color: var(--m-oro);
}

.tarjeta-servicio__foto {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/**
 * Sin foto no se sirve ninguna imagen (D-B2): un marcador gris claro sobre una
 * tarjeta oscura se lee como foto rota, y además sería una petición de red para
 * no decir nada.
 */
.tarjeta-servicio__sin-foto {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--m-piedra);
}

.tarjeta-servicio__sin-foto-rotulo {
  font-family: var(--m-font-sans);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
}

/** La rebaja se ve en reposo, fuera del velo: es la razón para detenerse. */
.tarjeta-servicio__promo {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 26px;
  margin: 0;
  padding: 0 11px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: 0.08em;
}

/** La rellena la fase E. Por encima del velo y del botón estirado. */
.tarjeta-servicio__acciones {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 4;
  display: flex;
  gap: 8px;
}

/**
 * El velo. `rgba(22, 19, 15, α)` son los canales de `--m-tinta`: un degradado
 * necesita alfa y `color-mix()` no llega a Safari 13.1 (NF06). Misma licencia
 * que las sombras de `AssistantPanel.vue`.
 */
.tarjeta-servicio__velo {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px 16px 15px;
  background: linear-gradient(
    to top,
    rgba(22, 19, 15, 0.94) 0%,
    rgba(22, 19, 15, 0.74) 44%,
    rgba(22, 19, 15, 0.1) 100%
  );
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}

.tarjeta-servicio:hover .tarjeta-servicio__velo,
.tarjeta-servicio:focus-within .tarjeta-servicio__velo,
.tarjeta-servicio__velo--fijo {
  opacity: 1;
}

/**
 * Red de seguridad: donde el puntero no puede posarse, el velo está puesto
 * aunque el JavaScript no haya arrancado (la página se prerenderiza con SSG).
 */
@media (hover: none) {
  .tarjeta-servicio__velo {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-servicio__velo {
    transition: none;
  }
}

.tarjeta-servicio__categoria {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra-clara);
}

.tarjeta-servicio__nombre {
  margin: 6px 0 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 19px;
  line-height: 1.2;
  color: var(--m-hueso);
  // Dos líneas como mucho: un nombre largo no puede empujar el precio fuera.
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.tarjeta-servicio__linea {
  display: flex;
  align-items: baseline;
  gap: 9px;
  margin: 12px 0 0;
}

.tarjeta-servicio__precio {
  font-family: var(--m-font-display);
  font-size: 18px;
  color: var(--m-oro);
  white-space: nowrap;
}

.tarjeta-servicio__precio-base {
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  color: var(--m-piedra-clara);
  text-decoration: line-through;
  white-space: nowrap;
}

.tarjeta-servicio__detalle {
  margin-left: auto;
  padding-bottom: 3px;
  border-bottom: var(--m-filete-grosor) solid var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  text-transform: uppercase;
  // El lienzo pide 0,18em; se usa el token de navegación (0,16em) para no
  // sembrar espaciados sueltos. La diferencia no se ve.
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-hueso);
  white-space: nowrap;
}

/**
 * El botón estirado (D-B1). No envuelve la tarjeta porque la ranura `acciones`
 * trae botones dentro, y un botón dentro de otro es marcado inválido. Área
 * táctil: la tarjeta entera, 252 px.
 */
.tarjeta-servicio__enlace {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.tarjeta-servicio__enlace:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: -4px;
}
</style>
