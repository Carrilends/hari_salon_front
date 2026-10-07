<template>
  <div
    class="campos"
    :class="{ 'campos--compacto': compacto }"
    data-test="campos"
  >
    <!-- GÉNERO ------------------------------------------------------------ -->
    <fieldset class="campos__grupo">
      <legend class="campos__etiqueta">Género</legend>
      <div class="campos__chips">
        <button
          v-for="genero in filterGenres"
          :key="genero.id"
          type="button"
          class="campos__chip"
          :class="{ 'campos__chip--activo': genero.selected }"
          :aria-pressed="genero.selected ? 'true' : 'false'"
          data-test="genero"
          @click="alternarGenero(genero.id)"
        >
          {{ genero.name }}
        </button>
      </div>
    </fieldset>

    <hr class="campos__filete" />

    <!-- CATEGORÍA --------------------------------------------------------- -->
    <fieldset class="campos__grupo" data-test="categoria">
      <legend class="campos__etiqueta">
        Categoría
        <span
          v-if="cuentaCategorias > 0"
          class="campos__cuenta"
          data-test="categoria-cuenta"
        >
          {{ cuentaCategorias }}
        </span>
      </legend>
      <services-box
        :initial-selected-ids="filtersStore.selectedServicesIDs"
        :is-edit-mode="true"
        variante="oscuro"
        section-title=""
        :contained-scroll="false"
        @selected-services="alCambiarCategoria"
      />
    </fieldset>

    <hr class="campos__filete" />

    <!-- PRECIO------------------------------------------------------------ -->
    <fieldset class="campos__grupo" data-test="precio">
      <legend class="campos__etiqueta">Precio</legend>
      <label class="campos__casilla">
        <input
          type="checkbox"
          class="campos__tick"
          data-test="precio-activo"
          :checked="includePriceRange"
          :disabled="includePromotionsOnly"
          @change="alternarPrecio"
        />
        <span>Filtrar por precio</span>
      </label>
      <div v-if="includePriceRange" class="campos__rango">
        <p class="campos__rango-valor" data-test="precio-valor">
          {{ etiquetaPrecio }}
        </p>
        <label class="campos__perilla">
          <span class="campos__perilla-rotulo">Desde</span>
          <input
            type="range"
            data-test="precio-min"
            :min="PRECIO_ESCALA_MIN"
            :max="PRECIO_ESCALA_MAX"
            step="1"
            :value="prices.min"
            @input="alMoverMinimo"
            @change="alSoltarPerilla"
          />
        </label>
        <label class="campos__perilla">
          <span class="campos__perilla-rotulo">Hasta</span>
          <input
            type="range"
            data-test="precio-max"
            :min="PRECIO_ESCALA_MIN"
            :max="PRECIO_ESCALA_MAX"
            step="1"
            :value="prices.max"
            @input="alMoverMaximo"
            @change="alSoltarPerilla"
          />
        </label>
      </div>
    </fieldset>

    <hr class="campos__filete" />

    <!-- SOLO PROMOCIONES -------------------------------------------------- -->
    <fieldset class="campos__grupo" data-test="solo-promos">
      <legend class="campos__etiqueta">Promociones</legend>
      <label class="campos__casilla">
        <input
          type="checkbox"
          class="campos__tick"
          data-test="promos-activo"
          :checked="includePromotionsOnly"
          :disabled="includePriceRange"
          @change="alternarPromos"
        />
        <span>Solo promociones</span>
      </label>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ServicesBox from 'src/components/shared/ServicesBox.vue';
import {
  useFilterService,
  type FilterService,
  type FiltersEmits,
} from 'src/composables/dialogs/useServiceFilter';
import {
  PRECIO_ESCALA_MAX,
  PRECIO_ESCALA_MIN,
  useFiltersStore,
} from 'src/stores/filters-store';
import { formatCopDisplay } from 'src/helpers/price-display';

