<template>
  <q-dialog
    class="resena-dialogo"
    aria-labelledby="resena-titulo"
    :model-value="abierto"
    :persistent="estado === 'enviando'"
    :position="esHoja ? 'bottom' : 'standard'"
    :transition-show="esHoja ? 'slide-up' : 'scale'"
    :transition-hide="esHoja ? 'slide-down' : 'scale'"
    @update:model-value="alCambiar"
  >
    <section
      class="resena"
      :class="{ 'resena--hoja': esHoja }"
      data-test="resena"
    >
      <span v-if="esHoja" class="resena__tirador" aria-hidden="true" />
      <button
        type="button"
        class="resena__cerrar m-boton-plano"
        aria-label="Cerrar"
        data-test="resena-cerrar"
        :disabled="estado === 'enviando'"
        @click="cerrar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        v-if="estado === 'enviada'"
        class="resena__exito"
        data-test="resena-enviada"
      >
        <p class="resena__antetitulo">Tu reseña</p>
        <h2
          id="resena-titulo"
          ref="tituloExito"
          class="resena__titulo"
          tabindex="-1"
        >
          Gracias por contarnos
        </h2>
        <p class="resena__lede resena__lede--exito" role="status">
          Tu reseña ya sale en Testimonios.
        </p>
        <div class="resena__acciones">
          <router-link
            to="/testimonios"
            class="resena__enlace"
            data-test="ver-testimonios"
            @click="cerrar"
          >
            Ver Testimonios →
          </router-link>
          <button
            type="button"
            class="resena__enviar m-boton--ancho"
            data-test="cerrar-exito"
            @click="cerrar"
          >
            Cerrar
          </button>
        </div>
      </div>

      <template v-else>
        <p class="resena__antetitulo">Tu reseña</p>
        <h2 id="resena-titulo" class="resena__titulo">
          ¿Cómo te fue en Marlene?
        </h2>
        <p class="resena__lede">Tu reseña sale en Testimonios con tu nombre.</p>

        <form
          class="resena__formulario"
          data-test="resena-formulario"
          novalidate
          @submit.prevent="alEnviar"
        >
          <div class="resena__puntaje">
            <p class="resena__etiqueta resena__etiqueta--puntaje" aria-hidden="true">
              Tu puntaje
            </p>
            <EstrellasPuntaje
              ref="estrellas"
              v-model="campos.puntaje"
              nombre="resena-puntaje"
              :error="errores.puntaje"
              id-error="resena-error-puntaje"
            />
            <ErrorCampo
              v-if="errores.puntaje"
              id="resena-error-puntaje"
              data-test="error-puntaje"
            >
              {{ errores.puntaje }}
            </ErrorCampo>
          </div>

          <label for="resena-nombre" class="resena__etiqueta">Nombre</label>
          <input
            id="resena-nombre"
            ref="campoNombre"
            v-model="campos.nombre"
            type="text"
            class="resena__campo"
            :class="{ 'resena__campo--error': errores.nombre }"
            :maxlength="LIMITES_RESENA.nombreMax"
            autocomplete="name"
            data-test="campo-nombre"
            :aria-invalid="errores.nombre ? 'true' : undefined"
            :aria-describedby="
              errores.nombre ? 'resena-error-nombre' : 'resena-ayuda-nombre'
            "
          />
          <ErrorCampo
            v-if="errores.nombre"
            id="resena-error-nombre"
            data-test="error-nombre"
          >
            {{ errores.nombre }}
          </ErrorCampo>
          <p v-else id="resena-ayuda-nombre" class="resena__ayuda">
            Así aparecerás en Testimonios.
          </p>

          <label for="resena-texto" class="resena__etiqueta">Tu experiencia</label>
          <textarea
            id="resena-texto"
            ref="campoTexto"
            v-model="campos.texto"
            rows="4"
            class="resena__campo resena__campo--area"
            :class="{ 'resena__campo--error': errores.texto }"
            :maxlength="LIMITES_RESENA.textoMax"
            data-test="campo-texto"
            :aria-invalid="errores.texto ? 'true' : undefined"
            :aria-describedby="
              errores.texto
                ? 'resena-error-texto resena-ayuda-texto'
                : 'resena-ayuda-texto'
            "
          />
          <ErrorCampo
            v-if="errores.texto"
            id="resena-error-texto"
            data-test="error-texto"
          >
            {{ errores.texto }}
          </ErrorCampo>
          <p id="resena-ayuda-texto" class="resena__ayuda resena__ayuda--fila">
            <span v-if="!errores.texto">
              Mínimo {{ LIMITES_RESENA.textoMin }} caracteres.
            </span>
            <span class="resena__contador" data-test="contador">
              {{ campos.texto.length }} / {{ LIMITES_RESENA.textoMax }}
            </span>
          </p>

          <AvisoAcceso v-if="errorEnvio" class="resena__aviso">
            {{ errorEnvio }}
          </AvisoAcceso>

          <div class="resena__acciones">
            <button
              v-if="!esHoja"
              type="button"
              class="resena__cancelar m-boton-plano"
              data-test="resena-cancelar"
              :disabled="estado === 'enviando'"
              @click="cerrar"
            >
              Cancelar
            </button>
            <button
              ref="botonEnviar"
              type="submit"
              class="resena__enviar m-boton--ancho"
              data-test="enviar-resena"
              :disabled="estado === 'enviando'"
              :aria-busy="estado === 'enviando' ? 'true' : undefined"
            >
              {{ estado === 'enviando' ? 'Enviando…' : 'Enviar reseña' }}
            </button>
          </div>
        </form>
      </template>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import EstrellasPuntaje from 'src/components/resena/EstrellasPuntaje.vue';
