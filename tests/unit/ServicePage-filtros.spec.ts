/**
 * La página con sus filtros: carril en escritorio, hoja en móvil, una sola
 * lista y un solo contador.
 *
 * El plan pedía leer solo la fuente, porque la fase A iba a reescribir la
 * plantilla y una prueba montada nacería caducada. La fase A ya aterrizó, y lo
 * que aquí se vigila es CONDUCTA de la página —volver a la página 1, limpiar
 * hasta la escala completa, subir al cambiar de página, no abrir nada en
 * escritorio—, que una expresión regular no prueba. Se monta con los hijos
 * doblados (declaran sus props y emits) y con `useServices` sustituido por refs
 * que la prueba controla. Lo que no se puede montar —la guarda de SSG, que no
 * vuelva un literal de 1024— se lee de la fuente al final.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick, ref } from 'vue';

import ServicePage from 'src/pages/ServicePage.vue';
import ServiceCardAdminActions from 'src/components/servicePage/ServiceCardAdminActions.vue';
import type Service from 'src/interfaces/service';
import type { MotivoRefresco } from 'src/composables/services/useServiceAdminActions';
import {
  ALTO_MINIMO_HOJA_PX,
  CONSULTA_PANTALLA_BAJA,
  PRECIO_ESCALA_MAX,
  PRECIO_ESCALA_MIN,
  useFiltersStore,
} from 'src/stores/filters-store';
import { useOptionsStore } from 'src/stores/options-store';
import type { IndexSection } from 'src/constants/index-sections';
import type { FilterService } from 'src/composables/dialogs/useServiceFilter';
import { fijarViewport } from '../viewportMock';

// `services-api` lee `import.meta.env`, que ts-jest no compila a CommonJS.
jest.mock('src/api/services-api', () => ({
  servicesApi: { post: jest.fn() },
  adminServiceApi: { patch: jest.fn() },
}));
jest.mock('src/composables/shared/useOptions', () => ({
  useOptions: () => undefined,
}));
jest.mock('src/composables/seo/useSeo', () => ({ useSeo: () => undefined }));
jest.mock('quasar', () => ({ useQuasar: () => ({}) }));
/** Mutable: las pruebas de las acciones de la dueña entran como admin. */
const mockAuth = { isAdmin: false, isLoggedIn: false };
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => mockAuth,
}));
jest.mock('src/stores/book-store', () => ({
  useBookStore: () => ({ syncBookingWithService: jest.fn() }),
}));
jest.mock('src/composables/services/useService', () => {
  const { ref: refReal } = jest.requireActual('vue');
  return {
    deleteService: jest.fn(),
    getService: jest.fn(),
    useService: () => ({ serviceIdRef: refReal('') }),
    useServiceForEdition: () => ({ serviceIdEditRef: refReal('') }),
  };
});

/** Los refs que devolvería `useServices`, recreados en cada caso. */
const crearServicios = () => ({
  services: ref([] as Service[]),
  filterService: ref({
    name: '',
    selectedGenres: [] as string[],
    selectedServicesIDs: [] as string[],
    includePriceRange: false,
    includePromotionsOnly: false,
    prices: { min: PRECIO_ESCALA_MIN, max: PRECIO_ESCALA_MAX },
    page: 1,
    limit: 10,
  }),
  totalPages: ref(5),
  totalServices: ref(37),
  refetch: ref(0),
  isLoading: ref(false),
  isFetching: ref(false),
  error: ref(null),
});
const mockServicios: { actual: ReturnType<typeof crearServicios> | null } = {
  actual: null,
};
jest.mock('src/composables/services/useServices', () => ({
  useServices: () => mockServicios.actual,
}));

/*
 * Los hijos se doblan como MÓDULO y no con `stubs`: el `import` se ejecuta
 * antes de montar, y la cadena real (ServicesBox, serviceCreateEdit…) arrastra
 * media aplicación. Cada doble declara las props y los emits de su contrato.
 */
