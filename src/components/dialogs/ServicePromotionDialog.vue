<template>
  <q-dialog
    ref="dialogRef"
    class="promo-dialogo"
    persistent
    :position="esHoja ? 'bottom' : 'standard'"
    :transition-show="esHoja ? 'slide-up' : 'scale'"
    :transition-hide="esHoja ? 'slide-down' : 'scale'"
    @hide="onDialogHide"
  >
    <section
      class="promo"
      :class="{ 'promo--hoja': esHoja }"
      data-test="dialogo-promocion"
      role="document"
      aria-labelledby="promo-titulo"
    >
      <span
        v-if="esHoja"
        class="promo__tirador"
        data-test="promo-tirador"
        aria-hidden="true"
      />

      <div class="promo__cuerpo">
        <h2 id="promo-titulo" class="promo__titulo">{{ titulo }}</h2>

        <!--
          De qué servicio se habla, con su precio de lista: es el que vuelve si
          se quita la promoción y el que se tacha junto al resultante.
        -->
        <div class="promo__ficha" data-test="promo-servicio">
          <img
            class="promo__foto"
            :src="foto"
            alt=""
            width="46"
            height="46"
            decoding="async"
            @error="fotoRota = true"
          />
          <span class="promo__ficha-texto">
            <span class="promo__ficha-nombre">{{ service.name }}</span>
            <span class="promo__ficha-linea">{{ lineaServicio }}</span>
          </span>
        </div>

        <p v-if="esQuitar" class="promo__texto">
          ¿Deseas quitar la promoción de este servicio?
        </p>

        <template v-else>
          <label class="promo__rotulo" for="promo-porcentaje">
            Descuento (1–100)
          </label>
          <div class="promo__campo">
            <input
              id="promo-porcentaje"
              ref="campoRef"
              :value="porcentaje"
              class="promo__entrada"
              data-test="porcentaje"
              type="number"
              inputmode="numeric"
              min="1"
              max="100"
              step="1"
              :aria-invalid="valido ? 'false' : 'true'"
              aria-describedby="promo-ayuda"
              @input="alEscribir"
              @keydown.enter.prevent="aplicar"
            />
            <span class="promo__signo" aria-hidden="true">%</span>
          </div>
          <p id="promo-ayuda" class="promo__ayuda">
            <span
              v-if="valido"
              class="promo__resultado"
              data-test="precio-resultante"
            >
              Queda en
              <span class="promo__precio">${{ precioResultante }}</span>
              <!-- El tachado solo se ve: el lector de pantalla oye «antes». -->
              <span
                v-if="hayPrecioBase"
                class="promo__precio-base"
                data-test="promo-precio-base"
              >
                <span class="sr">antes</span>
                ${{ precioBase }}
              </span>
            </span>
            <span v-else class="promo__error" data-test="error-porcentaje">
              Escribe un porcentaje entero entre 1 y 100
            </span>
          </p>
        </template>
      </div>

      <div class="promo__acciones">
        <button
          type="button"
          class="promo__boton"
          data-test="cancelar"
          @click="onDialogCancel"
        >
          Cancelar
        </button>
        <button
          v-if="esQuitar"
          type="button"
          class="promo__boton promo__boton--oro m-boton--ancho"
          data-test="quitar"
          @click="quitar"
        >
          Quitar
        </button>
        <button
          v-else
          type="button"
          class="promo__boton promo__boton--oro m-boton--ancho"
          data-test="aplicar"
          :disabled="!valido"
          @click="aplicar"
        >
          Aplicar
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { PLACEHOLDER_IMAGE } from 'src/constants/placeholder-image';
import { optimizeCloudinaryUrl } from 'src/helpers/cloudinaryUrl';
import { formatCopDisplay } from 'src/helpers/price-display';
import { etiquetaDeCategoria } from 'src/helpers/service-category';
import { urlDeFotoPrincipal } from 'src/helpers/service-photo';
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';
import type Service from 'src/interfaces/service';

/**
 * La promoción de un servicio, en un diálogo propio.
 *
 * Sustituye al `$q.dialog({ prompt })` de Quasar, que salía con sus colores y
 * no sabía decir en qué precio queda el servicio. La variante la elige el
 * propio diálogo con `serviceIsOnPromotion`: si hay promoción, pregunta si se
 * quita; si no, pide el porcentaje.
 *
 * Se abre con el plugin de diálogos, así que el único canal de vuelta es
 * `.onOk(payload)`: **un cero significa «quitar»**. El emit `'quitar'` existe
 * por el contrato de la hoja de ruta y para quien lo monte declarativamente.
 */
