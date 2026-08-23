<template>
  <q-card
    class="assistant-chat"
    role="dialog"
    aria-label="Asistente de la Peluquería Marlene"
  >
    <header class="assistant-chat__head">
      <div>
        <div class="assistant-chat__title">Asistente Marlene</div>
        <div class="assistant-chat__sub">Asistente automático · IA</div>
      </div>
      <q-btn
        flat
        round
        dense
        icon="close"
        aria-label="Cerrar asistente"
        @click="emit('close')"
      />
    </header>

    <p class="assistant-chat__notice">{{ aviso || DEFAULT_NOTICE }}</p>

    <div ref="thread" class="assistant-chat__thread">
      <p v-if="messages.length === 0" class="assistant-chat__empty">
        ¡Hola! 👋 Pregúntame por servicios, precios o disponibilidad. Para
        reservar necesitas iniciar sesión.
      </p>

      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="['assistant-bubble', m.role]"
      >
        {{ m.content }}
      </div>

      <div
        v-if="loading"
        class="assistant-bubble assistant assistant-typing"
        aria-label="El asistente está escribiendo"
      >
        <span></span><span></span><span></span>
      </div>

      <p v-if="error" class="assistant-chat__error" role="alert">{{ error }}</p>
    </div>

    <p v-if="!auth.isLoggedIn" class="assistant-chat__login">
      Para reservar,
      <a href="#" @click.prevent="goLogin">inicia sesión</a>.
    </p>

    <form class="assistant-chat__input" @submit.prevent="onSubmit">
      <q-input
        v-model="text"
        dense
        outlined
        maxlength="500"
        placeholder="Escribe tu mensaje…"
        aria-label="Mensaje para el asistente"
        :disable="loading"
        @keyup.enter="onSubmit"
      />
      <q-btn
        type="submit"
        round
        dense
        color="pink-5"
        icon="send"
        aria-label="Enviar"
        :disable="loading || !text.trim()"
      />
    </form>
  </q-card>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useAssistant } from 'src/composables/assistant/useAssistant';

const DEFAULT_NOTICE =
  'Asistente automático. Tus mensajes se procesan con un proveedor de inteligencia artificial fuera de Colombia.';

const emit = defineEmits<{ (e: 'close'): void }>();

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { messages, loading, error, aviso, send } = useAssistant();

const text = ref('');
const thread = ref<HTMLElement | null>(null);

async function onSubmit() {
  const value = text.value;
  if (!value.trim() || loading.value) return;
  text.value = '';
  await send(value);
}

function goLogin() {
  emit('close');
  router.push({
    name: 'login',
    query: { redirect: route.fullPath || '/services' },
  });
}

function scrollToBottom() {
  const el = thread.value;
  if (el) el.scrollTop = el.scrollHeight;
}

watch(
  () => [messages.value.length, loading.value],
  () => {
    void nextTick(scrollToBottom);
  }
);
</script>

<style scoped lang="scss">
.assistant-chat {
  display: flex;
  flex-direction: column;
  width: min(92vw, 380px);
  height: min(70vh, 560px);
  border-radius: 16px;
  overflow: hidden;
}

.assistant-chat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(100deg, #f8bbd0 0%, #bdc9d7 90%);
  color: #2a2a2a;
}

.assistant-chat__title {
  font-weight: 700;
  line-height: 1.1;
}

.assistant-chat__sub {
  font-size: 0.72rem;
  opacity: 0.75;
}

.assistant-chat__notice {
  margin: 0;
  padding: 6px 14px;
  font-size: 0.68rem;
  color: #6a6a6a;
  background: #fbfbfd;
  border-bottom: 1px solid #eceef1;
}

.assistant-chat__thread {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
}

.assistant-chat__empty {
  margin: auto 0;
  color: #8a8a8a;
  font-size: 0.9rem;
  text-align: center;
}

.assistant-bubble {
  max-width: 82%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 0.92rem;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.assistant-bubble.user {
  align-self: flex-end;
  background: #f48fb1;
  color: #241016;
  border-bottom-right-radius: 4px;
}

.assistant-bubble.assistant {
  align-self: flex-start;
  background: #eef1f4;
  color: #22282f;
  border-bottom-left-radius: 4px;
}

.assistant-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.assistant-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9aa4ad;
  animation: assistant-blink 1.2s infinite ease-in-out both;
}

.assistant-typing span:nth-child(2) {
  animation-delay: 0.18s;
}

.assistant-typing span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes assistant-blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .assistant-typing span {
    animation: none;
  }
}

.assistant-chat__error {
  margin: 0;
  color: #b3261e;
  font-size: 0.85rem;
}

.assistant-chat__login {
  margin: 0;
  padding: 6px 14px;
  font-size: 0.82rem;
  background: #fff7fa;
  border-top: 1px solid #f2e6ec;
}

.assistant-chat__input {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-top: 1px solid #eceef1;
  background: #fafafa;
}

.assistant-chat__input :deep(.q-field) {
  flex: 1;
}
</style>
