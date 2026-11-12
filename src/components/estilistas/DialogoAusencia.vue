<template>
  <section
    class="ausencia"
    role="document"
    aria-labelledby="ausencia-titulo"
    data-test="dialogo-ausencia-cuerpo"
  >
    <header class="ausencia__cabecera">
      <div class="ausencia__titulos">
        <p class="ausencia__antetitulo">{{ worker.name }}</p>
        <h2
          id="ausencia-titulo"
          class="ausencia__titulo"
          data-test="titulo-ausencia"
        >
          {{ titulo }}
        </h2>
      </div>
      <button
        type="button"
        class="ausencia__cerrar m-boton-plano"
        aria-label="Cerrar"
        data-test="cerrar-ausencia"
        :disabled="ocupada"
        @click="paso === 'resultado' ? emit('hecho') : emit('cerrar')"
      >
        <StrokeIcon nombre="cerrar" :tamano="20" />
      </button>
    </header>

    <div class="ausencia__cuerpo">
      <template v-if="paso === 'elegir'">
        <label for="ausencia-fecha" class="ausencia__etiqueta">Fecha</label>
        <input
          id="ausencia-fecha"
          v-model="fecha"
          class="ausencia__campo"
          data-test="fecha-ausencia"
          type="date"
          :min="hoy"
          aria-describedby="ausencia-fecha-pista"
          required
        />
        <!-- Safari de escritorio 13.1 no trae selector: ahí se escribe a mano. -->
        <span
          id="ausencia-fecha-pista"
          class="ausencia__pista"
          data-test="pista-fecha"
          >AAAA-MM-DD</span
        >

        <fieldset class="ausencia__modo">
          <legend class="ausencia__etiqueta">Cuánto falta</legend>
          <label class="ausencia__opcion">
            <input
              v-model="modo"
              type="radio"
              name="ausencia-modo"
              value="dia"
              data-test="modo-dia"
            />
            <span>Todo el día</span>
          </label>
          <label class="ausencia__opcion">
            <input
              v-model="modo"
              type="radio"
              name="ausencia-modo"
              value="franja"
              data-test="modo-franja"
            />
            <span>Una franja</span>
          </label>
        </fieldset>

        <div v-if="modo === 'franja'" class="ausencia__franja">
          <div class="ausencia__hora">
            <label for="ausencia-desde" class="ausencia__etiqueta">Desde</label>
            <select
              id="ausencia-desde"
              v-model="desde"
              class="ausencia__campo"
              data-test="desde-ausencia"
            >
              <option v-for="o in desdes" :key="o.valor" :value="o.valor">
                {{ o.texto }}
              </option>
            </select>
          </div>
          <div class="ausencia__hora">
            <label for="ausencia-hasta" class="ausencia__etiqueta">Hasta</label>
            <select
              id="ausencia-hasta"
              v-model="hasta"
              class="ausencia__campo"
              data-test="hasta-ausencia"
            >
              <option v-for="o in hastas" :key="o.valor" :value="o.valor">
                {{ o.texto }}
              </option>
            </select>
          </div>
        </div>
        <p v-if="horario" class="ausencia__ayuda" data-test="horario-dia">
          Horario de ese día: {{ horario }}
        </p>
      </template>

      <template v-else-if="plan">
        <div class="ausencia__resumen" data-test="resumen-ausencia">
          <p class="ausencia__que">{{ resumen }}</p>
          <p v-if="!lineas.length && !pendientes.length" class="ausencia__nada">
            No tiene citas en ese rato: nada cambia.
          </p>
          <p
            v-else-if="cuenta"
            class="ausencia__cuenta"
            data-test="cuenta-impactos"
          >
            {{ cuenta }}
          </p>
        </div>

        <ul v-if="lineas.length" class="ausencia__citas">
          <li
            v-for="l in lineas"
            :key="l.id"
            class="ausencia__cita"
            data-test="impacto-ausencia"
          >
            <span class="ausencia__cita-hora" data-test="hora-impacto">{{
              l.hora
            }}</span>
            <span class="ausencia__cita-quien">
              <span class="ausencia__cita-clienta">{{ l.clienta }}</span>
              <span class="ausencia__cita-servicios">{{ l.servicios }}</span>
            </span>
            <span
              class="ausencia__destino"
              :class="{ 'ausencia__destino--cancela': l.cancelada }"
              data-test="destino-impacto"
              >{{ l.destino }}</span
            >
          </li>
        </ul>

        <ul v-if="pendientes.length" class="ausencia__citas">
          <li
            v-for="p in pendientes"
            :key="p.id"
            class="ausencia__pendiente"
            role="alert"
            data-test="sin-resolver"
          >
            <StrokeIcon nombre="alerta" :tamano="16" />
            <span
              >{{ p.texto }}: no se pudo mover ni cancelar; revísala en la
              bandeja.</span
            >
          </li>
        </ul>

        <p
          v-if="paso === 'vista' && hayCanceladas"
          class="ausencia__ayuda"
          data-test="nota-canceladas"
        >
          Una cita cancelada no vuelve aunque después quites la ausencia.
        </p>
      </template>

      <p
        v-if="error"
        class="ausencia__error"
        role="alert"
        data-test="error-ausencia"
      >
        {{ error }}
      </p>
    </div>

    <footer class="ausencia__acciones">
      <template v-if="paso === 'elegir'">
        <button
          type="button"
          class="ausencia__boton"
          data-test="cancelar-ausencia"
          @click="emit('cerrar')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ausencia__boton ausencia__boton--principal"
          data-test="ver-que-pasa"
          :disabled="ocupada"
          @click="verQuePasa"
        >
          {{ ocupada ? 'Revisando…' : 'Ver qué pasa' }}
        </button>
      </template>
      <template v-else-if="paso === 'vista'">
        <button
          type="button"
          class="ausencia__boton"
          data-test="cambiar-ausencia"
          :disabled="ocupada"
          @click="volver"
        >
          Cambiar
        </button>
        <button
          type="button"
          class="ausencia__boton"
          :class="
            hayCanceladas
              ? 'ausencia__boton--peligro'
              : 'ausencia__boton--principal'
          "
          data-test="confirmar-ausencia"
          :disabled="ocupada"
          @click="confirmar"
        >
          {{ ocupada ? 'Guardando…' : 'Confirmar' }}
        </button>
      </template>
      <button
        v-else
        type="button"
        class="ausencia__boton ausencia__boton--principal"
        data-test="listo-ausencia"
        @click="emit('hecho')"
      >
        Listo
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type {
  AbsenceInput,
  AbsencePlan,
  AbsenceResult,
} from 'src/api/workers-api';
import { useAusencias } from 'src/composables/workers/useAusencias';
import { getSalonNowParts } from 'src/helpers/businessHours';
import {
  cuentaDeImpactos,
  fechaDeAusencia,
  franjaDeAusencia,
  horarioDelDia,
  lineaDeImpacto,
  mensajeDeAusencia,
  opcionesDesde,
  opcionesHasta,
  rangoDelPanel,
} from 'src/helpers/ausencias';

