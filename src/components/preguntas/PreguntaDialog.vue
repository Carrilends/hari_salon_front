<template>
  <q-dialog
    :model-value="abierto"
    :maximized="esMovil"
    :persistent="guardando"
    @update:model-value="alCambiarModelo"
  >
    <section
      class="pregunta-dialogo"
      data-test="dialogo-pregunta"
      role="document"
      aria-labelledby="pregunta-dialogo-titulo"
    >
      <header class="pregunta-dialogo__cabeza">
        <h2 id="pregunta-dialogo-titulo" class="pregunta-dialogo__titulo">
          {{ titulo }}
        </h2>
        <button
          type="button"
          class="pregunta-dialogo__cerrar"
          data-test="cerrar-dialogo"
          aria-label="Cerrar sin guardar"
          :disabled="guardando"
          @click="cerrar"
        >
          <StrokeIcon nombre="cerrar" :tamano="20" />
        </button>
      </header>

      <form
        class="pregunta-dialogo__formulario"
        novalidate
        data-test="formulario-pregunta"
        @submit.prevent="enviar"
      >
        <div class="pregunta-dialogo__cuerpo">
          <p class="pregunta-dialogo__lede">
            Así la verán las clientas en la página de preguntas frecuentes.
          </p>

          <div class="pregunta-dialogo__campo">
            <div class="pregunta-dialogo__rotulos">
              <label for="campo-pregunta" class="pregunta-dialogo__etiqueta"
                >Pregunta</label
              >
              <span
                id="contador-pregunta"
                class="pregunta-dialogo__contador"
                data-test="contador-pregunta"
                >{{ valores.pregunta.length }} /
                {{ LIMITES_PREGUNTA.pregunta.max }}</span
              >
            </div>
            <input
              id="campo-pregunta"
              v-model="valores.pregunta"
              type="text"
              class="pregunta-dialogo__control"
              data-test="campo-pregunta"
              :maxlength="LIMITES_PREGUNTA.pregunta.max"
              :aria-invalid="errores.pregunta ? 'true' : 'false'"
              :aria-describedby="descritoPor('pregunta')"
            />
            <p
              v-if="errores.pregunta"
              id="error-pregunta"
              class="pregunta-dialogo__error"
              data-test="error-pregunta"
            >
              {{ errores.pregunta }}
            </p>
          </div>

          <div class="pregunta-dialogo__campo">
            <div class="pregunta-dialogo__rotulos">
              <label for="campo-respuesta" class="pregunta-dialogo__etiqueta"
                >Respuesta</label
              >
              <span
                id="contador-respuesta"
                class="pregunta-dialogo__contador"
                data-test="contador-respuesta"
                >{{ valores.respuesta.length }} /
                {{ LIMITES_PREGUNTA.respuesta.max }}</span
              >
            </div>
            <textarea
              id="campo-respuesta"
              v-model="valores.respuesta"
              rows="6"
              class="pregunta-dialogo__control pregunta-dialogo__control--area"
              data-test="campo-respuesta"
              :maxlength="LIMITES_PREGUNTA.respuesta.max"
              :aria-invalid="errores.respuesta ? 'true' : 'false'"
              :aria-describedby="descritoPor('respuesta')"
            />
            <p
              v-if="errores.respuesta"
              id="error-respuesta"
              class="pregunta-dialogo__error"
              data-test="error-respuesta"
            >
              {{ errores.respuesta }}
            </p>
          </div>

          <div class="pregunta-dialogo__pista" data-test="pista-puesto">
            <StrokeIcon nombre="asa" :tamano="18" />
            <span>{{ pista }}</span>
          </div>
          <p class="pregunta-dialogo__regla">
            Pregunta y respuesta: mínimo 5 caracteres.
          </p>
          <p
            v-if="error"
            class="pregunta-dialogo__fallo"
            role="alert"
            data-test="error-guardar"
          >
            {{ error }}
          </p>
        </div>

        <div class="pregunta-dialogo__pie">
          <button
            type="button"
            class="pregunta-dialogo__boton"
            data-test="cancelar-pregunta"
            :disabled="guardando"
            @click="cerrar"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="pregunta-dialogo__boton pregunta-dialogo__boton--macizo m-boton--ancho"
            data-test="guardar-pregunta"
            :disabled="guardando"
          >
            {{ textoGuardar }}
          </button>
        </div>
      </form>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  erroresDePregunta,
  LIMITES_PREGUNTA,
  type CampoPregunta,
  type ErroresPregunta,
} from 'src/helpers/validar-pregunta';

/**
 * Crear o editar una pregunta frecuente (F2, F4; tablero `PreguntasDuenaA`,
 * «Móvil · 2»). Cabecera tinta, campos con contador, errores en línea y la
 * pista del puesto. El orden ya no se escribe a mano: se cambia con el asa.
 *
 * No guarda: emite `guardar` con los textos recortados y la página llama a la
 * mutación; si falla, la página devuelve el mensaje por `error` y el diálogo
 * sigue abierto con lo escrito.
 */
const props = defineProps<{
  abierto: boolean;
  pregunta: FaqItem | null;
  puesto: number | null;
  total: number;
  guardando: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:abierto', valor: boolean): void;
  (e: 'guardar', cuerpo: { question: string; answer: string }): void;
}>();

/** En móvil el diálogo ocupa la pantalla (tablero). */
const esMovil = useConsultaMedios('(max-width: 699px)', false);

