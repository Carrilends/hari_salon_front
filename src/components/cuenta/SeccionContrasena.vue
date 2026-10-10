<template>
  <marco-seccion
    antetitulo="Contraseña"
    :titulo="tieneContrasena ? 'Cambiar tu contraseña' : 'Entras con Google'"
    :movil="movil"
  >
    <template v-if="tieneContrasena">
      <form novalidate data-test="form-contrasena" @submit.prevent="guardar">
        <campo-acceso
          id="actual"
          v-model="valores.actual.value"
          rotulo="Contraseña actual"
          tipo="password"
          autocomplete="current-password"
          :error="errores.actual || errorActual"
          @blur="tocar('actual')"
        />
        <campo-acceso
          id="nueva"
          v-model="valores.nueva.value"
          rotulo="Contraseña nueva"
          tipo="password"
          autocomplete="new-password"
          describedby="reglas-nueva"
          :error="errores.nueva"
          @blur="tocar('nueva')"
        />
        <reglas-contrasena id="reglas-nueva" :valor="valores.nueva.value" />
        <campo-acceso
          id="repetida"
          v-model="valores.repetida.value"
          rotulo="Repítela"
          tipo="password"
          autocomplete="new-password"
          :error="errores.repetida"
          @blur="tocar('repetida')"
        />
        <aviso-acceso v-if="errorServidor" class="cuenta-aviso">{{
          errorServidor
        }}</aviso-acceso>
        <aviso-acceso v-if="logro" variante="tranquilo" class="cuenta-aviso">{{
          logro
        }}</aviso-acceso>
        <acciones-cuenta
          texto-guardar="Guardar contraseña"
          :enviando="enviando"
          :con-descartar="!movil"
          :ancho="movil"
          @descartar="descartar"
        />
      </form>

      <p class="contrasena__olvido">
        ¿No la recuerdas?
        <button
          type="button"
          class="contrasena__enlace m-boton-plano"
          data-test="pedir-enlace"
          :disabled="enviandoEnlace"
          @click="pedirEnlace"
        >
          <span class="contrasena__enlace-texto">Te enviamos un enlace</span>
        </button>
      </p>
      <p class="contrasena__vivo" aria-live="polite" data-test="enlace-estado">
        {{
          enviadoA
            ? `Te enviamos un enlace a ${enviadoA}. Sirve una sola vez.`
            : ''
        }}
      </p>
      <aviso-acceso v-if="errorEnlace" class="cuenta-aviso">{{
        errorEnlace
      }}</aviso-acceso>
    </template>

    <template v-else>
      <div
        class="contrasena__google"
        :class="{ 'contrasena__google--movil': movil }"
        data-test="contrasena-google"
      >
        <span class="contrasena__g" aria-hidden="true">G</span>
        <p class="contrasena__google-texto">
          Tu cuenta no tiene contraseña: entras con el botón de Google, con
          <strong data-test="correo-google">{{ authStore.email }}</strong
          >.
        </p>
      </div>
      <p class="contrasena__texto">
        Si quieres entrar también con tu correo, crea una contraseña. Te
        enviamos un enlace para elegirla: sirve una sola vez y vence en 30
        minutos. Al guardarla se cierran tus sesiones abiertas y vuelves a
        entrar.
      </p>
      <aviso-acceso v-if="errorEnlace" class="cuenta-aviso">{{
        errorEnlace
      }}</aviso-acceso>
      <aviso-acceso v-if="enviadoA" variante="tranquilo" class="cuenta-aviso"
        >Te enviamos el enlace a {{ enviadoA }}. Revisa también el correo no
        deseado.</aviso-acceso
      >
      <button
        type="button"
        class="contrasena__crear"
        :class="{ 'm-boton--ancho': movil }"
        data-test="crear-contrasena"
        :disabled="enviandoEnlace"
        :aria-busy="enviandoEnlace ? 'true' : undefined"
        @click="pedirEnlace"
      >
        {{
          enviandoEnlace
            ? 'Enviando…'
            : enviadoA
            ? 'Enviar otra vez'
            : 'Crear una contraseña'
        }}
      </button>
    </template>
  </marco-seccion>
</template>

<script setup lang="ts">
/**
 * Contraseña (plan 6, C1–C3).
 *
 * Con contraseña: cambiarla con la actual, las reglas vivas del acceso
 * (`ReglasContrasena`, la misma política que `UpdatePasswordDto`) y los textos
 * de restablecer. El 401 del backend es de la contraseña actual y va en su
 * campo (tablero, móvil 2).
 *
 * Cuenta de Google sin contraseña (C3, tablero móvil 3): «Crear una
 * contraseña» pide en el sitio el enlace de restablecer al correo de la cuenta
 * (`useEnlaceContrasena`) en vez de mandar a la página de recuperar, que no
 * admite un correo prellenado. `ResetPasswordUseCase` crea la contraseña,
 * conserva Google y revoca las sesiones: el texto lo avisa.
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
import { useEnlaceContrasena } from 'src/composables/cuenta/useEnlaceContrasena';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';
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
import MarcoSeccion from 'src/components/cuenta/MarcoSeccion.vue';
import AccionesCuenta from 'src/components/cuenta/AccionesCuenta.vue';

withDefaults(defineProps<{ movil?: boolean }>(), { movil: false });

const authStore = useAuthStore();
/** `null` (no se sabe aún) cuenta como «sí»: es el caso común. */
const tieneContrasena = computed(() => authStore.hasPassword !== false);

