<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import { useLoginWithGoogle } from 'src/composables/auth/useLoginWithGoogle';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { useSeo } from 'src/composables/seo/useSeo';
import { mensajeDeAcceso } from 'src/helpers/mensajes-acceso';
import { redireccionSegura } from 'src/helpers/redireccion-segura';
import {
  hasLowercase,
  hasNumber,
  hasUppercase,
  isEmail,
  matches,
  minLength,
  minTrimmedLength,
  requerido,
} from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import ReglasContrasena from 'src/components/auth/ReglasContrasena.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import SeparadorAcceso from 'src/components/auth/SeparadorAcceso.vue';
import GoogleSignInButton from 'src/components/auth/GoogleSignInButton.vue';

// Página privada: se sirve como SPA (excluida del SSG) y no debe indexarse.
useSeo({
  title: 'Crear cuenta | Peluquería Marlene',
  description: 'Crea tu cuenta para gestionar tus reservas en la Peluquería Marlene.',
  noindex: true,
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// A12: el registro también vuelve adonde la clienta iba (el menú manda
// `redirect` a «Crear cuenta»). Solo rutas internas (§7.7).
const destino = redireccionSegura(route.query.redirect);
const consultaDestino = computed(() =>
  typeof route.query.redirect === 'string' ? { redirect: destino } : {}
);

type CampoRegistro = 'nombre' | 'correo' | 'contrasena' | 'repetida';

const formulario: FormularioAcceso<CampoRegistro> =
  useFormularioAcceso<CampoRegistro>({
    nombre: [
      requerido('Escribe tu nombre.'),
      minTrimmedLength(3, 'Escribe tu nombre completo (3 letras o más).'),
    ],
    correo: [
      requerido('Escribe tu correo.'),
      isEmail('Escribe un correo válido, como tu@correo.com.'),
    ],
    // La misma política que valida el backend (`CreateUserDto`).
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

// S9: nunca premarcada. Sin ella no se crea cuenta, ni por formulario ni por
// Google.
const aceptaPolitica = ref(false);
const enviando = ref(false);
const errorServidor = ref('');
const googleDisponible = ref(false);

const { handleCredential, error: errorGoogle } = useLoginWithGoogle({
  redirectTo: destino,
});

const avisoError = computed(() => errorServidor.value || errorGoogle.value);

async function crearCuenta() {
  if (enviando.value || !aceptaPolitica.value) return;
  errorServidor.value = '';
  errorGoogle.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  try {
    const data = await authApi.register({
      fullName: valores.nombre.value.trim(),
      email: valores.correo.value.trim(),
      password: valores.contrasena.value,
      // Obligatorio en el backend: deja constancia auditable de la aceptación
      // de la Política de Tratamiento de Datos Personales (Ley 1581 de 2012).
      dataPolicyAccepted: aceptaPolitica.value,
    });
    authStore.setSession(
      data.token,
      {
        fullName: data.fullName,
        email: data.email,
        roles: data.roles ?? ['user'],
        emailVerified: data.emailVerified,
      },
      data.expiresIn * 1000 + Date.now()
    );
    await router.push({ path: destino });
  } catch (err: unknown) {
    errorServidor.value = mensajeDeAcceso(err, 'registro');
  } finally {
    enviando.value = false;
  }
}

function alCredencialGoogle(idToken: string) {
  // S9: el botón de Google se apaga con `pointer-events`, pero su iframe sigue
  // al alcance del teclado. Sin la casilla, la credencial se descarta:
  // registrarse por Google no puede ser una puerta trasera al consentimiento.
  if (!aceptaPolitica.value) return;
  errorServidor.value = '';
  void handleCredential(idToken, true);
}
</script>

<template>
  <div class="acceso-pagina">
    <h1 class="acceso-titulo registro__titulo">Crea tu cuenta</h1>

    <form novalidate @submit.prevent="crearCuenta">
      <campo-acceso
        id="nombre"
        v-model="valores.nombre.value"
        rotulo="Nombre completo"
        tipo="text"
        autocomplete="name"
        :error="errores.nombre"
        @blur="tocar('nombre')"
      />
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
        autocomplete="new-password"
        describedby="reglas-contrasena"
        :error="errores.contrasena"
        @blur="tocar('contrasena')"
      />
      <reglas-contrasena :valor="valores.contrasena.value" />
      <campo-acceso
        id="repetida"
        v-model="valores.repetida.value"
        rotulo="Repite la contraseña"
        tipo="password"
        autocomplete="new-password"
        :error="errores.repetida"
        @blur="tocar('repetida')"
      />

      <label class="registro__consentimiento" for="consentimiento">
        <input
          id="consentimiento"
          v-model="aceptaPolitica"
          type="checkbox"
          class="registro__casilla"
          data-test="consentimiento"
        />
        <span data-test="texto-consentimiento">
          He leído y acepto la
          <router-link
            :to="{ name: 'privacy-policy' }"
            target="_blank"
            rel="noopener"
            class="acceso-enlace"
            >política de tratamiento de datos</router-link
          >
          (Ley 1581 de 2012).
        </span>
      </label>

      <aviso-acceso v-if="avisoError" class="registro__aviso">
        {{ avisoError }}
      </aviso-acceso>

      <button
        type="submit"
        class="acceso-boton m-boton--ancho"
        data-test="enviar"
        :disabled="!aceptaPolitica || enviando"
        :aria-busy="enviando ? 'true' : undefined"
      >
        {{ enviando ? 'Creando tu cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <separador-acceso v-if="googleDisponible" texto="o" />
    <google-sign-in-button
      :disabled="!aceptaPolitica"
      @credential="alCredencialGoogle"
      @disponible="googleDisponible = $event"
    />
    <p
      v-if="googleDisponible && !aceptaPolitica"
      class="acceso-nota"
      data-test="nota-google"
    >
      Marca la casilla para seguir.
    </p>

    <p class="acceso-pie-formulario">
      ¿Ya tienes cuenta?
      <router-link
        :to="{ name: 'login', query: consultaDestino }"
        class="acceso-enlace"
        data-test="ir-a-entrar"
        >Entra</router-link
      >
    </p>
  </div>
</template>

<style scoped>
.registro__titulo {
  margin-bottom: 18px;
}

.registro__consentimiento {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: var(--m-tactil-min);
  margin-top: 16px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--m-piedra);
  cursor: pointer;
}

.registro__casilla {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin: 1px 0 0;
  accent-color: var(--m-tinta);
  cursor: pointer;
}

.registro__casilla:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

.registro__aviso {
  margin-top: 14px;
}
</style>