jest.mock('src/components/servicePage/ServiceToolbar.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceToolbar',
    props: ['total', 'mostrados', 'busqueda', 'filtrosActivos', 'esAdmin', 'conCarril'],
    emits: ['update:busqueda', 'abrir-filtros', 'crear-servicio'],
    template: '<header />',
  },
}));
jest.mock('src/components/servicePage/ServicePagerBar.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServicePagerBar',
    props: ['pagina', 'totalPaginas', 'mostrados', 'total'],
    emits: ['update:pagina'],
    template: '<nav />',
  },
}));
/**
 * La rejilla de verdad reexpone UNA ranura `acciones` con `{ servicio,
 * compacto }`: `true` dentro del renglón de móvil, `false` en la tarjeta. El
 * doble la pide con los dos valores para el primer servicio, y dice si la
 * página la rellenó.
 */
jest.mock('src/components/servicePage/ServiceCardsGrid.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceCardsGrid',
    props: ['servicios', 'columnas', 'renglones', 'cargando', 'recargando', 'error', 'hayFiltros'],
    emits: ['detalle', 'limpiar-filtros', 'reintentar'],
    template: `<div>
      <span data-test="hay-acciones">{{ $slots.acciones ? 'si' : 'no' }}</span>
      <template v-if="servicios.length">
        <slot name="acciones" :servicio="servicios[0]" :compacto="true" />
        <slot name="acciones" :servicio="servicios[0]" :compacto="false" />
      </template>
    </div>`,
  },
}));

// Los arrastra el módulo real del composable (de él sale `paginaTrasBorrado`)
// y leen `useDialogPluginComponent.emits`, que el doble de `quasar` no trae.
jest.mock('src/components/dialogs/ServiceDeleteDialog.vue', () => ({
  __esModule: true,
  default: { name: 'ServiceDeleteDialog', template: '<div />' },
}));
jest.mock('src/components/dialogs/ServicePromotionDialog.vue', () => ({
  __esModule: true,
  default: { name: 'ServicePromotionDialog', template: '<div />' },
}));

/**
 * El composable de administración se dobla para quedarse con el `refrescar`
 * que le pasa la página; `paginaTrasBorrado` es la de verdad, que es la regla
 * que la página tiene que aplicar.
 */
const mockAdmin = {
  refrescar: null as ((motivo: MotivoRefresco) => void) | null,
  editar: jest.fn(),
  promocionar: jest.fn(),
  eliminar: jest.fn(),
};
jest.mock('src/composables/services/useServiceAdminActions', () => ({
  paginaTrasBorrado: jest.requireActual(
    'src/composables/services/useServiceAdminActions'
  ).paginaTrasBorrado,
  useServiceAdminActions: (opciones: {
    refrescar: (motivo: MotivoRefresco) => void;
  }) => {
    mockAdmin.refrescar = opciones.refrescar;
    return {
      editar: mockAdmin.editar,
      promocionar: mockAdmin.promocionar,
      eliminar: mockAdmin.eliminar,
    };
  },
}));
jest.mock('src/components/servicePage/ServiceFilterRail.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceFilterRail',
    emits: ['aplicar', 'update:amount'],
    template: '<aside />',
  },
}));
jest.mock('src/components/dialogs/serviceFilterDialog.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceFilterDialog',
    props: ['dialog', 'total'],
    emits: ['update:dialog', 'update:amount', 'update:services'],
    template: '<div />',
  },
}));
jest.mock('src/components/dialogs/serviceCreateEdit.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceCreateEdit',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div />',
  },
}));

const GENEROS = [
  { id: 'g1', name: 'Unisex' as const, selected: false },
  { id: 'g2', name: 'Niños' as const, selected: false },
];

let pinia: Pinia;

