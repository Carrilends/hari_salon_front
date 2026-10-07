<template>
  <header class="barra" data-test="toolbar">
    <!--
      Por debajo de 550 px el campo de 330 px no cabe al lado del título: el
      buscador se convierte en un botón y, al pulsarlo, ocupa la barra entera.
      El cambio es seco, sin `<transition>`: con `mode="out-in"` el campo no
      existe hasta que acaba el fundido de salida y el foco del `nextTick` caía
      en el vacío; y en iOS un foco fuera del gesto del toque no levanta el
      teclado.
    -->
    <div
      v-if="esBusquedaCompacta && overlayAbierto"
      key="overlay"
      class="barra__overlay"
      data-test="buscador-overlay"
    >
      <div class="barra__buscador barra__buscador--ancho">
        <label class="sr" for="buscador-servicio">Buscar servicio</label>
        <span class="barra__lupa" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="6.4" />
            <path d="M15.8 15.8 20.5 20.5" />
          </svg>
        </span>
        <input
          id="buscador-servicio"
          ref="campo"
          type="search"
          class="barra__campo"
          placeholder="Buscar servicio"
          autocomplete="off"
          :value="texto"
          data-test="buscador"
          @input="alEscribir"
          @keyup.enter="alEnter"
        />
      </div>
      <button
        type="button"
        class="barra__redondo"
        aria-label="Cerrar la búsqueda"
        data-test="cerrar-buscador"
        @click="overlayAbierto = false"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
      </button>
    </div>

    <div v-else key="encabezado" class="barra__encabezado">
      <div class="barra__titulo">
        <p class="barra__conteo" data-test="conteo">{{ conteo }}</p>
        <h1 class="barra__h1">Servicios</h1>
      </div>

      <div class="barra__acciones">
        <div v-if="!esBusquedaCompacta" class="barra__buscador">
          <label class="sr" for="buscador-servicio">Buscar servicio</label>
          <span class="barra__lupa" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="11" cy="11" r="6.4" />
              <path d="M15.8 15.8 20.5 20.5" />
            </svg>
          </span>
          <input
            id="buscador-servicio"
            type="search"
            class="barra__campo"
            placeholder="Buscar servicio"
            autocomplete="off"
            :value="texto"
            data-test="buscador"
            @input="alEscribir"
          />
        </div>
        <button
          v-else
          type="button"
          class="barra__redondo"
          aria-label="Buscar servicio"
          data-test="buscador-compacto"
          @click="abrirOverlay"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="11" cy="11" r="6.4" />
            <path d="M15.8 15.8 20.5 20.5" />
          </svg>
        </button>

        <!--
            Con carril (D1) los filtros ya se ven a la izquierda de la lista, y
            la hoja que abriría este botón no existe a ese ancho.
          -->
        <div v-if="!conCarril" class="barra__filtros">
          <!--
              Reguladores, no embudo: tres líneas con sus perillas. El embudo de
              Line Awesome que había antes es un icono relleno y desentona con
              el resto del portal, que es todo trazo fino.
            -->
          <button
            type="button"
            class="barra__boton"
            :class="{ 'barra__boton--redondo': !muestraEtiquetas }"
            :aria-label="etiquetaFiltros"
            data-test="boton-filtros"
            @click="emit('abrir-filtros')"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M3 7h5M12 7h9" />
              <path d="M3 12h11M18 12h3" />
              <path d="M3 17h3M10 17h11" />
              <circle cx="10" cy="7" r="2" />
              <circle cx="16" cy="12" r="2" />
              <circle cx="8" cy="17" r="2" />
            </svg>
            <span v-if="muestraEtiquetas">Filtros</span>
            <!--
                `aria-hidden` porque el número ya va en el nombre accesible del
                botón: sin esto el lector de pantalla diría «Filtros (3 activos)
                3». Va DENTRO del botón para subir y hundirse con él («Realce y
                hundido», `app.scss`); como hermano se quedaba quieto.
              -->
            <span
              v-if="filtrosActivos > 0"
              class="barra__contador"
              aria-hidden="true"
              data-test="contador-filtros"
            >
              {{ filtrosActivos > 9 ? '9+' : filtrosActivos }}
            </span>
          </button>
        </div>

        <button
          v-if="esAdmin"
          type="button"
          class="barra__boton barra__boton--oro"
          :class="{ 'barra__boton--redondo': !muestraEtiquetas }"
          aria-label="Crear servicio"
          data-test="crear-servicio"
          @click="emit('crear-servicio')"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span v-if="muestraEtiquetas">Crear servicio</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