/**
 * «Marcar ausencia» de una estilista (spec de ausencias, §5 «Panel web»).
 *
 * Tres pasos: elegir (fecha desde hoy, día completo o franja de 30 en 30
 * dentro del horario de ese día) → vista previa (qué pasa con cada cita, sin
 * tocar nada) → resultado. «Confirmar» solo existe tras la vista previa, y
 * cambiar cualquier dato obliga a verla de nuevo: nada se cancela sin que la
 * dueña lo haya visto antes. Las peticiones van por `useAusencias`, que al
 * marcar ya refresca la semana, las reservas y las horas libres.
 */
const props = defineProps<{ worker: { id: string; name: string } }>();

const emit = defineEmits<{
  (e: 'hecho'): void;
  (e: 'cerrar'): void;
}>();

const { previsualizar, marcar } = useAusencias(ref(false));

const hoy = getSalonNowParts().ymd;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const paso = ref<'elegir' | 'vista' | 'resultado'>('elegir');
const fecha = ref(hoy);
const modo = ref<'dia' | 'franja'>('dia');
const desde = ref('');
const hasta = ref('');
const plan = ref<AbsencePlan | null>(null);
const resultado = ref<AbsenceResult | null>(null);
const error = ref<string | null>(null);
const ocupada = ref(false);