/**
 * El doble de `q-page` hace lo que hace el de verdad con `style-fn`: lo llama
 * con lo que ocupa la cabecera (`offset`) y el alto de la pantalla, y pone en
 * su raíz el estilo que le devuelven. Quasar pasa alto 0 mientras no conoce la
 * pantalla, que es lo que pasa al prerenderizar con `build:ssg`.
 */
const CABECERA_PX = 50;
let altoPantalla = 800;
const QPageDoble = {
  props: ['styleFn'],
  data: () => ({ alto: altoPantalla }),
  template:
    '<div data-test="pagina" :style="styleFn ? styleFn(' +
    CABECERA_PX +
    ', alto) : undefined"><slot /></div>',
};

const montar = ({ ancho = 1280, alto = 900 } = {}) => {
  fijarViewport({ ancho, alto });
  return mount(ServicePage, {
    global: {
      plugins: [pinia],
      stubs: { 'q-page': QPageDoble },
    },
  });
};

const filtro = (parcial: Partial<FilterService> = {}): FilterService => ({
  selectedGenres: ['g1'],
  selectedServicesIDs: [],
  includePriceRange: false,
  includePromotionsOnly: false,
  prices: { min: PRECIO_ESCALA_MIN, max: PRECIO_ESCALA_MAX },
  ...parcial,
});

const servicios = () => {
  if (!mockServicios.actual) throw new Error('sin useServices doblado');
  return mockServicios.actual;
};

let scrollTo: jest.SpyInstance;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  useOptionsStore().setGenres(GENEROS);
  mockServicios.actual = crearServicios();
  mockAuth.isAdmin = false;
  mockAuth.isLoggedIn = false;
  mockAdmin.refrescar = null;
  mockAdmin.editar.mockClear();
  mockAdmin.promocionar.mockClear();
  mockAdmin.eliminar.mockClear();
  // jsdom no implementa `scrollTo` y lo dice por consola.
  scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  altoPantalla = 800;
  scrollTo.mockRestore();
  history.replaceState(null, '');
});

describe('ServicePage · el carril y la barra', () => {
  it('desde 1024 px monta el carril y la barra va sin botón de filtros', () => {
    const wrapper = montar({ ancho: 1024 });

    expect(wrapper.findComponent({ name: 'ServiceFilterRail' }).exists()).toBe(true);
    expect(
      wrapper.getComponent({ name: 'ServiceToolbar' }).props('conCarril')
    ).toBe(true);
  });

  it('por debajo de 1024 px la barra recupera el botón que abre la hoja', async () => {
    const wrapper = montar({ ancho: 1023 });
    const barra = wrapper.getComponent({ name: 'ServiceToolbar' });

    expect(barra.props('conCarril')).toBe(false);

    await barra.vm.$emit('abrir-filtros');
    expect(
      wrapper.getComponent({ name: 'ServiceFilterDialog' }).props('dialog')
    ).toBe(true);
  });

  it('el carril y la hoja alimentan el mismo contador de la barra', async () => {
    const wrapper = montar();
    const barra = wrapper.getComponent({ name: 'ServiceToolbar' });

    await wrapper.getComponent({ name: 'ServiceFilterRail' }).vm.$emit('update:amount', 2);
    expect(barra.props('filtrosActivos')).toBe(2);

    await wrapper.getComponent({ name: 'ServiceFilterDialog' }).vm.$emit('update:amount', 3);
    expect(barra.props('filtrosActivos')).toBe(3);
  });

  it('la hoja recibe el total, que es la cifra de su pie', () => {
    const wrapper = montar({ ancho: 390 });

    expect(
      wrapper.getComponent({ name: 'ServiceFilterDialog' }).props('total')
    ).toBe(37);
  });
});

/**
 * `/services` se prerenderiza y Vue Query no resuelve durante `build:ssg`: lo
 * que la página pinta mientras carga es el HTML que se publica. «0 servicios» y
 * «0 de 0 servicios» serían una mentira en el archivo que se indexa.
 */