const valores = reactive({ pregunta: '', respuesta: '' });
/** Los errores se enseñan tras el primer intento de guardar, no mientras se escribe. */
const intentado = ref(false);

const errores = computed<ErroresPregunta>(() =>
  intentado.value ? erroresDePregunta(valores) : {}
);

const esEdicion = computed(() => props.pregunta !== null);
const titulo = computed(() =>
  esEdicion.value ? 'Editar pregunta' : 'Nueva pregunta'
);
const textoGuardar = computed(() =>
  esEdicion.value ? 'Guardar cambios' : 'Crear pregunta'
);
const pista = computed(() =>
  esEdicion.value && props.puesto !== null
    ? `Está en el puesto ${props.puesto} de ${props.total}. Para moverla, arrástrala por el asa en la lista o usa las flechas del teclado sobre ella.`
    : 'Las nuevas se añaden al final de la lista. Después puedes moverla con el asa.'
);

function cargar() {
  valores.pregunta = props.pregunta?.question ?? '';
  valores.respuesta = props.pregunta?.answer ?? '';
  intentado.value = false;
}

watch(
  () => [props.abierto, props.pregunta?.id] as const,
  ([abierto]) => {
    if (abierto) cargar();
  },
  { immediate: true }
);

function descritoPor(campo: CampoPregunta) {
  return errores.value[campo]
    ? `contador-${campo} error-${campo}`
    : `contador-${campo}`;
}

/** Mientras se guarda no se cierra: si falla, se perdería lo escrito. */
function cerrar() {
  if (props.guardando) return;
  emit('update:abierto', false);
}

function alCambiarModelo(valor: boolean) {
  if (!valor && props.guardando) return;
  emit('update:abierto', valor);
}

function enviar() {
  if (props.guardando) return;
  intentado.value = true;
  const conError = (['pregunta', 'respuesta'] as const).find(
    (campo) => errores.value[campo]
  );
  if (conError) {
    // Manejador de evento: aquí sí hay `document`.
    document.getElementById(`campo-${conError}`)?.focus();
    return;
  }
  emit('guardar', {
    question: valores.pregunta.trim(),
    answer: valores.respuesta.trim(),
  });
}

defineOptions({ name: 'PreguntaDialog' });
</script>

<style scoped lang="scss">
.pregunta-dialogo {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa la raíz y cae en el velo. */
  pointer-events: all;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.pregunta-dialogo__cabeza {
  min-height: 60px;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 20px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.pregunta-dialogo__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 19px;
  font-weight: 400;
}

.pregunta-dialogo__cerrar {
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: none;
  color: var(--m-hueso);
  cursor: pointer;
}

.pregunta-dialogo__cerrar:disabled,
.pregunta-dialogo__boton:disabled {
  opacity: 0.6;
  cursor: progress;
}

.pregunta-dialogo__cerrar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.pregunta-dialogo__formulario {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pregunta-dialogo__cuerpo {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 22px 20px;
}

.pregunta-dialogo__lede {
  margin: 0 0 20px;
  color: var(--m-piedra);
  font-size: 13.5px;
  line-height: 1.55;
}

.pregunta-dialogo__campo + .pregunta-dialogo__campo {
  margin-top: 20px;
}

.pregunta-dialogo__rotulos {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.pregunta-dialogo__etiqueta {
  color: var(--m-piedra);
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.pregunta-dialogo__contador {
  color: var(--m-piedra);
  font-size: 11.5px;
}

.pregunta-dialogo__control {
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 15px;
}

.pregunta-dialogo__control--area {
  padding: 12px 14px;
  line-height: 1.6;
  resize: vertical;
}

.pregunta-dialogo__control:focus {
  border-color: var(--m-tinta);
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.pregunta-dialogo__control[aria-invalid='true'] {
  border-color: var(--m-peligro);
}

.pregunta-dialogo__error {
  margin: 6px 0 0;
  color: var(--m-peligro);
  font-size: 13px;
}

.pregunta-dialogo__pista {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 18px;
  padding: 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-piedra);
  font-size: 13px;
  line-height: 1.5;
}

.pregunta-dialogo__regla {
  margin: 14px 0 0;
  color: var(--m-piedra);
  font-size: 12.5px;
}

.pregunta-dialogo__fallo {
  margin: 14px 0 0;
  padding: 10px 14px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-peligro);
  font-size: 13.5px;
}

.pregunta-dialogo__pie {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  padding: 14px 20px 22px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
}

.pregunta-dialogo__boton {
  min-height: 50px;
  padding: 0 22px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-pildora);
  background: var(--m-nieve);
  color: var(--m-tinta);
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.pregunta-dialogo__boton--macizo {
  flex-grow: 1;
  border-color: var(--m-tinta);
  background: var(--m-tinta);
  color: var(--m-hueso);
  letter-spacing: 0.18em;
}

.pregunta-dialogo__boton--macizo:disabled {
  opacity: 0.6;
  cursor: progress;
}

.pregunta-dialogo__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/* Pantalla completa en móvil (q-dialog `maximized`). */
@media (max-width: 699px) {
  .pregunta-dialogo {
    width: 100vw;
    max-height: none;
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .pregunta-dialogo__cerrar:hover {
    color: var(--m-oro);
  }

  .pregunta-dialogo__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .pregunta-dialogo__boton--macizo:hover:not(:disabled) {
    color: var(--m-oro);
  }
}
</style>
