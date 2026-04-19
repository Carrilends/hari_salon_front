<template>
  <div class="q-pa-md q-gutter-sm">
    <q-dialog
      v-model="dialog"
      :position="maximized ? 'standard' : 'right'"
      :full-height="!maximized"
      :maximized="maximized"
      :transition-show="maximized ? 'slide-up' : 'slide-left'"
      :transition-hide="maximized ? 'slide-down' : 'slide-right'"
    >
      <q-card
        class="column full-height filter-dialog-card"
        :class="{ 'filter-dialog-card--maximized': maximized }"
      >
        <q-card-section
          class="col q-pa-none filter-dialog-card__body"
          :class="{ 'filter-dialog-card__body--maximized': maximized }"
        >
          <div
            class="row filter-dialog__inner"
            :class="[
              maximized ? 'q-pt-md q-pb-md q-px-sm' : 'q-pa-md',
              { 'filter-dialog__inner--maximized': maximized },
            ]"
          >
            <div
              class="col-12 q-my-md badge-container row items-center no-wrap flex-shrink-0"
            >
              <!-- Botón a la izquierda -->
              <q-btn
                icon="arrow_back"
                round
                outline
                color="blue"
                @click="hide"
                class="q-mr-sm glass"
              />

              <!-- Título -->
              <div
                class="title-text"
                :class="{ 'title-text--maximized': maximized }"
              >
                Busqueda de servicios
                <div v-if="amountOfFilters > 0" class="badge">
                  {{ amountOfFilters }}
                </div>
              </div>
              <q-btn
                icon="cleaning_services"
                round
                color="blue"
                @click="cleanFilters"
                class="q-ml-sm"
              />
            </div>
            <!-- GÉNEROS (mismo patrón que serviceCreateEdit) -->
            <div
              class="col-12 q-py-md filter-dialog__genres flex-shrink-0"
              :style="{ minWidth: maximized ? '0' : '250px' }"
            >
              <div
                class="q-pb-md text-grey-7"
                style="font-size: medium"
                :class="maximized ? 'text-left' : 'text-center'"
              >
                Género(s):
              </div>
              <div
                class="row q-gutter-sm"
                :class="maximized ? 'justify-start' : 'justify-center'"
              >
                <q-chip
                  v-for="genre in filterGenres"
                  v-model:selected="genre.selected"
                  :key="genre.id"
                  :icon="genreIcon(genre)"
                  :color="genre.selected ? 'indigo-4' : 'indigo-2'"
                  clickable
                >
                  {{ genre.name }}
                </q-chip>
              </div>
            </div>
            <!-- Servicios (ServicesBox: mismo árbol que crear/editar) -->
            <services-box
              v-if="dialog"
              :initial-selected-ids="filtersStore.selectedServicesIDs"
              is-edit-mode
              :contained-scroll="maximized"
              section-title="Listado de servicios:"
              @selected-services="filtersStore.setSelectedServiceIds"
            />
          </div>
        </q-card-section>
        <q-separator :inset="!maximized" />
        <q-card-section
          class="row items-center"
          :class="maximized ? 'q-px-sm' : ''"
        >
          <div
            class="col-12 q-py-md"
            :class="maximized ? 'q-px-sm' : 'q-px-md'"
          >
            <div v-if="!maximized" class="row items-center q-gutter-sm">
              <q-btn
                no-caps
                icon="payments"
                :color="includePriceRange ? 'green-7' : 'blue-grey-3'"
                :text-color="includePriceRange ? 'white' : 'blue-grey-9'"
                :outline="!includePriceRange"
                :disable="includePromotionsOnly"
                @click="includePriceRange = !includePriceRange"
              >
                Incluir rango de precios
              </q-btn>
              <q-btn
                no-caps
                icon="percent"
                :color="includePromotionsOnly ? 'deep-orange-6' : 'blue-grey-3'"
                :text-color="includePromotionsOnly ? 'white' : 'blue-grey-9'"
                :outline="!includePromotionsOnly"
                :disable="includePriceRange"
                @click="includePromotionsOnly = !includePromotionsOnly"
              >
                Promos
              </q-btn>
            </div>
            <div
              v-else
              class="row items-center justify-between filter-dialog__mobile-actions"
            >
              <q-item
                tag="label"
                v-ripple
                class="filter-dialog__mobile-price-toggle"
                :class="{
                  'filter-dialog__mobile-price-toggle--active': includePriceRange,
                  'filter-dialog__mobile-price-toggle--disabled':
                    includePromotionsOnly,
                }"
              >
                <q-checkbox
                  v-model="includePriceRange"
                  color="green"
                  :disable="includePromotionsOnly"
                />
                <q-item-section>
                  <q-item-label class="q-pl-sm" style="font-size: 16px">
                    Incluir rango de precios
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-btn
                round
                unelevated
                icon="percent"
                size="16px"
                class="filter-dialog__promo-round-btn"
                :class="{
                  'filter-dialog__promo-round-btn--active': includePromotionsOnly,
                }"
                :disable="includePriceRange"
                @click="includePromotionsOnly = !includePromotionsOnly"
              />
            </div>
            <div
              v-if="includePriceRange"
              class="q-pt-md q-pb-sm"
              style="font-size: 16px; font-weight: bold"
            >
              <q-icon name="attach_money" color="green" size="25px" />
              Precios: {{ prices.min }}.000 $ ― {{ prices.max }}.000 $
            </div>
            <div style="padding-top: 35px">
              <q-range
                v-if="includePriceRange"
                v-model="prices"
                :min="5"
                :max="200"
                :step="1"
                :left-label-value="prices.min + '.000'"
                :right-label-value="prices.max + '.000'"
                :disable="!includePriceRange"
                color="red"
                track-size="8px"
                thumb-size="30px"
                label-always
              />
            </div>
          </div>
        </q-card-section>
        <q-card-section
          class="filter-dialog-card__footer"
          :class="
            maximized
              ? 'row items-center q-px-sm'
              : 'flex justify-center items-center'
          "
          style="min-height: 120px"
        >
          <q-btn
            label="Aplicar filtro"
            color="blue"
            @click="sendFilter"
            :disabled="!amountOfFilters"
            :class="{ 'full-width': maximized }"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- The display value -->
    <!-- Customizing menu options -->
  </div>
