<script lang="ts" setup>
import { onMounted, ref } from 'vue';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ (e: 'credential', idToken: string): void }>();

const container = ref<HTMLElement | null>(null);
const failed = ref(false);

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  if (document.querySelector(`script[src="${GSI_SRC}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  // El SSG prerenderiza sin navegador: todo esto vive en onMounted a propósito.
  if (typeof window === 'undefined') return;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Sin client id configurado no se muestra el botón; el acceso local sigue.
    failed.value = true;
    return;
  }
  try {
    await loadScript();
    if (!window.google) throw new Error('Google Identity Services no disponible');
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) =>
        emit('credential', response.credential),
    });
    if (container.value) {
      window.google.accounts.id.renderButton(container.value, {
        theme: 'outline',
        size: 'large',
        locale: 'es',
        text: 'continue_with',
        width: 260,
      });
    }
  } catch {
    // Si el usuario bloquea recursos de terceros el botón no aparece; el acceso
    // local sigue disponible. El fallo es silencioso, no rompe la página.
    failed.value = true;
  }
});
</script>

<template>
  <div
    v-show="!failed"
    ref="container"
    class="google-signin"
    :class="{ 'google-signin--disabled': props.disabled }"
  />
</template>

<style scoped>
.google-signin--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
