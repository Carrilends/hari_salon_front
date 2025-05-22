<template>
  <q-card class="my-card" flat bordered>
    <q-img :src="props.imgPath" />

    <q-card-section>
      <q-btn
        fab
        color="primary"
        icon="lab la-whatsapp"
        class="absolute"
        style="top: 0; right: 80px; transform: translateY(-50%);"
      />
      <q-btn
        fab
        color="primary"
        icon="arrow_forward_ios"
        class="absolute"
        style="top: 0; right: 12px; transform: translateY(-50%);"
      />

      <div class="row no-wrap items-center">
        <div class="col text-h6 ellipsis">
          {{ props.title }}
        </div>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="text-subtitle1">
        $・Italian, Cafe
      </div>
      <div class="text-caption text-grey">
        Small plates, salads & sandwiches in an intimate setting.
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Card-banner',
});

const props = defineProps<{
  imgPath: string;
  title: string;
}>();
</script>

<style scoped>
.my-card {
  width: 370px;
  height: 430px;
  border-radius: 10px;
  overflow: hidden;
}

.image-container {
  position: relative;
  width: 370px; /* Ajusta el ancho según necesites */
  height: 430px; /* Ajusta la altura según necesites */
  overflow: hidden; /* Para asegurarte de que no haya desbordamiento */
}

.image-container img {
  border-radius: 10px;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill; /* Ajusta a 'cover' o 'contain' según prefieras */
  transition: filter 0.3s;
}

.image-container .overlay {
  position: absolute;
  top: 0;
  left: 0;
  /* Fondo semitransparente */
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s;
}

.image-container:hover .overlay {
  border-radius: 10px;
  opacity: 1;
}

.image-container:hover img {
  filter: blur(2px);
}
</style>
