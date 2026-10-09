<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useVerifyEmail } from 'src/composables/auth/useVerifyEmail';
import { useAuthStore } from 'src/stores/auth-store';
import { authApi } from 'src/api/auth-api';
import { useSeo } from 'src/composables/seo/useSeo';
import EstadoAcceso from 'src/components/auth/EstadoAcceso.vue';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Verificar correo | Peluquería Marlene',
  description: 'Confirma tu dirección de correo electrónico.',
  noindex: true,
});

const route = useRoute();
const authStore = useAuthStore();
const { verify } = useVerifyEmail();

const token = typeof route.query.token === 'string' ? route.query.token : '';
const estado = ref<'verificando' | 'confirmado' | 'fallido'>('verificando');
const reenviando = ref(false);
const reenviado = ref(false);

onMounted(async () => {
  if (!token) {
    estado.value = 'fallido';
    return;
  }
  try {
    await verify(token);
    // Reflejar la verificación en la sesión activa, si la hay.
    if (authStore.isLoggedIn) authStore.emailVerified = true;
    estado.value = 'confirmado';
  } catch {
    estado.value = 'fallido';
  }
});

async function reenviar() {
  if (!authStore.email || reenviando.value) return;
  reenviando.value = true;
  reenviado.value = false;
  try {
    await authApi.resendVerification(authStore.email);
  } catch {
    // Respuesta neutra igualmente (§7.2).
  } finally {
    reenviando.value = false;
    reenviado.value = true;
  }
}
</script>

<template>
  <estado-acceso
    v-if="estado === 'confirmado'"
    tono="tinta"
    titulo="Correo confirmado"
  >
    <template #icono>
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </template>

    <p>Ya puedes reservar y seguir tus citas desde tu cuenta.</p>

    <template #acciones>
      <router-link
        to="/services"
        class="acceso-boton m-boton m-boton--ancho"
        data-test="ver-servicios"
        >Ver servicios</router-link
      >
      <router-link
        to="/mi-cuenta"
        class="acceso-secundario"
        data-test="ir-a-mi-cuenta"
        >Ir a mi cuenta</router-link
      >
    </template>
  </estado-acceso>

  <estado-acceso
    v-else-if="estado === 'fallido'"
    tono="peligro"
    titulo="Este enlace ya no sirve"
  >
    <template #icono>
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M9.5 14.5l-1.8 1.8a3.2 3.2 0 0 1-4.5-4.5l2.6-2.6a3.2 3.2 0 0 1 4.2-.3"
        />
        <path
          d="M14.5 9.5l1.8-1.8a3.2 3.2 0 0 1 4.5 4.5l-2.6 2.6a3.2 3.2 0 0 1-4.2.3"
        />
        <path d="M8 4.5v2M4.5 8h2M16 19.5v-2M19.5 16h-2" />
      </svg>
    </template>

    <p>
      Puede que haya vencido o que ya lo hayas usado: cada enlace funciona una
      sola vez.
    </p>

    <template #acciones>
      <template v-if="authStore.isLoggedIn">
        <button
          type="button"
          class="acceso-boton m-boton--ancho"
          data-test="reenviar"
          :disabled="reenviando"
          :aria-busy="reenviando ? 'true' : undefined"
          @click="reenviar"
        >
          {{ reenviando ? 'Enviando…' : 'Enviar otro enlace' }}
        </button>
        <p class="acceso-vivo" aria-live="polite" data-test="reenvio-estado">
          {{
            reenviado
              ? 'Si tu correo sigue sin confirmar, te enviamos un enlace nuevo.'
              : ''
          }}
        </p>
      </template>
      <router-link
        v-else
        :to="{ name: 'login' }"
        class="acceso-boton m-boton m-boton--ancho"
        data-test="entrar"
        >Entrar</router-link
      >
    </template>
  </estado-acceso>

  <estado-acceso v-else tono="oro" titulo="Verificando tu correo…" ocupado>
    <template #icono>
      <span class="verificar__indicador" />
    </template>
  </estado-acceso>
</template>

<style scoped>
/* Indicador propio (A16): un aro de filete con el tramo de arriba en oro. */
.verificar__indicador {
  display: block;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-top-color: var(--m-oro-profundo);
  border-radius: 50%;
  animation: verificar-giro 0.9s linear infinite;
}

@keyframes verificar-giro {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .verificar__indicador {
    animation: none;
  }
}
</style>
