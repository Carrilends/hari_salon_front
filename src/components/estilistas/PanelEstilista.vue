<template>
  <aside
    id="panel-estilista"
    class="panel-estilista"
    data-test="panel-estilista"
    aria-labelledby="panel-estilista-titulo"
    @keydown.esc="alEscape"
  >
    <form
      class="panel-estilista__formulario"
      novalidate
      @submit.prevent="enviar"
    >
      <header class="panel-estilista__cabecera">
        <div class="panel-estilista__identidad">
          <span class="panel-estilista__inicial" aria-hidden="true">
            <StrokeIcon v-if="modo === 'crear'" nombre="mas" :tamano="20" />
            <template v-else>{{ inicial }}</template>
          </span>
          <div>
            <p class="panel-estilista__antetitulo">
              {{ modo === 'crear' ? 'Nueva estilista' : 'Editar' }}
            </p>
            <h2
              id="panel-estilista-titulo"
              class="panel-estilista__titulo"
              data-test="panel-titulo"
            >
              {{ titulo }}
            </h2>
          </div>
        </div>
        <button
          type="button"
          class="panel-estilista__cerrar m-boton-plano"
          aria-label="Cerrar el panel"
          data-test="cerrar-panel"
          @click="emit('cerrar')"
        >
          <StrokeIcon nombre="cerrar" />
        </button>
      </header>

      <label for="panel-estilista-nombre" class="panel-estilista__etiqueta"
        >Nombre</label
      >
      <input
        id="panel-estilista-nombre"
        ref="campo"
        v-model="nombre"
        class="panel-estilista__campo"
        data-test="campo-nombre"
        type="text"
        autocomplete="off"
        maxlength="120"
        :aria-invalid="errorNombre ? 'true' : 'false'"
        :aria-describedby="describedBy"
      />
      <p id="panel-estilista-ayuda" class="panel-estilista__ayuda">
        Así la ven las clientas al reservar.
      </p>
      <p
        v-if="errorNombre"
        id="panel-estilista-error"
        class="panel-estilista__error"
        data-test="error-nombre"
        role="alert"
      >
        {{ errorNombre }}
      </p>

      <template v-if="modo === 'editar' && estilista">
        <hr class="panel-estilista__filete" />
        <p class="panel-estilista__antetitulo">Semana · {{ semanaRotulo }}</p>
        <p class="panel-estilista__resumen" data-test="resumen-semana">
          <span class="panel-estilista__cifra">{{
            formatearDuracion(resumen.usados)
          }}</span>
          <span class="panel-estilista__de"
            >reservadas de {{ formatearDuracion(resumen.capacidad) }}</span
          >
        </p>
        <span class="panel-estilista__riel" aria-hidden="true">
          <span
            class="panel-estilista__avance"
            :style="{ width: `${porcentaje}%` }"
          />
        </span>

        <p class="panel-estilista__antetitulo panel-estilista__antetitulo--hoy">
          {{ hoyRotulo }}
        </p>
        <ul
          v-if="citasHoy.length"
          class="panel-estilista__citas"
          data-test="citas-hoy"
        >
          <li
            v-for="cita in citasHoy"
            :key="cita.id"
            class="panel-estilista__cita"
            data-test="cita-hoy"
          >
            <span class="panel-estilista__franja"
              >{{ cita.desde }} – {{ cita.hasta }}</span
            >
            <span class="panel-estilista__servicios">{{ cita.servicios }}</span>
          </li>
        </ul>
        <p v-else class="panel-estilista__nada" data-test="sin-citas-hoy">
          No le quedan citas hoy.
        </p>
        <router-link
          to="/reservas"
          class="panel-estilista__enlace"
          data-test="ir-a-reservas"
        >
          Ir a Reservas →
        </router-link>
      </template>

      <div class="panel-estilista__pie">
        <p
          v-if="errorGuardar"
          class="panel-estilista__error"
          data-test="error-guardar"
          role="alert"
        >
          {{ errorGuardar }}
        </p>
        <p
          v-if="exito"
          class="panel-estilista__exito"
          data-test="exito-estilista"
          role="status"
        >
          {{ exito }}
        </p>
        <button
          type="submit"
          class="panel-estilista__guardar m-boton--ancho"
          data-test="guardar-estilista"
          :disabled="guardando"
        >
          {{ modo === 'crear' ? 'Crear estilista' : 'Guardar cambios' }}
        </button>

        <template v-if="puedeEliminar">
          <p
            v-if="bloqueada"
            class="panel-estilista__bloqueo"
            data-test="error-eliminar"
            role="alert"
          >
            <StrokeIcon nombre="candado" :tamano="15" />
            <span>{{ errorEliminar }}</span>
          </p>
          <template v-else>
            <div
              v-if="confirmando"
              class="panel-estilista__confirmacion"
              data-test="confirmacion-eliminar"
            >
              <p class="panel-estilista__pregunta">
                ¿Eliminar a {{ estilista?.name }}? No se puede deshacer.
              </p>
              <div class="panel-estilista__botones">
                <button
                  type="button"
                  class="panel-estilista__cancelar"
                  data-test="cancelar-eliminar"
                  @click="confirmando = false"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="panel-estilista__confirmar"
                  data-test="confirmar-eliminar"
                  :disabled="eliminando"
                  @click="emit('eliminar')"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
            <button
              v-else
              type="button"
              class="panel-estilista__eliminar"
              data-test="eliminar-estilista"
              @click="confirmando = true"
            >
              <StrokeIcon nombre="papelera" :tamano="16" />
              Eliminar estilista
            </button>
            <p
              v-if="errorEliminar"
              class="panel-estilista__error"
              data-test="error-eliminar"
              role="alert"
            >
              {{ errorEliminar }}
            </p>
          </template>
        </template>
      </div>
    </form>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { WorkersWeekWorker } from 'src/api/workers-api';
