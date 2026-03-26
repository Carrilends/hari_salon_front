<template>
  <q-dialog
    v-model="dialog"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <div class="row flex flex-center" style="background: lightgray">
      <q-stepper
        v-model="step"
        ref="stepper"
        color="primary"
        animated
        style="width: 700px"
      >
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
                  clickable
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
              v-if="!files || files.length === 0"
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
            <q-file
              v-model="files"
              @update:model-value="onFilesSelected"
              accept="image/*"
              :display-value="
                (files?.length || 0) + `/${5}` + ' archivos seleccionados'
              "
              :max-files="5"
              :disable="files?.length >= 5"
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
          <services-box
            ref="servicesBoxRef"
            :initial-selected-ids="selectedServicesIDs"
            :is-edit-mode="isEditMode"
            @selectedServices="selectedServices"
          />
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
import { ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useQuasar } from 'quasar';
import { useServiceCreateEdit } from 'src/composables/services/useServiceCreateEdit';
import { prepareImagesForUpload } from 'src/helpers/cloudinaryHelpers';
import {
  createServiceHelper,
  updateServiceHelper,
} from 'src/helpers/service.helpers';
import { getService } from 'src/composables/services/useService';
import { useBookStore } from 'src/stores/book-store';
import ServicesBox from '../shared/ServicesBox.vue';
// import { Image } from 'src/interfaces/service';

const props = defineProps({
  name: String,
  detail: {
    description: String,
    specifications: {
      df: String,
    },
  },
  price: Number,
  images: Array,
  tags: Array,
  isEditMode: Boolean,
  id: String,
});

const servicesBoxRef = ref(null);

const {
  formData,
  stepper,
  nameRef,
  descriptionRef,
  priceRef,
  selectedServicesIDs,
  slide,
  step,
  files,
  internGenres,
} = useServiceCreateEdit(props);

// Problematic variables
const dialog = defineModel({ default: false });
const $q = useQuasar();
const queryClient = useQueryClient();
const bookStore = useBookStore();

const removeImage = (file) => {
  files.value = files.value.filter((f) => f !== file);
  URL.revokeObjectURL(file.url);
  slide.value = 1;
};

function onFilesSelected() {
  files.value = files.value.map((f) => {
    if (f instanceof File) {
      const newImg = Object.assign(f, { url: URL.createObjectURL(f) });
      return newImg;
    }
    return f;
  });
}

const selectedServices = (services) => {
  selectedServicesIDs.value = services;
};

const prepareFormData = async () => {
  const allGenres = internGenres.value
    .filter((g) => g.selected)
    .map((g) => g.id)
    .concat(selectedServicesIDs.value);

  const dividedImgs = [
    files.value.filter((f) => f instanceof File), // New images
    files.value.filter((f) => !(f instanceof File)), // Existing images
  ];

  const newImages =
    dividedImgs[0].length > 0
      ? await prepareImagesForUpload(dividedImgs[0])
      : [];

  formData.value.images = dividedImgs[1].concat(newImages);
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
      await prepareFormData();
      if (props.isEditMode) {
        await updateService();
      } else {
        await createService();
      }
      dialog.value = false;
    }
  }
};

const createService = async () => {
  await createServiceHelper(formData.value, $q);
  await queryClient.invalidateQueries({ queryKey: ['services'] });
};

const updateService = async () => {
  await updateServiceHelper(formData.value, props.id, $q);
  await queryClient.invalidateQueries({ queryKey: ['services'] });
  if (props.id) {
    await queryClient.invalidateQueries({ queryKey: ['service', props.id] });
    try {
      const fresh = await getService(props.id);
      bookStore.syncBookingWithService(fresh);
    } catch {
      // La edición ya se guardó; si falla el GET, la reserva puede quedar desactualizada hasta otra sincronización.
    }
  }
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
    files.value = [];
    slide.value = 1;
    step.value = 1;
    internGenres.value.forEach((g) => (g.selected = false));
    selectedServicesIDs.value = [];
    servicesBoxRef.value?.resetLocalState?.();
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
