<template>
  <q-page class="mostrador" :style-fn="alturaDelMostrador">
    <ServiceToolbar
      class="mostrador__barra"
      :total="totalConocido"
      :mostrados="services.length"
      :busqueda="filterService.name"
      :filtros-activos="externalAmountOfFilters"
      :es-admin="authStore.isAdmin"
      :con-carril="hayCarril"
      @update:busqueda="alBuscar"
      @abrir-filtros="showFilterDialog = true"
      @crear-servicio="dialogCreation = true"
    />

    <div class="mostrador__cuerpo">
      <!--
        El carril decide por sí mismo si le toca pintarse (D1): por debajo de su
        ancho no pinta nada y la lista se queda con toda la fila.
      -->
      <ServiceFilterRail
        @aplicar="fetchServices"
        @update:amount="externalAmountOfFilters = $event"
      />
      <!--
        La única caja que desplaza: barra, pie y carril se quedan quietos. Lleva
        el riel dorado de `app.scss` porque el riel lo pinta quien desplaza.
      -->
      <div
        ref="listaRef"
        class="mostrador__lista m-riel-oro"
        data-test="lista-servicios"
      >
        <!--
          La rejilla reexpone una sola ranura `acciones` con `{ servicio,
          compacto }`: `compacto` es `true` en el renglón de móvil y `false` en
          la tarjeta. Solo se rellena para la dueña: sin ranura, ni la tarjeta
          ni el renglón pintan el contenedor de las acciones.
        -->
        <ServiceCardsGrid
          :servicios="services"
          :columnas="columnas"
          :renglones="esListaMovil"
          :cargando="isLoading"
          :recargando="recargandoLista"
          :error="Boolean(error)"
          :hay-filtros="hayFiltrosActivos"
          @detalle="openServiceDetail"
          @limpiar-filtros="limpiarFiltros"
          @reintentar="reintentar"
        >
          <template v-if="authStore.isAdmin" #acciones="{ servicio, compacto }">
            <ServiceCardAdminActions
              :servicio="servicio"
              :compacto="compacto"
              @editar="admin.editar"
              @promocion="admin.promocionar"
              @eliminar="admin.eliminar"
            />
          </template>
        </ServiceCardsGrid>
      </div>
    </div>

    <ServicePagerBar
      class="mostrador__pie"
      :pagina="filterService.page"
      :total-paginas="totalPages"
      :mostrados="services.length"
      :total="totalConocido"
      @update:pagina="alCambiarPagina"
    />

    <ServiceFilterDialog
      v-model:dialog="showFilterDialog"
      :total="totalServices"
      @update:amount="externalAmountOfFilters = $event"
      @update:services="fetchServices"
    />
    <service-create-edit v-model="dialogCreation" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useServices } from 'src/composables/services/useServices';
import { useServiceViewport } from 'src/composables/services/useServiceViewport';
import { useService } from 'src/composables/services/useService';
import {
  paginaTrasBorrado,
  useServiceAdminActions,
} from 'src/composables/services/useServiceAdminActions';
import ServiceCardsGrid from 'src/components/servicePage/ServiceCardsGrid.vue';
import ServiceCardAdminActions from 'src/components/servicePage/ServiceCardAdminActions.vue';
import ServiceToolbar from 'src/components/servicePage/ServiceToolbar.vue';
import ServicePagerBar from 'src/components/servicePage/ServicePagerBar.vue';
import ServiceFilterDialog from 'src/components/dialogs/serviceFilterDialog.vue';
import ServiceFilterRail from 'src/components/servicePage/ServiceFilterRail.vue';
import { FilterService } from 'src/composables/dialogs/useServiceFilter';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';
import {
  ANCHO_CARRIL_PX,
  CONSULTA_PANTALLA_BAJA,
  useFiltersStore,
} from 'src/stores/filters-store';
import serviceCreateEdit from 'src/components/dialogs/serviceCreateEdit.vue';

import type { IndexSection } from 'src/constants/index-sections';
import { useAuthStore } from 'src/stores/auth-store';
import { useOptions } from 'src/composables/shared/useOptions';
import { useOptionsStore } from 'src/stores/options-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { servicesSchema } from 'src/composables/seo/structuredData';

useOptions();
const optionsStore = useOptionsStore();

const filtersStore = useFiltersStore();
const authStore = useAuthStore();

const {
  services,
  filterService,
  totalPages,
  totalServices,
  refetch,
  isLoading,
  isFetching,
  error,
} = useServices();

