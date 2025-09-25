<template>
  <div class="q-pa-md q-gutter-sm">
    <q-dialog v-model="dialog" position="right" full-height>
      <q-card class="column full-height" style="width: 500px">
        <q-card-section class="col q-pa-none" style="overflow-y: auto">
          <div class="col-row items-center q-pa-md">
            <div class="col-12 q-my-md badge-container row items-center">
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
              <div class="title-text">
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
            <!-- GENEROS -->
            <div class="col-12 q-py-md" style="min-width: 250px">
              <q-select
                v-model="filtersStore.selectedGenres"
                @clear="filtersStore.clearGenders"
                :options="optionsStore.genres"
                option-value="id"
                option-label="name"
                label="Genero(s)"
                color="indigo-8"
                multiple
                filled
                clearable
              >
                <template v-slot:selected-item="scope">
                  <q-chip
                    @remove="() => filtersStore.removeGenre(scope.opt.id)"
                    removable
                  >
                    <q-avatar
                      outline
                      square
                      :icon="scope.opt.icon"
                      color="indigo-9"
                      text-color="white"
                    />
                    {{ scope.opt.name }}
                  </q-chip>
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon :name="scope.opt.icon" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.name }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <!-- SERVICIOS DERIVADOS -->
            <div
              class="col-12 q-my-md q-pa-sm"
              style="background: #f2f2f2; border-radius: 8px"
            >
              <div class="row">
                <div class="col-11 flex flex-center">Listado de servicios:</div>
                <div
                  v-if="filtersStore.selectedServicesIDs.length > 0"
                  class="col-1"
                >
                  <q-btn
                    @click="clearServices"
                    color="red"
                    icon="close"
                    size="sm"
                    round
                    flat
                  />
                </div>
              </div>
            </div>
            <div class="col-12 q-my-md q-pa-sm" style="background: #f2f2f2">
              <template v-for="p in filtersStore.principalServices" :key="p.id">
                <q-chip
                  @click="
                    filtersStore.manageServicesID(p.id, !p.selected);
                    p.selected = !p.selected;
                  "
                  :color="p.selected ? 'teal-14' : 'teal'"
                  :outline="!p.selected"
                  :class="p.selected ? 'text-white' : 'text-black'"
                  clickable
                  icon="star"
                >
                  {{ p.name }}
                </q-chip>
              </template>
              <template v-for="s in filtersStore.servicesToShow" :key="s.id">
                <q-chip
                  @click="
                    filtersStore.manageServicesID(s.id, !s.selected);
                    s.selected = !s.selected;
                  "
                  :color="s.selected ? 'teal-14' : 'teal'"
                  :outline="!s.selected"
                  :class="s.selected ? 'text-white' : 'text-black'"
                  clickable
                  icon="star"
                >
                  {{ s.name }}
                </q-chip>
              </template>
            </div>
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section class="row items-center">
          <div class="col-12 q-px-md q-py-md">
            <q-item
              tag="label"
              v-ripple
              style="border-radius: 8px"
              :style="{
                backgroundColor: includePriceRange ? '#ccebd1' : '#e3dae6',
              }"
            >
              <q-checkbox v-model="includePriceRange" color="green" />
              <q-item-section>
                <q-item-label class="q-pl-md" style="font-size: 16px">
                  Incluir rango de precios:
                </q-item-label>
              </q-item-section>
            </q-item>
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
          class="flex justify-center items-center"
          style="min-height: 120px"
        >
          <q-btn
            label="Aplicar filtro"
            color="blue"
            @click="sendFilter"
            :disabled="!amountOfFilters"
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
import { useOptionsStore } from 'src/stores/options-store';
import { useFiltersStore } from 'src/stores/filters-store';

const optionsStore = useOptionsStore();
const filtersStore = useFiltersStore();

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits & FiltersEmits>();

const {
  includePriceRange,
  prices,
  // Computed
  amountOfFilters,
  clearServices,
  cleanFilters,
  sendFilter,
} = useFilterService(emit);

const { dialog, hide } = useDialog(props, emit);
</script>

<style lang="scss" scoped>
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
  flex-grow: 1;
  text-align: center;
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
</style>
