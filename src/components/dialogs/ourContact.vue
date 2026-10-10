<template>
  <q-dialog
    v-model="dialog"
    class="horarios-dialogo"
    :position="esMovil ? 'bottom' : 'standard'"
    :transition-show="esMovil ? 'slide-up' : 'scale'"
    :transition-hide="esMovil ? 'slide-down' : 'scale'"
    aria-label="Horarios"
  >
    <section
      class="horarios"
      :class="{ 'horarios--hoja': esMovil }"
      data-test="horarios"
    >
      <span
        v-if="esMovil"
        class="horarios__tirador"
        data-test="tirador"
        aria-hidden="true"
      />

      <header class="horarios__cabecera">
        <div class="horarios__titulos">
          <p class="horarios__antetitulo">Horarios</p>
          <h2 class="horarios__titulo">Cuándo atendemos</h2>
        </div>
        <p class="horarios__estado">
          <span class="horarios__pildora" data-test="estado-salon">
            <span class="horarios__punto" aria-hidden="true" />
            {{ textoEstado }}
          </span>
        </p>
        <button
          type="button"
          class="horarios__cerrar m-boton-plano"
          aria-label="Cerrar"
          data-test="cerrar-horarios"
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

      <ul class="horarios__semana" data-test="semana">
        <li
          v-for="fila in filas"
          :key="fila.fecha"
          class="horarios__fila"
          :class="{ 'horarios__fila--hoy': fila.esHoy }"
          :aria-current="fila.esHoy ? 'date' : undefined"
          data-test="fila-dia"
        >
          <span class="horarios__dia">
            {{ fila.dia }}
            <span
              v-if="fila.esHoy"
              class="horarios__marca"
              data-test="marca-hoy"
              >Hoy</span
            >
            <span
              v-if="fila.esFestivo"
              class="horarios__marca horarios__marca--festivo"
              data-test="marca-festivo"
              >Festivo</span
            >
          </span>
          <span class="horarios__horas"
            >{{ fila.abre }} – {{ fila.cierra }}</span
          >
        </li>
      </ul>
      <p class="horarios__festivos" data-test="linea-festivos">
        Los festivos atendemos de {{ festivos.abre }} a {{ festivos.cierra }}.
      </p>

      <footer class="horarios__pie">
        <p class="horarios__direccion" data-test="direccion">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
            />
            <path d="M14.4 10a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0" />
          </svg>
          {{ SALON_STREET }}, {{ SALON_LOCALITY }}
        </p>
        <a
          class="horarios__whatsapp m-boton m-boton--ancho"
          data-test="whatsapp"
          :href="whatsappHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.6z"
            />
          </svg>
          Escríbenos por WhatsApp
        </a>
      </footer>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDialog } from 'src/composables/dialogs/useDialogService';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  getSalonNowParts,
  isColombianHolidayQDate,
} from 'src/helpers/businessHours';
import {
  estadoDelSalon,
  horarioDeFestivos,
  semanaDelSalon,
  textoEstadoSalon,
} from 'src/helpers/estado-salon';
import { SALON_LOCALITY, SALON_STREET } from 'src/constants/salon-location';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';

/**
 * El diálogo de Horarios (S3, tablero HorariosSemanaTinta). Lo abre el menú
 * «Más» del armazón con `v-model:dialog`; esa interfaz no cambia.
 *
 * El teléfono ya no se escribe: la regla del portal es el botón verde de
 * WhatsApp y nada más. El número sale de `whatsapp-phone` (un solo sitio).
 */
const props = defineProps<{ dialog: boolean }>();
/* Inline y no `DialogEmits`: vue3-jest no resuelve tipos importados en
   `defineEmits` (sin opción `fs`). Es la misma firma que `DialogEmits`. */
const emit = defineEmits<{ (e: 'update:dialog', value: boolean): void }>();

const { dialog } = useDialog(props, emit);

/** Mismo corte que la cabecera y el menú: por debajo, hoja inferior. */
const esMovil = useConsultaMedios('(max-width: 699px)', false);

/**
 * La hora se lee al ABRIR, no solo al montar: el armazón monta este diálogo una
 * vez por visita, y una pestaña abierta desde la mañana diría «Abierto ahora»
 * por la noche.
 */
const ahora = ref(getSalonNowParts());
watch(dialog, (abierto) => {
  if (abierto) ahora.value = getSalonNowParts();
});

const textoEstado = computed(() =>
  textoEstadoSalon(
    estadoDelSalon(ahora.value),
    isColombianHolidayQDate(ahora.value.qDate)
  )
);
const filas = computed(() => semanaDelSalon(ahora.value));
const festivos = horarioDeFestivos();
const whatsappHref = `https://wa.me/${WHATSAPP_PHONE}`;

