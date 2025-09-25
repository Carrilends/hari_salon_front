<template>
  <q-dialog
    v-model="dialog"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <div class="row flex flex-center" style="background: lightgray">
      <q-stepper v-model="step" ref="stepper" color="primary" animated>
        <q-step
          :name="1"
          title="Información general"
          icon="settings"
          :done="step > 1"
        >
          <!-- NOMBRE -->
          <div class="col-12 q-py-sm">
            <q-input
              v-model="formData.name"
              ref="nameRef"
              filled
              label="Nombre"
              color="black"
              :rules="[
                (val) => !!val || 'El nombre es obligatorio',
                (val) =>
                  (val && val.length >= 3) ||
                  'El nombre debe tener al menos 3 caracteres',
              ]"
            />
          </div>
          <!-- DESCRIPCION -->
          <div class="col-12 q-py-sm">
            <q-input
              v-model="formData.detail.description"
              ref="descriptionRef"
              filled
              clearable
              label="Descripción"
              type="textarea"
              color="black"
              :rules="[
                (val) => !!val || 'La descripción es obligatoria',
                (val) =>
                  (val && val.length >= 20) ||
                  'La descripción debe tener al menos 20 caracteres',
              ]"
            />
          </div>
          <!-- Precio y Genero -->
          <div class="col-12 q-py-sm">
            <div class="row" style="justify-content: space-between">
              <div
                class="col-6 q-pb-md"
                style="text-align: center; font-size: medium; color: #5e5e62"
              >
                Géneros:
              </div>
              <div
                class="col-6 q-pb-md"
                style="text-align: center; font-size: medium; color: #5e5e62"
              >
                Precio:
              </div>
              <div class="col-6">
                <q-chip
                  v-for="(genre, index) in internGenres"
                  v-model:selected="genre.selected"
                  :key="index"
                  :icon="genre.icon"
                  :color="genre.selected ? 'indigo-4' : 'indigo-2'"
                >
                  {{ genre.name }}
                </q-chip>
              </div>
              <div class="col-6">
                <q-input
                  v-model="formData.price"
                  ref="priceRef"
                  outlined
                  type="number"
                  prefix="$"
                  label="Precio del servicio"
                  :rules="[
                    (val) => !!val || 'El precio es obligatorio',
                    (val) =>
                      (val && val >= 5000) ||
                      'El precio debe ser mayor o igual a $5000 Cop',
                  ]"
                >
                  <template v-slot:append>
                    <q-avatar>
                      <q-icon name="attach_money" size="sm" color="green" />
                    </q-avatar>
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </q-step>
        <q-step
          :name="2"
          title="Seleccion de imagenes"
          icon="image"
          :done="step > 2"
        >
          <div class="q-pa-md">
            <div
              v-if="files.length === 0"
              class="flex flex-center"
              style="height: 300px; border: gray dashed 2px"
            >
              No hay imágenes seleccionadas
            </div>
            <q-carousel
              v-else
              v-model="slide"
              animated
              arrows
              navigation
              infinite
            >
              <q-carousel-slide
                v-for="(file, index) in files"
                :key="file.url"
                :name="index + 1"
                :img-src="file.url"
                :style="file.isPrincipal ? 'border: green solid 3px' : ''"
              >
                <div class="absolute-top">
                  <div
                    class="row q-pa-md"
                    style="justify-content: space-between"
                  >
                    <q-btn
                      round
                      color="red"
                      icon="delete"
                      @click="removeImage(file)"
                    />
                  </div>
                </div>
              </q-carousel-slide>
            </q-carousel>
          </div>
          <div class="q-pa-md">
            <!-- @update:model-value="onFilesSelected" -->
            <!-- v-model="files" -->
            <q-file
              v-model="files"
              @update:model-value="onFilesSelected"
              accept="image/*"
              :display-value="
                files.length + `/${maxFiles}` + ' archivos seleccionados'
              "
              :max-files="maxFiles"
              :disable="files.length >= maxFiles"
              bg-color="light-blue-1"
              multiple
              outlined
              append
            >
              <template v-slot:append>
                <q-icon name="upload" />
              </template>
              <template v-slot:label> Seleccionar imágenes </template>
            </q-file>
          </div>
        </q-step>
        <q-step
          :name="3"
          title="Listado de servicios"
          icon="list"
          :done="step > 3"
        >
          <!-- LISTADO DE SERVICIOS -->
          <div
            class="col-12 q-my-md q-pa-sm"
            style="background: #f2f2f2; border-radius: 8px"
          >
            <div class="row">
              <div
                class="col-11 flex flex-center"
                style="font-size: medium; color: #5e5e62; font-weight: bold"
              >
                Tu servicio es:
              </div>
              <div v-if="selectedServicesIDs.length > 0" class="col-1">
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
            <template v-for="p in principalServices" :key="p.id">
              <q-chip
                @click="
                  manageServicesID(p.id, !p.selected);
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
            <template v-for="s in servicesToShow" :key="s.id">
              <q-chip
                @click="
                  manageServicesID(s.id, !s.selected);
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
        </q-step>
        <template v-slot:navigation>
          <q-stepper-navigation>
            <q-btn class="q-mr-sm" flat @click="close" label="Cancelar" />
            <q-btn
              @click="controlStepper"
              color="primary"
              :label="step === 3 ? 'Crear servicio' : 'Continuar'"
            />
            <q-btn
              v-if="step > 1"
              flat
              color="primary"
              @click="stepper.previous()"
              label="Atras"
              class="q-ml-sm"
            />
          </q-stepper-navigation>
        </template>
      </q-stepper>
    </div>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar';