describe('ServicePage · el total antes de la primera respuesta', () => {
  it('mientras carga por primera vez la barra y el pie reciben un total desconocido', () => {
    servicios().isLoading.value = true;
    servicios().totalServices.value = 0;
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'ServiceToolbar' }).props('total')).toBeNull();
    expect(wrapper.getComponent({ name: 'ServicePagerBar' }).props('total')).toBeNull();
  });

  it('en cuanto llega la respuesta pasan la cifra de verdad', async () => {
    servicios().isLoading.value = true;
    const wrapper = montar();

    servicios().isLoading.value = false;
    await nextTick();

    expect(wrapper.getComponent({ name: 'ServiceToolbar' }).props('total')).toBe(37);
    expect(wrapper.getComponent({ name: 'ServicePagerBar' }).props('total')).toBe(37);
  });

  /**
   * Si la PRIMERA carga falla, `totalServices` sigue en 0: al lado del panel de
   * error, «0 servicios» diría que el catálogo está vacío, que no es lo que pasó.
   */
  it('si la primera carga falla, tampoco dice una cifra junto al error', () => {
    servicios().error.value = new Error('red') as unknown as null;
    servicios().totalServices.value = 0;
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'ServiceToolbar' }).props('total')).toBeNull();
    expect(wrapper.getComponent({ name: 'ServicePagerBar' }).props('total')).toBeNull();
  });

  it('un error con filas ya puestas conserva la cifra que se conocía', () => {
    servicios().error.value = new Error('red') as unknown as null;
    servicios().services.value = [{ id: 's1', name: 'Corte' } as Service];
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'ServiceToolbar' }).props('total')).toBe(37);
  });

  it('una recarga con filas ya puestas no vuelve a esconder la cifra', () => {
    servicios().isLoading.value = true;
    servicios().services.value = [{ id: 's1', name: 'Corte' } as Service];
    const wrapper = montar();

    expect(wrapper.getComponent({ name: 'ServiceToolbar' }).props('total')).toBe(37);
  });
});

describe('ServicePage · aplicar un filtro', () => {
  it('lo que aplica el carril llega a la consulta', async () => {
    const wrapper = montar();

    await wrapper
      .getComponent({ name: 'ServiceFilterRail' })
      .vm.$emit('aplicar', filtro({ selectedServicesIDs: ['s1'], includePromotionsOnly: true }));

    const consulta = servicios().filterService.value;
    expect(consulta.selectedGenres).toEqual(['g1']);
    expect(consulta.selectedServicesIDs).toEqual(['s1']);
    expect(consulta.includePromotionsOnly).toBe(true);
  });

  /**
   * Con aplicación instantánea esto pasa a cada clic: sin volver a la página 1,
   * filtrar estando en la 3 deja la lista vacía y parece que no hay nada.
   */
  it('cambiar un filtro estando en la página 3 vuelve a la 1', async () => {
    const wrapper = montar();
    servicios().filterService.value.page = 3;

    await wrapper.getComponent({ name: 'ServiceFilterRail' }).vm.$emit('aplicar', filtro());

    expect(servicios().filterService.value.page).toBe(1);
  });

  it('lo mismo desde la hoja de móvil', async () => {
    const wrapper = montar({ ancho: 390 });
    servicios().filterService.value.page = 3;

    await wrapper
      .getComponent({ name: 'ServiceFilterDialog' })
      .vm.$emit('update:services', filtro());

    expect(servicios().filterService.value.page).toBe(1);
  });

  /**
   * La hoja aplica en cada toque: si aplicar la cerrase, cada chip la bajaría
   * de golpe. La cierran su pie («Ver N servicios») y su aspa, nadie más.
   */
  it('aplicar desde la hoja no la cierra', async () => {
    const wrapper = montar({ ancho: 390 });
    const hoja = wrapper.getComponent({ name: 'ServiceFilterDialog' });
    await wrapper.getComponent({ name: 'ServiceToolbar' }).vm.$emit('abrir-filtros');

    await hoja.vm.$emit('update:services', filtro());

    expect(hoja.props('dialog')).toBe(true);
  });
});