import { useServiceViewport } from 'src/composables/services/useServiceViewport';
import { useOptionsStore } from 'src/stores/options-store';

/**
 * La cabecera de contenido de la página de servicios.
 *
 * `mostrados` está en el contrato de la hoja de ruta (§5) y aquí no se pinta: el
 * conteo de la barra habla del catálogo entero («48 servicios») y el de la
 * página visible es del pie («12 de 48 servicios»). Se declara para no romper
 * el contrato, porque es la barra quien podría necesitarlo si el conteo cambia.
 */
const props = withDefaults(
  defineProps<{
    /**
     * `null` mientras la primera respuesta no ha llegado: `/services` se
     * prerenderiza con la lista aún vacía, y «0 servicios» sería una cifra
     * falsa en el HTML que se publica e indexa.
     */
    total: number | null;
    mostrados: number;
    busqueda: string;
    filtrosActivos: number;
    esAdmin: boolean;
    /**
     * Fuera del contrato de §5, y opcional a propósito: la pone la página
     * cuando el carril de filtros está a la vista (fase C). Sin ella la barra es
     * la de siempre, con su botón de filtros.
     */
    conCarril?: boolean;
  }>(),
  { conCarril: false }
);

const emit = defineEmits<{
  (e: 'update:busqueda', valor: string): void;
  (e: 'abrir-filtros'): void;
  (e: 'crear-servicio'): void;
}>();

const { esBusquedaCompacta, muestraEtiquetas } = useServiceViewport();

/**
 * Las categorías no llegan por props: el contrato de §5 fija cinco y ninguna es
 * esta. Son las raíces del árbol de tags, que `ServicePage` ya hidrata con
 * `useOptions()`, así que se leen de donde están en vez de inventar una prop.
 */
const optionsStore = useOptionsStore();
const categorias = computed(() => optionsStore.principalServices.length);

/** Espacio duro: la línea conserva su alto y el título no salta al llegar la cifra. */
const SIN_CIFRA = '\u00a0';

const conteo = computed(() => {
  // Total desconocido: no se dice nada, tampoco las categorías (una cifra sola
  // a medias se lee como el total).
  if (props.total === null) return SIN_CIFRA;
  const servicios = `${props.total} ${
    props.total === 1 ? 'servicio' : 'servicios'
  }`;
  // El primer render llega antes de que `/filters` conteste: «0 categorías»
  // sería una cifra falsa, así que no se dice nada.
  if (categorias.value === 0) return servicios;
  const cuantas = `${categorias.value} ${
    categorias.value === 1 ? 'categoría' : 'categorías'
  }`;
  return `${servicios} · ${cuantas}`;
});

/**
 * El número de filtros va en el nombre accesible y no solo en la burbuja: por
 * debajo de 1100 px el botón es redondo y la burbuja sería la única pista.
 */
const etiquetaFiltros = computed(() =>
  props.filtrosActivos > 0
    ? `Filtros (${props.filtrosActivos} activos)`
    : 'Filtros'
);

/**
 * El retardo del buscador.
 *
 * Son los mismos 1000 ms que traía `debounce="1000"` en el `q-input` que había
 * aquí: cada aviso al padre es una petición a `/service/search`, así que una
 * tecla no puede valer una consulta. Con marcado llano (D8) el `q-input` ya no
 * está, y el temporizador se lleva a mano — y se limpia al desmontar, porque un
 * emit después del desmontaje es un fallo que no se ve hasta que rompe otra
 * cosa.
 */
const RETARDO_MS = 1000;

const texto = ref(props.busqueda);
const overlayAbierto = ref(false);
const campo = ref<HTMLInputElement | null>(null);

let temporizador: ReturnType<typeof setTimeout> | null = null;

const cancelar = () => {
  if (temporizador === null) return;
  clearTimeout(temporizador);
  temporizador = null;
};

const alEscribir = (evento: Event) => {
  texto.value = (evento.target as HTMLInputElement).value;
  cancelar();
  temporizador = setTimeout(() => {
    temporizador = null;
    emit('update:busqueda', texto.value);
    // Conducta de siempre: cuando el término llega, el overlay ya no hace
    // falta y la barra vuelve a su sitio.
    overlayAbierto.value = false;
  }, RETARDO_MS);
};

