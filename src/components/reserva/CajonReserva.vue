<template>
  <q-dialog
    :model-value="abierto"
    class="cajon-dialogo"
    aria-label="Tu reserva"
    :position="movil ? 'standard' : 'right'"
    :maximized="movil"
    :full-height="!movil"
    :transition-show="movil ? 'slide-up' : 'slide-left'"
    :transition-hide="movil ? 'slide-down' : 'slide-right'"
    @update:model-value="alCambiarDialogo"
  >
    <section
      class="cajon"
      :class="{ 'cajon--movil': movil }"
      data-test="cajon-reserva"
      aria-labelledby="cajon-titulo"
    >
      <header class="cajon__cabecera">
        <div class="cajon__barra">
          <div>
            <p
              v-if="paso !== 'exito' && cantidad > 0"
              class="cajon__cuenta"
              data-test="cuenta-servicios"
            >
              {{ cantidadDeServicios(cantidad) }}
            </p>
            <h2 id="cajon-titulo" class="cajon__titulo">Tu reserva</h2>
          </div>
          <button
            type="button"
            class="cajon__cerrar"
            data-test="cerrar-cajon"
            aria-label="Cerrar"
            @click="cerrar"
          >
            <StrokeIcon nombre="cerrar" :tamano="20" />
          </button>
        </div>
        <IndicadorPasos v-if="numeroDePaso" :actual="numeroDePaso" />
      </header>

      <PantallaExito
        v-if="paso === 'exito' && resumen"
        :resumen="resumen"
        @ver-servicios="irAServicios"
        @ver-mis-reservas="irAMisReservas"
        @cerrar="cerrar"
      />

      <template v-else>
        <div ref="cuerpo" class="cajon__cuerpo" tabindex="-1">
          <PasoServicios
            v-if="paso === 'servicios'"
            :lineas="lineas"
            @quitar="quitarServicio"
            @ver-servicios="irAServicios"
            @abrir-asistente="abrirAsistente"
          />
          <PasoCuando
            v-else-if="paso === 'cuando'"
            :estilistas="estilistas"
            :estilista-id="estilistaId"
            :duracion-min="duracion"
            :dias="dias"
            :fecha="fecha"
            :huecos="huecos"
            :hora="hora"
            :cargando="cargandoHuecos"
            :error-huecos="errorHuecos"
            :aviso="aviso"
            @elegir-estilista="elegirEstilista"
            @elegir-fecha="elegirFecha"
            @elegir-hora="elegirHora"
            @elegir-otra-hora="elegirOtraHora"
            @probar-sin-preferencia="probarSinPreferencia"
            @reintentar="reintentarHuecos"
          />
          <PasoDatos
            v-else
            v-model:nombre="nombre"
            v-model:telefono="telefono"
            v-model:consentimiento="consentimiento"
            :con-sesion="conSesion"
            :cuenta="cuenta"
            :cita="cita"
            :errores="errores"
            :error-envio="errorEnvio"
            @cambiar="irACuando"
            @entrar="irAEntrar"
          />
        </div>

        <footer class="cajon__pie">
          <p
            v-if="paso === 'cuando' && lineaResumen"
            class="cajon__resumen"
            data-test="linea-resumen"
          >
            <StrokeIcon nombre="calendario" :tamano="16" />
            {{ lineaResumen }}
          </p>
          <div class="cajon__acciones">
            <button
              v-if="paso !== 'servicios'"
              type="button"
              class="cajon__atras"
              data-test="atras"
              @click="atras"
            >
              <span aria-hidden="true">←</span> Atrás
            </button>
            <div class="cajon__total">
              <p class="cajon__importe" data-test="total">
                {{ precioTexto(total) }}
              </p>
              <p class="cajon__duracion">{{ duracionAprox(duracion) }}</p>
            </div>
            <button
              type="button"
              class="cajon__continuar"
              data-test="continuar"
              :disabled="!puedeContinuar"
              :aria-busy="enviando ? 'true' : undefined"
              @click="continuar"
            >
              {{ textoBoton }}
            </button>
          </div>
        </footer>
      </template>
    </section>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import IndicadorPasos from 'src/components/reserva/IndicadorPasos.vue';
