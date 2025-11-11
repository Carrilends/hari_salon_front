<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuth } from 'src/composables/auth';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const $q = useQuasar();
const router = useRouter();
const { loginBody, login, isLoading } = useAuth();

const username = ref('');
const password = ref('');

async function submitLogin() {
  if (!username.value || !password.value) return;

  loginBody.value = {
    email: username.value,
    password: password.value,
  };

  try {
    await login(); // espera a que el store se llene correctamente
    router.push({ path: '/services' });
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message:
        (err as ApiError)?.response?.data?.message ||
        'Credenciales inválidas o error de servidor',
    });
  }
}
</script>

<template>
  <q-card
    class="q-pa-xl shadow-2 rounded-borders"
    style="width: 370px; max-width: 90vw"
  >
    <q-card-section class="text-center">
      <div class="text-h5 text-weight-bold q-mb-sm">Bienvenido</div>
      <div class="text-caption text-grey-7">
        Por favor, inicie sesión en su cuenta
      </div>
    </q-card-section>

    <q-form @submit="submitLogin" class="q-gutter-md">
      <q-input
        v-model="username"
        filled
        label="Email"
        color="black"
        outlined
        type="email"
        :rules="[
          (val) => !!val || 'Requerido',
          (val) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
            'Debe ser un correo válido',
        ]"
      />

      <q-input
        v-model="password"
        filled
        label="Password"
        type="password"
        color="black"
        outlined
        :rules="[
          (val) => !!val || 'Requerido',
          (val) => val.length >= 8 || 'Debe tener al menos 8 caracteres',
          (val) => /[A-Z]/.test(val) || 'Debe tener al menos una mayúscula',
          (val) => /[0-9]/.test(val) || 'Debe tener al menos un número',
        ]"
      />

      <div class="row justify-center">
        <q-btn
          :loading="isLoading"
          :disable="!username || !password"
          type="submit"
          label="Login"
          color="primary"
          class="q-mt-md"
        />
      </div>
    </q-form>
  </q-card>
</template>
