<template>
  <q-page class="faq-page q-px-md q-py-lg">
    <section class="faq-wrap">
      <div class="faq-header">
        <div>
          <h1 class="text-h4 text-weight-bold q-my-none">Preguntas frecuentes</h1>
          <p class="text-grey-7 q-mt-sm q-mb-none">
            Resolvemos las dudas más comunes para que reserves con confianza.
          </p>
        </div>
        <div class="faq-header__actions">
          <div class="text-caption text-grey-7">
            {{ faqs.length }} pregunta{{ faqs.length === 1 ? '' : 's' }}
          </div>
          <q-btn
            v-if="authStore.isAdmin"
            color="indigo-5"
            icon="add"
            :label="isCompactAction ? undefined : 'Agregar pregunta'"
            :round="isCompactAction"
            :rounded="!isCompactAction"
            :aria-label="'Agregar pregunta frecuente'"
            @click="openCreateDialog"
          />
        </div>
      </div>

      <q-scroll-area
        class="faq-scroll-area"
        :thumb-style="scrollThumbStyle"
        :bar-style="scrollBarStyle"
        visible
      >
        <div class="faq-scroll-content">
          <div v-if="isLoading" class="faq-loading-list">
            <q-card v-for="index in 5" :key="index" class="faq-item">
              <q-card-section>
                <q-skeleton type="text" width="70%" />
                <q-skeleton type="text" class="q-mt-sm" />
                <q-skeleton type="text" width="45%" />
              </q-card-section>
            </q-card>
          </div>

          <div v-else-if="!faqs.length" class="empty-state">
            <q-icon name="help_outline" size="48px" color="grey-6" />
            <div class="text-subtitle1 text-weight-medium q-mt-sm">
              Aún no hay preguntas frecuentes
            </div>
            <div class="text-caption text-grey-7">
              {{
                authStore.isAdmin
                  ? 'Agrega la primera pregunta para tus clientes.'
                  : 'Vuelve pronto para conocer más información.'
              }}
            </div>
          </div>

          <q-list v-else class="faq-list">
            <q-expansion-item
              v-for="faq in faqs"
              :key="faq.id"
              class="faq-item"
              expand-separator
              switch-toggle-side
            >
              <template #header>
                <q-item-section>
                  <q-item-label class="text-weight-medium faq-question">{{ faq.question }}</q-item-label>
                  <q-item-label class="text-caption text-grey-7">
                    Orden: {{ faq.sortOrder }}
                  </q-item-label>
                </q-item-section>
                <q-item-section v-if="authStore.isAdmin" side class="faq-admin-actions">
                  <div class="row items-center no-wrap q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      aria-label="Editar pregunta frecuente"
                      @click.stop="openEditDialog(faq)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      aria-label="Eliminar pregunta frecuente"
                      @click.stop="confirmDelete(faq)"
                    />
                  </div>
                </q-item-section>
              </template>

              <q-card-section class="faq-answer">
                {{ faq.answer }}
              </q-card-section>
            </q-expansion-item>
          </q-list>
        </div>
      </q-scroll-area>
    </section>

    <q-dialog v-model="faqDialogOpen">
      <q-card class="faq-dialog q-pa-sm">
        <q-card-section class="q-pb-none">
          <div class="text-h6">
            {{ isEditMode ? 'Editar pregunta frecuente' : 'Agregar pregunta frecuente' }}
          </div>
          <div class="text-caption text-grey-7">
            Completa la pregunta y su respuesta para mostrarla a tus clientes.
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input
            v-model="faqForm.question"
            outlined
            label="Pregunta"
            :rules="[
              (val) => !!val || 'Requerido',
              (val) => val.trim().length >= 5 || 'Mínimo 5 caracteres',
            ]"
          />
          <q-input
            v-model="faqForm.answer"
            outlined
            type="textarea"
            autogrow
            label="Respuesta"
            :rules="[
              (val) => !!val || 'Requerido',
              (val) => val.trim().length >= 5 || 'Mínimo 5 caracteres',
            ]"
          />
          <q-input
            v-model.number="faqForm.sortOrder"
            outlined
            type="number"
            min="0"
            label="Orden"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="positive"
            :label="isEditMode ? 'Guardar cambios' : 'Crear pregunta'"
            :loading="isSubmitting"
            @click="submitFaq"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useFaqs } from 'src/composables/faqs/useFaqs';
import { useAuthStore } from 'src/stores/auth-store';
import type { CreateFaqBody, FaqItem } from 'src/api/apiTypes';
import { useSeo } from 'src/composables/seo/useSeo';
import { faqPageSchema } from 'src/composables/seo/structuredData';

