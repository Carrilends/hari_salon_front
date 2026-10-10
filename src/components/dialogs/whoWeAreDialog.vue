<template>
  <q-dialog
    v-model="dialog"
    class="quienes-dialogo"
    :maximized="esMovil"
    :transition-show="esMovil ? 'slide-up' : 'scale'"
    :transition-hide="esMovil ? 'slide-down' : 'scale'"
    aria-label="¿Quiénes somos?"
  >
    <article
      class="quienes"
      :class="{ 'quienes--movil': esMovil }"
      data-test="quienes"
    >
      <header v-if="esMovil" class="quienes__barra" data-test="barra-movil">
        <h2 class="quienes__titulo quienes__titulo--barra">¿Quiénes somos?</h2>
        <button
          type="button"
          class="quienes__cerrar quienes__cerrar--barra m-boton-plano"
          aria-label="Cerrar"
          data-test="cerrar-quienes"
          @click="cerrar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div class="quienes__foto">
        <FotoResponsiva
          class="quienes__imagen"
          data-test="foto-salon"
          foto="/people/salon.jpg"
          alt="El salón de la Peluquería Marlene por dentro"
          :anchos="ANCHOS_FICHA"
          medidas="(max-width: 699px) 100vw, 900px"
        />
        <div class="quienes__placa" data-test="placa-direccion">
          <p class="quienes__placa-etiqueta">Dónde estamos</p>
          <p class="quienes__placa-direccion">
            {{ SALON_STREET }}<template v-if="esMovil"> · </template
            ><br v-else />{{ SALON_LOCALITY }}, {{ SALON_REGION }}
          </p>
        </div>
      </div>

      <div class="quienes__cuerpo">
        <p class="quienes__antetitulo">La peluquería</p>
        <h2 v-if="!esMovil" class="quienes__titulo">¿Quiénes somos?</h2>
        <p class="quienes__texto">
          Peluquería Marlene es un lugar donde te sentirás como en casa, con un
          ambiente agradable y un personal amable y profesional. Llevamos más de
          20 años en el sector de la belleza y la estética, ofreciendo servicios
          de calidad a precios accesibles.
        </p>

        <div class="quienes__mapa">
          <iframe
            class="quienes__mapa-marco"
            data-test="mapa"
            :src="MAPS_EMBED_URL"
            title="Ubicación de Peluquería Marlene"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          />
        </div>
        <div class="quienes__meta">
          <a
            class="quienes__atribucion"
            data-test="atribucion-mapa"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            >© OpenStreetMap contributors</a
          >
          <a
            class="quienes__abrir-mapa"
            data-test="abrir-mapa"
            :href="MAPS_EXTERNAL_URL"
            target="_blank"
            rel="noopener noreferrer"
            >Abrir en el mapa →</a
          >
        </div>
      </div>

      <button
        v-if="!esMovil"
        type="button"
        class="quienes__cerrar m-boton-plano"
        aria-label="Cerrar"
        data-test="cerrar-quienes"
        @click="cerrar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </article>
  </q-dialog>
</template>

<script setup lang="ts">
import FotoResponsiva from 'src/components/shared/FotoResponsiva.vue';
import { useDialog } from 'src/composables/dialogs/useDialogService';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { ANCHOS_FICHA } from 'src/constants/anchos-de-foto';
import {
  MAPS_EMBED_URL,
  MAPS_EXTERNAL_URL,
  SALON_LOCALITY,
  SALON_REGION,
  SALON_STREET,
} from 'src/constants/salon-location';

/**
 * «¿Quiénes somos?» (S2, tablero QuienesFicha). Lo abre el menú «Más» del
 * armazón con `v-model:dialog`; esa interfaz no cambia.
 *
 * El mapa sigue siendo el `iframe` de OpenStreetMap, con su atribución: la
 * licencia del mapa la exige y no hay clave de ningún proveedor que gestionar.
 */
const props = defineProps<{ dialog: boolean }>();
/* Inline y no `DialogEmits`: vue3-jest no resuelve tipos importados en
   `defineEmits` (sin opción `fs`). Es la misma firma que `DialogEmits`. */