</template>
<script setup lang="ts">
import {
  FiltersEmits,
  useFilterService,
} from 'src/composables/dialogs/useServiceFilter';
import {
  useDialog,
  type DialogEmits,
} from 'src/composables/dialogs/useDialogService';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import { useFiltersStore } from 'src/stores/filters-store';
import ServicesBox from 'src/components/shared/ServicesBox.vue';
import type { FilterGenreChip } from 'src/composables/dialogs/useServiceFilter';

const filtersStore = useFiltersStore();

const genreIcon = (g: FilterGenreChip) => g.icon ?? 'face';

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();

const {
  includePriceRange,
  includePromotionsOnly,
  prices,
  filterGenres,
  amountOfFilters,
  cleanFilters,
  sendFilter,
} = useFilterService(emit);

const { dialog, hide } = useDialog(props, emit);
const { maximized } = useDialogMaximizedBelow();
</script>

<style lang="scss" scoped>
.filter-dialog-card {
  width: 500px;
}

.filter-dialog-card__body {
  overflow-y: auto;
}

.filter-dialog-card--maximized {
  width: 100%;
  max-width: 100%;
  min-height: 100%;
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;

  .filter-dialog-card__body--maximized {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .filter-dialog-card__footer {
    flex-shrink: 0;
  }
}

.filter-dialog__inner--maximized.row {
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.title {
  padding: 6px 0;
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  border-radius: 10px;
  font-family: Georgia, 'Times New Roman', Times, serif;
  background: linear-gradient(90deg, #f8bbd0 0%, #bdc9d7 90%);
}
.badge-container {
  position: relative;
  display: flex;
  align-items: center;
}

.title-text {
  position: relative;
  font-size: 22px;
  font-weight: bold;
  font-family: Georgia, 'Times New Roman', Times, serif;
  background: linear-gradient(90deg, #f8bbd0 0%, #bdc9d7 90%);
  padding: 10px 16px;
  border-radius: 10px;
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
}

.title-text--maximized {
  text-align: left;
  padding-left: 12px;
  padding-right: 36px;
}

.badge {
  position: absolute;
  top: -12px;
  right: -12px;
  background-color: #e53935; // rojo más fuerte
  color: white;
  font-weight: bold;
  border-radius: 50%;
  padding: 6px 10px;
  font-size: 16px;
  min-width: 28px;
  min-height: 28px;
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  z-index: 10;
}

.filter-dialog__mobile-actions {
  gap: 12px;
}

.filter-dialog__mobile-price-toggle {
  flex: 1 1 auto;
  border-radius: 12px;
  background-color: #e3dae6;
  transition: background-color 0.2s ease;
}

.filter-dialog__mobile-price-toggle--active {
  background-color: #ccebd1;
}

.filter-dialog__mobile-price-toggle--disabled {
  opacity: 0.6;
}

.filter-dialog__promo-round-btn {
  width: 46px;
  height: 46px;
  color: #4f5d75;
  background: #e3dae6;
  border: 1px solid #c6bdd5;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.filter-dialog__promo-round-btn--active {
  color: #ffffff;
  background: linear-gradient(145deg, #ff7043, #ef5350);
  border-color: #ef5350;
  box-shadow: 0 8px 16px rgba(239, 83, 80, 0.3);
}

.filter-dialog__promo-round-btn:not(:disabled):hover {
  transform: translateY(-1px);
}
</style>
