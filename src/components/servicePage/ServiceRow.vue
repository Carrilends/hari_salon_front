<template>
  <article class="fila-servicio m-tarjeta-pulsable" data-test="fila">
    <!--
      El marco mide 104 px de ancho y se estira con el renglón; la foto va en
      absoluto dentro para que su proporción no decida el alto (ver el CSS).
    -->
    <div
      ref="marco"
      class="fila-servicio__marco"
      :class="{ 'm-foto-cargando': tieneFoto && cargando(foto) }"
      data-test="fila-marco"
    >
      <!--
        El orden de los atributos importa: la imagen empieza a bajar en cuanto
        recibe `src`. `loading` primero para que WebKit aplace la descarga, y
        `src` el último (lo midió FotoResponsiva; lo vigila ServiceRow.spec).
      -->
      <img
        v-if="tieneFoto"
        class="fila-servicio__foto m-foto-fundido"
        :class="{ 'm-foto-fundido--esperando': cargando(foto) }"
        loading="lazy"
        decoding="async"
        width="104"
        height="104"
        :srcset="fotoSrcset || undefined"
        sizes="104px"
        :alt="`Foto del servicio ${servicio.name}`"
        :src="foto"
        @load="alCargar"
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

      <!--
        La rebaja también se ve sobre la foto, como en la tarjeta (tablero
        AdminMostradorMovil): el tachado de abajo dice cuánto costaba; la
        píldora, cuánto se ahorra. Dentro del marco y por debajo del botón
        estirado, que es quien recibe el toque.
      -->
      <span
        v-if="enPromocion"
        class="fila-servicio__promo"
        data-test="fila-promo-pildora"
      >
        −{{ porcentaje }} %
      </span>
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
      class="fila-servicio__enlace m-boton-estirado"
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
// La píldora del porcentaje va sobre la foto (plan 9), donde no aprieta el
// nombre; el precio tachado sigue al lado del efectivo.
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';
import { useCargaImagen } from 'src/composables/shared/useCargaImagen';

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

const foto = computed(() => optimizeCloudinaryUrl(urlOriginal.value, ANCHO));
const fotoSrcset = computed(() =>
  buildCloudinarySrcset(urlOriginal.value, ANCHOS_SRCSET)
);

/** El marco brilla hasta que la foto llega (ver `useCargaImagen`). */
const marco = ref<HTMLElement | null>(null);
const { cargando, fallida, alCargar } = useCargaImagen(marco, () => [
  foto.value,
]);

/**
 * Sin URL, con un `error` ya oído (`fotoRota`) o con una foto que había fallado
 * antes de montar (`fallida`, del repaso de `useCargaImagen`): «Sin foto».
 */
const tieneFoto = computed(
  () =>
    Boolean(urlOriginal.value) && !fotoRota.value && !fallida(foto.value)
);

const categoria = computed(() => etiquetaDeCategoria(props.servicio));
const enPromocion = computed(() => serviceIsOnPromotion(props.servicio));
const precioEfectivo = computed(() =>
  formatCopDisplay(effectiveServiceUnitPrice(props.servicio))
);
const precioBase = computed(() =>
  formatCopDisplay(Number(props.servicio.price ?? 0))
);
const porcentaje = computed(() => promotionPercentDisplay(props.servicio));
</script>

<style scoped lang="scss">
/**
 * Medidas del lienzo (tablero «Servicios en móvil — mostrador en tinta»).
 * Colores de la paleta A (2026-10-11): renglón nieve con filete claro sobre la
 * lista en hueso, foto en marco arena, nombre en tinta y precio en oro
 * profundo (el oro claro da 3,2:1 sobre nieve y no es color de texto).
 */
.fila-servicio {
  position: relative;
  display: flex;
  // La franja de la dueña (plan 9) va en su propia línea, bajo foto y texto.
  flex-wrap: wrap;
  overflow: hidden;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
}

.fila-servicio:hover,
.fila-servicio:focus-within {
  border-color: var(--m-oro);
}

/**
 * El marco de la foto, a canto vivo: la esquina la recorta el radio del
 * renglón. Se estira con su línea (`align-self: stretch`) porque un nombre de
 * dos líneas puede pasar de 104 px y una foto fija dejaría un hueco debajo;
 * nunca baja de 104. La franja de la dueña va en otra línea y no lo estira.
 *
 * La foto va en absoluto dentro, y no como hija flexible con alto `auto`:
 * Cloudinary (`c_limit`) conserva la proporción, así que un retrato aportaba
 * su alto natural a la fila (2:3 → renglón de 158 px para todo el mundo, y los
 * renglones crecían a medida que cargaban las fotos). En absoluto no aporta
 * alto: lo decide el texto, o la franja de acciones. Los cuatro lados a mano,
 * no `inset`, que Safari 13.1 y 14.0 descartan.
 *
 * La foto se ve entera (`contain`), centrada; lo que sobra del marco es arena,
 * y el brillo de carga corre de arena a nieve.
 */
.fila-servicio__marco {
  --m-foto-fondo: var(--m-foto-marco-claro);
  --m-foto-brillo: var(--m-nieve);
  position: relative;
  flex: 0 0 auto;
  align-self: stretch;
  width: 104px;
  min-height: 104px;
  background: var(--m-foto-marco-claro);
}

.fila-servicio__foto {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

/*
 * El hueco sin foto es el propio marco arena, que ya se distingue del nieve
 * del renglón. Icono y rótulo en piedra: 4,8:1 sobre arena.
 */
.fila-servicio__sin-foto {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--m-foto-marco-claro);
  color: var(--m-piedra);
}

.fila-servicio__sin-foto-rotulo {
  font-family: var(--m-font-sans);
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra);
}

/* La rebaja sobre la foto: tinta sobre oro, 5,8:1 (la misma de la tarjeta). */
.fila-servicio__promo {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 11px;
  white-space: nowrap;
}

.fila-servicio__texto {
  box-sizing: border-box;
  // Base 0: con `auto` un nombre largo pediría su ancho natural y, con
  // `flex-wrap`, saltaría a otra línea en vez de partirse.
  flex: 1 1 0;
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
  color: var(--m-piedra);
}

.fila-servicio__nombre {
  margin: 4px 0 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 16px;
  line-height: 1.25;
  color: var(--m-tinta);
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
  color: var(--m-oro-profundo);
  white-space: nowrap;
}

.fila-servicio__precio-base {
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  color: var(--m-piedra);
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
  color: var(--m-tinta);
  white-space: nowrap;
}

/**
 * La franja de la dueña (plan 9, V2; la pinta `ServiceCardAdminActions` en
 * versión compacta): su propia línea, a todo el ancho, bajo la foto y el
 * texto. Por encima del botón estirado, que si no se comería sus toques.
 */
.fila-servicio__acciones {
  position: relative;
  z-index: 2;
  flex: 0 0 100%;
  min-width: 0;
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
  outline: 2px solid var(--m-tinta);
  outline-offset: -3px;
}
</style>