describe('ServicePage · un filtro que ya estaba en el store', () => {
  /**
   * Ir a otra ruta y volver conserva `filters-store`, pero `useServices` arranca
   * en blanco: sin copiar el store, el carril pintaría un género elegido sobre
   * una lista sin filtrar, y la barra diría cero.
   */
  it('al montar, el contador y la consulta dicen lo que dice el store', () => {
    const filtros = useFiltersStore();
    filtros.setGenres(['g1']);
    filtros.setSelectedServiceIds(['s1']);
    filtros.includePriceRange = true;
    filtros.prices.min = 40;

    const wrapper = montar({ ancho: 390 });

    expect(
      wrapper.getComponent({ name: 'ServiceToolbar' }).props('filtrosActivos')
    ).toBe(3);
    const consulta = servicios().filterService.value;
    expect(consulta.selectedGenres).toEqual(['g1']);
    expect(consulta.selectedServicesIDs).toEqual(['s1']);
    expect(consulta.includePriceRange).toBe(true);
    expect(consulta.prices.min).toBe(40);
  });

  it('con el store vacío no cambia nada', () => {
    const wrapper = montar();

    expect(
      wrapper.getComponent({ name: 'ServiceToolbar' }).props('filtrosActivos')
    ).toBe(0);
    expect(servicios().filterService.value.selectedGenres).toEqual([]);
  });
});

describe('ServicePage · limpiar filtros', () => {
  /**
   * Carril, hoja y lista tienen que coincidir después de «Limpiar filtros»: si
   * el store se quedase con el rango 40–120, el carril lo seguiría pintando.
   */
  it('vacía store y consulta, con el precio en la escala completa', async () => {
    const filtros = useFiltersStore();
    filtros.setGenres(['g1']);
    filtros.setSelectedServiceIds(['s1']);
    filtros.includePriceRange = true;
    filtros.prices.min = 40;
    filtros.prices.max = 120;
    const wrapper = montar();
    servicios().filterService.value.name = 'tinte';
    servicios().filterService.value.page = 3;

    await wrapper.getComponent({ name: 'ServiceCardsGrid' }).vm.$emit('limpiar-filtros');

    expect(filtros.selectedGenres).toEqual([]);
    expect(filtros.selectedServicesIDs).toEqual([]);
    expect(filtros.includePriceRange).toBe(false);
    expect(filtros.includePromotionsOnly).toBe(false);
    expect(filtros.prices).toEqual({ min: PRECIO_ESCALA_MIN, max: PRECIO_ESCALA_MAX });

    const consulta = servicios().filterService.value;
    expect(consulta).toEqual(
      expect.objectContaining({
        name: '',
        selectedGenres: [],
        selectedServicesIDs: [],
        includePriceRange: false,
        includePromotionsOnly: false,
        prices: { min: PRECIO_ESCALA_MIN, max: PRECIO_ESCALA_MAX },
        page: 1,
      })
    );
    expect(
      wrapper.getComponent({ name: 'ServiceToolbar' }).props('filtrosActivos')
    ).toBe(0);
  });
});

