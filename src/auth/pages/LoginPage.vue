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

  $q.loading.show({
    message: 'Iniciando sesión...',
    spinnerColor: 'primary',
  });
  try {
    await login();
    router.push({ path: '/services' });
  } catch (err: unknown) {
    $q.notify({
      type: 'negative',
      message:
        (err as ApiError)?.response?.data?.message ||
        'Credenciales inválidas o error de servidor',
    });
  } finally {
    $q.loading.hide();
  }
}
</script>

<template>
  <div class="login-page column flex-center">
    <q-card
      class="login-page__card q-pa-xl shadow-2 rounded-borders full-width"
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
            :disable="!username || !password || isLoading"
            type="submit"
            label="Login"
            color="primary"
            class="q-mt-md"
          />
        </div>
      </q-form>
      <q-card-section class="text-center q-pt-md">
        <q-btn
          flat
          no-caps
          color="grey-8"
          label="Ir al inicio"
          :to="{ path: '/' }"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  background-color: #e8e8e8;
}

@media (max-width: 1023px) {
  .login-page {
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.88),
        rgba(255, 255, 255, 0.92)
      ),
      url('src/assets/people/rainbow_hair.jpg');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }
}

.login-page__card {
  max-width: 400px;
}
</style>
