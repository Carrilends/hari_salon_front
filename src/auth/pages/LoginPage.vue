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
        label="Username or Email"
        color="black"
        outlined
        :rules="[
          (val) => !!val || 'Requerido',
          (val) => val.length >= 8 || 'Debe tener al menos 8 caracteres',
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
        ]"
      />

      <div class="row justify-center">
        <q-btn
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

<script lang="ts" setup>
import { useAuth } from 'src/composables/auth';
import { ref } from 'vue';

const { loginBody, refetch } = useAuth();

const username = ref('');
const password = ref('');

function submitLogin() {
  if (!username.value || !password.value) return;

  loginBody.value = {
    email: username.value,
    password: password.value,
  };

  refetch(); // 🔵 dispara la query manualmente
}
</script>

<style scoped>
.rounded-borders {
  border-radius: 16px;
}
</style>