describe('ServicePage · paginar', () => {
  /**
   * La lista desplaza dentro de su caja y el pie está siempre a la vista:
   * cambiar de página sin subir la lista deja a la visitante a media página
   * nueva. Lo que sube es la lista; la ventana no tiene nada que subir.
   */
  it('cambiar de página la pone y sube la lista al principio', async () => {
    const wrapper = montar();
    const lista = wrapper.get('[data-test="lista-servicios"]').element;
    lista.scrollTop = 300;

    await wrapper.getComponent({ name: 'ServicePagerBar' }).vm.$emit('update:pagina', 2);

    expect(servicios().filterService.value.page).toBe(2);
    expect(lista.scrollTop).toBe(0);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  /**
   * Con menos de 560 px de alto (teléfono tumbado) la lista deja de desplazar
   * y desplaza la página entera: entonces sí es la ventana lo que hay que subir,
   * o la visitante se queda mirando el pie de la página nueva.
   */
  it('en una pantalla baja, cambiar de página sube la ventana', async () => {
    const wrapper = montar({ ancho: 844, alto: 390 });

    await wrapper
      .getComponent({ name: 'ServicePagerBar' })
      .vm.$emit('update:pagina', 2);

    expect(servicios().filterService.value.page).toBe(2);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });
});

/**
 * Cabecera del portal, barra y pie fijos; solo la lista desplaza. Para eso la
 * página tiene que medir EXACTAMENTE lo que deja la cabecera: con el
 * `min-height` de Quasar crecería con la lista y desplazaría el documento.
 */
describe('ServicePage · el alto del mostrador', () => {
  /**
   * El alto va en una variable y NO en un `height` en línea: un estilo en línea
   * le gana a cualquier hoja de estilos, y la consulta de pantalla baja tiene
   * que poder devolverle a la página su alto natural.
   */
  it('mide el alto de la pantalla menos la cabecera, ni más ni menos', () => {
    altoPantalla = 800;
    const pagina = montar().get('[data-test="pagina"]').element as HTMLElement;

    expect(pagina.style.getPropertyValue('--mostrador-alto')).toBe('750px');
    expect(pagina.style.height).toBe('');
    expect(pagina.style.minHeight).toBe('');
  });

  it('sin pantalla conocida (prerender) descuenta la cabecera de 100vh', () => {
    altoPantalla = 0;
    const pagina = montar().get('[data-test="pagina"]').element as HTMLElement;

    expect(pagina.style.getPropertyValue('--mostrador-alto')).toBe(
      `calc(100vh - ${CABECERA_PX}px)`
    );
  });
});

describe('ServicePage · las acciones de la dueña', () => {
  const SERVICIO = {
    id: 's1',
    name: 'Bob clásico',
    price: 50000,
    images: [],
    tags: [],
  } as unknown as Service;
  const OTRO = { ...SERVICIO, id: 's2', name: 'Fade' } as Service;

  const comoDuena = () => {
    mockAuth.isAdmin = true;
    mockAuth.isLoggedIn = true;
  };

  it('a una clienta no le rellena la ranura: ni un contenedor vacío', () => {
    servicios().services.value = [SERVICIO];
    const wrapper = montar();

    expect(wrapper.get('[data-test="hay-acciones"]').text()).toBe('no');
    expect(wrapper.findAllComponents(ServiceCardAdminActions)).toHaveLength(0);
  });

  it('a la dueña le pone los controles en el renglón (compacto) y en la tarjeta', () => {
    comoDuena();
    servicios().services.value = [SERVICIO];
    const wrapper = montar();

    const acciones = wrapper.findAllComponents(ServiceCardAdminActions);
    expect(acciones.map((a) => a.props('compacto'))).toEqual([true, false]);
    expect(acciones.map((a) => (a.props('servicio') as Service).id)).toEqual([
      's1',
      's1',
    ]);
  });

  it('los tres controles llaman al composable con lo que emiten', async () => {
    comoDuena();
    servicios().services.value = [SERVICIO];
    const wrapper = montar();
    const [renglon, tarjeta] = wrapper.findAllComponents(ServiceCardAdminActions);

    await renglon.get('[data-test="editar"]').trigger('click');
    await tarjeta.get('[data-test="promocion"]').trigger('click');
    await tarjeta.get('[data-test="eliminar"]').trigger('click');

    expect(mockAdmin.editar).toHaveBeenCalledWith('s1');
    expect(mockAdmin.promocionar).toHaveBeenCalledWith(SERVICIO);
    expect(mockAdmin.eliminar).toHaveBeenCalledWith('s1');
  });

  /** Review Focus 1: borrar el último de la última página no la deja en blanco. */
  it('tras borrar el único servicio de una página que no es la primera, retrocede una', () => {
    servicios().services.value = [SERVICIO];
    servicios().filterService.value.page = 3;
    montar();

    mockAdmin.refrescar?.('borrado');

    expect(servicios().filterService.value.page).toBe(2);
    expect(servicios().refetch.value).toBe(1);
  });

  it('tras borrar con más servicios en la página, se queda en ella y recarga', () => {
    servicios().services.value = [SERVICIO, OTRO];
    servicios().filterService.value.page = 3;
    montar();

    mockAdmin.refrescar?.('borrado');

    expect(servicios().filterService.value.page).toBe(3);
    expect(servicios().refetch.value).toBe(1);
  });

  it('tras cambiar una promoción, recarga sin moverse de página', () => {
    servicios().services.value = [SERVICIO];
    servicios().filterService.value.page = 3;
    montar();

    mockAdmin.refrescar?.('promocion');

    expect(servicios().filterService.value.page).toBe(3);
    expect(servicios().refetch.value).toBe(1);
  });
});

describe('ServicePage · el atajo del inicio', () => {
  const TARJETA: IndexSection = {
    imgPath: '/people/x.jpg',
    title: 'Cortes',
    description: '',
    filterFormat: { genres: ['g2'], services: ['s9'] },
  };

  /** El atajo espera a que las opciones estén cargadas; aquí ya lo están. */
  const llegarDesdeElInicio = () => {
    useOptionsStore().setPrincipalServices([
      { id: 's9', name: 'Cortes', selected: false },
    ]);
    history.replaceState({ service: TARJETA }, '');
  };

  it('en escritorio aplica el filtro y no abre nada: el carril ya lo enseña', async () => {
    llegarDesdeElInicio();
    const wrapper = montar({ ancho: 1280 });
    await nextTick();

    expect(
      wrapper.getComponent({ name: 'ServiceFilterDialog' }).props('dialog')
    ).toBe(false);
    expect(servicios().filterService.value.selectedGenres).toEqual(['g2']);
    expect(servicios().filterService.value.selectedServicesIDs).toEqual(['s9']);
    expect(
      wrapper.getComponent({ name: 'ServiceToolbar' }).props('filtrosActivos')
    ).toBe(2);
  });

  it('en móvil aplica el filtro y abre la hoja', async () => {
    llegarDesdeElInicio();
    const wrapper = montar({ ancho: 390 });
    await nextTick();

    expect(
      wrapper.getComponent({ name: 'ServiceFilterDialog' }).props('dialog')
    ).toBe(true);
    expect(servicios().filterService.value.selectedGenres).toEqual(['g2']);
  });

  /**
   * El atajo es un filtro nuevo: un interruptor de precio que se quedara
   * encendido en el store saldría en el carril sin estar en la lista.
   */
  it('apaga en el store el precio y las promociones que hubiera', async () => {
    const filtros = useFiltersStore();
    filtros.includePriceRange = true;
    llegarDesdeElInicio();
    montar();
    await nextTick();

    expect(filtros.includePriceRange).toBe(false);
    expect(servicios().filterService.value.includePriceRange).toBe(false);
  });

  /**
   * Apagar el interruptor no basta: un rango de 40 a 120 que sobreviviera en el
   * store reaparecería en el carril el día que alguien encendiera «Precio».
   * El atajo parte de cero: `limpiarFiltros()`, no dos asignaciones sueltas.
   */
  it('devuelve el rango de precio a la escala completa en el store', async () => {
    const filtros = useFiltersStore();
    filtros.includePriceRange = true;
    filtros.prices.min = 40;
    filtros.prices.max = 120;
    llegarDesdeElInicio();
    montar();
    await nextTick();

    expect(filtros.prices).toEqual({
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    });
    // Y la consulta de la lista no se queda con el 40–120 que copió al arrancar.
    expect(servicios().filterService.value.prices).toEqual({
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    });
  });
});

describe('ServicePage · lo que se lee de la fuente', () => {
  const PAGINA = readFileSync(
    join(__dirname, '../../src/pages/ServicePage.vue'),
    'utf8'
  );

  it('el corte del carril sale del store, no de un literal nuevo', () => {
    expect(PAGINA).toContain('useDialogMaximizedBelow(ANCHO_CARRIL_PX)');
    expect(PAGINA).not.toMatch(/\b1024\b/);
  });

  /**
   * Sube la lista y no la ventana. La guarda de SSG es la referencia: sin DOM
   * (`build:ssg`) `listaRef` es nula y no se toca nada.
   */
  it('el desplazamiento al cambiar de página sube la lista, detrás de la guarda de SSG', () => {
    const alCambiar = PAGINA.slice(
      PAGINA.indexOf('const alCambiarPagina'),
      PAGINA.indexOf('};', PAGINA.indexOf('const alCambiarPagina'))
    );
    expect(alCambiar).toMatch(/if \(!listaRef\.value\) return;/);
    expect(alCambiar).toMatch(/listaRef\.value\.scrollTop = 0;/);
    // La ventana solo se sube en pantalla baja, que es cuando desplaza ella.
    expect(PAGINA.match(/window\.scrollTo/g)).toHaveLength(1);
    expect(alCambiar).toMatch(
      /window\.matchMedia\(CONSULTA_PANTALLA_BAJA\)\.matches[\s\S]{0,40}window\.scrollTo\(\{ top: 0 \}\)/
    );
  });

  /**
   * El corte de pantalla baja es el de la hoja de filtros (560 px de alto):
   * importado del store para la cuenta en JS, y repetido en el SCSS —que no
   * puede importarlo— como `max-height` de ese valor menos uno.
   */
  it('el corte de pantalla baja es el de la hoja de filtros', () => {
    // Una sola consulta, exportada del store, para la página y la hoja.
    expect(PAGINA).toMatch(
      /import \{[^}]*\bCONSULTA_PANTALLA_BAJA\b[^}]*\} from 'src\/stores\/filters-store';/
    );
    expect(PAGINA).not.toMatch(/const CONSULTA_PANTALLA_BAJA\b/);
    expect(CONSULTA_PANTALLA_BAJA).toBe(
      `(max-height: ${ALTO_MINIMO_HOJA_PX - 1}px)`
    );
    expect(PAGINA).toContain(`@media ${CONSULTA_PANTALLA_BAJA} {`);
    expect(ALTO_MINIMO_HOJA_PX).toBe(560);

    const HOJA = readFileSync(
      join(__dirname, '../../src/components/dialogs/serviceFilterDialog.vue'),
      'utf8'
    );
    expect(HOJA).toMatch(
      /import \{[^}]*\bCONSULTA_PANTALLA_BAJA\b[^}]*\} from 'src\/stores\/filters-store';/
    );
    expect(HOJA).toContain('window.matchMedia(CONSULTA_PANTALLA_BAJA)');
    expect(HOJA).not.toContain('CONSULTA_ALTO');
  });

  it('la correspondencia store→consulta se escribe en un solo sitio', () => {
    expect(PAGINA.match(/filterService\.value\.includePriceRange =/g)).toHaveLength(1);
    expect(PAGINA.match(/filterService\.value\.prices\.min =/g)).toHaveLength(1);
  });

  it('el atajo sigue avisando de los IDs de género que no encuentra', () => {
    // Un UUID de `index-sections.ts` que ya no exista dejaría el filtro mudo:
    // este `console.warn` es lo único que lo delata.
    expect(PAGINA).toContain('console.warn');
    expect(PAGINA).toMatch(/Atajo del inicio con IDs de género no encontrados/);
  });
});
