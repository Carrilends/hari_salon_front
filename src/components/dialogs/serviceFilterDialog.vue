<template>
  <div class="q-pa-md q-gutter-sm">
    <q-dialog v-model="dialog" position="right" full-height>
      <q-card style="width: 500px">
        <q-card-section class="row items-center">
          <div class="col-12 title q-my-md">Busqueda de servicios</div>
          <!-- GENEROS -->
          <div class="col-12 q-py-md" style="min-width: 250px">
            <q-select
              v-model="selectedGenres"
              :options="genderOptions"
              option-value="id"
              option-label="name"
              label="Genero(s)"
              color="indigo-8"
              multiple
              filled
              clearable
            >
              <template v-slot:selected-item="scope">
                <q-chip @remove="() => removeGenre(scope.opt.id)" removable>
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
          <!-- SERVICIOS GENERALES -->
          <div class="col-12" style="min-width: 250px">
            <q-select
              v-model="principalServicesOptions"
              @update:model-value="(value) => manageChildServices(value)"
              :options="principalServices"
              option-value="id"
              option-label="name"
              label="Servicios generales"
              color="indigo-9"
              use-chips
              multiple
              filled
            >
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.name }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <!-- SERVICIOS DERIVADOS -->
          <div class="col-12 q-my-md q-pa-sm" style="background: #f2f2f2">
            <q-chip
              v-for="c in childServices" :key="c.id"
              outline
              color="teal-14"
              icon="event"
            >
              {{ c.name }}
            </q-chip>
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
              Precios: {{ label.min }}.000 $ ― {{ label.max }}.000 $
            </div>
            <div style="padding-top: 35px">
              <q-range
                v-if="includePriceRange"
                v-model="label"
                :min="5"
                :max="200"
                :step="1"
                :left-label-value="label.min + '.000'"
                :right-label-value="label.max + '.000'"
                :disable="!includePriceRange"
                color="red"
                track-size="8px"
                thumb-size="30px"
                label-always
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- The display value -->
    <!-- Customizing menu options -->
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useOptionsStore } from 'stores/options-store';
import { ChildTag, Genres, GenresI, Tag } from 'src/interfaces/tag';

const optionsStore = useOptionsStore();
const genres = optionsStore.genres;
const principalServices = optionsStore.principalServices;
const devivatedServices = optionsStore.restServices;

const dialog = ref(true);
const includePriceRange = ref(false);
const selectedGenres = ref([]);
const principalServicesOptions = ref([]);
const childServices = ref<ChildTag[]>([]);


// Agregar selected en true o false???
// Actions
const removeGenre = (genreId: string) => {
  selectedGenres.value = selectedGenres.value.filter(
    (genre: GenresI) => genre.id !== genreId
  );
};

// En caso de que haya anidacion, siempre preguntar si mi parent esta en los principalServices,
// porque al fin de cuentas, como todos compartimos el segundo nivel, puedo gestionar esa autoeliminacion

const manageChildServices = (value: Tag[]) => {
  const currentIds = value.map(serv => serv.id);
  childServices.value = devivatedServices.filter(s => currentIds.includes(s.parent));
}

const icons: Record<Genres, string> = {
  Masculino: 'face',
  Femenino: 'face_3',
  Unisex: 'wc',
  Niños: 'child_care',
};

const genderOptions = genres.map((genre) => ({
  ...genre,
  icon: icons[genre.name],
}));

const label = ref({
  min: 15,
  max: 100,
});

// const open = () => dialog.value = true
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
</style>