type CampoContrasena = 'actual' | 'nueva' | 'repetida';

const formulario: FormularioAcceso<CampoContrasena> =
  useFormularioAcceso<CampoContrasena>({
    actual: [requerido('Escribe tu contraseña actual.')],
    nueva: [
      requerido('Elige una contraseña.'),
      minLength(8, 'Usa 8 caracteres o más.'),
      hasUppercase('Añade una mayúscula.'),
      hasLowercase('Añade una minúscula.'),
      hasNumber('Añade un número.'),
      (valor: string) =>
        valor !== formulario.valores.actual.value ||
        'Elige una distinta de la actual.',
    ],
    repetida: [
      requerido('Repite la contraseña.'),
      matches(
        () => formulario.valores.nueva.value,
        'Las contraseñas no coinciden.'
      ),
    ],
  });
const { valores, errores, tocar, validarTodo, reiniciar } = formulario;

const enviando = ref(false);
const errorServidor = ref('');
/** El 401 del servidor: es de la contraseña actual, y va en su campo. */
const errorActual = ref('');
const logro = ref('');

const {
  enviando: enviandoEnlace,
  enviadoA,
  error: errorEnlace,
  enviar: enviarEnlace,
} = useEnlaceContrasena();

watch(
  () => valores.actual.value,
  () => {
    errorActual.value = '';
  }
);

function pedirEnlace() {
  void enviarEnlace(authStore.email);
}

function descartar() {
  reiniciar();
  errorServidor.value = '';
  errorActual.value = '';
  logro.value = '';
}

async function guardar() {
  if (enviando.value) return;
  errorServidor.value = '';
  errorActual.value = '';
  logro.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  try {
    const sesion = await authApi.updatePassword({
      currentPassword: valores.actual.value,
      newPassword: valores.nueva.value,
    });
    aplicarSesion(sesion);
    reiniciar();
    logro.value = 'Guardamos tu contraseña nueva.';
  } catch (err: unknown) {
    const { texto, campo } = errorDeCuenta(err, 'contrasena');
    if (campo === 'contrasena-actual') {
      errorActual.value = texto;
      await nextTick();
      enfocarCampo('actual');
    } else {
      errorServidor.value = texto;
    }
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped lang="scss">
.cuenta-aviso {
  margin-top: 18px;
}

.contrasena__olvido {
  margin: 14px 0 0;
  text-align: center;
  font-family: var(--m-font-sans);
  font-size: 13px;
  color: var(--m-piedra);
}

.contrasena__enlace {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  padding: 0 2px;
  border: 0;
  background: transparent;
  color: var(--m-rosa-profundo);
  font: inherit;
  cursor: pointer;
}

.contrasena__enlace-texto {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

.contrasena__enlace:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.contrasena__enlace:disabled {
  opacity: 0.55;
  cursor: default;
}

.contrasena__vivo {
  margin: 0;
  text-align: center;
  font-family: var(--m-font-sans);
  font-size: 13px;
  color: var(--m-tinta);
}

.contrasena__google {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-hueso);
  font-family: var(--m-font-sans);
}

/* En móvil la sección va sobre hueso: la ficha es nieve (tablero, móvil 3). */
.contrasena__google--movil {
  background: var(--m-nieve);
}

.contrasena__g {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: 50%;
  color: var(--m-tinta);
  font-size: 16px;
  font-weight: 500;
}

.contrasena__google-texto {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--m-piedra);
}

.contrasena__google-texto strong {
  font-weight: 500;
  color: var(--m-tinta);
  overflow-wrap: anywhere;
}

.contrasena__texto {
  margin: 20px 0 0;
  font-family: var(--m-font-sans);
  font-size: 14px;
  line-height: 1.65;
  color: var(--m-piedra);
}

.contrasena__crear {
  display: block;
  min-height: 50px;
  margin-top: 18px;
  padding: 0 28px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.contrasena__crear.m-boton--ancho {
  width: 100%;
}

.contrasena__crear:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.contrasena__crear:disabled {
  opacity: 0.55;
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .contrasena__enlace:not(:disabled):hover .contrasena__enlace-texto {
    border-bottom-color: var(--m-rosa-profundo);
  }

  .contrasena__crear:not(:disabled):hover {
    color: var(--m-oro);
  }
}
</style>
