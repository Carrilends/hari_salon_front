<template>
  <div class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">
        404
      </div>

      <div class="text-h2" style="opacity:.4">
        Oops. Nothing here...
      </div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        to="/"
        label="Go Home"
        no-caps
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSeo } from 'src/composables/seo/useSeo';

useSeo({
  title: 'Página no encontrada | Peluquería Marlene',
  description: 'La página que buscas no existe. Vuelve al inicio para seguir navegando.',
  noindex: true,
});

defineOptions({
  name: 'ErrorNotFound'
});
</script>
