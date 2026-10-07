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
import {
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
jest.mock('src/stores/auth-store', () => ({
  useAuthStore: () => ({ isAdmin: false, isLoggedIn: false }),
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
  services: ref([]),
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
jest.mock('src/components/servicePage/ServiceCardsGrid.vue', () => ({
  __esModule: true,
  default: {
    name: 'ServiceCardsGrid',
    props: ['servicios', 'columnas', 'renglones', 'cargando', 'recargando', 'error', 'hayFiltros'],
    emits: ['detalle', 'limpiar-filtros', 'reintentar'],
    template: '<div />',
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

const montar = ({ ancho = 1280 } = {}) => {
  fijarViewport({ ancho });
  return mount(ServicePage, {
    global: {
      plugins: [pinia],
      stubs: { 'q-page': { template: '<div><slot /></div>' } },
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
  // jsdom no implementa `scrollTo` y lo dice por consola.
  scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
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
   * Desde que la página entera desplaza (D4), el pie queda al final de una
   * lista larga: cambiar de página sin subir deja a la visitante mirando el pie
   * de la página nueva.
   */
  it('cambiar de página la pone y sube al principio', async () => {
    const wrapper = montar();

    await wrapper.getComponent({ name: 'ServicePagerBar' }).vm.$emit('update:pagina', 2);

    expect(servicios().filterService.value.page).toBe(2);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
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

  it('el desplazamiento al cambiar de página va detrás de la guarda de SSG', () => {
    expect(PAGINA).toMatch(
      /typeof window !== 'undefined'[\s\S]{0,80}window\.scrollTo\(\{ top: 0 \}\)/
    );
  });

  it('el atajo sigue avisando de los IDs de género que no encuentra', () => {
    // Un UUID de `index-sections.ts` que ya no exista dejaría el filtro mudo:
    // este `console.warn` es lo único que lo delata.
    expect(PAGINA).toContain('console.warn');
    expect(PAGINA).toMatch(/Atajo del inicio con IDs de género no encontrados/);
  });
});
