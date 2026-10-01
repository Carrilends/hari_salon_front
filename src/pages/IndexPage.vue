<template>
  <q-page :padding="false" class="index-page">
    <HeroBand
      foto="/people/women-hair-cut.jpg"
      foto-alt="Clienta en la Peluquería Marlene"
      @ver-servicios="irAServicios"
    />
    <CatalogBand
      :secciones="secciones"
      @abrir="irASeccion"
      @ver-todo="irAServicios"
    />
    <ReviewAssistantBand />
    <SiteFooterBand :mostrar-admin="!authStore.isLoggedIn" @admin="goToAdmin" />
    <MobileActionBar @reservar="abrirReserva" />
  </q-page>
</template>

<script setup lang="ts">
import { useRouter, type HistoryState } from 'vue-router';
import { useOptions } from 'src/composables/shared/useOptions';
import { useAuthStore } from 'src/stores/auth-store';
import { useBookStore } from 'src/stores/book-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { hairSalonSchema } from 'src/composables/seo/structuredData';
import { INDEX_SECTIONS, type IndexSection } from 'src/constants/index-sections';
import HeroBand from 'src/components/index/HeroBand.vue';
import CatalogBand from 'src/components/index/CatalogBand.vue';
import ReviewAssistantBand from 'src/components/index/ReviewAssistantBand.vue';
import SiteFooterBand from 'src/components/index/SiteFooterBand.vue';
import MobileActionBar from 'src/components/index/MobileActionBar.vue';

useOptions();

useSeo({
  title: 'Peluquería Marlene | Cortes, color, barbería y estética',
  description:
    'Reserva cortes de cabello, coloración, barbería, maquillaje y manicura en Peluquería Marlene. Profesionales, promociones y atención personalizada.',
  path: '/',
  jsonLd: hairSalonSchema(),
});

const authStore = useAuthStore();
const router = useRouter();
const secciones = INDEX_SECTIONS;

// «Reservar» abre el flujo del portal: es el único camino que escribe la cita
// y dispara los cuatro avisos. Ni WhatsApp ni el asistente lo sustituyen.
const { showDialogFn: abrirReserva } = useBookStore();

function irAServicios() {
  router.push({ path: '/services' });
}

function irASeccion(seccion: IndexSection) {
  router.push({
    path: '/services',
    state: { service: seccion } as unknown as HistoryState,
  });
}

function goToAdmin() {
  router.push({ name: 'login' });
}

defineOptions({
  name: 'IndexPage',
});
</script>

<style scoped lang="scss">
.index-page {
  background: var(--m-hueso);
  font-family: var(--m-font-sans);
}

@media (max-width: 699px) {
  .index-page {
    // La barra fija se superpone al final de la página.
    padding-bottom: var(--m-barra-movil-alto);
  }
}
</style>