const props = defineProps<{ service: Service }>();

const emit = defineEmits([...useDialogPluginComponent.emits, 'quitar']);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

/**
 * Plan 9, V2: por debajo de 700 px —el corte de la barra fija y de la hoja del
 * menú— la promoción sube como hoja inferior. El diálogo solo se abre en el
 * cliente (lo pide el plugin de diálogos), y `useDialogMaximizedBelow` lee el
 * ancho tras su guarda de `window`: sin choque con el SSG.
 */
const { maximized: esHoja } = useDialogMaximizedBelow(700);

const esQuitar = computed(() => serviceIsOnPromotion(props.service));

const titulo = computed(() =>
  esQuitar.value ? 'Quitar promoción' : 'Activar promoción'
);

/** El mismo valor de partida que ofrecía el `prompt`: lo que ya tenía, o 10. */
const inicial = Math.min(
  100,
  Math.max(1, promotionPercentDisplay(props.service) || 10)
);
const porcentaje = ref(String(inicial));
const campoRef = ref<HTMLInputElement | null>(null);

/**
 * Se lee la cadena CRUDA del evento, no un `v-model`: Vue lo convertiría en
 * número y `1e2` pasaría por 100 en vez de rechazarse.
 */
function alEscribir(evento: Event) {
  porcentaje.value = (evento.target as HTMLInputElement).value;
}

/**
 * Entero de uno a tres cifras y nada más: `type="number"` acepta `1e2` y
 * `0.5`, y el backend guarda un entero.
 */
const porcentajeNumero = computed(() => {
  const escrito = porcentaje.value.trim();
  return /^\d{1,3}$/.test(escrito) ? Number(escrito) : null;
});

const valido = computed(
  () =>
    porcentajeNumero.value !== null &&
    porcentajeNumero.value >= 1 &&
    porcentajeNumero.value <= 100
);

/**
 * La misma cuenta que cobra la bolsa (`book-store`): si aquí se calculara de
 * otra manera, la dueña vería un precio y la clienta otro.
 */
const precioResultante = computed(() =>
  formatCopDisplay(
    effectiveServiceUnitPrice({
      ...props.service,
      havePromotion: true,
      porcentageDiscount: porcentajeNumero.value ?? 0,
    })
  )
);

/** El precio de lista. `price` llega como cadena desde Postgres (`numeric`). */
const precioBase = computed(() =>
  formatCopDisplay(Number(props.service.price || 0))
);

/** Sin precio de lista no hay nada que enseñar ni que tachar: ni «$0». */
const hayPrecioBase = computed(() => Number(props.service.price) > 0);