/**
 * Editar, promocionar y borrar viven en su composable; la página solo decide
 * cómo refrescar. Cada motivo recarga la lista (`refetch` es parte de la clave
 * de la consulta). Tras un borrado, además, puede hacer falta retroceder de
 * página: si se borró el único servicio de la última, el paginador apuntaría a
 * una página que ya no existe y la lista se quedaría en blanco.
 */
const admin = useServiceAdminActions({
  refrescar: (motivo) => {
    if (motivo === 'borrado') {
      filterService.value.page = paginaTrasBorrado(
        services.value.length,
        filterService.value.page
      );
    }
    refetch.value++;
  },
});

// D9: los cortes de ancho son del composable. Renglones solo por debajo de
// 501 px; entre 501 y 759 px, una columna de tarjetas.
const { esListaMovil, columnas } = useServiceViewport();

useSeo({
  title: 'Servicios | Peluquería Marlene',
  description:
    'Descubre todos nuestros servicios de peluquería: cortes de cabello, coloración, alisados, barbería, maquillaje, uñas y más. Reserva online en pocos pasos.',
  path: '/services',
  jsonLd: computed(() =>
    servicesSchema(
      (services.value || []).slice(0, 20).map((service) => ({
        name: service.name,
        description: service.detail?.description,
        price: service.price,
      })),
    ),
  ),
});
const { serviceIdRef } = useService();
const dialogCreation = ref(false);

const showFilterDialog = ref(false);
const externalAmountOfFilters = ref(0);

/**
 * Desde el ancho del carril los filtros son el carril (D1) y la barra pierde su
 * botón: la hoja no se pinta por encima de ese ancho. El carril y la hoja
 * deciden cada uno si les toca; esto solo sirve para la barra y para el atajo
 * del inicio. Mismo corte y misma consulta que ellos, importados del store.
 */
const { maximized: esHojaFiltros } = useDialogMaximizedBelow(ANCHO_CARRIL_PX);
const hayCarril = computed(() => !esHojaFiltros.value);

/**
 * Ir a otra ruta y volver conserva `filters-store`, pero `useServices` arranca
 * con su filtro en blanco: el carril pintaría un género elegido sobre una lista
 * sin filtrar, y la barra diría cero filtros. Se copia el store una sola vez,
 * al arrancar; el atajo del inicio, si lo hay, lo pisa después.
 */
const filtroDelStore = (): FilterService => ({
  selectedGenres: filtersStore.selectedGenres.map((g) => g.id),
  selectedServicesIDs: [...filtersStore.selectedServicesIDs],
  includePriceRange: filtersStore.includePriceRange,
  includePromotionsOnly: filtersStore.includePromotionsOnly,
  prices: { ...filtersStore.prices },
});

/** El único sitio que escribe estos cinco campos en la consulta de la lista. */
const aplicarAlFiltro = (filtro: FilterService) => {
  filterService.value.selectedGenres = filtro.selectedGenres;
  filterService.value.selectedServicesIDs = filtro.selectedServicesIDs;
  filterService.value.includePriceRange = filtro.includePriceRange;
  filterService.value.includePromotionsOnly = filtro.includePromotionsOnly;
  filterService.value.prices.min = filtro.prices.min;
  filterService.value.prices.max = filtro.prices.max;
};

const copiarFiltroDelStore = () => {
  aplicarAlFiltro(filtroDelStore());
  externalAmountOfFilters.value = filtersStore.cantidadFiltros;
};
if (filtersStore.cantidadFiltros > 0) copiarFiltroDelStore();

const openServiceDetail = (id: string) => {
  serviceIdRef.value = id;
};

/**
 * La recarga (otra página, o un filtro nuevo) no es la primera carga: con
 * `placeholderData: previousData` las filas anteriores siguen puestas, así que
 * se avisa con una línea discreta y **no** con el esqueleto (§6.3).
 */
const recargandoLista = computed(() => isFetching.value && !isLoading.value);

/**
 * El total no se sabe hasta la primera respuesta. `/services` se prerenderiza y
 * Vue Query no resuelve durante `build:ssg`, así que lo que se pinta mientras
 * carga es el HTML publicado: con `totalServices` en 0, la barra diría
 * «0 servicios» y el pie «0 de 0 servicios». `null` hace que no digan nada. Lo
 * mismo si la primera carga falla: al lado del panel de error, «0 servicios»
 * diría que el catálogo está vacío. Una recarga (o un error) con filas ya
 * puestas sí conoce el total y lo sigue diciendo.
 */
const totalConocido = computed<number | null>(() =>
  services.value.length === 0 && (isLoading.value || Boolean(error.value))
    ? null
    : totalServices.value
);