const fechaValida = computed(() => FECHA.test(fecha.value));
const desdes = computed(() =>
  fechaValida.value ? opcionesDesde(fecha.value) : []
);
const hastas = computed(() =>
  fechaValida.value && desde.value
    ? opcionesHasta(fecha.value, desde.value)
    : []
);
const horario = computed(() => {
  if (!fechaValida.value) return '';
  const { abre, cierra } = horarioDelDia(fecha.value);
  return rangoDelPanel(abre, cierra);
});

/** Una hora que ya no está entre las opciones pasa a la primera que haya. */
watch(
  desdes,
  (lista) => {
    if (!lista.some((o) => o.valor === desde.value)) {
      desde.value = lista[0]?.valor ?? '';
    }
  },
  { immediate: true }
);
watch(
  hastas,
  (lista) => {
    if (!lista.some((o) => o.valor === hasta.value)) {
      hasta.value = lista[0]?.valor ?? '';
    }
  },
  { immediate: true }
);

const titulo = computed(() =>
  paso.value === 'elegir'
    ? 'Marcar ausencia'
    : paso.value === 'vista'
    ? 'Qué pasa con sus citas'
    : 'Ausencia guardada'
);

const nombre = computed(
  () => plan.value?.workerName?.trim() || props.worker.name
);
const resumen = computed(() => {
  const p = resultado.value ?? plan.value;
  if (!p) return '';
  return `${nombre.value} · ${fechaDeAusencia(p.startsAt)} · ${franjaDeAusencia(
    p.startsAt,
    p.endsAt
  )}`;
});
const impactos = computed(() =>
  paso.value === 'resultado'
    ? resultado.value?.impacts ?? []
    : plan.value?.impacts ?? []
);
const lineas = computed(() =>
  impactos.value.map((i) =>
    lineaDeImpacto(i, paso.value === 'resultado' ? 'pasado' : 'futuro')
  )
);
const cuenta = computed(() =>
  paso.value === 'vista' ? cuentaDeImpactos(impactos.value) : ''
);
const hayCanceladas = computed(() =>
  (plan.value?.impacts ?? []).some((i) => i.outcome === 'cancelada')
);
/** Las que el servidor no pudo mover ni cancelar: se nombran con la vista previa. */
const pendientes = computed(() =>
  (resultado.value?.sinResolver ?? []).map((id) => {
    const previa = plan.value?.impacts.find((i) => i.reservationId === id);
    if (!previa) return { id, texto: 'Una cita' };
    const l = lineaDeImpacto(previa);
    return { id, texto: `${l.hora} · ${l.clienta}` };
  })
);

const entrada = (): AbsenceInput =>
  modo.value === 'franja'
    ? {
        workerId: props.worker.id,
        date: fecha.value,
        from: desde.value,
        to: hasta.value,
      }
    : { workerId: props.worker.id, date: fecha.value };

function validar(): string | null {
  if (!fechaValida.value) return 'Elige la fecha.';
  if (fecha.value < hoy) return 'Elige hoy o un día que venga.';
  if (modo.value === 'franja' && (!desde.value || !hasta.value)) {
    return 'Elige desde y hasta qué hora.';
  }
  return null;
}

async function verQuePasa() {
  if (ocupada.value) return;
  error.value = validar();
  if (error.value) return;
  ocupada.value = true;
  try {
    plan.value = await previsualizar(entrada());
    paso.value = 'vista';
  } catch (err) {
    error.value = mensajeDeAusencia(err, props.worker.name, 'revisar');
  } finally {
    ocupada.value = false;
  }
}

async function confirmar() {
  if (ocupada.value || paso.value !== 'vista' || !plan.value) return;
  ocupada.value = true;
  error.value = null;
  try {
    resultado.value = await marcar(entrada());
    paso.value = 'resultado';
  } catch (err) {
    error.value = mensajeDeAusencia(err, nombre.value, 'guardar');
  } finally {
    ocupada.value = false;
  }
}

/** Volver a elegir descarta la vista previa: habrá que verla otra vez. */
function volver() {
  plan.value = null;
  error.value = null;
  paso.value = 'elegir';
}

defineOptions({ name: 'DialogoAusencia' });
</script>

