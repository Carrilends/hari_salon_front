<script lang="ts" setup>
import { ref } from 'vue';
import { useForgotPassword } from 'src/composables/auth/useForgotPassword';
import { useSeo } from 'src/composables/seo/useSeo';
import { isEmail, isRequired } from 'src/helpers/validators';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Recuperar contraseña | Peluquería Marlene',
  description: 'Solicita un enlace para restablecer tu contraseña.',
  noindex: true,
});

const { email, sent, submit, isLoading } = useForgotPassword();
const localEmail = ref('');

async function onSubmit() {
  if (!localEmail.value) return;
  email.value = localEmail.value.trim();
  try {
    await submit();
  } catch {
    // Respuesta deliberadamente neutra: nunca revelar si el correo existe.
    sent.value = true;
  }
}
</script>

<template>
  <div class="auth-form-page column flex-center">
    <q-card class="auth-form-page__card q-pa-xl shadow-2 rounded-borders full-width">
      <q-card-section class="text-center">
        <div class="text-h5 text-weight-bold q-mb-sm">Recuperar contraseña</div>
        <div class="text-caption text-grey-7">
          Te enviaremos un enlace para elegir una nueva.
        </div>
      </q-card-section>

      <template v-if="!sent">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="localEmail"
            filled
            outlined
            color="black"
            type="email"
            label="Correo electrónico"
            :rules="[isRequired, isEmail('Correo inválido')]"
          />
          <div class="row justify-center">
            <q-btn
              type="submit"
              color="primary"
              label="Enviar enlace"
              class="q-mt-md"
              :disable="!localEmail || isLoading"
              :loading="isLoading"
            />
          </div>
        </q-form>
      </template>

      <template v-else>
        <q-card-section class="text-center">
          <q-icon name="mark_email_read" size="48px" color="primary" />
          <div class="q-mt-md text-body1">
            Si el correo está registrado, te enviamos un enlace para restablecer
            la contraseña. Revisa tu bandeja de entrada.
          </div>
        </q-card-section>
      </template>

      <q-card-section class="text-center q-pt-md">
        <q-btn
          flat
          no-caps
          color="primary"
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
