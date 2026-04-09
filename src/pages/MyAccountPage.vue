<template>
  <q-page class="account-page q-pa-md">
    <section class="account-wrap">
      <div class="q-mb-sm">
        <div class="text-h5 text-weight-bold">Mi cuenta</div>
        <div class="text-caption text-grey-7">
          Actualiza tu nombre, correo y contraseña.
        </div>
      </div>

      <q-card class="account-card">
        <q-tabs
          v-model="activeTab"
          dense
          align="justify"
          indicator-color="primary"
          active-color="primary"
          class="account-tabs"
        >
          <q-tab name="name" label="Nombre" icon="badge" />
          <q-tab name="email" label="Correo" icon="mail" />
          <q-tab name="password" label="Contraseña" icon="lock" />
        </q-tabs>

        <q-separator />

        <q-tab-panels
          v-model="activeTab"
          animated
          class="account-panels"
        >
          <q-tab-panel name="name" class="q-pa-md">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Cambiar nombre
            </div>
            <q-form class="q-gutter-md" @submit="submitName">
              <q-input
                v-model="fullName"
                outlined
                label="Nombre completo"
                :rules="fullNameRules"
              />
              <div class="row justify-end">
                <q-btn
                  color="primary"
                  type="submit"
                  label="Guardar nombre"
                  :loading="isSavingName"
                  :disable="!canSaveName"
                />
              </div>
            </q-form>
          </q-tab-panel>

          <q-tab-panel name="email" class="q-pa-md">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Cambiar correo
            </div>
            <q-form class="q-gutter-md" @submit="submitEmail">
              <q-input
                v-model="newEmail"
                outlined
                type="email"
                label="Nuevo correo"
                :rules="emailRules"
              />
              <q-input
                v-model="currentPasswordForEmail"
                outlined
                type="password"
                label="Contraseña actual"
                :rules="passwordBaseRules"
              />
              <div class="row justify-end">
                <q-btn
                  color="primary"
                  type="submit"
                  label="Guardar correo"
                  :loading="isSavingEmail"
                  :disable="!canSaveEmail"
                />
              </div>
            </q-form>
          </q-tab-panel>

          <q-tab-panel name="password" class="q-pa-md">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              Cambiar contraseña
            </div>
            <q-form class="q-gutter-md" @submit="submitPassword">
              <q-input
                v-model="currentPassword"
                outlined
                type="password"
                label="Contraseña actual"
                :rules="passwordBaseRules"
              />
              <q-input
                v-model="newPassword"
                outlined
                type="password"
                label="Nueva contraseña"
                :rules="newPasswordRules"
              />
              <q-input
                v-model="confirmNewPassword"
                outlined
                type="password"
                label="Confirmar nueva contraseña"
                :rules="confirmPasswordRules"
              />
              <div class="row justify-end">
                <q-btn
                  color="primary"
                  type="submit"
                  label="Guardar contraseña"
                  :loading="isSavingPassword"
                  :disable="!canSavePassword"
                />
              </div>
            </q-form>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { adminServiceApi } from 'src/api/services-api';
import { useAuthStore } from 'src/stores/auth-store';
import type { AuthResponse } from 'src/api/apiTypes';

interface ApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const fullName = ref(authStore.fullname || '');
const newEmail = ref(authStore.email || '');
const currentPasswordForEmail = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');

const isSavingName = ref(false);
const isSavingEmail = ref(false);
const isSavingPassword = ref(false);
const activeTab = ref<'name' | 'email' | 'password'>('name');

const fullNameRules = [
  (val: string) => !!val || 'Requerido',
  (val: string) => val.trim().length >= 3 || 'Mínimo 3 caracteres',
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailRules = [
  (val: string) => !!val || 'Requerido',
  (val: string) => emailRegex.test(val) || 'Correo inválido',
];

const passwordBaseRules = [
  (val: string) => !!val || 'Requerido',
  (val: string) => val.length >= 8 || 'Debe tener al menos 8 caracteres',
];

const newPasswordRules = [
  ...passwordBaseRules,
  (val: string) => /[A-Z]/.test(val) || 'Debe tener al menos una mayúscula',
  (val: string) => /[0-9]/.test(val) || 'Debe tener al menos un número',
];

const confirmPasswordRules = [
  (val: string) => !!val || 'Requerido',
  (val: string) => val === newPassword.value || 'Las contraseñas no coinciden',
];

const canSaveName = computed(
  () => !!fullName.value.trim() && fullName.value.trim() !== authStore.fullname,
);

const canSaveEmail = computed(
  () =>
    !!newEmail.value.trim() &&
    !!currentPasswordForEmail.value &&
    newEmail.value.trim().toLowerCase() !== authStore.email.toLowerCase(),
);

const canSavePassword = computed(
  () =>
    !!currentPassword.value &&
    !!newPassword.value &&
    !!confirmNewPassword.value &&
    newPassword.value === confirmNewPassword.value,
);

onMounted(() => {
  if (!authStore.isLoggedIn) {
    void router.push({ name: 'login', query: { redirect: '/mi-cuenta' } });
  }
});

function syncSession(data: AuthResponse) {
  authStore.setSession(data.token, {
    fullName: data.fullName,
    email: data.email,
    roles: data.roles,
  });
  fullName.value = data.fullName;
  newEmail.value = data.email;
}

function getErrorMessage(err: unknown, fallback: string) {
  const msg = (err as ApiError)?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
}

async function submitName() {
  if (!canSaveName.value || isSavingName.value) return;
  isSavingName.value = true;
  try {
    const { data } = await adminServiceApi.patch<AuthResponse>('/auth/me/profile', {
      fullName: fullName.value.trim(),
    });
    syncSession(data);
    $q.notify({ type: 'positive', message: 'Nombre actualizado correctamente' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: getErrorMessage(err, 'No se pudo actualizar el nombre'),
    });
  } finally {
    isSavingName.value = false;
  }
}

async function submitEmail() {
  if (!canSaveEmail.value || isSavingEmail.value) return;
  isSavingEmail.value = true;
  try {
    const { data } = await adminServiceApi.patch<AuthResponse>('/auth/me/email', {
      newEmail: newEmail.value.trim(),
      currentPassword: currentPasswordForEmail.value,
    });
    syncSession(data);
    currentPasswordForEmail.value = '';
    $q.notify({ type: 'positive', message: 'Correo actualizado correctamente' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: getErrorMessage(err, 'No se pudo actualizar el correo'),
    });
  } finally {
    isSavingEmail.value = false;
  }
}

async function submitPassword() {
  if (!canSavePassword.value || isSavingPassword.value) return;
  isSavingPassword.value = true;
  try {
    const { data } = await adminServiceApi.patch<AuthResponse>(
      '/auth/me/password',
      {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    );
    syncSession(data);
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
    $q.notify({ type: 'positive', message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: getErrorMessage(err, 'No se pudo actualizar la contraseña'),
    });
  } finally {
    isSavingPassword.value = false;
  }
}

defineOptions({
  name: 'MyAccountPage',
});
</script>

<style scoped lang="scss">
.account-page {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(245, 245, 245, 0.48) 45%,
    rgba(250, 248, 250, 0.55) 100%
  );
}

.account-wrap {
  width: min(760px, 100%);
  margin: 0 auto;
  min-height: 0;
}

.account-card {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  height: min(560px, calc(100vh - 180px));
  overflow: hidden;
}

.account-tabs {
  background: rgba(245, 245, 245, 0.85);
}

.account-panels {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

@media (max-width: 700px) {
  .account-card {
    height: min(560px, calc(100vh - 170px));
  }
}
</style>