defineOptions({ name: 'ServiceFilterFields' });

defineProps<{ compacto: boolean }>();

const emit = defineEmits<{
  (e: 'aplicar', filtro: FilterService): void;
  (e: 'cuenta', cantidad: number): void;
  (e: 'limpiar'): void;
}>();

const filtersStore = useFiltersStore();

/**
 * `useFilterService` habla el idioma del diálogo viejo (`update:amount` /
 * `update:services`); el carril y la hoja hablan el de §5 de la hoja de ruta
 * (`cuenta` / `aplicar`). Se traduce aquí en vez de renombrar un composable que
 * ya tiene pruebas y otro consumidor.
 */
const puente = ((evento: string, valor: unknown) => {
  if (evento === 'update:amount') emit('cuenta', valor as number);
  else if (evento === 'update:services') emit('aplicar', valor as FilterService);
}) as unknown as FiltersEmits;

const {
  includePriceRange,
  includePromotionsOnly,
  prices,
  filterGenres,
  cleanFilters,
  sendFilter,
} = useFilterService(puente);

const cuentaCategorias = computed(() => filtersStore.selectedServicesIDs.length);

/**
 * La escala del control está en miles; la etiqueta añade los tres ceros. Ver la
 * nota ### de `filters-store.ts`: el backend compara contra pesos.
 */
const MILES = 1000;
const etiquetaPrecio = computed(
  () =>
    `${formatCopDisplay(prices.value.min * MILES)} $ ― ` +
    `${formatCopDisplay(prices.value.max * MILES)} $`
);

/**
 * Los géneros se escriben en `filters-store`, que es el estado compartido del
 * filtro (§6.2): el carril y la hoja son dos instancias de este componente y no
 * pueden tener cada una su propia idea de lo que está elegido. `sendFilter` lee
 * del store, así que se puede llamar en el acto sin esperar al `watch`.
 */
function alternarGenero(id: string) {
  const activos = new Set(filtersStore.selectedGenres.map((g) => g.id));
  if (activos.has(id)) activos.delete(id);
  else activos.add(id);
  // `Array.from`, no `[...activos]`: ts-jest compila a ES5 sin `downlevelIteration`
  // y el spread de un `Set` sale vacío.
  filtersStore.setGenres(Array.from(activos));
  sendFilter();
}

/**
 * `ServicesBox` emite también al hidratarse (`hydrateFromIds` → `syncEmit`).
 * Comparar antes de escribir es lo que evita una búsqueda redundante en cada
 * montaje del carril: con `placeholderData: previousData` se vería como un
 * parpadeo de la lista entera.
 */
function alCambiarCategoria(ids: string[]) {
  if (filtersStore.selectedServicesIDs.join(',') === ids.join(',')) return;
  filtersStore.setSelectedServiceIds(ids);
  sendFilter();
}

/**
 * El apagado del otro interruptor se hace AQUÍ, a mano, aunque
 * `useFilterService` tenga un `watch` que hace lo mismo: el `watch` corre en el
 * siguiente ciclo y `sendFilter` se llama ahora, así que el cuerpo saldría con
 * los dos en `true`. El backend los trata como excluyentes (§6.8).
 */
function alternarPrecio(evento: Event) {
  const activo = (evento.target as HTMLInputElement).checked;
  includePriceRange.value = activo;
  if (activo) includePromotionsOnly.value = false;
  sendFilter();
}

function alternarPromos(evento: Event) {
  const activo = (evento.target as HTMLInputElement).checked;
  includePromotionsOnly.value = activo;
  if (activo) includePriceRange.value = false;
  sendFilter();
}

/**
 * Pinza en las dos perillas: son dos `input[type=range]` independientes y sin
 * esto el cuerpo saldría con `min > max`. El backend haría `BETWEEN` al revés y
 * no devolvería nada, sin decir por qué.
 */