<style lang="scss" scoped>
.ausencia {
  /* Quasar quita los clics a `.q-dialog__inner`: la raíz los recupera. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-panel);
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.ausencia__cabecera {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 0;
}

.ausencia__titulos {
  min-width: 0;
}

.ausencia__antetitulo {
  margin: 0;
  color: var(--m-oro-profundo);
  font-size: 0.65rem;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.ausencia__titulo {
  margin: 4px 0 0;
  font-family: var(--m-font-display);
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1.2;
}

.ausencia__cerrar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  margin: -8px -12px 0 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--m-piedra);
  cursor: pointer;
}

.ausencia__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  padding: 6px 24px 4px;
  overflow-y: auto;
}

.ausencia__etiqueta {
  display: block;
  margin: 16px 0 7px;
  padding: 0;
  color: var(--m-piedra);
  font-size: 0.65rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.ausencia__campo {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--m-tactil-min);
  padding: 0 12px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 1rem;
}

.ausencia__modo {
  margin: 0;
  padding: 0;
  border: 0;
}

.ausencia__pista {
  display: block;
  margin-top: 4px;
  color: var(--m-piedra);
  font-size: 0.75rem;
}

.ausencia__modo .ausencia__etiqueta {
  float: left;
  width: 100%;
}

.ausencia__opcion {
  display: inline-flex;
  clear: left;
  align-items: center;
  gap: 10px;
  min-height: var(--m-tactil-min);
  margin-right: 22px;
  font-size: 0.95rem;
  cursor: pointer;
}

.ausencia__opcion input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--m-tinta);
}

.ausencia__franja {
  display: flex;
  gap: 12px;
}

.ausencia__hora {
  flex: 1;
  min-width: 0;
}

.ausencia__ayuda,
.ausencia__nada {
  margin: 12px 0 0;
  color: var(--m-piedra);
  font-size: 0.85rem;
  line-height: 1.45;
}

.ausencia__resumen {
  margin-top: 10px;
}

.ausencia__que {
  margin: 0;
  font-size: 0.95rem;
}

.ausencia__cuenta {
  margin: 6px 0 0;
  color: var(--m-oro-profundo);
  font-size: 0.7rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.ausencia__citas {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.ausencia__cita {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 14px;
  padding: 10px 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  font-size: 0.9rem;
}

.ausencia__cita-hora {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ausencia__cita-quien {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}

.ausencia__cita-servicios {
  color: var(--m-piedra);
  font-size: 0.82rem;
}

.ausencia__destino {
  grid-column: 2;
  color: var(--m-oro-profundo);
  font-size: 0.82rem;
}

/* Lo que no tiene vuelta: en el color de peligro y en negrita, no solo color. */
.ausencia__destino--cancela {
  color: var(--m-peligro);
  font-weight: 500;
}

.ausencia__pendiente {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: var(--m-filete-grosor) solid var(--m-peligro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-aviso-fondo);
  font-size: 0.88rem;
}

.ausencia__pendiente + .ausencia__pendiente {
  margin-top: 8px;
}

.ausencia__error {
  margin: 14px 0 0;
  color: var(--m-peligro);
  font-size: 0.88rem;
  line-height: 1.45;
}

.ausencia__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
}

.ausencia__boton {
  min-height: var(--m-tactil-min);
  padding: 0 20px;
  border: var(--m-filete-grosor) solid transparent;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 0.72rem;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.ausencia__boton--principal {
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.ausencia__boton--peligro {
  border-color: var(--m-peligro);
  background: var(--m-peligro);
  color: var(--m-peligro-texto);
}

.ausencia__boton:disabled,
.ausencia__cerrar:disabled {
  opacity: 0.6;
  cursor: progress;
}

.ausencia__boton:focus-visible,
.ausencia__cerrar:focus-visible,
.ausencia__campo:focus-visible,
.ausencia__opcion input:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

/* Móvil: el diálogo es la pantalla (el panel lo abre `maximized`). */
@media (max-width: 599px) {
  .ausencia {
    width: 100vw;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
  }

  .ausencia__cabecera {
    padding: 18px 20px 0;
  }

  .ausencia__cuerpo {
    padding: 6px 20px 4px;
  }

  .ausencia__acciones {
    flex-direction: column-reverse;
    padding: 14px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  }

  .ausencia__boton {
    width: 100%;
  }
}

/** Realce al pasar (solo puntero fino): el COLOR. */
@media (hover: hover) and (pointer: fine) {
  .ausencia__boton:hover:not(:disabled) {
    border-color: var(--m-oro);
  }

  .ausencia__cerrar:hover {
    color: var(--m-tinta);
  }
}
</style>
