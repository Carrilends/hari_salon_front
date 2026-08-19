<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';

defineOptions({
  name: 'App',
});

// Aviso en tiempo real de reservas nuevas (Fase 4). No hace nada para visitantes
// anónimos: el socket solo se abre en sesiones de administración.
useAdminNotifications().start();
</script>