import PasoServicios from 'src/components/reserva/PasoServicios.vue';
import PasoCuando from 'src/components/reserva/PasoCuando.vue';
import PasoDatos from 'src/components/reserva/PasoDatos.vue';
import PantallaExito from 'src/components/reserva/PantallaExito.vue';
import { useCajonReserva } from 'src/composables/booking/useCajonReserva';
import { useAssistantPanel } from 'src/composables/assistant/useAssistantPanel';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import {
  cantidadDeServicios,
  duracionAprox,
  precioTexto,
} from 'src/helpers/reserva-texto';

/**
 * El cajón de reserva (spec §1, B1–B7): un solo diálogo, a la derecha y a
 * alto completo en escritorio (480 px), a pantalla completa por debajo de
 * 700 px. Sustituye a los dos diálogos de `bookingDialog.vue` —la bolsa con su
 * pestaña de administración, y «Elegir Fecha y Hora»—. La administración vive
 * en `/reservas` (plan 3).
 *
 * Este componente compone y navega; lo que decide está en `useCajonReserva`.
 */
defineOptions({ name: 'CajonReserva' });

const props = defineProps<{ abierto: boolean }>();

const emit = defineEmits<{ (e: 'update:abierto', valor: boolean): void }>();

const router = useRouter();
const route = useRoute();
const { abrir: abrirPanelAsistente } = useAssistantPanel();

/** El mismo corte de 700 px que la cabecera y el inicio. */
const movil = useConsultaMedios('(max-width: 699px)', false);

const {
  paso,
  fecha,
  hora,
  estilistaId,
  nombre,
  telefono,
  consentimiento,
  errores,
  enviando,
  errorEnvio,
  aviso,
  resumen,
  lineas,
  cantidad,
  total,
  duracion,
  conSesion,
  cuenta,
  dias,
  estilistas,
  huecos,
  cargandoHuecos,
  errorHuecos,
  cita,
  lineaResumen,
  puedeContinuar,
  continuar,
  atras,
  irACuando,
  elegirFecha,
  elegirHora,
  elegirEstilista,
  quitarServicio,
  reintentarHuecos,
  elegirOtraHora,
  probarSinPreferencia,
} = useCajonReserva(toRef(props, 'abierto'));

const cuerpo = ref<HTMLElement | null>(null);

const numeroDePaso = computed<1 | 2 | 3 | null>(() => {
  if (paso.value === 'servicios') return 1;
  if (paso.value === 'cuando') return 2;
  if (paso.value === 'datos') return 3;
  return null;
});

const textoBoton = computed(() => {
  if (paso.value !== 'datos') return 'Continuar';
  return enviando.value ? 'Registrando…' : 'Confirmar reserva';
});

// Al cambiar de paso, el cuerpo vuelve arriba y recibe el foco: quien navega
// con teclado o lector de pantalla empieza el paso nuevo por el principio.
watch(paso, async () => {
  await nextTick();
  if (!cuerpo.value) return;
  cuerpo.value.scrollTop = 0;
  cuerpo.value.focus({ preventScroll: true });
});

function alCambiarDialogo(valor: boolean) {
  emit('update:abierto', valor);
}

function cerrar() {
  emit('update:abierto', false);
}

function irAServicios() {
  cerrar();
  void router.push('/services');
}

function irAMisReservas() {
  cerrar();
  void router.push({ name: 'my-reservations' });
}

function irAEntrar() {
  cerrar();
  void router.push({ name: 'login', query: { redirect: route.fullPath } });
}

function abrirAsistente() {
  cerrar();
  abrirPanelAsistente();
}
</script>

<style scoped lang="scss">
/**
 * Tableros ReservaCajonPasos y ReservaCajonEstados. Cabecera tinta (68 px +
 * pasos; 60 en móvil), cuerpo hueso que desplaza, pie nieve fijo.
 */