function alMoverMinimo(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  prices.value.min = Math.min(Number(entrada.value), prices.value.max);
  // Si el valor encerrado no cambia, `:value` no se vuelve a pintar y la perilla
  // nativa se queda donde el dedo la dejó: se reescribe a mano.
  entrada.value = String(prices.value.min);
}

function alMoverMaximo(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  prices.value.max = Math.max(Number(entrada.value), prices.value.min);
  entrada.value = String(prices.value.max);
}

/**
 * `input` salta en cada paso del arrastre (hasta ~195 por pasada) y cada valor
 * es una consulta distinta: la etiqueta y el store siguen el arrastre, pero la
 * búsqueda sale solo con `change`, al soltar la perilla o confirmar con teclado.
 */
function alSoltarPerilla() {
  sendFilter();
}

function limpiar() {
  cleanFilters();
  emit('limpiar');
}

defineExpose({ limpiar, aplicar: sendFilter });
</script>

<style scoped lang="scss">
/**
 * Sobre tinta. El componente no pone fondo: lo pone el envoltorio (el carril o
 * la hoja), que son los que saben cuánto espacio hay.
 */
.campos {
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: var(--m-font-sans);
  color: var(--m-hueso);
}

.campos__grupo {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

/// Versalitas espaciadas: el rótulo de grupo del portal.
.campos__etiqueta {
  display: block;
  margin: 0 0 10px;
  padding: 0;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-etiqueta);
  color: var(--m-piedra-clara);
}

.campos__cuenta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-size: 10px;
  letter-spacing: 0;
}

/// Un filete de oro al 35 % entre grupos: separa sin gritar.
.campos__filete {
  height: 0;
  margin: 0;
  border: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.campos__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.campos__chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.campos__chip--activo {
  background: var(--m-oro);
  border-color: var(--m-oro);
  color: var(--m-tinta);
}

.campos__chip:focus-visible,
.campos__casilla input:focus-visible,
.campos__perilla input:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/// Casilla de 18 px con tick dorado, dibujado con un borde girado para no
/// meter un `data:` con un color dentro.
.campos__casilla {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--m-tactil-min);
  cursor: pointer;
  font-size: 14px;
}

.campos__tick {
  position: relative;
  appearance: none;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin: 0;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
}

.campos__tick:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 0;
  width: 6px;
  height: 10px;
  border: solid var(--m-oro);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.campos__tick:disabled {
  opacity: 0.45;
  cursor: default;
}

.campos__casilla:has(.campos__tick:disabled) {
  opacity: 0.55;
  cursor: default;
}

.campos__rango {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 6px;
}

.campos__rango-valor {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 15px;
  color: var(--m-oro);
}

.campos__perilla {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--m-tactil-min);
}

.campos__perilla-rotulo {
  flex: 0 0 44px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: var(--m-tracking-nav);
  color: var(--m-piedra-clara);
}

/// Perilla de 17 px (dentro de los 15–19 del diseño) en oro sobre canal tinta.
.campos__perilla input[type='range'] {
  appearance: none;
  flex: 1 1 auto;
  min-width: 0;
  height: 19px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}

.campos__perilla input[type='range']::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.campos__perilla input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 17px;
  height: 17px;
  margin-top: -8px;
  border: 0;
  border-radius: 50%;
  background: var(--m-oro);
}

.campos__perilla input[type='range']::-moz-range-track {
  height: 3px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.campos__perilla input[type='range']::-moz-range-thumb {
  width: 17px;
  height: 17px;
  border: 0;
  border-radius: 50%;
  background: var(--m-oro);
}

/// Dentro de la hoja de móvil todo respira más y los chips crecen al área
/// táctil mínima: ahí se toca con el pulgar, no con un ratón.
.campos--compacto {
  gap: 22px;
}

.campos--compacto .campos__chip {
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  font-size: 14px;
}

.campos--compacto .campos__etiqueta {
  font-size: 12px;
}
</style>