/** Para decidir si el vacío ofrece «Limpiar filtros» o solo explica. */
const hayFiltrosActivos = computed(
  () =>
    externalAmountOfFilters.value > 0 ||
    filterService.value.includePriceRange ||
    filterService.value.includePromotionsOnly ||
    Boolean(filterService.value.name)
);

/**
 * Limpiar escribe en `filters-store`, que es el estado compartido (§6.2), y no
 * en una copia local: el carril y la hoja leen de ahí. El vaciado es el mismo
 * que hace «Limpiar» del carril y de la hoja —rango incluido, de vuelta a la
 * escala completa—, así que los tres coinciden después.
 */
const limpiarFiltros = () => {
  filtersStore.limpiarFiltros();
  filterService.value.name = '';
  aplicarAlFiltro(filtroDelStore());
  filterService.value.page = 1;
  externalAmountOfFilters.value = 0;
};

/** El botón «Reintentar»: `refetch` forma parte de la clave de la consulta. */
const reintentar = () => {
  refetch.value++;
};

/**
 * Buscar vuelve a la primera página. Hoy no lo hacía: buscando desde la página
 * 3, el backend devuelve `[]` para un término que sí tiene resultados y la
 * lista se queda en blanco.
 */
const alBuscar = (texto: string) => {
  filterService.value.name = texto;
  filterService.value.page = 1;
};

/**
 * La caja que desplaza. Es lo único de la página que desplaza: la ventana no
 * tiene nada que subir.
 */
const listaRef = ref<HTMLElement | null>(null);

/**
 * Cabecera, barra y pie quietos; solo la lista desplaza (se revirtió D4). Para
 * eso la página mide EXACTAMENTE lo que deja la cabecera del portal: con el
 * `min-height` que pone Quasar por defecto crecería con la lista y desplazaría
 * el documento. Quasar llama a esto con lo que ocupa la cabecera (`offset`) y
 * el alto de la pantalla, así que no hay cuentas a mano ni escucha de `resize`.
 * Mientras no conoce la pantalla (alto 0, el prerender de `build:ssg`) se
 * descuenta la cabecera de `100vh`, que es lo mismo que hace Quasar.
 *
 * Va en una variable CSS y no en un `height` en línea: un estilo en línea le
 * gana a cualquier hoja de estilos, y en pantalla baja el SCSS tiene que poder
 * devolverle a la página su alto natural.
 */
const alturaDelMostrador = (offset: number, alto: number) => {
  const altura = alto > 0 ? `${alto - offset}px` : `calc(100vh - ${offset}px)`;
  return { '--mostrador-alto': altura };
};

/**
 * Con el pie siempre a la vista, cambiar de página sin subir la lista deja a
 * la visitante a media página nueva. Sube la lista; en pantalla baja
 * (`CONSULTA_PANTALLA_BAJA` del store, el corte de la hoja de filtros), donde
 * desplaza la página entera, sube también la ventana. Sin DOM (`build:ssg`) la
 * referencia es nula y no se toca nada: esa es la guarda.
 */
const alCambiarPagina = (pagina: number) => {
  filterService.value.page = pagina;
  if (!listaRef.value) return;
  listaRef.value.scrollTop = 0;
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia(CONSULTA_PANTALLA_BAJA).matches
  ) {
    window.scrollTo({ top: 0 });
  }
};

type HistoryStateWithService = { service?: IndexSection };
const indexShortcutCard =
  typeof history !== 'undefined'
    ? (history.state as HistoryStateWithService | null | undefined)?.service
    : undefined;

/** Solo se consume una vez al llegar desde el índice con `router.push({ state })`. */
const indexShortcutPending = ref(!!indexShortcutCard);

function applyShortcutFromIndex(card: IndexSection) {
  const genreIds = card.filterFormat?.genres ?? [];
  const serviceIds = card.filterFormat?.services ?? [];
  // El atajo es un filtro nuevo: un interruptor o un rango que se quedara en el
  // store saldría marcado en el carril sin estar aplicado a la lista.
  filtersStore.limpiarFiltros();
  filtersStore.setGenres(genreIds);
  filtersStore.setServicesExternal(serviceIds);
  if (genreIds.length > 0 && filtersStore.selectedGenres.length === 0) {
    console.warn(
      '[ServicePage] Atajo del inicio con IDs de género no encontrados en optionsStore.genres:',
      genreIds
    );
  }
  aplicarAlFiltro(filtroDelStore());
  filterService.value.page = 1;
  externalAmountOfFilters.value = filtersStore.cantidadFiltros;
  /**
   * Con el carril (D1) no hay nada que abrir en escritorio: los filtros ya se
   * ven. Por debajo de su ancho se abre la hoja, como hasta ahora.
   */
  showFilterDialog.value = !hayCarril.value;
}