/** «Cortes de dama · $38.000»; sin categoría, solo el precio. */
const lineaServicio = computed(() =>
  [
    etiquetaDeCategoria(props.service),
    hayPrecioBase.value ? `$${precioBase.value}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
);

/** La miniatura mide 46 px: 92 cubre las pantallas densas. */
const ANCHO_FOTO = 92;
const fotoRota = ref(false);

const foto = computed(() => {
  if (fotoRota.value) return PLACEHOLDER_IMAGE;
  return (
    optimizeCloudinaryUrl(urlDeFotoPrincipal(props.service), ANCHO_FOTO) ||
    PLACEHOLDER_IMAGE
  );
});

function aplicar() {
  if (!valido.value) return;
  onDialogOK(porcentajeNumero.value);
}

function quitar() {
  emit('quitar');
  onDialogOK(0);
}

onMounted(() => {
  if (!esQuitar.value) campoRef.value?.focus();
});

defineOptions({ name: 'ServicePromotionDialog' });
</script>

<style lang="scss" scoped>
/**
 * Carbón con filete oro: así la dibujan los dos tableros (AdminMostradorMovil,
 * la hoja; AdminDialogosCortos, el diálogo de escritorio). Sobre carbón el
 * texto principal es hueso (13,5:1) y el secundario piedra clara (8,5:1).
 */
.promo {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  box-sizing: border-box;
  width: min(500px, calc(100vw - 32px));
  /* No `hidden`: Quasar da a este `<div>` `overflow: auto` y un alto máximo;
     con `hidden` el contenido se recorta en pantallas bajas y «Aplicar» queda
     fuera de alcance. `auto` también recorta a la esquina redondeada. */
  overflow-y: auto;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-panel);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

/* La hoja de móvil: de borde a borde, filete solo arriba, esquinas del panel
   (el tablero dibuja 16 px, que no es ningún token). */
.promo--hoja {
  width: 100%;
  max-width: 100%;
  border-width: var(--m-filete-grosor) 0 0;
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* El asa de la hoja: no es color de texto. */
.promo__tirador {
  display: block;
  width: 40px;
  height: 4px;
  margin: 10px auto 4px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-piedra);
}

.promo__cuerpo {
  padding: 22px 26px 0;
}

.promo--hoja .promo__cuerpo {
  padding: 10px 22px 0;
}

.promo__titulo {
  margin: 0 0 10px;
  font-family: var(--m-font-display);
  font-size: 21px;
  font-weight: 400;
  line-height: 1.2;
}

.promo__ficha {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 10px 12px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-tinta);
}

.promo__foto {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  object-fit: contain;
  border-radius: var(--m-radio-foto);
  background: var(--m-carbon);
}

.promo__ficha-texto {
  min-width: 0;
}

.promo__ficha-nombre {
  display: block;
  font-family: var(--m-font-display);
  font-size: 16px;
  overflow-wrap: anywhere;
}

.promo__ficha-linea {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-piedra-clara);
}

.promo__texto {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra-clara);
}

.promo__rotulo {
  display: block;
  margin-bottom: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra-clara);
}

.promo__campo {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: var(--m-filete-grosor) solid var(--m-oro);
}

/* Cifra grande en oro sobre carbón: 4,8:1, y a 32 px es texto grande (≥ 3:1). */
.promo__entrada {
  width: 100px;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--m-oro);
  font-family: var(--m-font-display);
  font-size: 32px;
  line-height: 1.1;
}

.promo__entrada:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 3px;
}

.promo__signo {
  color: var(--m-oro);
  font-family: var(--m-font-display);
  font-size: 22px;
}

.promo__ayuda {
  min-height: 1.6em;
  margin: 16px 0 0;
  font-size: 13.5px;
  color: var(--m-piedra-clara);
}

.promo__resultado {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}

.promo__precio {
  font-family: var(--m-font-display);
  font-size: 21px;
  color: var(--m-hueso);
}

.promo__precio-base {
  text-decoration: line-through;
}

/* El rosa profundo de los fondos claros aquí daría 2,1:1. */
.promo__error {
  color: var(--m-peligro-sobre-tinta);
}

.promo__acciones {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 14px 16px 18px;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.promo--hoja .promo__acciones {
  padding-bottom: 22px;
}

.promo__boton {
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-piedra-clara);
  font-family: var(--m-font-sans);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.promo__boton:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/* Tinta sobre oro, 5,8:1. En escritorio se arrima a la derecha; en la hoja,
   a lo ancho de lo que deja «Cancelar». */
.promo__boton--oro {
  margin-left: auto;
  padding: 0 28px;
  border-color: var(--m-oro);
  background: var(--m-oro);
  color: var(--m-tinta);
}

.promo--hoja .promo__boton--oro {
  flex: 1 1 auto;
}

.promo__boton--oro:disabled {
  border-color: var(--m-filete-oscuro);
  background: transparent;
  color: var(--m-piedra-clara);
  cursor: not-allowed;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .promo__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .promo__boton--oro:hover:not(:disabled) {
    border-color: var(--m-oro-claro);
    background: var(--m-oro-claro);
  }
}
</style>

<style lang="scss">
/**
 * Fuera de `scoped` a propósito: el velo y el relleno de la hoja los pinta
 * QDialog, cuyos nodos no llevan el atributo de ámbito de este componente. La
 * clase `promo-dialogo` viaja al div raíz del diálogo (QDialog mete
 * `attrs.class` en sus clases raíz): estas reglas no se escapan a otro.
 */
.promo-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

/* Quasar solo quita el relleno lateral de las hojas inferiores por debajo de
   600 px; esta sale hasta 699 y va de borde a borde (como la hoja del menú). */
.promo-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