import ErrorCampo from 'src/components/resena/ErrorCampo.vue';
import { useFormularioResena } from 'src/composables/reviews/useFormularioResena';
import { useReviewDialog } from 'src/composables/reviews/useReviewDialog';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  LIMITES_RESENA,
  quienPuedeResenar,
  type CampoResena,
} from 'src/helpers/resena';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * El diálogo de reseña (R1 y R2 de
 * `docs/superpowers/specs/2026-10-09-vistas-restantes-design.md`; tablero
 * ResenaA). Lo monta `MainLayout`, fuera de `<router-view>`, y se gobierna con
 * el estado compartido de `useReviewDialog`.
 *
 * Se pide con `solicitar()` («Deja la tuya →» del inicio, Testimonios, Mis
 * reservas), que ejecuta la política que registra el armazón
 * (`politicaDeResena`: sin sesión al login, la clienta abre, la dueña nada).
 * Aquí, al abrirse, se rellena el formulario; y como red de seguridad, si lo
 * abre alguien que no es una clienta (un `abrir()` a pelo), se vuelve a cerrar
 * antes de pintar —el `watch` corre antes del render—. No navega.
 */
defineOptions({ name: 'ResenaDialog' });

/** El mismo corte que la cabecera y el menú «Más»: por debajo, hoja inferior. */
const CONSULTA_HOJA = '(max-width: 699px)';

const authStore = useAuthStore();
const { abierto, cerrar } = useReviewDialog();
const { campos, errores, estado, errorEnvio, preparar, enviar } =
  useFormularioResena();
const esHoja = useConsultaMedios(CONSULTA_HOJA, false);

const estrellas = ref<InstanceType<typeof EstrellasPuntaje> | null>(null);
const campoNombre = ref<HTMLInputElement | null>(null);
const campoTexto = ref<HTMLTextAreaElement | null>(null);
const tituloExito = ref<HTMLElement | null>(null);
const botonEnviar = ref<HTMLButtonElement | null>(null);

function alAbrir(): void {
  const quien = quienPuedeResenar({
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    roles: authStore.roles,
  });
  if (quien !== 'clienta') {
    cerrar();
    return;
  }
  preparar({ nombre: authStore.fullname, correo: authStore.email });
}

watch(
  abierto,
  (valor) => {
    if (valor) alAbrir();
  },
  { immediate: true }
);

/** Escape y el velo: `q-dialog` pide cerrarse. */
function alCambiar(valor: boolean): void {
  if (!valor) cerrar();
}

function enfocar(campo: CampoResena): void {
  if (campo === 'puntaje') estrellas.value?.enfocar();
  else if (campo === 'nombre') campoNombre.value?.focus();
  else campoTexto.value?.focus();
}

/**
 * Con error, el foco va al primer campo que falla; con éxito, al título del
 * mensaje (el botón pulsado ya no existe y el foco se perdería en el diálogo).
 */
async function alEnviar(): Promise<void> {
  const campo = await enviar();
  await nextTick();
  if (campo) {
    enfocar(campo);
    return;
  }
  if (estado.value === 'enviada') tituloExito.value?.focus();
  // Un fallo de red o del servidor: el botón pulsado se deshabilitó al enviar
  // y el foco habría caído al <body>; vuelve al botón, junto al aviso.
  else if (estado.value === 'editando' && errorEnvio.value) {
    botonEnviar.value?.focus();
  }
}
</script>

