<template>
  <q-page class="workers-page q-px-md q-py-lg">
    <section class="workers-wrap">
      <div class="workers-header">
        <div>
          <h1 class="text-h4 text-weight-bold q-my-none">Mis empleados</h1>
          <p class="text-grey-7 q-mt-sm q-mb-none">
            Gestiona el equipo que atiende a tus clientes.
          </p>
        </div>
        <div class="workers-header__actions">
          <div class="text-caption text-grey-7">
            {{ workers.length }} empleado{{ workers.length === 1 ? '' : 's' }}
          </div>
          <q-btn
            v-if="authStore.isAdmin"
            color="indigo-5"
            icon="add"
            :label="isCompactAction ? undefined : 'Agregar empleado'"
            :round="isCompactAction"
            :rounded="!isCompactAction"
            aria-label="Agregar empleado"
            @click="openCreateDialog"
          />
        </div>
      </div>

      <q-scroll-area
        class="workers-scroll-area"
        :thumb-style="scrollThumbStyle"
        :bar-style="scrollBarStyle"
        visible
      >
        <div class="workers-scroll-content">
          <div v-if="isLoading" class="workers-grid">
            <q-card v-for="index in 6" :key="index" class="worker-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="row items-center q-col-gutter-sm no-wrap">
                    <div class="col-auto">
                      <q-skeleton type="QAvatar" size="42px" />
                    </div>
                    <div class="col">
                      <q-skeleton type="text" width="65%" />
                      <q-skeleton type="text" width="35%" />
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div v-else-if="!workers.length" class="empty-state">
            <q-icon name="groups" size="48px" color="grey-6" />
            <div class="text-subtitle1 text-weight-medium q-mt-sm">
              Aún no tienes empleados registrados
            </div>
            <div class="text-caption text-grey-7">
              Agrega el primero para comenzar a organizar el equipo.
            </div>
          </div>

          <div v-else class="workers-grid">
            <q-card v-for="worker in workers" :key="worker.id" class="worker-card">
              <q-card-section>
                <div class="row items-center justify-between q-col-gutter-md">
                  <div class="row items-center q-col-gutter-sm no-wrap">
                    <div class="col-auto">
                      <q-avatar color="primary" text-color="white">
                        {{ getInitial(worker.name) }}
                      </q-avatar>
                    </div>
                    <div class="col">
                      <div class="text-weight-medium">{{ worker.name }}</div>
                      <div class="q-mt-xs">
                        <q-chip
                          v-if="worker.isDefault"
                          dense
                          color="blue-grey-2"
                          text-color="blue-grey-9"
                          size="sm"
                        >
                          Predeterminado
                        </q-chip>
                        <span v-else class="text-caption text-grey-7">Empleado activo</span>
                      </div>
                    </div>
                  </div>

                  <div class="row items-center no-wrap q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      aria-label="Editar empleado"
                      @click="openEditDialog(worker)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      :disable="worker.isDefault"
                      aria-label="Eliminar empleado"
                      @click="confirmDelete(worker)"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-scroll-area>
    </section>

    <q-dialog v-model="workerDialogOpen">
      <q-card class="worker-dialog q-pa-sm">
        <q-card-section class="q-pb-none">
          <div class="text-h6">
            {{ isEditMode ? 'Editar empleado' : 'Agregar empleado' }}
          </div>
          <div class="text-caption text-grey-7">
            Escribe el nombre para {{ isEditMode ? 'actualizar' : 'crear' }} el empleado.
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="workerForm.name"
            outlined
            label="Nombre"
            :rules="[
              (val) => !!val || 'Requerido',
              (val) => val.trim().length >= 2 || 'Mínimo 2 caracteres',
            ]"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="positive"
            :label="isEditMode ? 'Guardar cambios' : 'Crear empleado'"
            :loading="isSubmitting"
            @click="submitWorker"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useWorkers } from 'src/composables/workers/useWorkers';
import { useAuthStore } from 'src/stores/auth-store';
import type { WorkerItem } from 'src/api/workers-api';
import { useSeo } from 'src/composables/seo/useSeo';