const emit = defineEmits<{ (e: 'update:dialog', value: boolean): void }>();

const { dialog } = useDialog(props, emit);

/** Mismo corte que la cabecera: por debajo, a pantalla completa. */
const esMovil = useConsultaMedios('(max-width: 699px)', false);

function cerrar(): void {
  dialog.value = false;
}

defineOptions({
  name: 'WhoWeAreDialog',
});
</script>

<style scoped lang="scss">
/**
 * Tablero QuienesFicha: ficha nieve de 880 × 600, foto a la izquierda (380 px)
 * con la placa tinta de la dirección, y el cuerpo a la derecha.
 */
.quienes {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la ficha. */
  pointer-events: all;
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 880px;
  max-width: calc(100vw - 32px);
  height: 600px;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.quienes__foto {
  position: relative;
  flex: 0 0 43%;
  max-width: 380px;
  background: var(--m-carbon);
}

.quienes__imagen {
  display: block;
  width: 100%;
  height: 100%;
}

.quienes__imagen :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quienes__placa {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18px 24px 20px;
  background: var(--m-tinta);
}

.quienes__placa-etiqueta {
  margin: 0 0 6px;
  font-size: 10px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.quienes__placa-direccion {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 18px;
  line-height: 1.35;
  color: var(--m-hueso);
}

.quienes__cuerpo {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 44px 44px 32px;
  overflow-y: auto;
}

.quienes__antetitulo {
  margin: 0 0 10px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.quienes__titulo {
  margin: 0 0 16px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 34px;
  line-height: 1.1;
}

.quienes__texto {
  margin: 0 0 24px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--m-piedra);
}

.quienes__mapa {
  flex: 0 0 auto;
  height: 170px;
  overflow: hidden;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-hueso);
}

.quienes__mapa-marco {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.quienes__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
}

.quienes__atribucion {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  font-size: 11.5px;
  color: var(--m-piedra);
  text-decoration: none;
}

.quienes__abrir-mapa {
  display: inline-flex;
  align-items: flex-end;
  box-sizing: border-box;
  min-height: var(--m-tactil-min);
  padding-bottom: 2px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
  font-size: 13px;
  color: var(--m-rosa-profundo);
  text-decoration: none;
}

.quienes__cerrar {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--m-nieve);
  color: var(--m-tinta);
  cursor: pointer;
}

.quienes__cerrar:focus-visible,
.quienes__atribucion:focus-visible,
.quienes__abrir-mapa:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/* Móvil: pantalla completa, barra de título arriba y todo en una columna. */
.quienes--movil {
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: none;
  overflow-y: auto;
  border: 0;
  border-radius: 0;
}

.quienes__barra {
  position: sticky;
  top: 0;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--m-cabecera-alto-movil);
  padding: 0 8px 0 20px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
}

.quienes__titulo--barra {
  margin: 0;
  font-size: 19px;
}

.quienes__cerrar--barra {
  position: static;
  background: none;
}

.quienes--movil .quienes__foto {
  flex: 0 0 232px;
  max-width: none;
  height: 232px;
}

.quienes--movil .quienes__placa {
  padding: 12px 20px 14px;
}

.quienes--movil .quienes__placa-etiqueta {
  margin-bottom: 4px;
  font-size: 9.5px;
}

.quienes--movil .quienes__placa-direccion {
  font-size: 15.5px;
}

.quienes--movil .quienes__cuerpo {
  flex: 0 0 auto;
  padding: 22px 20px 24px;
  overflow: visible;
}

.quienes--movil .quienes__antetitulo {
  margin-bottom: 8px;
  font-size: 10px;
}

.quienes--movil .quienes__texto {
  margin-bottom: 20px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»). El oro claro no es texto sobre nieve.
 */
@media (hover: hover) and (pointer: fine) {
  .quienes__cerrar:hover {
    color: var(--m-oro-profundo);
  }

  .quienes__abrir-mapa:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }

  .quienes__atribucion:hover {
    color: var(--m-tinta);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog, cuyos nodos no llevan el
  atributo de ámbito. La clase `quienes-dialogo` viaja a la raíz del diálogo.
-->
<style lang="scss">
.quienes-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}
</style>
