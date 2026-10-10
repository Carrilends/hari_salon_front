<template>
  <marco-seccion
    antetitulo="Correo"
    titulo="Cambiar tu correo"
    :entradilla="tieneContrasena ? ENTRADILLA : ''"
    :movil="movil"
  >
    <p class="correo__rotulo">Correo actual</p>
    <p class="correo__actual" data-test="correo-actual">
      {{ authStore.email }}
    </p>

    <form
      v-if="tieneContrasena"
      novalidate
      data-test="form-correo"
      @submit.prevent="guardar"
    >
      <campo-acceso
        id="correo"
        v-model="valores.correo.value"
        rotulo="Nuevo correo"
        tipo="email"
        autocomplete="email"
        marcador="tu@correo.com"
        :error="errores.correo"
        @blur="tocar('correo')"
      />
      <campo-acceso
        id="clave"
        v-model="valores.clave.value"
        rotulo="Tu contraseña actual"
        tipo="password"
        autocomplete="current-password"
        describedby="clave-nota"
        :error="errores.clave || errorClave"
        @blur="tocar('clave')"
      />
      <p id="clave-nota" class="correo__nota">
        La pedimos para confirmar que eres tú.
      </p>
      <aviso-acceso v-if="errorServidor" class="cuenta-aviso">{{
        errorServidor
      }}</aviso-acceso>
      <aviso-acceso v-if="logro" variante="tranquilo" class="cuenta-aviso">{{
        logro
      }}</aviso-acceso>
      <acciones-cuenta
        texto-guardar="Guardar correo"
        :enviando="enviando"
        :con-descartar="!movil"
        :ancho="movil"
        @descartar="descartar"
      />
    </form>

    <div v-else class="correo__google" data-test="correo-google">
      <p class="correo__texto">
        Para cambiar el correo de una cuenta de Google, primero crea una
        contraseña: la pedimos para confirmar que eres tú.
      </p>
      <router-link
        :to="{ query: { seccion: 'contrasena' } }"
        class="correo__enlace"
        data-test="ir-a-crear-contrasena"
      >
        <span class="correo__enlace-texto">Crear una contraseña</span>
        <span aria-hidden="true">→</span>
      </router-link>
    </div>
  </marco-seccion>
</template>

<script setup lang="ts">
/**
 * Correo (plan 6, C1–C3). El backend cambia el correo AL GUARDAR y lo deja
 * sin verificar (`UserAccount.changeEmail`): la entradilla lo dice así (el
 * tablero decía que la dirección vieja seguía valiendo; corregido). Pide la
 * contraseña actual, así que una cuenta de Google sin contraseña no puede
 * cambiarlo: se la manda a «Contraseña» a crear una.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { aplicarSesion } from 'src/composables/cuenta/aplicarSesion';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';
import { isEmail, requerido } from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import MarcoSeccion from 'src/components/cuenta/MarcoSeccion.vue';
import AccionesCuenta from 'src/components/cuenta/AccionesCuenta.vue';

withDefaults(defineProps<{ movil?: boolean }>(), { movil: false });

const ENTRADILLA =
  'Te enviaremos un enlace a la dirección nueva para confirmarla. En cuanto guardes, entrarás con ella.';

const authStore = useAuthStore();
/** `null` (no se sabe aún) cuenta como «sí»: es el caso común. */
const tieneContrasena = computed(() => authStore.hasPassword !== false);

type CampoCorreo = 'correo' | 'clave';

const formulario: FormularioAcceso<CampoCorreo> =
  useFormularioAcceso<CampoCorreo>({
    correo: [
      requerido('Escribe el correo nuevo.'),
      isEmail('Escribe un correo válido, como tu@correo.com.'),
      (valor: string) =>
        valor.trim().toLowerCase() !== authStore.email.trim().toLowerCase() ||
        'Ese ya es tu correo.',
    ],
    clave: [requerido('Escribe tu contraseña actual.')],
  });
const { valores, errores, tocar, validarTodo, reiniciar } = formulario;

const enviando = ref(false);
const errorServidor = ref('');
/** El 401 del servidor: es de la contraseña, y va en su campo. */
const errorClave = ref('');
const logro = ref('');

watch(
  () => valores.clave.value,
  () => {
    errorClave.value = '';
  }
);

function descartar() {
  reiniciar();
  errorServidor.value = '';
  errorClave.value = '';
  logro.value = '';
}

async function guardar() {
  if (enviando.value) return;
  errorServidor.value = '';
  errorClave.value = '';
  logro.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  try {
    const sesion = await authApi.updateEmail({
      newEmail: valores.correo.value.trim(),
      currentPassword: valores.clave.value,
    });
    aplicarSesion(sesion);
    reiniciar();
    logro.value = `Listo: ahora entras con ${sesion.email}. Te enviamos un enlace para confirmarlo.`;
  } catch (err: unknown) {
    const { texto, campo } = errorDeCuenta(err, 'correo');
    if (campo === 'contrasena-actual') {
      errorClave.value = texto;
      await nextTick();
      enfocarCampo('clave');
    } else {
      errorServidor.value = texto;
    }
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped lang="scss">
.correo__rotulo {
  margin: 0 0 7px;
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
}

.correo__actual {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 48px;
  margin: 0 0 18px;
  padding: 10px 14px;
  border: var(--m-filete-grosor) dashed var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  font-family: var(--m-font-sans);
  font-size: 15px;
  color: var(--m-piedra);
  overflow-wrap: anywhere;
}

.correo__nota {
  margin: 8px 0 0;
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  color: var(--m-piedra);
}

.correo__texto {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.correo__enlace {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--m-tactil-min);
  margin-top: 8px;
  font-family: var(--m-font-sans);
  font-size: 14px;
  color: var(--m-rosa-profundo);
  text-decoration: none;
}

.correo__enlace-texto {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.correo__enlace:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.cuenta-aviso {
  margin-top: 18px;
}

@media (hover: hover) and (pointer: fine) {
  .correo__enlace:hover .correo__enlace-texto {
    border-bottom-color: var(--m-rosa-profundo);
  }
}
</style>
