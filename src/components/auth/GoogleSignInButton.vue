<script lang="ts" setup>
/**
 * Botón de Google Identity Services. Lo pinta Google (decisión A10): aquí solo
 * se eligen sus opciones —píldora, contorno, grande, «Continuar con Google»,
 * ancho del contenedor— y se avisa al padre con `disponible` para que pinte o
 * no el separador «o».
 *
 * `disabled` lo atenúa y le quita el puntero, pero el iframe de Google sigue
 * al alcance del teclado: el padre que exige un consentimiento previo (el
 * registro, S9) tiene que descartar él mismo una credencial que llegue sin él.
 */
import { onMounted, ref } from 'vue';
import { leerGoogleClientId } from 'src/constants/google-client-id';
import { anchoBotonGoogle } from 'src/helpers/ancho-boton-google';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{
  (e: 'credential', idToken: string): void;
  (e: 'disponible', si: boolean): void;
}>();

const container = ref<HTMLElement | null>(null);
const failed = ref(false);

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadScript(): Promise<void> {
  if (document.querySelector(`script[src="${GSI_SRC}"]`))
    return Promise.resolve();
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

function noDisponible() {
  failed.value = true;
  emit('disponible', false);
}

onMounted(async () => {
  // El SSG prerenderiza sin navegador: todo esto vive en onMounted a propósito.
  if (typeof window === 'undefined') return;
  const clientId = leerGoogleClientId();
  if (!clientId) {
    // Sin client id configurado no se muestra el botón; el acceso local sigue.
    noDisponible();
    return;
  }
  try {
    await loadScript();
    if (!window.google)
      throw new Error('Google Identity Services no disponible');
    if (!container.value) throw new Error('Sin contenedor para el botón');
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential: string }) =>
        emit('credential', response.credential),
    });
    window.google.accounts.id.renderButton(container.value, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      locale: 'es',
      width: anchoBotonGoogle(container.value.clientWidth),
    });
    emit('disponible', true);
  } catch {
    // Si el usuario bloquea recursos de terceros el botón no aparece; el acceso
    // local sigue disponible. El fallo no rompe la página: se avisa al padre.
    noDisponible();
  }
});
</script>

<template>
  <div
    v-show="!failed"
    ref="container"
    class="google-signin"
    :class="{ 'google-signin--disabled': props.disabled }"
    :aria-disabled="props.disabled ? 'true' : undefined"
    data-test="google-signin"
  />
</template>

<style scoped>
.google-signin {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: var(--m-tactil-min);
}

.google-signin--disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
