<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResetPassword } from 'src/composables/auth/useResetPassword';
import { useSeo } from 'src/composables/seo/useSeo';
import {
  hasNumber,
  hasUppercase,
  isRequired,
  matches,
  minLength,
} from 'src/helpers/validators';

interface ApiError {
  response?: { data?: { message?: string | string[] } };
}

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Restablecer contraseña | Peluquería Marlene',
  description: 'Elige una nueva contraseña para tu cuenta.',
  noindex: true,
});

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { submit, isLoading } = useResetPassword();

const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : ''
);
const newPassword = ref('');
const confirmPassword = ref('');
const failed = ref(false);

const canSubmit = computed(
  () =>
    !!token.value &&
    !!newPassword.value &&
    !!confirmPassword.value &&
    newPassword.value === confirmPassword.value
);

async function onSubmit() {
  if (!canSubmit.value) return;
  try {
    await submit({ token: token.value, newPassword: newPassword.value });
    $q.notify({
      type: 'positive',
      message: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.',
    });
    await router.push({ name: 'login' });
  } catch (err: unknown) {
    // Token expirado o ya usado: se ofrece pedir uno nuevo.
    failed.value = true;
    const msg = (err as ApiError)?.response?.data?.message;
    $q.notify({
      type: 'negative',
      message: Array.isArray(msg)
        ? msg.join(', ')
        : msg || 'No se pudo restablecer la contraseña',
    });
  }
}
</script>

<template>
  <div class="auth-form-page column flex-center">
    <q-card class="auth-form-page__card q-pa-xl shadow-2 rounded-borders full-width">
      <q-card-section class="text-center">
        <div class="text-h5 text-weight-bold q-mb-sm">Restablecer contraseña</div>
      </q-card-section>

      <template v-if="!token">
        <q-card-section class="text-center">
          <q-icon name="link_off" size="48px" color="negative" />
          <div class="q-mt-md text-body1">
            El enlace no es válido o está incompleto.
          </div>
        </q-card-section>
        <q-card-section class="text-center q-pt-none">
          <q-btn
            flat
            no-caps
            color="primary"
            label="Solicitar un enlace nuevo"
            :to="{ name: 'forgot-password' }"
          />
        </q-card-section>
      </template>

      <template v-else>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="newPassword"
            filled
            outlined
            color="black"
            type="password"
            label="Nueva contraseña"
            :rules="[isRequired, minLength(8), hasUppercase(), hasNumber()]"
          />
          <q-input
            v-model="confirmPassword"
            filled
            outlined
            color="black"
            type="password"
            label="Confirmar nueva contraseña"
            :rules="[isRequired, matches(() => newPassword)]"
          />
          <div class="row justify-center">
            <q-btn
              type="submit"
              color="primary"
              label="Guardar contraseña"
              class="q-mt-md"
              :disable="!canSubmit || isLoading"
              :loading="isLoading"
            />
          </div>
        </q-form>

        <q-card-section v-if="failed" class="text-center q-pt-md">
          <q-btn
            flat
            no-caps
            color="primary"
            label="El enlace no funcionó: solicitar uno nuevo"
            :to="{ name: 'forgot-password' }"
          />
        </q-card-section>
      </template>

      <q-card-section class="text-center q-pt-md">
        <q-btn
          flat
          no-caps
          color="grey-8"
          label="Volver a iniciar sesión"
          :to="{ name: 'login' }"
        />
      </q-card-section>
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