import { ref } from 'vue';

import { useOptionsStore } from 'src/stores/options-store';
import { adminServiceApi } from 'src/api/services-api';

const stepper = ref(null);

const dialog = defineModel({ default: false });
const optionsStore = useOptionsStore();
const maxFiles = 5;
const $q = useQuasar();

const nameRef = ref(null);
const descriptionRef = ref(null);
const priceRef = ref(null);

const selectedServicesIDs = ref([]);

const slide = ref(1);
const step = ref(1);
const files = ref([]);

const servicesToShow = ref([]);

const principalServices = ref([
  ...optionsStore.principalServices.map((s) => ({ ...s, selected: false })),
]);

const restServices = ref([
  ...optionsStore.restServices.map((s) => ({ ...s, selected: false })),
]);

const setServicesToShow = () => {
  servicesToShow.value = restServices.value.filter(
    (s) => selectedServicesIDs.value.includes(s.parent) || s.selected
  );
};

const manageServicesID = (id, selected) => {
  if (selected) {
    selectedServicesIDs.value.push(id);
  } else {
    selectedServicesIDs.value = selectedServicesIDs.value.filter(
      (s) => s !== id
    );
  }
  setServicesToShow();
};

const removeImage = (file) => {
  files.value = files.value.filter((f) => f !== file);
  URL.revokeObjectURL(file.url);
  slide.value = 1;
};

function onFilesSelected(val) {
  files.value.forEach((file) => {
    if (file.url) URL.revokeObjectURL(file.url);
  });
  files.value = val.map((file) => {
    if (!file.url) file.url = URL.createObjectURL(file);
    return {
      ...file,
      isPrincipal: false,
    };
  });
}

const clearServices = () => {
  selectedServicesIDs.value = [];
  principalServices.value.forEach((s) => (s.selected = false));
  restServices.value.forEach((s) => (s.selected = false));
  setServicesToShow();
};

const internGenres = ref(
  optionsStore.genres.map((genre) => ({
    ...genre,
    selected: false,
  }))
);

const formData = ref({
  name: '',
  detail: {
    description: '',
    specifications: {
      df: '',
    },
  },
  price: null,
  images: [],
  tags: [],
});

const prepareFormData = () => {
  const allGenres = internGenres.value
    .filter((g) => g.selected)
    .map((g) => g.id)
    .concat(selectedServicesIDs.value);

  const amountOfImages = files.value.length;
  const randomIndex = Math.floor(Math.random() * amountOfImages);
  const imageRestructure = files.value.map((file, index) => ({
    url: file.url,
    isPrincipal: index === randomIndex,
  }));

  formData.value.images = imageRestructure;
  formData.value.tags = allGenres;
  formData.value.price = Number(formData.value.price);
};

const controlStepper = async () => {
  if (step.value === 1) {
    const isNameValid = nameRef.value.validate();
    const isDescriptionValid = descriptionRef.value.validate();
    const isPriceValid = priceRef.value.validate();
    const genres = internGenres.value.filter((g) => g.selected).length;
    if (genres === 0) {
      $q.notify({
        type: 'negative',
        message: 'Debes seleccionar al menos un género',
        position: 'bottom',
      });
    }
    if (isNameValid && isDescriptionValid && isPriceValid && genres > 0)
      stepper.value.next();
  } else if (step.value === 2) {
    if (files.value.length === 0) {
      $q.notify({
        type: 'negative',
        message: 'Debes seleccionar al menos una imagen',
        position: 'bottom',
      });
    } else stepper.value.next();
  } else if (step.value === 3) {
    if (selectedServicesIDs.value.length === 0) {
      $q.notify({
        type: 'negative',
        message: 'Debes seleccionar al menos un servicio',
        position: 'bottom',
      });
    } else {
      prepareFormData();
      console.log('Creacion exitosa', formData.value);
      await createService();
      // dialog.value = false;
    }
  }
};

const createService = async () => {
  adminServiceApi
    .post('/service', formData.value)
    .then((response) => {
      console.log('Servicio creado:', response.data);
      $q.notify({
        type: 'positive',
        message: 'Servicio creado exitosamente',
        position: 'bottom',
      });
      dialog.value = false;
    })
    .catch((error) => {
      console.error('Error al crear el servicio:', error);
      $q.notify({
        type: 'negative',
        message: 'Error al crear el servicio',
        position: 'bottom',
      });
    });
};

const close = () => {
  $q.dialog({
    title: 'Cancelar creación',
    message: '¿Estás seguro de que deseas cancelar la creación del servicio?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    formData.value = {
      name: '',
      detail: {
        description: '',
        specifications: {
          df: '',
        },
      },
      price: null,
      images: [],
      tags: [],
    };
    files.value.forEach((file) => {
      if (file.url) URL.revokeObjectURL(file.url);
    });
    files.value = [];
    slide.value = 1;
    step.value = 1;
    internGenres.value.forEach((g) => (g.selected = false));
    clearServices();
    dialog.value = false;
  });
};
</script>

<style lang="scss" scoped>
.custom-caption {
  text-align: center;
  padding: 12px;
  color: white;
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