useSeo({
  title: 'Mis empleados | Peluquería Pecas',
  description: 'Gestión interna del equipo de Peluquería Pecas.',
  path: '/mis-empleados',
  noindex: true,
});

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
const {
  workers,
  isLoading,
  createWorkerMutation,
  updateWorkerMutation,
  removeWorkerMutation,
} = useWorkers();

const scrollThumbStyle = {
  right: '2px',
  borderRadius: '8px',
  backgroundColor: 'rgba(80, 80, 80, 0.22)',
  width: '6px',
  opacity: '0.9',
};

const scrollBarStyle = {
  right: '2px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
  width: '6px',
  opacity: '0.25',
};

const workerDialogOpen = ref(false);
const isEditMode = ref(false);
const editingWorkerId = ref('');
const isCompactAction = ref(
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 680px)').matches : false,
);

const workerForm = reactive({
  name: '',
});

const isSubmitting = computed(
  () => createWorkerMutation.isPending.value || updateWorkerMutation.isPending.value,
);

const resetForm = () => {
  workerForm.name = '';
  editingWorkerId.value = '';
  isEditMode.value = false;
};

const getInitial = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();

const getErrorMessage = (err: unknown, fallback: string) => {
  const msg = (err as ApiError)?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg || fallback;
};

const openCreateDialog = () => {
  if (!authStore.isAdmin) return;
  resetForm();
  workerDialogOpen.value = true;
};

const openEditDialog = (worker: WorkerItem) => {
  if (!authStore.isAdmin) return;
  workerForm.name = worker.name;
  editingWorkerId.value = worker.id;
  isEditMode.value = true;
  workerDialogOpen.value = true;
};

const submitWorker = async () => {
  if (!authStore.isAdmin || isSubmitting.value) return;

  const payload = {
    name: workerForm.name.trim(),
  };
  if (!payload.name || payload.name.length < 2) return;

  try {
    if (isEditMode.value && editingWorkerId.value) {
      await updateWorkerMutation.mutateAsync({
        id: editingWorkerId.value,
        body: payload,
      });
      $q.notify({
        type: 'positive',
        message: 'Empleado actualizado',
      });
    } else {
      await createWorkerMutation.mutateAsync(payload);
      $q.notify({
        type: 'positive',
        message: 'Empleado creado',
      });
    }

    workerDialogOpen.value = false;
    resetForm();
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: getErrorMessage(err, 'No se pudo guardar el empleado'),
    });
  }
};

const confirmDelete = (worker: WorkerItem) => {
  if (!authStore.isAdmin || worker.isDefault || removeWorkerMutation.isPending.value) return;

  $q.dialog({
    title: 'Eliminar empleado',
    message: `¿Deseas eliminar a "${worker.name}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await removeWorkerMutation.mutateAsync(worker.id);
      $q.notify({
        type: 'positive',
        message: 'Empleado eliminado',
      });
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: getErrorMessage(err, 'No se pudo eliminar el empleado'),
      });
    }
  });
};

let mediaQuery: MediaQueryList | null = null;
const syncActionButton = () => {
  if (!mediaQuery) return;
  isCompactAction.value = mediaQuery.matches;
};

onMounted(() => {
  if (!authStore.isAdmin) {
    void router.replace('/services');
    return;
  }

  mediaQuery = window.matchMedia('(max-width: 680px)');
  syncActionButton();
  mediaQuery.addEventListener('change', syncActionButton);
});

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncActionButton);
});

defineOptions({
  name: 'WorkersPage',
});
</script>

<style scoped lang="scss">
.workers-page {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(245, 245, 245, 0.48) 45%,
    rgba(250, 248, 250, 0.55) 100%
  );
}

.workers-wrap {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.workers-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 14px;
  padding: 18px;
}

.workers-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workers-scroll-area {
  height: clamp(320px, calc(100vh - 290px), 760px);
}

.workers-scroll-content {
  padding-right: 8px;
}

.workers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.worker-card {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
}

.worker-dialog {
  width: min(92vw, 460px);
  border-radius: 14px;
}

@media (max-width: 680px) {
  .workers-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .workers-header__actions {
    width: 100%;
    justify-content: space-between;
  }

  .workers-scroll-area {
    height: clamp(280px, calc(100vh - 300px), 680px);
  }
}
</style>