watch(
  () =>
    optionsStore.principalServices.length > 0 &&
    optionsStore.genres.length > 0,
  (ready) => {
    if (!indexShortcutCard || !indexShortcutPending.value || !ready) return;
    indexShortcutPending.value = false;
    applyShortcutFromIndex(indexShortcutCard);
  },
  { immediate: true }
);

/**
 * Recibe el filtro del carril y de la hoja. Ya NO cierra la hoja: aplica en
 * cada toque (D1), y cerrarla aquí la bajaría con cada chip. La cierran su pie
 * («Ver N servicios») y su aspa.
 */
const fetchServices = (e: FilterService) => {
  aplicarAlFiltro(e);
  /**
   * Con aplicación instantánea esto pasa a cada clic del carril: sin volver a
   * la página 1, filtrar estando en la 3 deja la lista vacía y parece que el
   * filtro no encontró nada.
   */
  filterService.value.page = 1;
};

defineOptions({
  name: 'ServicePage',
});
</script>

<style lang="scss" scoped>
/**
 * «El mostrador»: el nombre interno del armazón, que es como lo rotula el
 * tablero de escritorio del lienzo. El `<h1>` dice «Servicios», que es lo que
 * se busca y lo que publica el `<title>`.
 *
 * Columna, y no fila dentro de una caja: la caja gris con sombra lila era lo que
 * hacía que la página pareciera un formulario dentro de otra página. El fondo
 * tinta se declara aquí porque el `q-layout` lleva una foto de fondo.
 *
 * El alto lo fija `alturaDelMostrador` (el `style-fn`, en `--mostrador-alto`):
 * barra y pie no encogen, el cuerpo se come lo que sobra y, dentro de él, la
 * lista desplaza.
 *
 * El relleno inferior es el despeje del lanzador del asistente, que flota abajo
 * a la derecha: con el pie siempre a la vista, sin él la píldora tapaba
 * «Siguiente». Cuesta 34 px de lista en escritorio y 46 en móvil (frente a
 * los 40 y 28 de antes), y no hay forma más barata de no taparlo a todos los
 * anchos.
 */
.mostrador {
  display: flex;
  flex-direction: column;
  height: var(--mostrador-alto);
  min-height: var(--mostrador-alto);
  padding: 0 var(--m-banda-margen) var(--m-flotante-despeje);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.mostrador__barra,
.mostrador__pie {
  flex: none;
}

.mostrador__cuerpo {
  // Se come el alto que dejan la barra y el pie. Sin `min-height: 0` un hijo
  // flexible no encoge por debajo de su contenido: la lista entera empujaría
  // el pie fuera de la pantalla en vez de desplazar.
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  padding: 22px 0 10px;
  // Carril a la izquierda y lista al lado (D1). Sin carril, el `v-if` del
  // carril no deja ningún elemento y la lista ocupa la fila entera. Los dos se
  // estiran al alto del cuerpo para que cada uno desplace dentro de él.
  display: flex;
  align-items: stretch;
  gap: 24px;
}

.mostrador__lista {
  flex: 1 1 auto;
  // Sin esto la rejilla no encoge por debajo de su contenido y empuja la
  // página hacia la derecha.
  min-width: 0;
  min-height: 0;
  // La única caja que desplaza. `contain`: al llegar al final no le pasa el
  // gesto al documento (donde lo soporta; Safari 13.1 lo ignora sin daño).
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 699px) {
  .mostrador {
    padding: 0 var(--m-banda-margen-movil) var(--m-flotante-despeje);
  }

  .mostrador__cuerpo {
    padding: 16px 0 8px;
  }
}

/**
 * Teléfono tumbado (844×390): cabecera, barra y pie se comían el alto y a la
 * lista le quedaban 80 px. Por debajo de 560 px de alto —`ALTO_MINIMO_HOJA_PX`
 * del store, el mismo corte en que la hoja de filtros pasa a pantalla
 * completa— vuelve a desplazar la página entera: alto natural (al menos la
 * pantalla) y la lista sin caja propia. En CSS y no en JS para que valga ya en
 * el HTML prerenderizado.
 */
@media (max-height: 559px) {
  .mostrador {
    height: auto;
  }

  .mostrador__cuerpo {
    flex: 1 0 auto;
  }

  .mostrador__lista {
    overflow-y: visible;
  }
}
</style>