/** Enter entrega ya lo escrito, en vez de dejarlo caer desde un overlay cerrado. */
const alEnter = () => {
  if (temporizador !== null) {
    cancelar();
    emit('update:busqueda', texto.value);
  }
  overlayAbierto.value = false;
};

onUnmounted(cancelar);

/**
 * Un cambio venido de fuera —limpiar los filtros, el atajo del inicio— entra en
 * el campo y NO se devuelve: si se devolviera, padre e hijo se perseguirían.
 */
watch(
  () => props.busqueda,
  (valor) => {
    if (valor === texto.value) return;
    texto.value = valor;
    cancelar();
  }
);

const abrirOverlay = () => {
  overlayAbierto.value = true;
};

/** Abrir un buscador y no poner el cursor dentro es pedir un toque de más. */
watch(overlayAbierto, (abierto) => {
  if (!abierto) return;
  void nextTick(() => campo.value?.focus());
});

/** Al ensancharse la ventana el campo vuelve a caber: el overlay ya no toca. */
watch(esBusquedaCompacta, (compacta) => {
  if (!compacta) overlayAbierto.value = false;
});

defineOptions({ name: 'ServiceToolbar' });
</script>

<style scoped lang="scss">
/**
 * El fondo tinta lo pone la página, no la barra: así la barra puede ir también
 * dentro de una banda clara si alguna vez hace falta.
 */
.barra {
  padding: 24px 0 18px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.barra__encabezado {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}

.barra__titulo {
  min-width: 0;
}

.barra__conteo {
  margin: 0 0 6px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  // Sobre tinta el oro claro da 5,7:1: aquí sí es color de texto.
  color: var(--m-oro);
}

.barra__h1 {
  margin: 0;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 30px;
  line-height: 1.1;
  color: var(--m-hueso);
}

.barra__acciones {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
}

.barra__overlay {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 10px;
}

.barra__buscador {
  display: flex;
  align-items: center;
  width: 330px;
  max-width: 100%;
  height: var(--m-tactil-min);
  padding: 0 14px;
  gap: 10px;
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
}

/** En el overlay el campo ocupa lo que quede tras el botón de cerrar. */
.barra__buscador--ancho {
  width: auto;
  flex: 1 1 auto;
}

.barra__buscador:focus-within {
  border-color: var(--m-oro);
}

.barra__lupa {
  display: flex;
  flex-shrink: 0;
  color: var(--m-oro);
}

.barra__campo {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  background: none;
  border: 0;
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 14px;
}

.barra__campo::placeholder {
  color: var(--m-piedra-clara);
}

/** El foco se ve en el filete del contenedor, no en el campo desnudo. */
.barra__campo:focus {
  outline: none;
}

.barra__redondo,
.barra__boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--m-tactil-min);
  gap: 8px;
  background: none;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-pildora);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.barra__redondo {
  width: var(--m-tactil-min);
  flex-shrink: 0;
}

.barra__boton {
  // Ancla el contador de filtros, que va dentro del botón.
  position: relative;
  padding: 0 18px;
}

.barra__boton--redondo {
  width: var(--m-tactil-min);
  padding: 0;
}

.barra__boton--oro {
  background: var(--m-oro);
  border-color: var(--m-oro);
  color: var(--m-tinta);
}

.barra__redondo:focus-visible,
.barra__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 3px;
}

.barra__filtros {
  position: relative;
  display: inline-flex;
}

.barra__contador {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: var(--m-oro);
  border-radius: var(--m-radio-pildora);
  color: var(--m-tinta);
  font-size: 11px;
  line-height: 1;
}

@media (max-width: 699px) {
  .barra {
    padding: 18px 0 14px;
  }

  .barra__encabezado {
    gap: 14px;
  }

  .barra__h1 {
    font-size: 24px;
  }

  .barra__acciones {
    margin-left: auto;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px con
 * sombra suave, hundirse a 0,96 al pulsar— es global, en `app.scss`
 * («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .barra__redondo:hover,
  .barra__boton:hover {
    border-color: var(--m-oro);
  }

  .barra__boton--oro:hover {
    border-color: var(--m-oro-claro);
    background: var(--m-oro-claro);
  }
}
</style>
