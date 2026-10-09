<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from 'src/composables/auth';
import { useLoginWithGoogle } from 'src/composables/auth/useLoginWithGoogle';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { useSeo } from 'src/composables/seo/useSeo';
import { mensajeDeAcceso } from 'src/helpers/mensajes-acceso';
import { redireccionSegura } from 'src/helpers/redireccion-segura';
import { isEmail, requerido } from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import SeparadorAcceso from 'src/components/auth/SeparadorAcceso.vue';
import GoogleSignInButton from 'src/components/auth/GoogleSignInButton.vue';
import ConsentimientoGoogle from 'src/components/auth/ConsentimientoGoogle.vue';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Iniciar sesión | Peluquería Marlene',
  description: 'Accede a tu cuenta de la Peluquería Marlene.',
  noindex: true,
});

const router = useRouter();
const route = useRoute();
const { loginBody, login } = useAuth();

// Solo rutas internas (§7.7): `?redirect=//otro.sitio` sacaría a la clienta
// del portal y `?redirect=/auth/…` la devolvería aquí ya con sesión.
const destino = redireccionSegura(route.query.redirect);
const consultaDestino = computed(() =>
  typeof route.query.redirect === 'string' ? { redirect: destino } : {}
);
const restablecida = route.query.restablecida === '1';

type CampoEntrar = 'correo' | 'contrasena';

// A5: al ENTRAR solo se exige correo con formato y contraseña no vacía, que es
// lo que dice el DTO del backend (`login-user.dto.ts`). La política de
// fortaleza es para crear contraseñas, no para comprobarlas: con ella aquí,
// una contraseña antigua que no la cumpliera no dejaba ni enviar.
const formulario: FormularioAcceso<CampoEntrar> =
  useFormularioAcceso<CampoEntrar>({
    correo: [
      requerido('Escribe tu correo.'),
      isEmail('Escribe un correo válido, como tu@correo.com.'),
    ],
    contrasena: [requerido('Escribe tu contraseña.')],
  });
const { valores, errores, tocar, validarTodo } = formulario;

const enviando = ref(false);
const errorServidor = ref('');
const googleDisponible = ref(false);

const {
  handleCredential,
  error: errorGoogle,
  pidiendoConsentimiento,
  aceptarConsentimiento,
  rechazarConsentimiento,
} = useLoginWithGoogle({ redirectTo: destino });

const avisoError = computed(() => errorServidor.value || errorGoogle.value);

async function entrar() {
  if (enviando.value) return;
  errorServidor.value = '';
  errorGoogle.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  loginBody.value = {
    email: valores.correo.value.trim(),
    password: valores.contrasena.value,
  };
  try {
    await login();
    await router.push({ path: destino });
  } catch (err: unknown) {
    errorServidor.value = mensajeDeAcceso(err, 'entrar');
  } finally {
    enviando.value = false;
  }
}

function alCredencialGoogle(idToken: string) {
  errorServidor.value = '';
  void handleCredential(idToken);
}
</script>

<template>
  <div class="acceso-pagina">
    <p class="acceso-antetitulo">Tu cuenta</p>
    <h1 class="acceso-titulo">Hola de nuevo</h1>
    <p class="acceso-entradilla">
      Entra para reservar más rápido y ver tus citas.
    </p>

    <aviso-acceso
      v-if="restablecida"
      variante="tranquilo"
      class="entrar__restablecida"
    >
      Tu contraseña quedó cambiada. Entra con la nueva.
    </aviso-acceso>

    <google-sign-in-button
      @credential="alCredencialGoogle"
      @disponible="googleDisponible = $event"
    />
    <separador-acceso v-if="googleDisponible" texto="o con tu correo" />

    <form novalidate @submit.prevent="entrar">
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
      <campo-acceso
        id="contrasena"
        v-model="valores.contrasena.value"
        rotulo="Contraseña"
        tipo="password"
        autocomplete="current-password"
        :error="errores.contrasena"
        :describedby="avisoError ? 'aviso-entrar' : undefined"
        @blur="tocar('contrasena')"
      >
        <template #accesorio>
          <router-link
            :to="{ name: 'forgot-password' }"
            class="acceso-enlace acceso-enlace--suelto"
            data-test="olvidaste"
            >¿La olvidaste?</router-link
          >
        </template>
      </campo-acceso>

      <aviso-acceso v-if="avisoError" id="aviso-entrar" class="entrar__aviso">
        {{ avisoError }}
      </aviso-acceso>

      <button
        type="submit"
        class="acceso-boton m-boton--ancho"
        data-test="enviar"
        :disabled="enviando"
        :aria-busy="enviando ? 'true' : undefined"
      >
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <p class="acceso-pie-formulario">
      ¿Primera vez?
      <router-link
        :to="{ name: 'register', query: consultaDestino }"
        class="acceso-enlace"
        data-test="crear-cuenta"
        >Crea tu cuenta</router-link
      >
    </p>

    <consentimiento-google
      :abierto="pidiendoConsentimiento"
      @aceptar="aceptarConsentimiento"
      @cancelar="rechazarConsentimiento"
    />
  </div>
</template>

<style scoped>
.entrar__restablecida {
  margin-bottom: 20px;
}

.entrar__aviso {
  margin-top: 14px;
}
</style>
