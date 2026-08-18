<script lang="ts" setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuth } from 'src/composables/auth';
import { useLoginWithGoogle } from 'src/composables/auth/useLoginWithGoogle';
import GoogleSignInButton from 'src/components/auth/GoogleSignInButton.vue';
import { useSeo } from 'src/composables/seo/useSeo';
import {
  hasNumber,
  hasUppercase,
  isEmail,
  isRequired,
  minLength,
} from 'src/helpers/validators';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const { loginBody, login, isLoading } = useAuth();

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Iniciar sesión | Peluquería Marlene',
  description: 'Accede a tu cuenta de la Peluquería Marlene.',
  noindex: true,
});

const username = ref('');
const password = ref('');

const redirectTo =
  typeof route.query.redirect === 'string' ? route.query.redirect : '/services';

// Inicio de sesión con Google (Fase 3b): comparte la redirección del login local.
const { handleCredential: onGoogleCredential } = useLoginWithGoogle({ redirectTo });

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
    router.push({ path: redirectTo });
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
          :rules="[isRequired, isEmail()]"
        />

        <q-input
          v-model="password"
          filled
          label="Password"
          type="password"
          color="black"
          outlined
          :rules="[isRequired, minLength(8), hasUppercase(), hasNumber()]"
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

      <q-separator class="q-my-md" />
      <div class="text-center text-caption text-grey-7 q-mb-sm">o</div>
      <div class="row justify-center">
        <GoogleSignInButton @credential="onGoogleCredential" />
      </div>
      <q-card-section class="text-center q-pt-md q-pb-none">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="¿Olvidaste tu contraseña?"
          :to="{ name: 'forgot-password' }"
        />
      </q-card-section>
      <q-card-section class="text-center q-pt-sm">
        <q-btn
          flat
          no-caps
          color="primary"
          label="¿No tienes cuenta? Regístrate"
          :to="{ name: 'register' }"
        />
      </q-card-section>
      <q-card-section class="text-center q-pt-none">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Política de Tratamiento de Datos Personales"
          :to="{ name: 'privacy-policy' }"
        />
      </q-card-section>
      <q-card-section class="text-center q-pt-none">
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

/* Pantalla pequeña: el login se centra y la imagen pasa a ser el fondo
   completo, con una capa tenue para que el formulario siga legible. */
@media (max-width: 1023px) {
  .login-page {
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.62),
        rgba(255, 255, 255, 0.68)
      ),
      url('/people/rainbow_hair.jpg');
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
  }
}

.login-page__card {
  max-width: 400px;
}
</style>