const authStore = useAuthStore();
const $q = useQuasar();
const { faqs, isLoading, createFaqMutation, updateFaqMutation, removeFaqMutation } = useFaqs();

useSeo({
  title: 'Preguntas frecuentes | Peluquería Marlene',
  description:
    'Resolvemos las dudas más comunes sobre reservas, servicios, pagos y atención en Peluquería Marlene.',
  path: '/preguntas-frecuentes',
  jsonLd: computed(() =>
    faqPageSchema(
      (faqs.value || []).map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      })),
    ),
  ),
});

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

const faqDialogOpen = ref(false);
const isEditMode = ref(false);
const editingFaqId = ref('');
const isCompactAction = ref(
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 680px)').matches : false,
);

const faqForm = reactive<CreateFaqBody>({
  question: '',
  answer: '',
  sortOrder: 0,
});

const isSubmitting = computed(
  () => createFaqMutation.isPending.value || updateFaqMutation.isPending.value,
);

const resetForm = () => {
  faqForm.question = '';
  faqForm.answer = '';
  faqForm.sortOrder = 0;
  editingFaqId.value = '';
  isEditMode.value = false;
};

const openCreateDialog = () => {
  if (!authStore.isAdmin) return;
  resetForm();
  faqDialogOpen.value = true;
};

const openEditDialog = (faq: FaqItem) => {
  if (!authStore.isAdmin) return;
  faqForm.question = faq.question;
  faqForm.answer = faq.answer;
  faqForm.sortOrder = faq.sortOrder;
  editingFaqId.value = faq.id;
  isEditMode.value = true;
  faqDialogOpen.value = true;
};

const submitFaq = async () => {
  if (!authStore.isAdmin || isSubmitting.value) return;

  const payload: CreateFaqBody = {
    question: faqForm.question.trim(),
    answer: faqForm.answer.trim(),
    sortOrder: Number(faqForm.sortOrder ?? 0),
  };

  if (!payload.question || payload.question.length < 5) return;
  if (!payload.answer || payload.answer.length < 5) return;

  try {
    if (isEditMode.value && editingFaqId.value) {
      await updateFaqMutation.mutateAsync({
        id: editingFaqId.value,
        body: payload,
      });
      $q.notify({
        type: 'positive',
        message: 'Pregunta frecuente actualizada',
      });
    } else {
      await createFaqMutation.mutateAsync(payload);
      $q.notify({
        type: 'positive',
        message: 'Pregunta frecuente creada',
      });
    }

    faqDialogOpen.value = false;
    resetForm();
  } catch {
    $q.notify({
      type: 'negative',
      message: 'No se pudo guardar la pregunta frecuente',
    });
  }
};

const confirmDelete = (faq: FaqItem) => {
  if (!authStore.isAdmin || removeFaqMutation.isPending.value) return;

  $q.dialog({
    title: 'Eliminar pregunta',
    message: `¿Deseas eliminar "${faq.question}"?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await removeFaqMutation.mutateAsync(faq.id);
      $q.notify({
        type: 'positive',
        message: 'Pregunta frecuente eliminada',
      });
    } catch {
      $q.notify({
        type: 'negative',
        message: 'No se pudo eliminar la pregunta frecuente',
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
  mediaQuery = window.matchMedia('(max-width: 680px)');
  syncActionButton();
  mediaQuery.addEventListener('change', syncActionButton);
});

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncActionButton);
});

defineOptions({
  name: 'FaqPage',
});
</script>

<style scoped lang="scss">
.faq-page {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(245, 245, 245, 0.48) 45%,
    rgba(250, 248, 250, 0.55) 100%
  );
}

.faq-wrap {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.faq-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 14px;
  padding: 18px;
}

.faq-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.faq-loading-list {
  display: grid;
  gap: 12px;
}

.faq-scroll-area {
  height: clamp(320px, calc(100vh - 290px), 760px);
}

.faq-scroll-content {
  padding-right: 8px;
}

.faq-list {
  display: grid;
  gap: 12px;
}

.faq-item {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.faq-item :deep(.q-item) {
  min-height: 68px;
}

.faq-question {
  line-height: 1.35;
}

.faq-admin-actions {
  margin-left: 12px;
}

.faq-answer {
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
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

.faq-dialog {
  width: min(92vw, 560px);
  border-radius: 14px;
}

@media (max-width: 680px) {
  .faq-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .faq-header__actions {
    width: 100%;
    justify-content: space-between;
  }

  .faq-scroll-area {
    height: clamp(280px, calc(100vh - 300px), 680px);
  }
}
</style>
