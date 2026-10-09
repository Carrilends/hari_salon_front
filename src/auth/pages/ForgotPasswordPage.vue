<script lang="ts" setup>
import { ref } from 'vue';
import { useForgotPassword } from 'src/composables/auth/useForgotPassword';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { useSeo } from 'src/composables/seo/useSeo';
import { isEmail, requerido } from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import EstadoAcceso from 'src/components/auth/EstadoAcceso.vue';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Recuperar contraseña | Peluquería Marlene',
  description: 'Solicita un enlace para restablecer tu contraseña.',
  noindex: true,
});

const { email, sent, submit } = useForgotPassword();

type CampoRecuperar = 'correo';

const formulario: FormularioAcceso<CampoRecuperar> =
  useFormularioAcceso<CampoRecuperar>({
    correo: [
      requerido('Escribe tu correo.'),
      isEmail('Escribe un correo válido, como tu@correo.com.'),
    ],
  });
const { valores, errores, tocar, validarTodo } = formulario;

const enviando = ref(false);
const reenviando = ref(false);
const reenviado = ref(false);

/**
 * Respuesta deliberadamente neutra (§7.2): el backend contesta igual exista o
 * no la cuenta, y la interfaz no puede ser más habladora que él. Un error,
 * también de red, se traga y se muestra como el éxito.
 */
async function pedirEnlace() {
  try {
    await submit();
  } catch {
    /* neutra: ver arriba */
  }
}

async function enviar() {
  if (enviando.value) return;
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  email.value = valores.correo.value.trim();
  await pedirEnlace();
  sent.value = true;
  enviando.value = false;
}

async function reenviar() {
  if (reenviando.value) return;
  reenviando.value = true;
  reenviado.value = false;
  await pedirEnlace();
  reenviado.value = true;
  reenviando.value = false;
}
</script>

<template>
  <div v-if="!sent" class="acceso-pagina">
    <h1 class="acceso-titulo">Recupera tu contraseña</h1>
    <p class="acceso-entradilla">Te enviamos un enlace para elegir una nueva.</p>

    <form novalidate @submit.prevent="enviar">
      <campo-acceso
        id="correo"
        v-model="valores.correo.value"
        rotulo="Correo"
        tipo="email"
        autocomplete="email"
        marcador="tu@correo.com"
        :error="errores.correo"
        @blur="tocar('correo')"
      />
      <button
        type="submit"
        class="acceso-boton m-boton--ancho"
        data-test="enviar"
        :disabled="enviando"
        :aria-busy="enviando ? 'true' : undefined"
      >
        {{ enviando ? 'Enviando…' : 'Enviar enlace' }}
      </button>
    </form>
  </div>

  <estado-acceso
    v-else
    tono="oro"
    antetitulo="Recuperar contraseña"
    titulo="Revisa tu correo"
  >
    <template #icono>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M3.5 6.5h17v11h-17z" />
        <path d="M3.5 7l8.5 6.5L20.5 7" />
      </svg>
    </template>

    <p>Si <strong data-test="correo-enviado">{{ email }}</strong> tiene cuenta, te llegó un enlace para elegir una contraseña nueva. Sirve una sola vez.</p>

    <template #acciones>
      <router-link
        :to="{ name: 'login' }"
        class="acceso-boton m-boton m-boton--ancho"
        data-test="volver-a-entrar"
        >Volver a entrar</router-link
      >
      <p class="recuperar__reenvio">
        ¿No llegó? Mira en correo no deseado o
        <button
          type="button"
          class="acceso-enlace m-boton-plano"
          data-test="reenviar"
          :disabled="reenviando"
          @click="reenviar"
        >envíalo otra vez</button>.
      </p>
      <p class="acceso-vivo" aria-live="polite" data-test="reenvio-estado">
        {{ reenviado ? 'Te lo enviamos otra vez.' : '' }}
      </p>
    </template>
  </estado-acceso>
</template>

<style scoped>
.recuperar__reenvio {
  margin: 18px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--m-piedra);
}
</style>