import {
  MENSAJE_CON_RESERVAS,
  formatearDuracion,
  inicialDe,
  porcentajeDeCarga,
  resumenDeSemana,
  validarNombre,
  type CitaDeHoy,
} from 'src/helpers/semana-estilistas';

/**
 * El panel lateral de «Mis estilistas»: crear, renombrar y borrar.
 *
 * Solo pinta y valida; las peticiones las hace la página (emits). Todo se dice
 * en línea: el error del nombre bajo el campo, el de guardar y el éxito sobre
 * el botón, y el 409 del borrado como un candado en lugar del botón (no hay
 * nada que reintentar). Un fallo de red al borrar, en cambio, deja reintentar.
 */
const props = defineProps<{
  modo: 'crear' | 'editar';
  estilista: WorkersWeekWorker | null;
  semanaRotulo: string;
  hoyRotulo: string;
  citasHoy: CitaDeHoy[];
  guardando: boolean;
  eliminando: boolean;
  exito: string | null;
  errorGuardar: string | null;
  errorEliminar: string | null;
}>();

const emit = defineEmits<{
  (e: 'guardar', nombre: string): void;
  (e: 'eliminar'): void;
  (e: 'cerrar'): void;
}>();

const campo = ref<HTMLInputElement | null>(null);
const nombre = ref('');
const errorNombre = ref<string | null>(null);
const confirmando = ref(false);

const titulo = computed(() =>
  props.modo === 'crear' ? 'Agregar estilista' : props.estilista?.name ?? ''
);
const inicial = computed(() => inicialDe(props.estilista?.name ?? ''));
const resumen = computed(() => resumenDeSemana(props.estilista?.days ?? []));
const porcentaje = computed(() =>
  porcentajeDeCarga(resumen.value.usados, resumen.value.capacidad)
);
const puedeEliminar = computed(
  () =>
    props.modo === 'editar' &&
    Boolean(props.estilista) &&
    !props.estilista?.isDefault
);
const bloqueada = computed(() => props.errorEliminar === MENSAJE_CON_RESERVAS);
const describedBy = computed(() =>
  errorNombre.value
    ? 'panel-estilista-ayuda panel-estilista-error'
    : 'panel-estilista-ayuda'
);

/** Otra estilista (u otro modo): nombre nuevo, sin errores ni confirmación, foco al campo. */
watch(
  () => [props.modo, props.estilista?.id] as const,
  () => {
    nombre.value = props.modo === 'editar' ? props.estilista?.name ?? '' : '';
    errorNombre.value = null;
    confirmando.value = false;
    void nextTick(() => campo.value?.focus());
  },
  { immediate: true }
);

/** Tras crear, el panel se queda listo para la siguiente. */
watch(
  () => props.exito,
  (texto) => {
    if (texto && props.modo === 'crear') nombre.value = '';
  }
);

/** Escape deshace primero el paso interior (la confirmación) y luego cierra el panel. */
function alEscape() {
  if (confirmando.value) {
    confirmando.value = false;
    return;
  }
  emit('cerrar');
}

function enviar() {
  const error = validarNombre(nombre.value);
  errorNombre.value = error;
  if (error) {
    campo.value?.focus();
    return;
  }
  if (props.guardando) return;
  emit('guardar', nombre.value.trim());
}

