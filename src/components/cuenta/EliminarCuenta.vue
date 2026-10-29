<template>
  <div v-if="!authStore.isAdmin" class="eliminar" data-test="bloque-eliminar">
    <p class="eliminar__subtitulo">Eliminar la cuenta</p>
    <p class="eliminar__texto">
      Borra tu cuenta y tu acceso al portal. No se puede deshacer.
    </p>
    <button
      type="button"
      class="eliminar__abrir"
      data-test="eliminar-cuenta"
      @click="abrir"
    >
      Eliminar mi cuenta
    </button>

    <q-dialog
      v-model="abierto"
      class="eliminar-dialogo"
      :position="esMovil ? 'bottom' : 'standard'"
      :persistent="enviando"
    >
      <section
        class="eliminar-hoja"
        :class="{ 'eliminar-hoja--hoja': esMovil }"
        role="document"
        aria-labelledby="eliminar-titulo"
        data-test="eliminar-dialogo"
      >
        <span
          v-if="esMovil"
          class="eliminar-hoja__tirador"
          aria-hidden="true"
        />
        <p class="eliminar-hoja__antetitulo">Eliminar</p>
        <h2 id="eliminar-titulo" class="eliminar-hoja__titulo">
          ¿Eliminar tu cuenta?
        </h2>

        <p class="eliminar-hoja__rotulo">Se borra</p>
        <ul class="eliminar-hoja__lista" data-test="eliminar-borra">
          <li>Tu cuenta y tu acceso, con todas tus sesiones abiertas.</li>
          <li>Tus conversaciones con el asistente.</li>
        </ul>

        <p class="eliminar-hoja__rotulo">Se conserva</p>
        <ul class="eliminar-hoja__lista" data-test="eliminar-conserva">
          <li>
            Tus citas vigentes, con tu nombre y un contacto, hasta que se
            cumplan o se cancelen; después, el historial hasta su borrado
            automático.
          </li>
          <li>Tus reseñas, sin tu nombre.</li>
        </ul>

        <p class="eliminar-hoja__texto">
          Borrar la cuenta no cancela tus citas vigentes. Para cambiarlas o
          cancelarlas después, escríbele al salón por
          <a
            class="eliminar-hoja__enlace"
            :href="enlaceWhatsApp"
            target="_blank"
            rel="noopener noreferrer"
            data-test="eliminar-whatsapp"
            >WhatsApp</a
          >. Esta acción no se puede deshacer.
        </p>

        <form novalidate @submit.prevent="confirmar">
          <campo-acceso
            id="eliminar-clave"
            v-model="valor"
            :rotulo="conContrasena ? 'Tu contraseña' : 'Tu correo'"
            :tipo="conContrasena ? 'password' : 'email'"
            :autocomplete="conContrasena ? 'current-password' : 'email'"
            :marcador="conContrasena ? '' : authStore.email"
            describedby="eliminar-nota"
          />
          <p id="eliminar-nota" class="eliminar-hoja__nota">
            {{
              conContrasena
                ? 'La pedimos para confirmar que eres tú.'
                : 'Escribe el correo de tu cuenta para confirmar que eres tú.'
            }}
          </p>

          <p
            v-if="error"
            class="eliminar-hoja__error"
            role="alert"
            data-test="eliminar-error"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            class="eliminar-hoja__confirmar m-boton--ancho"
            data-test="eliminar-confirmar"
            :disabled="enviando || !valor.trim()"
            :aria-busy="enviando ? 'true' : 'false'"
          >
            {{ enviando ? 'Eliminando…' : 'Sí, eliminar mi cuenta' }}
          </button>
        </form>
        <button
          type="button"
          class="eliminar-hoja__volver m-boton--ancho"
          data-test="eliminar-volver"
          :disabled="enviando"
          @click="cerrar"
        >
          Volver
        </button>
      </section>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * «Eliminar mi cuenta», al final de la sección Sesión de Mi cuenta: un botón
 * discreto y un diálogo (hoja inferior en móvil) que cuenta qué se borra y qué
 * se conserva antes de pedir la confirmación. El foco queda atrapado en el
 * diálogo (lo hace `q-dialog`); los controles miden 44 px o más.
 *
 * Se confirma con la contraseña o, si la cuenta no tiene (entró con Google),
 * con el correo. El servidor contesta 422 si no coincide: la sesión se
 * conserva y el error se queda en línea. Con 204 el servidor ya limpió la
 * cookie del refresh: se cierra la sesión en memoria, se va a la portada y
 * allí sale el aviso «Tu cuenta se eliminó.» (mismo `useAviso` que «cerrar en
 * todos los dispositivos»; no es `sesionCaducada`, porque no fue un fallo).
 *
 * No aparece a las cuentas de administración (el servidor además responde 403).
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi, type DeleteAccountBody } from 'src/api/auth-api';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { MENSAJE_CUENTA_ELIMINADA } from 'src/constants/mensajes-sesion';
import { useAviso } from 'src/composables/shared/useAviso';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { errorDeEliminar } from 'src/helpers/mensajes-cuenta';
import { CONSULTA_CUENTA_MOVIL } from 'src/helpers/secciones-cuenta';
import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';
import { useAuthStore } from 'src/stores/auth-store';

