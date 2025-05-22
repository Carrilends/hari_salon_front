<template>
  <q-carousel
    animated
    v-model="slide"
    navigation
    infinite
    :autoplay="autoplay"
    arrows
    transition-prev="slide-right"
    transition-next="slide-left"
    @mouseenter="autoplay = false"
    @mouseleave="autoplay = true"
  >
    <q-carousel-slide :name="1" style="background: #525252">
      <div class="row full-width" style="padding: 5px 40px">
        <div class="col-8 hair-salon" style="height: 360px" />
        <div class="col-4">
          <div class="title q-pl-xl" style="color: white; font-size: 35px">Quienes somos?</div>
          <q-separator class="q-ml-xl" dark inset />
          <div class="q-pl-xl q-pt-md" style="color: white; line-height: 1.5; font-size: 16px">
            Peluqueria Marlene es un lugar donde te sentiras como en casa, con un ambiente agradable y un personal amable y profesional.
            Hemos trabajado por mas de 20 años en el sector de la belleza y la estetica, ofreciendo servicios de calidad y a precios accesibles.
            Ven y visitanos, estamos ubicados en la ciudad de Sopo, Cundinamarca, Carrera 3# 1-18, Casco urbano.
          </div>
        </div>
      </div>
    </q-carousel-slide>
    <q-carousel-slide :name="2" style="background: #424242">
      <div class="row full-width full-height" style="padding: 5px 40px 25px 40px">
        <div class="col-4 slid-2-content" />
        <div class="col-8 q-pl-lg">
          <div class="row full-width">
            <div class="col-12" style="border-bottom: white 1px solid">
              <div class="title" style="color: white; font-size: 30px">Nuestros servicios especiales</div>
            </div>
            <div class="col-12 q-pt-md">
              <div class="row">
                <div v-for="(item, index) in services.colmn1" :key="index" class="col-3 flex">
                  <div
                    class="row flex flex-center q-pa-sm icon-container"
                  >
                    <q-icon
                      class="col-12"
                      size="64px"
                      :name="item.icon"
                      color="white"
                    />
                    <div
                      class="title col-12 flex flex-center q-pt-sm"
                      style="color: white; font-size: 20px"
                    >
                      {{ item.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12 q-pt-lg">
              <div class="row" style="justify-content: space-around">
                <div v-for="(item, index) in services.colmn2" :key="index" class="col-3 flex">
                  <div
                    class="row flex flex-center q-pa-sm icon-container"
                  >
                    <q-icon
                      class="col-12"
                      size="64px"
                      :name="item.icon"
                      color="white"
                    />
                    <div
                      class="title col-12 flex flex-center q-pt-sm"
                      style="color: white; font-size: 20px"
                    >
                      {{ item.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-carousel-slide>
    <!-- <q-carousel-slide :name="3" img-src="https://cdn.quasar.dev/img/parallax2.jpg" />
    <q-carousel-slide :name="4" img-src="https://cdn.quasar.dev/img/quasar.jpg" /> -->
  </q-carousel>
</template>


<script setup lang="ts">
import { ref } from 'vue'

const slide = ref(1)
const autoplay = ref(true)

const services = {
  colmn1: [
    {
      icon: 'las la-ring',
      name: 'Bodas'
    },
    {
      icon: 'las la-graduation-cap',
      name: 'Grados'
    },
    {
      icon: 'las la-theater-masks',
      name: 'Temático'
    },
    {
      icon: 'las la-birthday-cake',
      name: 'Quinceañeras'
    }
  ],
  colmn2: [
    {
      icon: 'las la-praying-hands',
      name: 'Eventos religiosos'
    },
    {
      icon: 'las la-cut',
      name: 'Mas...'
    }
  ]
}

console.log(services.colmn1)

defineOptions({
  name: 'PrincipalBanner',
});
</script>

<style scoped lang="scss">

.icon-container {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 7px;
  cursor: pointer;
}
.icon-container:hover {
  background-color: rgb(248 187 208 / 0.7);
  color: white;
}

.hair-salon {
  background: url('src/assets/places/salon.jpg') no-repeat center center;
  background-size: cover;
}

.slid-2-content {
  background: url('src/assets/people/baner-2-our-services.jpg') no-repeat center center;
  background-size: cover;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}


</style>
