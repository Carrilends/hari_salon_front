<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useVerifyEmail } from 'src/composables/auth/useVerifyEmail';
import { useAuthStore } from 'src/stores/auth-store';
import { authApi } from 'src/api/auth-api';
import { useSeo } from 'src/composables/seo/useSeo';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Verificar correo | Peluquería Marlene',
  description: 'Confirma tu dirección de correo electrónico.',
  noindex: true,
});

const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const { verify, isSuccess } = useVerifyEmail();

const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : ''
);
const failed = ref(false);
const resending = ref(false);

onMounted(async () => {
  if (!token.value) {
    failed.value = true;
    return;
  }
  try {
    await verify(token.value);
    // Reflejar la verificación en la sesión activa, si la hay.
    if (authStore.isLoggedIn) authStore.emailVerified = true;
  } catch {
    failed.value = true;
  }
});

async function resend() {
  if (!authStore.email) return;
  resending.value = true;
  try {
    await authApi.resendVerification(authStore.email);
  } catch {
    // respuesta neutra igualmente
  } finally {
    resending.value = false;
    $q.notify({
      type: 'positive',
      message:
        'Si la cuenta existe y no está verificada, enviamos un nuevo enlace.',
    });
  }
}
</script>

<template>
  <div class="auth-form-page column flex-center">
    <q-card class="auth-form-page__card q-pa-xl shadow-2 rounded-borders full-width">
      <q-card-section class="text-center">
        <div class="text-h5 text-weight-bold q-mb-sm">Verificar correo</div>
      </q-card-section>

      <!-- Éxito -->
      <template v-if="isSuccess">
        <q-card-section class="text-center">
          <q-icon name="verified" size="56px" color="positive" />
          <div class="q-mt-md text-body1">Tu correo quedó confirmado.</div>
        </q-card-section>
        <q-card-section class="text-center q-pt-none">
          <q-btn
            color="primary"
            no-caps
            label="Ir a mi cuenta"
            :to="{ path: '/mi-cuenta' }"
          />
        </q-card-section>
      </template>

      <!-- Fallo -->
      <template v-else-if="failed">
        <q-card-section class="text-center">
          <q-icon name="error_outline" size="56px" color="negative" />
          <div class="q-mt-md text-body1">
            No pudimos confirmar tu correo: el enlace no es válido o expiró.
          </div>
        </q-card-section>
        <q-card-section
          v-if="authStore.isLoggedIn"
          class="text-center q-pt-none"
        >
          <q-btn
            color="primary"
            no-caps
            label="Reenviar correo de confirmación"
            :loading="resending"
            @click="resend"
          />
        </q-card-section>
        <q-card-section v-else class="text-center q-pt-none">
          <q-btn
            flat
            no-caps
            color="primary"
            label="Iniciar sesión"
            :to="{ name: 'login' }"
          />
        </q-card-section>
      </template>

      <!-- Verificando -->
      <template v-else>
        <q-card-section class="text-center">
          <q-spinner color="primary" size="40px" />
          <div class="q-mt-md text-body2 text-grey-7">
            Verificando tu correo…
          </div>
        </q-card-section>
      </template>
    </q-card>
  </div>
</template>

<style scoped>
.auth-form-page {
  width: 100%;
  min-height: 100vh;
  padding: 16px;
  box-sizing: border-box;
}
.auth-form-page__card {
  max-width: 400px;
}
</style>