defineOptions({ name: 'EliminarCuenta' });

const authStore = useAuthStore();
const router = useRouter();
const aviso = useAviso();
const esMovil = useConsultaMedios(CONSULTA_CUENTA_MOVIL, false);

const enlaceWhatsApp = buildWhatsAppUrl(
  WHATSAPP_PHONE,
  'Hola, eliminé mi cuenta del portal y quiero gestionar una cita vigente.'
);

const abierto = ref(false);
const valor = ref('');
const error = ref('');
const enviando = ref(false);

/** `null` (no se sabe aún) cuenta como «sí»: es el caso común. */
const conContrasena = ref(true);

function abrir() {
  conContrasena.value = authStore.hasPassword !== false;
  valor.value = '';
  error.value = '';
  abierto.value = true;
}

function cerrar() {
  if (enviando.value) return;
  abierto.value = false;
  valor.value = '';
  error.value = '';
}

async function confirmar() {
  const texto = valor.value.trim();
  if (enviando.value || !texto) return;
  const cuerpo: DeleteAccountBody = conContrasena.value
    ? { password: valor.value }
    : { email: texto };
  enviando.value = true;
  error.value = '';
  try {
    await authApi.deleteAccount(cuerpo);
  } catch (err: unknown) {
    enviando.value = false;
    error.value = errorDeEliminar(err, conContrasena.value);
    return;
  }
  enviando.value = false;
  abierto.value = false;
  valor.value = '';
  authStore.logout();
  aviso.logro(MENSAJE_CUENTA_ELIMINADA);
  await router.push({ path: '/' });
}
</script>

<style scoped lang="scss">
.eliminar {
  margin-top: 24px;
  padding-top: 24px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.eliminar__subtitulo {
  margin: 0 0 8px;
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-peligro);
}

.eliminar__texto {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}

/* Discreto: texto subrayado, no un botón macizo; el área táctil sí es de 44. */
.eliminar__abrir {
  min-height: var(--m-tactil-min);
  margin-top: 6px;
  margin-left: -4px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--m-peligro);
  font-family: var(--m-font-sans);
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.eliminar__abrir:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.eliminar-hoja {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  box-sizing: border-box;
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px 24px 22px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.eliminar-hoja--hoja {
  width: 100%;
  max-width: 100%;
  padding: 10px 20px calc(26px + env(safe-area-inset-bottom, 0px));
  border: 0;
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
}

.eliminar-hoja__tirador {
  display: block;
  width: 40px;
  height: 4px;
  margin: 0 auto 18px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-piedra-clara);
}

.eliminar-hoja__antetitulo {
  margin: 0 0 8px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-peligro);
}

.eliminar-hoja__titulo {
  margin: 0 0 16px;
  font-family: var(--m-font-display);
  font-size: 26px;
  font-weight: 400;
  line-height: 1.15;
}

.eliminar-hoja__rotulo {
  margin: 0 0 6px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.eliminar-hoja__lista {
  margin: 0 0 14px;
  padding-left: 18px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--m-tinta);
}

.eliminar-hoja__texto {
  margin: 0 0 8px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.eliminar-hoja__enlace {
  display: inline-block;
  min-height: 24px;
  color: var(--m-rosa-profundo);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.eliminar-hoja__enlace:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.eliminar-hoja__nota {
  margin: 8px 0 16px;
  font-size: 12.5px;
  color: var(--m-piedra);
}

.eliminar-hoja__error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-peligro);
  font-size: 13px;
  line-height: 1.45;
}

.eliminar-hoja__confirmar {
  width: 100%;
  min-height: 50px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-pildora);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.eliminar-hoja__confirmar:disabled {
  opacity: 0.6;
  cursor: default;
}

.eliminar-hoja__volver {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.eliminar-hoja__volver:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.eliminar-hoja__confirmar:focus-visible,
.eliminar-hoja__volver:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .eliminar__abrir:hover {
    color: var(--m-tinta);
  }

  .eliminar-hoja__confirmar:hover:not(:disabled),
  .eliminar-hoja__volver:hover:not(:disabled) {
    border-color: var(--m-oro);
  }
}
</style>

<!-- Sin `scoped`: el velo lo pinta QDialog fuera del ámbito. -->
<style lang="scss">
.eliminar-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

.eliminar-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
