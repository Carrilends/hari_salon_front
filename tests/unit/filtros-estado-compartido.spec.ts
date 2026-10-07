/**
 * El estado del filtro es UNO, aunque haya dos superficies que lo pinten.
 *
 * Con el carril (D1) el filtro se ve en dos sitios —carril por encima de
 * 1024 px, hoja por debajo— y cada uno monta su propia instancia de
 * `useFilterService`. Mientras el precio y las promociones eran refs locales
 * del composable, cruzar los 1024 px perdía el rango mientras el filtro YA
 * APLICADO seguía diciendo que estaba activo. Esta suite fija que viven en el
 * store.
 */
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import {
  ANCHO_CARRIL_PX,
  PRECIO_ESCALA_MAX,
  PRECIO_ESCALA_MIN,
  useFiltersStore,
} from 'src/stores/filters-store';
import { useFilterService } from 'src/composables/dialogs/useServiceFilter';
import { useOptionsStore } from 'src/stores/options-store';

type EmitFalso = (evento: string, valor: unknown) => void;
const emitirANingunSitio: EmitFalso = () => undefined;

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('filters-store como estado compartido del filtro', () => {
  it('arranca con la escala de precio completa y sin filtros de precio ni promos', () => {
    const filtros = useFiltersStore();

    expect(filtros.includePriceRange).toBe(false);
    expect(filtros.includePromotionsOnly).toBe(false);
    expect(filtros.prices).toEqual({
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    });
  });

  it('dos instancias del composable comparten el interruptor de precio', () => {
    const carril = useFilterService(emitirANingunSitio as never);
    const hoja = useFilterService(emitirANingunSitio as never);

    carril.includePriceRange.value = true;

    expect(hoja.includePriceRange.value).toBe(true);
    expect(useFiltersStore().includePriceRange).toBe(true);
  });

  it('dos instancias comparten el rango, no una copia', () => {
    const carril = useFilterService(emitirANingunSitio as never);
    const hoja = useFilterService(emitirANingunSitio as never);

    carril.prices.value.min = 40;

    expect(hoja.prices.value.min).toBe(40);
    expect(useFiltersStore().prices.min).toBe(40);
  });

  it('limpiar apaga en el store los dos interruptores', async () => {
    const filtros = useFiltersStore();
    const opciones = useOptionsStore();
    opciones.setGenres([{ id: 'g1', name: 'Unisex', selected: false }]);
    filtros.setGenres(['g1']);
    const campos = useFilterService(emitirANingunSitio as never);
    campos.includePromotionsOnly.value = true;

    campos.cleanFilters();
    await nextTick();

    expect(filtros.includePromotionsOnly).toBe(false);
    expect(filtros.includePriceRange).toBe(false);
    expect(filtros.selectedGenres).toEqual([]);
  });

  /**
   * «Limpiar» del carril o de la hoja: si el rango se quedara en 40–120 con el
   * interruptor apagado, al volver a encenderlo filtraría con un rango que ya
   * nadie ve elegido.
   */
  it('limpiar devuelve el rango a la escala completa', async () => {
    const filtros = useFiltersStore();
    const campos = useFilterService(emitirANingunSitio as never);
    filtros.prices.min = 40;
    filtros.prices.max = 120;

    campos.cleanFilters();
    await nextTick();

    expect(filtros.prices).toEqual({
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    });
  });

  /** Lo que usa «Limpiar filtros» de la página: el mismo vaciado, un sitio. */
  it('limpiarFiltros vacía las cinco cosas del filtro', () => {
    const filtros = useFiltersStore();
    useOptionsStore().setGenres([{ id: 'g1', name: 'Unisex', selected: false }]);
    filtros.setGenres(['g1']);
    filtros.setSelectedServiceIds(['s1']);
    filtros.includePriceRange = true;
    filtros.prices.min = 40;
    filtros.prices.max = 120;

    filtros.limpiarFiltros();

    expect(filtros.selectedGenres).toEqual([]);
    expect(filtros.selectedServicesIDs).toEqual([]);
    expect(filtros.includePriceRange).toBe(false);
    expect(filtros.includePromotionsOnly).toBe(false);
    expect(filtros.prices).toEqual({
      min: PRECIO_ESCALA_MIN,
      max: PRECIO_ESCALA_MAX,
    });
  });

  /** La misma suma que hacen los campos, para quien no los tiene montados. */
  it('cuenta los filtros activos como los cuentan los campos', () => {
    const filtros = useFiltersStore();
    useOptionsStore().setGenres([
      { id: 'g1', name: 'Unisex', selected: false },
      { id: 'g2', name: 'Niños', selected: false },
    ]);
    expect(filtros.cantidadFiltros).toBe(0);

    filtros.setGenres(['g1', 'g2']);
    filtros.setSelectedServiceIds(['s1']);
    filtros.includePromotionsOnly = true;

    expect(filtros.cantidadFiltros).toBe(4);
  });

  it('el ancho del carril es 1024 y vive en un solo sitio', () => {
    // El carril y la hoja lo importan de aquí: dos literales distintos
    // dejarían un ancho sin carril y sin hoja, o con los dos a la vez.
    expect(ANCHO_CARRIL_PX).toBe(1024);
  });
});
