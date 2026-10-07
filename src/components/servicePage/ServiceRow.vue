<template>
  <article class="fila-servicio" data-test="fila">
    <!--
      El marco mide 104 px de ancho y se estira con el renglón; la foto va en
      absoluto dentro para que su proporción no decida el alto (ver el CSS).
    -->
    <div class="fila-servicio__marco" data-test="fila-marco">
      <!--
        El orden de los atributos importa: la imagen empieza a bajar en cuanto
        recibe `src`. `loading` primero para que WebKit aplace la descarga, y
        `src` el último (lo midió FotoResponsiva; lo vigila ServiceRow.spec).
      -->
      <img
        v-if="tieneFoto"
        class="fila-servicio__foto"
        loading="lazy"
        decoding="async"
        width="104"
        height="104"
        :srcset="fotoSrcset || undefined"
        sizes="104px"
        :alt="`Foto del servicio ${servicio.name}`"
        :src="foto"
        @error="fotoRota = true"
      />
      <div
        v-else
        class="fila-servicio__foto fila-servicio__sin-foto"
        data-test="fila-sin-foto"
      >
        <svg
          width="22"
          height="22"
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
        <span class="fila-servicio__sin-foto-rotulo">Sin foto</span>
      </div>
    </div>

    <div class="fila-servicio__texto">
      <div>
        <p
          v-if="categoria"
          class="fila-servicio__categoria"
          data-test="fila-categoria"
        >
          {{ categoria }}
        </p>
        <h3 class="fila-servicio__nombre" data-test="fila-nombre">
          {{ servicio.name }}
        </h3>
      </div>
      <p class="fila-servicio__linea">
        <span class="fila-servicio__precio" data-test="fila-precio">
          ${{ precioEfectivo }}
        </span>
        <span
          v-if="enPromocion"
          class="fila-servicio__precio-base"
          data-test="fila-precio-base"
        >
          <!-- El tachado solo se ve: el lector de pantalla oye «antes». -->
          <span class="sr">antes</span>
          ${{ precioBase }}
        </span>
        <span class="fila-servicio__detalle">Detalle</span>
      </p>
    </div>

    <div
      v-if="$slots.acciones"
      class="fila-servicio__acciones"
      data-test="acciones"
    >
      <slot name="acciones" />
    </div>

    <button
      type="button"
      class="fila-servicio__enlace"
      data-test="fila-enlace"
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
// `promotionPercentDisplay` no se importa a propósito: el renglón enseña la
// rebaja con el precio tachado y no con una píldora (no cabe sin apretar el
// nombre), así que aquí no hace falta el porcentaje.
import {
  effectiveServiceUnitPrice,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';

defineOptions({ name: 'ServiceRow' });

const props = defineProps<{ servicio: Service }>();

const emit = defineEmits<{ (e: 'detalle', id: string): void }>();

/** La foto se pinta a 104 px: 208 cubre la pantalla de 2× de cualquier teléfono. */
const ANCHO = 208;
const ANCHOS_SRCSET = [104, 208, 312];

const fotoRota = ref(false);
const urlOriginal = computed(() => urlDeFotoPrincipal(props.servicio));

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
const precioEfectivo = computed(() =>
  formatCopDisplay(effectiveServiceUnitPrice(props.servicio))
);
const precioBase = computed(() =>
  formatCopDisplay(Number(props.servicio.price ?? 0))
);
</script>

<style scoped lang="scss">
/** Medidas del lienzo (tablero «Servicios en móvil — mostrador en tinta»). */
.fila-servicio {
  position: relative;
  display: flex;
  overflow: hidden;
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
}

.fila-servicio:hover,
.fila-servicio:focus-within {
  border-color: var(--m-oro);
}

/**
 * El marco de la foto, a canto vivo: la esquina la recorta el radio del
 * renglón. Se estira con el renglón (`align-self: stretch`) porque con las
 * acciones de la dueña apiladas el renglón pasa de 104 px y una foto fija
 * dejaría un hueco debajo; nunca baja de 104.
 *
 * La foto va en absoluto dentro, y no como hija flexible con alto `auto`:
 * Cloudinary (`c_limit`) conserva la proporción, así que un retrato aportaba
 * su alto natural a la fila (2:3 → renglón de 158 px para todo el mundo, y los
 * renglones crecían a medida que cargaban las fotos). En absoluto no aporta
 * alto: lo decide el texto, o las acciones apiladas. Los cuatro lados a mano,
 * no `inset`, que Safari 13.1 y 14.0 descartan.
 */
.fila-servicio__marco {
  position: relative;
  flex: 0 0 auto;
  align-self: stretch;
  width: 104px;
  min-height: 104px;
}

.fila-servicio__foto {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fila-servicio__sin-foto {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--m-piedra);
}

.fila-servicio__sin-foto-rotulo {
  font-family: var(--m-font-sans);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
}

.fila-servicio__texto {
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 11px 14px;
}

.fila-servicio__categoria {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra-clara);
}

.fila-servicio__nombre {
  margin: 4px 0 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.25;
  color: var(--m-hueso);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.fila-servicio__linea {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 8px 0 0;
}

.fila-servicio__precio {
  font-family: var(--m-font-display);
  font-size: 16.5px;
  color: var(--m-oro);
  white-space: nowrap;
}

.fila-servicio__precio-base {
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  color: var(--m-piedra-clara);
  text-decoration: line-through;
  white-space: nowrap;
}

.fila-servicio__detalle {
  margin-left: auto;
  padding-bottom: 3px;
  border-bottom: var(--m-filete-grosor) solid var(--m-oro);
  font-family: var(--m-font-sans);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-hueso);
  white-space: nowrap;
}

/** La rellena la fase E, en versión compacta. Por encima del botón estirado. */
.fila-servicio__acciones {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 8px 8px 8px 0;
}

.fila-servicio__enlace {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.fila-servicio__enlace:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: -3px;
}
</style>