<style scoped lang="scss">
/**
 * Tablero ResenaA. Escritorio: tarjeta de nieve de 600 px con filete y sombra
 * de capa flotante. Móvil (< 700 px): hoja inferior de borde a borde con
 * tirador, y «Enviar reseña» pegado al pie de la hoja.
 */
.resena {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la sección y cae en el velo. */
  pointer-events: all;
  position: relative;
  box-sizing: border-box;
  width: calc(100vw - 32px);
  max-width: 600px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 32px 40px 28px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  box-shadow: var(--m-sombra-flotante);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.resena--hoja {
  width: 100%;
  max-width: 100%;
  max-height: 92vh;
  padding: 10px 20px 0;
  border: 0;
  border-radius: var(--m-radio-panel) var(--m-radio-panel) 0 0;
  box-shadow: none;
}

.resena__tirador {
  display: block;
  width: 40px;
  height: 4px;
  margin: 0 auto 10px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-filete);
}

.resena__cerrar {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-tinta);
  cursor: pointer;
}

.resena--hoja .resena__cerrar {
  top: 20px;
  right: 10px;
}

.resena__antetitulo {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.resena__titulo {
  margin: 0 0 8px;
  padding-right: var(--m-tactil-min);
  font-family: var(--m-font-display);
  font-size: 32px;
  font-weight: 400;
  line-height: 1.15;
}

/* El título solo recibe el foco por programa (tras enviar): no es un control. */
.resena__titulo:focus {
  outline: none;
}

.resena__lede {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.resena__puntaje {
  padding: 16px 0 18px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.resena__etiqueta {
  display: block;
  margin: 20px 0 6px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
}

.resena__etiqueta--puntaje {
  margin: 0 0 8px;
  letter-spacing: var(--m-tracking-etiqueta);
}

.resena__campo {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  font-family: var(--m-font-sans);
  font-size: 15px;
  color: var(--m-tinta);
}

.resena__campo--area {
  padding: 12px 14px;
  line-height: 1.55;
  resize: none;
}

.resena__campo:focus {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.resena__campo--error {
  border-color: var(--m-peligro);
}

.resena__ayuda {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--m-piedra);
}

.resena__ayuda--fila {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.resena__contador {
  margin-left: auto;
}

.resena__aviso {
  margin-top: 18px;
}

.resena__acciones {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.resena__cancelar {
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  background: transparent;
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
  cursor: pointer;
}

.resena__enviar {
  min-height: 50px;
  padding: 0 30px;
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

.resena__enviar:disabled {
  opacity: 0.6;
  cursor: progress;
}

.resena__enlace {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  margin-right: auto;
  font-size: 14.5px;
  color: var(--m-rosa-profundo);
  text-decoration: none;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
}

/* A mitad de envío no se puede cerrar: se ven inactivos. */
.resena__cerrar:disabled,
.resena__cancelar:disabled {
  opacity: 0.4;
  cursor: default;
}

.resena__cerrar:focus-visible,
.resena__cancelar:focus-visible,
.resena__enviar:focus-visible,
.resena__enlace:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.resena--hoja .resena__titulo {
  font-size: 25px;
}

.resena--hoja .resena__lede:not(.resena__lede--exito) {
  display: none;
}

/* En la hoja, el botón de enviar se queda al pie aunque el teclado empuje. */
.resena--hoja .resena__acciones {
  position: sticky;
  bottom: 0;
  margin: 20px -20px 0;
  padding: 12px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-nieve);
}

.resena--hoja .resena__enviar {
  flex: 1 1 auto;
  min-height: 52px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es el global de
 * `app.scss`.
 */
@media (hover: hover) and (pointer: fine) {
  .resena__cerrar:not(:disabled):hover {
    color: var(--m-oro-profundo);
  }

  .resena__cancelar:not(:disabled):hover {
    color: var(--m-oro-profundo);
  }

  /* Tinta maciza: el rótulo se enciende en oro (5,8:1 sobre tinta). */
  .resena__enviar:not(:disabled):hover {
    color: var(--m-oro);
  }

  .resena__enlace:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }
}
</style>

<!--
  Sin `scoped` a propósito: el velo lo pinta QDialog, cuyos nodos no llevan el
  atributo de ámbito. La clase `resena-dialogo` viaja al div raíz del diálogo,
  así que la regla no se escapa a otro. Mismo patrón que `MenuMasHoja.vue`.
-->
<style lang="scss">
.resena-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

/* Quasar solo quita el relleno lateral de las hojas inferiores por debajo de
   600 px; la hoja de reseña sale hasta 699 px y va de borde a borde. */
.resena-dialogo .q-dialog__inner--bottom {
  padding-left: 0;
  padding-right: 0;
}
</style>
