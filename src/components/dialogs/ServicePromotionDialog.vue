<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <section
      class="promo"
      data-test="dialogo-promocion"
      role="document"
      aria-labelledby="promo-titulo"
    >
      <h2 id="promo-titulo" class="promo__titulo">{{ titulo }}</h2>

      <template v-if="esQuitar">
        <p class="promo__texto">
          ¿Deseas quitar la promoción de este servicio?
        </p>
        <p class="promo__servicio">{{ service.name }}</p>
      </template>

      <template v-else>
        <label class="promo__rotulo" for="promo-porcentaje">
          Porcentaje de descuento
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
          />
          <span class="promo__signo" aria-hidden="true">%</span>
        </div>
        <p id="promo-ayuda" class="promo__ayuda">
          <span v-if="valido" data-test="precio-resultante">
            Queda en ${{ precioResultante }}
          </span>
          <span v-else class="promo__error" data-test="error-porcentaje">
            Escribe un porcentaje entero entre 1 y 100
          </span>
        </p>
      </template>

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
          class="promo__boton promo__boton--oro"
          data-test="quitar"
          @click="quitar"
        >
          Quitar
        </button>
        <button
          v-else
          type="button"
          class="promo__boton promo__boton--oro"
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
import { formatCopDisplay } from 'src/helpers/price-display';
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
.promo {
  width: min(420px, calc(100vw - 32px));
  padding: 26px 24px 20px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.promo__titulo {
  margin: 0 0 14px;
  font-family: var(--m-font-display);
  font-size: 1.35rem;
  font-weight: 400;
  line-height: 1.2;
}

.promo__texto {
  margin: 0 0 6px;
  color: var(--m-piedra);
  font-size: 0.95rem;
}

.promo__servicio {
  margin: 0 0 18px;
  font-family: var(--m-font-display);
  font-size: 1.05rem;
}

.promo__rotulo {
  display: block;
  margin-bottom: 8px;
  color: var(--m-piedra);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
}

.promo__campo {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.promo__entrada {
  width: 7ch;
  min-height: var(--m-tactil-min);
  padding: 0 0 4px;
  border: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-oro);
  background: transparent;
  color: var(--m-oro-profundo);
  font-family: var(--m-font-display);
  font-size: 30px;
  line-height: 1.1;
}

.promo__entrada:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 3px;
}

.promo__signo {
  color: var(--m-oro-profundo);
  font-family: var(--m-font-display);
  font-size: 20px;
}

.promo__ayuda {
  min-height: 1.4em;
  margin: 10px 0 20px;
  font-size: 0.85rem;
  color: var(--m-piedra);
}

.promo__error {
  color: var(--m-rosa-profundo);
}

.promo__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.promo__boton {
  min-height: var(--m-tactil-min);
  padding: 0 18px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  cursor: pointer;
}

.promo__boton:hover {
  border-color: var(--m-filete);
}

.promo__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.promo__boton--oro {
  border-color: var(--m-oro);
  background: var(--m-oro);
  color: var(--m-tinta);
}

.promo__boton--oro:disabled {
  border-color: var(--m-filete);
  background: var(--m-filete);
  color: var(--m-piedra);
  cursor: not-allowed;
}
</style>
