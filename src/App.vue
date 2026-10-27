<template>
  <router-view />
</template>

<script setup lang="ts">
import { useAdminNotifications } from 'src/composables/notifications/useAdminNotifications';
import { useAvisoSesionCerrada } from 'src/composables/auth/useAvisoSesionCerrada';

defineOptions({
  name: 'App',
});

// Aviso en tiempo real de reservas nuevas (Fase 4). No hace nada para visitantes
// anónimos: el socket solo se abre en sesiones de administración.
useAdminNotifications().start();

// RF32: si la sesión se cierra sola, la clienta lo ve en un aviso.
useAvisoSesionCerrada();
</script>
