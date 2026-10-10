<template>
  <div
    class="aviso-verificacion"
    :class="{ 'aviso-verificacion--movil': movil }"
    data-test="aviso-verificacion"
  >
    <div class="aviso-verificacion__fila">
      <span class="aviso-verificacion__icono" aria-hidden="true">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          focusable="false"
        >
          <path d="M3.5 6.5h17v11h-17z" />
          <path d="M3.5 7l8.5 6.5L20.5 7" />
        </svg>
      </span>
      <p class="aviso-verificacion__texto">
        <strong>Tu correo aún no está confirmado.</strong>{{ ' '
        }}<span class="aviso-verificacion__detalle"
          >Abre el enlace que te enviamos, o pide uno nuevo.</span
        >
      </p>
      <button
        type="button"
        class="aviso-verificacion__boton"
        :class="{ 'm-boton--ancho': movil }"
        data-test="reenviar-enlace"
        :disabled="enviando"
        :aria-busy="enviando ? 'true' : undefined"
        @click="reenviar"
      >
        {{ enviando ? 'Enviando…' : 'Reenviar el enlace' }}
      </button>
    </div>
    <p
      class="aviso-verificacion__estado"
      aria-live="polite"
      data-test="reenvio-estado"
    >
      {{ enviadoA ? `Te enviamos un enlace nuevo a ${enviadoA}.` : '' }}
    </p>
    <p
      v-if="error"
      class="aviso-verificacion__error"
      role="alert"
      data-test="reenvio-error"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Correo sin confirmar (plan 6, C2). Sustituye al `q-banner` naranja y al
 * aviso flotante de la página anterior: el resultado de reenviar se dice en
 * línea, debajo. El backend responde 202 siempre (`resend-verification`); un
 * error solo puede ser de red o de servidor, y se dice para reintentar.
 */
import { ref, watch } from 'vue';
import { authApi } from 'src/api/auth-api';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';

const props = withDefaults(defineProps<{ correo: string; movil?: boolean }>(), {
  movil: false,
});

const enviando = ref(false);
const enviadoA = ref('');
const error = ref('');

// Si el correo cambia (la clienta lo cambió desde «Correo»), lo dicho sobre el
// anterior ya no vale: ni «te enviamos un enlace a …» ni su error.
watch(
  () => props.correo,
  () => {
    enviadoA.value = '';
    error.value = '';
  }
);

async function reenviar() {
  if (enviando.value) return;
  enviando.value = true;
  error.value = '';
  enviadoA.value = '';
  try {
    await authApi.resendVerification(props.correo);
    enviadoA.value = props.correo;
  } catch (err: unknown) {
    error.value = errorDeCuenta(err, 'reenvio').texto;
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped lang="scss">
.aviso-verificacion {
  padding: 14px 18px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.aviso-verificacion__fila {
  display: flex;
  align-items: center;
  gap: 16px;
}

.aviso-verificacion__icono {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: 50%;
  color: var(--m-oro-profundo);
}

.aviso-verificacion__texto {
  flex-grow: 1;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.aviso-verificacion__texto strong {
  font-weight: 500;
}

.aviso-verificacion__detalle {
  color: var(--m-piedra);
}

.aviso-verificacion__boton {
  flex-shrink: 0;
  min-height: var(--m-tactil-min);
  padding: 0 20px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.aviso-verificacion__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.aviso-verificacion__boton:disabled {
  opacity: 0.55;
  cursor: default;
}

.aviso-verificacion__estado {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--m-tinta);
}

/* La región viva existe siempre (para que el lector la conozca), pero vacía no ocupa. */
.aviso-verificacion__estado:empty {
  margin: 0;
}

.aviso-verificacion__error {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--m-peligro);
}

.aviso-verificacion--movil {
  padding: 14px 16px;
}

.aviso-verificacion--movil .aviso-verificacion__fila {
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.aviso-verificacion--movil .aviso-verificacion__icono {
  width: auto;
  height: auto;
  margin-top: 2px;
  border: 0;
}

.aviso-verificacion--movil .aviso-verificacion__texto {
  flex-basis: calc(100% - 40px);
  font-size: 13.5px;
}

.aviso-verificacion--movil .aviso-verificacion__boton {
  width: 100%;
}

@media (hover: hover) and (pointer: fine) {
  .aviso-verificacion__boton:not(:disabled):hover {
    border-color: var(--m-oro);
  }
}
</style>
