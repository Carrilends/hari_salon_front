<script lang="ts" setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResetPassword } from 'src/composables/auth/useResetPassword';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { useSeo } from 'src/composables/seo/useSeo';
import { estadoDeError, mensajeDeAcceso } from 'src/helpers/mensajes-acceso';
import {
  hasLowercase,
  hasNumber,
  hasUppercase,
  matches,
  minLength,
  requerido,
} from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import ReglasContrasena from 'src/components/auth/ReglasContrasena.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import EstadoAcceso from 'src/components/auth/EstadoAcceso.vue';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Restablecer contraseña | Peluquería Marlene',
  description: 'Elige una nueva contraseña para tu cuenta.',
  noindex: true,
});

const route = useRoute();
const router = useRouter();
const { submit } = useResetPassword();

const token = typeof route.query.token === 'string' ? route.query.token : '';
// A14: sin token, el mismo estado que un enlace caducado o usado.
const enlaceInvalido = ref(!token);

type CampoRestablecer = 'contrasena' | 'repetida';

const formulario: FormularioAcceso<CampoRestablecer> =
  useFormularioAcceso<CampoRestablecer>({
    // La misma política que valida el backend (`ResetPasswordDto`).
    contrasena: [
      requerido('Elige una contraseña.'),
      minLength(8, 'Usa 8 caracteres o más.'),
      hasUppercase('Añade una mayúscula.'),
      hasLowercase('Añade una minúscula.'),
      hasNumber('Añade un número.'),
    ],
    repetida: [
      requerido('Repite la contraseña.'),
      matches(
        () => formulario.valores.contrasena.value,
        'Las contraseñas no coinciden.'
      ),
    ],
  });
const { valores, errores, tocar, validarTodo } = formulario;

const enviando = ref(false);
const errorServidor = ref('');

async function guardar() {
  if (enviando.value) return;
  errorServidor.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  try {
    await submit({ token, newPassword: valores.contrasena.value });
    // A15: el backend revoca todas las sesiones y no abre una nueva: se vuelve
    // a entrar con la contraseña nueva, y el login lo dice con calma.
    await router.push({ name: 'login', query: { restablecida: '1' } });
  } catch (err: unknown) {
    // Enlace inexistente, caducado o usado responden 400 a propósito (no se
    // revela cuál). Cualquier otra cosa —la red, el servidor— no es culpa del
    // enlace: se dice en línea y se puede volver a intentar.
    if (estadoDeError(err) === 400) {
      enlaceInvalido.value = true;
    } else {
      errorServidor.value = mensajeDeAcceso(err, 'restablecer');
    }
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <estado-acceso
    v-if="enlaceInvalido"
    tono="peligro"
    titulo="Este enlace ya no sirve"
  >
    <template #icono>
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9.5 14.5l-1.8 1.8a3.2 3.2 0 0 1-4.5-4.5l2.6-2.6a3.2 3.2 0 0 1 4.2-.3" />
        <path d="M14.5 9.5l1.8-1.8a3.2 3.2 0 0 1 4.5 4.5l-2.6 2.6a3.2 3.2 0 0 1-4.2.3" />
        <path d="M8 4.5v2M4.5 8h2M16 19.5v-2M19.5 16h-2" />
      </svg>
    </template>

    <p>
      Puede que haya vencido o que ya lo hayas usado: cada enlace funciona una
      sola vez.
    </p>

    <template #acciones>
      <router-link
        :to="{ name: 'forgot-password' }"
        class="acceso-boton m-boton m-boton--ancho"
        data-test="pedir-otro-enlace"
        >Pedir otro enlace</router-link
      >
      <router-link :to="{ name: 'login' }" class="acceso-secundario"
        >Volver a entrar</router-link
      >
    </template>
  </estado-acceso>

  <div v-else class="acceso-pagina">
    <p class="acceso-antetitulo">Restablecer</p>
    <h1 class="acceso-titulo">Elige una contraseña nueva</h1>
    <p class="acceso-entradilla">
      Al guardarla se cierran tus sesiones abiertas y vuelves a entrar con la
      nueva.
    </p>

    <form novalidate @submit.prevent="guardar">
      <campo-acceso
        id="contrasena"
        v-model="valores.contrasena.value"
        rotulo="Contraseña nueva"
        tipo="password"
        autocomplete="new-password"
        describedby="reglas-contrasena"
        :error="errores.contrasena"
        @blur="tocar('contrasena')"
      />
      <reglas-contrasena :valor="valores.contrasena.value" />
      <campo-acceso
        id="repetida"
        v-model="valores.repetida.value"
        rotulo="Repítela"
        tipo="password"
        autocomplete="new-password"
        :error="errores.repetida"
        @blur="tocar('repetida')"
      />

      <aviso-acceso v-if="errorServidor" class="restablecer__aviso">
        {{ errorServidor }}
      </aviso-acceso>

      <button
        type="submit"
        class="acceso-boton m-boton--ancho"
        data-test="enviar"
        :disabled="enviando"
        :aria-busy="enviando ? 'true' : undefined"
      >
        {{ enviando ? 'Guardando…' : 'Guardar contraseña' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.restablecer__aviso {
  margin-top: 14px;
}
</style>
