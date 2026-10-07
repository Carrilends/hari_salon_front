import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { GenresI } from 'src/interfaces/tag';
import { useOptionsStore } from './options-store';

/**
 * Los extremos del control de precio. **Están en MILES**, no en pesos: el
 * control va de 5 a 200 y la etiqueta añade «.000» al pintarlos.
 *
 * ### El backend los usa TAL CUAL (`s.price BETWEEN :min AND :max`,
 * `service.service.ts`), y los precios reales van de 15.000 a 250.000: con la
 * escala en miles, activar el filtro de precio no devuelve nada. Diagnosticado
 * en la Tarea 2 de `docs/superpowers/plans/2026-10-07-servicios-fase-c-filtros.md`
 * y pendiente de que Luis decida si el control muestra miles o pesos completos.
 * Esta fase NO cambia la escala.
 */
export const PRECIO_ESCALA_MIN = 5;
export const PRECIO_ESCALA_MAX = 200;

/**
 * Desde este ancho los filtros son un carril fijo a la izquierda de la lista
 * (D1); por debajo, una hoja inferior. Lo importan el carril, la hoja y la
 * página: un literal repetido dejaría un ancho sin ninguno de los dos, o con
 * los dos a la vez.
 */
export const ANCHO_CARRIL_PX = 1024;

export const useFiltersStore = defineStore('filters', () => {
  const optionsStore = useOptionsStore();

  const selectedGenres = ref<GenresI[]>([]);
  const selectedServicesIDs = ref<string[]>([]);

  /**
   * Antes eran refs locales de `useFilterService`. Con el carril hay DOS
   * superficies de filtro y cada una montaba su propia instancia: al cruzar los
   * 1024 px se perdía el rango de precio mientras el filtro aplicado seguía
   * diciendo que estaba activo. El estado compartido va aquí, con los géneros y
   * las categorías.
   */
  const includePriceRange = ref(false);
  const includePromotionsOnly = ref(false);
  const prices = ref({ min: PRECIO_ESCALA_MIN, max: PRECIO_ESCALA_MAX });

  const removeGenre = (id: string) => {
    selectedGenres.value = selectedGenres.value.filter(
      (g: GenresI) => g.id !== id
    );
  };

  const setGenres = (genres: string[]) => {
    selectedGenres.value = optionsStore.genres.filter((g: GenresI) =>
      genres.includes(g.id)
    );
  };

  const setSelectedServiceIds = (ids: string[]) => {
    selectedServicesIDs.value = [...ids];
  };

  /** Restaura IDs desde navegación u orígenes externos (misma semántica que ServicesBox). */
  const setServicesExternal = (services: string[]) => {
    setSelectedServiceIds(services);
  };

  /**
   * Cuántos filtros hay activos: la misma suma que hacen los campos
   * (`amountOfFilters`), para quien no los tiene montados — la página al
   * volver a ella, con la hoja cerrada, y el atajo del inicio.
   */
  const cantidadFiltros = computed(
    () =>
      selectedGenres.value.length +
      selectedServicesIDs.value.length +
      (includePriceRange.value ? 1 : 0) +
      (includePromotionsOnly.value ? 1 : 0)
  );

  /**
   * Vacía el filtro entero, el rango incluido: si el rango se quedara en
   * 40–120 con el interruptor apagado, el carril lo seguiría pintando y
   * encenderlo filtraría con un rango que nadie eligió. Lo usan «Limpiar» del
   * carril y de la hoja (`cleanFilters`) y «Limpiar filtros» de la lista.
   * Se mutan `min`/`max` en vez de cambiar el objeto: los campos lo leen por
   * referencia.
   */
  const limpiarFiltros = () => {
    selectedGenres.value = [];
    selectedServicesIDs.value = [];
    includePriceRange.value = false;
    includePromotionsOnly.value = false;
    prices.value.min = PRECIO_ESCALA_MIN;
    prices.value.max = PRECIO_ESCALA_MAX;
  };

  return {
    selectedGenres,
    selectedServicesIDs,
    includePriceRange,
    includePromotionsOnly,
    prices,
    cantidadFiltros,
    limpiarFiltros,
    setGenres,
    setSelectedServiceIds,
    setServicesExternal,
    removeGenre,
    clearGenders: () => (selectedGenres.value = []),
    clearSelectedServices: () => (selectedServicesIDs.value = []),
  };
});
