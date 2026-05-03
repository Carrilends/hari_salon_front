<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { servicesApi } from 'src/api/services-api';
import { useAuthStore } from 'src/stores/auth-store';
import type { AuthResponse } from 'src/api/apiTypes';

interface RegisterApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const fullName = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const dataPolicyAccepted = ref(false);
const isSubmitting = ref(false);

const canSubmit = computed(
  () =>
    !!fullName.value.trim() &&
    !!email.value.trim() &&
    !!password.value &&
    !!confirmPassword.value &&
    password.value === confirmPassword.value &&
    dataPolicyAccepted.value
);

async function submitRegister() {
  if (!canSubmit.value || isSubmitting.value) return;

  isSubmitting.value = true;
  $q.loading.show({
    message: 'Creando cuenta...',
    spinnerColor: 'primary',
  });

  try {
    const { data } = await servicesApi.post<AuthResponse>('/auth/register', {
      fullName: fullName.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });

    authStore.setSession(data.token, {
      fullName: data.fullName,
      email: data.email,
      roles: data.roles ?? ['user'],
    });

    await router.push({ path: '/services' });
  } catch (err: unknown) {
    const msg = (err as RegisterApiError)?.response?.data?.message;
    $q.notify({
      type: 'negative',
      message: Array.isArray(msg) ? msg.join(', ') : msg || 'No se pudo crear la cuenta',
    });
  } finally {
    isSubmitting.value = false;
    $q.loading.hide();
  }
}
</script>

<template>
  <div class="register-page column flex-center">
    <q-card class="register-page__card q-pa-lg q-pa-md-sm shadow-2 rounded-borders full-width">
      <q-card-section class="text-center">
        <div class="text-h5 text-weight-bold q-mb-sm">Crear cuenta</div>
        <div class="text-caption text-grey-7">Regístrate como usuario normal</div>
      </q-card-section>

      <q-form @submit="submitRegister" class="q-gutter-md">
        <q-input
          v-model="fullName"
          filled
          outlined
          color="black"
          label="Nombre completo"
          :rules="[
            (val) => !!val || 'Requerido',
            (val) => val.trim().length >= 3 || 'Debe tener al menos 3 caracteres',
          ]"
        />

        <q-input
          v-model="email"
          filled
          outlined
          color="black"
          type="email"
          label="Email"
          :rules="[
            (val) => !!val || 'Requerido',
            (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Correo inválido',
          ]"
        />

        <q-input
          v-model="password"
          filled
          outlined
          color="black"
          type="password"
          label="Password"
          :rules="[
            (val) => !!val || 'Requerido',
            (val) => val.length >= 8 || 'Debe tener al menos 8 caracteres',
            (val) => /[A-Z]/.test(val) || 'Debe tener al menos una mayúscula',
            (val) => /[0-9]/.test(val) || 'Debe tener al menos un número',
          ]"
        />

        <q-input
          v-model="confirmPassword"
          filled
          outlined
          color="black"
          type="password"
          label="Confirmación de password"
          :rules="[
            (val) => !!val || 'Requerido',
            (val) => val === password || 'Las contraseñas no coinciden',
          ]"
        />

        <div class="register-page__consent">
          <q-checkbox
            v-model="dataPolicyAccepted"
            color="primary"
            :aria-label="'Aceptar la Política de Tratamiento de Datos Personales'"
          />
          <span class="register-page__consent-text">
            He leído y acepto la
            <router-link
              :to="{ name: 'privacy-policy' }"
              class="register-page__consent-link"
              @click.stop
            >
              Política de Tratamiento de Datos Personales
            </router-link>
            de Peluquería Marlene, conforme a la Ley 1581 de 2012 y el Decreto
            1377 de 2013.
          </span>
        </div>

        <div class="row justify-center q-pt-sm">
          <q-btn
            type="submit"
            color="primary"
            label="Registrarme"
            :disable="!canSubmit || isSubmitting"
          />
        </div>
      </q-form>

      <q-card-section class="text-center q-pt-md">
        <q-btn flat no-caps color="grey-8" label="Ya estoy registrado, ir a login" :to="{ name: 'login' }" />
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.register-page {
  width: 100%;
  min-height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  background-color: #e8e8e8;
}

@media (max-width: 1023px) {
  .register-page {
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

.register-page__card {
  max-width: 440px;
}

.register-page__consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 2px 0;
}

.register-page__consent-text {
  font-size: 0.9rem;
  line-height: 1.4;
  color: #333;
}

.register-page__consent-link {
  color: #1976d2;
  text-decoration: underline;
}

.register-page__consent-link:hover,
.register-page__consent-link:focus {
  text-decoration: underline;
  color: #0d47a1;
}
</style>