.cajon {
  /* Quasar quita los clics a `.q-dialog__inner` y solo los devuelve a sus
     hijos `<div>`: sin esto, cada clic atraviesa el cajón y cae en el velo. */
  pointer-events: all;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 480px;
  max-width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  box-shadow: var(--m-sombra-cajon);
}

.cajon--movil {
  width: 100vw;
  box-shadow: none;
}

.cajon__cabecera {
  flex-shrink: 0;
  padding: 0 12px 0 28px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.cajon__barra {
  height: var(--m-cabecera-alto);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cajon__cuenta {
  margin: 0 0 3px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro);
}

.cajon__titulo {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 24px;
  font-weight: 400;
}

.cajon__cerrar {
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-hueso);
  cursor: pointer;
}

.cajon__cerrar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.cajon__cuerpo {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px 24px;
  outline: none;
}

.cajon__pie {
  flex-shrink: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-nieve);
}

.cajon__resumen {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 10px 24px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
  font-size: 13px;
}

.cajon__resumen :deep(svg) {
  flex-shrink: 0;
  color: var(--m-oro-profundo);
}

.cajon__acciones {
  min-height: 80px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
}

.cajon__atras {
  min-height: var(--m-tactil-min);
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--m-piedra);
  font-family: var(--m-font-sans);
  font-size: 13px;
  cursor: pointer;
}

.cajon__total {
  flex: 1 1 auto;
  text-align: right;
}

.cajon__importe {
  margin: 0;
  font-family: var(--m-font-display);
  font-size: 20px;
}

.cajon__duracion {
  margin: 0;
  font-size: 11.5px;
  color: var(--m-piedra);
}

.cajon__continuar {
  min-height: 48px;
  padding: 0 28px;
  border: none;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
}

.cajon__continuar:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cajon__atras:focus-visible,
.cajon__continuar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (max-width: 699px) {
  .cajon__cabecera {
    padding: 0 6px 0 20px;
  }

  .cajon__barra {
    height: 60px;
  }

  /* El tablero de móvil no lleva la cuenta encima del título. */
  .cajon__cuenta {
    display: none;
  }

  .cajon__titulo {
    font-size: 22px;
  }

  .cajon__cuerpo {
    padding: 20px 20px 24px;
  }

  .cajon__resumen {
    padding: 9px 20px;
    font-size: 12.5px;
  }

  .cajon__acciones {
    min-height: 76px;
    gap: 12px;
    padding: 0 20px;
  }

  .cajon__importe {
    font-size: 18px;
  }

  .cajon__continuar {
    padding: 0 20px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .cajon__cerrar:hover {
    color: var(--m-oro);
  }

  .cajon__atras:hover {
    color: var(--m-tinta);
  }

  .cajon__continuar:hover:not(:disabled) {
    color: var(--m-oro);
  }
}
</style>

<!--
  Sin `scoped` a propósito, por dos razones. El velo y el relleno los pinta
  QDialog, cuyos nodos no llevan el atributo de ámbito; la clase
  `cajon-dialogo` viaja al div raíz del diálogo (QDialog mete `attrs.class` en
  sus clases raíz), así que la regla no se escapa a otro diálogo. Y las clases
  comunes de las piezas del cajón (`cajon-etiqueta`, `cajon-enlace`) se
  declaran una sola vez aquí.
-->
<style lang="scss">
.cajon-dialogo .q-dialog__backdrop {
  background: var(--m-velo);
}

/* `--minimized` deja 24 px arriba y abajo: el cajón va de borde a borde. */
.cajon-dialogo .q-dialog__inner--right {
  padding-top: 0;
  padding-bottom: 0;
}

.cajon-etiqueta {
  margin: 0 0 10px;
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.cajon-enlace {
  padding: 0;
  border: none;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
  background: transparent;
  color: var(--m-rosa-profundo);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.cajon-enlace:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .cajon-enlace:hover {
    color: var(--m-tinta);
  }
}
</style>