function cerrar(): void {
  dialog.value = false;
}

defineOptions({
  name: 'ourContact',
});
</script>

<style scoped lang="scss">
/**
 * Tablero HorariosSemanaTinta: 760 px en tinta en escritorio; hoja inferior en
 * móvil. Pares medidos: píldora rosa sobre carbón 9,41:1; «Hoy» oro sobre
 * carbón 4,75:1; días piedra clara sobre tinta 10,39:1.
 */
.horarios {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa el diálogo. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 760px;
  max-width: calc(100vw - 32px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--m-tinta);
  color: var(--m-hueso);
  border-radius: var(--m-radio-tarjeta);
  font-family: var(--m-font-sans);
}

.horarios--hoja {
  width: 100%;
  max-width: 100%;
  max-height: 85vh;
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.horarios__tirador {
  flex: 0 0 auto;
  width: 40px;
  height: 4px;
  margin: 10px auto 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-piedra-clara);
}

.horarios__cabecera {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 28px 36px 18px;
}

.horarios__titulos {
  flex: 1 1 auto;
  min-width: 0;
}

.horarios__antetitulo {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.horarios__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 30px;
  line-height: 1.1;
  color: var(--m-hueso);
}

.horarios__estado {
  flex: 0 0 auto;
  align-self: center;
  margin: 0;
}

.horarios__pildora {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 14px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-carbon);
  font-size: 13px;
  color: var(--m-rosa);
}

.horarios__punto {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--m-rosa);
}

.horarios__cerrar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--m-hueso);
  cursor: pointer;
}

.horarios__semana {
  list-style: none;
  margin: 0;
  padding: 0 36px;
  font-size: 14.5px;
  font-variant-numeric: tabular-nums;
}

.horarios__fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 38px;
  padding: 0 12px;
  border-top: var(--m-filete-grosor) solid var(--m-carbon);
  color: var(--m-piedra-clara);
}

.horarios__fila:last-child {
  border-bottom: var(--m-filete-grosor) solid var(--m-carbon);
}

.horarios__fila--hoy {
  background: var(--m-carbon);
  font-weight: 500;
  color: var(--m-hueso);
}

.horarios__dia {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.horarios__marca {
  padding: 2px 8px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-pildora);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.horarios__marca--festivo {
  border-color: var(--m-filete-oscuro);
  color: var(--m-piedra-clara);
}

.horarios__horas {
  color: var(--m-hueso);
}

.horarios__festivos {
  margin: 10px 48px 0;
  font-size: 13px;
  color: var(--m-piedra-clara);
}

.horarios__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding: 16px 36px;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.horarios__direccion {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13.5px;
  color: var(--m-piedra-clara);
}

.horarios__whatsapp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 22px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-whatsapp);
  color: var(--m-whatsapp-texto);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  text-decoration: none;
}

.horarios__cerrar:focus-visible,
.horarios__whatsapp:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/* Móvil: la hoja del tablero. La píldora baja a su propia línea. */
.horarios--hoja .horarios__cabecera {
  flex-wrap: wrap;
  align-items: center;
  padding: 10px 12px 0 20px;
}

.horarios--hoja .horarios__antetitulo {
  margin-bottom: 4px;
  font-size: 10px;
}

.horarios--hoja .horarios__titulo {
  font-size: 22px;
}

.horarios--hoja .horarios__estado {
  order: 3;
  flex: 1 0 100%;
  margin: 2px 0 14px;
}

.horarios--hoja .horarios__pildora {
  min-height: 30px;
  padding: 0 12px;
  font-size: 12.5px;
}

.horarios--hoja .horarios__semana {
  padding: 0 20px;
}

.horarios--hoja .horarios__fila {
  min-height: var(--m-tactil-min);
  padding: 0 10px;
}

.horarios--hoja .horarios__festivos {
  margin: 10px 30px 0;
  font-size: 12.5px;
}

.horarios--hoja .horarios__pie {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 14px 20px 22px;
}

.horarios--hoja .horarios__direccion {
  font-size: 12.5px;
}

.horarios--hoja .horarios__whatsapp {
  min-height: 50px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .horarios__cerrar:hover {
    color: var(--m-oro);
  }

  .horarios__whatsapp:hover {
    background: var(--m-whatsapp-realce);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog, cuyos nodos no llevan el
  atributo de ámbito. La clase `horarios-dialogo` viaja a la raíz del diálogo,
  así que la regla no se escapa a otro.
-->
<style lang="scss">
.horarios-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

.horarios-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