defineOptions({ name: 'PanelEstilista' });
</script>

<style lang="scss" scoped>
.panel-estilista {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  /* Abajo se deja sitio al lanzador del asistente (fijo, 18 px + 48 px de alto):
     sin él tapa «Sí, eliminar» con el panel a 900 px de alto. */
  padding: 24px 26px calc(var(--m-tactil-min) + 40px);
  border-left: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  background: var(--m-carbon);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.panel-estilista__formulario {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.panel-estilista__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.panel-estilista__identidad {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.panel-estilista__inicial {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 1.3rem;
}

.panel-estilista__antetitulo {
  margin: 0;
  color: var(--m-oro);
  font-size: 0.625rem;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.panel-estilista__antetitulo--hoy {
  margin-top: 22px;
}

.panel-estilista__titulo {
  margin: 4px 0 0;
  font-family: var(--m-font-display);
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.panel-estilista__cerrar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  margin: -6px -10px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-piedra-clara);
  cursor: pointer;
}

.panel-estilista__etiqueta {
  display: block;
  margin: 24px 0 7px;
  color: var(--m-piedra-clara);
  font-size: 0.65rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.panel-estilista__campo {
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-oro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 0.9375rem;
}

.panel-estilista__campo:focus {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.panel-estilista__ayuda,
.panel-estilista__exito,
.panel-estilista__nada {
  margin: 8px 0 0;
  color: var(--m-piedra-clara);
  font-size: 0.78rem;
}

.panel-estilista__error {
  margin: 8px 0 0;
  color: var(--m-hueso);
  font-size: 0.8rem;
}

.panel-estilista__filete {
  margin: 22px 0 18px;
  border: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.panel-estilista__resumen {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 10px 0 0;
}

.panel-estilista__cifra {
  font-family: var(--m-font-display);
  font-size: 1.875rem;
}

.panel-estilista__de {
  color: var(--m-piedra-clara);
  font-size: 0.8125rem;
}

.panel-estilista__riel {
  display: block;
  height: 6px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
}

.panel-estilista__avance {
  display: block;
  height: 100%;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
}

.panel-estilista__citas {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.84rem;
}

.panel-estilista__cita {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
}

.panel-estilista__franja {
  font-variant-numeric: tabular-nums;
}

.panel-estilista__servicios {
  color: var(--m-piedra-clara);
  text-align: right;
}

.panel-estilista__enlace {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  align-self: flex-start;
  margin-top: 10px;
  padding-bottom: 2px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  color: var(--m-oro);
  font-size: 0.78rem;
  text-decoration: none;
}

.panel-estilista__pie {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 24px;
}

.panel-estilista__guardar {
  min-height: 50px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.75rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.panel-estilista__guardar:disabled,
.panel-estilista__confirmar:disabled {
  opacity: 0.6;
  cursor: progress;
}

.panel-estilista__eliminar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--m-tactil-min);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-piedra-clara);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.panel-estilista__confirmacion {
  padding: 12px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
}

.panel-estilista__pregunta {
  margin: 0 0 10px;
  font-size: 0.84rem;
}

.panel-estilista__botones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.panel-estilista__cancelar,
.panel-estilista__confirmar {
  min-height: var(--m-tactil-min);
  padding: 0 16px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.panel-estilista__cancelar {
  background: transparent;
  color: var(--m-hueso);
}

/* La única pieza en peligro: el botón que borra de verdad (6,4:1). */
.panel-estilista__confirmar {
  border-color: var(--m-peligro);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
}

.panel-estilista__bloqueo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--m-piedra-clara);
  font-size: 0.75rem;
}

.panel-estilista__cerrar:focus-visible,
.panel-estilista__guardar:focus-visible,
.panel-estilista__eliminar:focus-visible,
.panel-estilista__cancelar:focus-visible,
.panel-estilista__confirmar:focus-visible,
.panel-estilista__enlace:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

/** Realce al pasar: el COLOR. El movimiento es global (`app.scss`). */
@media (hover: hover) and (pointer: fine) {
  .panel-estilista__cerrar:hover {
    color: var(--m-hueso);
  }

  .panel-estilista__guardar:hover:not(:disabled) {
    background: var(--m-oro-claro);
  }

  .panel-estilista__eliminar:hover {
    border-color: var(--m-oro);
  }

  .panel-estilista__cancelar:hover {
    border-color: var(--m-oro);
  }

  // El borrado no se aclara: se le enciende un filete de oro alrededor.
  .panel-estilista__confirmar:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .panel-estilista__enlace:hover {
    border-bottom-color: var(--m-oro);
  }
}
</style>
