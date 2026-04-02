import { createPinia, setActivePinia } from 'pinia';
import { useFiltersStore } from 'src/stores/filters-store';
import { useOptionsStore } from 'src/stores/options-store';
import { useFilterService } from 'src/composables/dialogs/useServiceFilter';
import { nextTick } from 'vue';

describe('filters store + useFilterService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('setGenres picks from options store by id', () => {
    const options = useOptionsStore();
    const filters = useFiltersStore();
    options.setGenres([
      { id: 'g1', name: 'Masculino', selected: false },
      { id: 'g2', name: 'Femenino', selected: false },
    ]);

    filters.setGenres(['g2']);
    expect(filters.selectedGenres.map((g) => g.id)).toEqual(['g2']);
  });

  test('useFilterService emits amount and services payload', async () => {
    const options = useOptionsStore();
    const filters = useFiltersStore();
    options.setGenres([
      { id: 'g1', name: 'Masculino', selected: false },
      { id: 'g2', name: 'Femenino', selected: false },
    ]);

    const emitted: Array<{ e: string; v: unknown }> = [];
    type EmitFn = (e: string, v: unknown) => void;
    const emit: EmitFn = (e, v) => emitted.push({ e, v });

    const composable = useFilterService(emit);
    // select 1 genre via UI model (filterGenres)
    composable.filterGenres.value = composable.filterGenres.value.map((g) =>
      g.id === 'g1' ? { ...g, selected: true } : g
    );
    await nextTick();
    await nextTick();
    // select 1 service id
    filters.setSelectedServiceIds(['s1']);
    // enable price range => should count +1
    composable.includePriceRange.value = true;

    composable.sendFilter();

    const lastServices = emitted
      .filter((x) => x.e === 'update:services')
      .at(-1)?.v as unknown as {
      selectedGenres: string[];
      selectedServicesIDs: string[];
      includePriceRange: boolean;
    };
    expect(lastServices.selectedGenres).toEqual(['g1']);
    expect(lastServices.selectedServicesIDs).toEqual(['s1']);
    expect(lastServices.includePriceRange).toBe(true);

    // amount: genres(1) + services(1) + price(1) = 3
    expect(composable.amountOfFilters.value).toBe(3);
  });

  test('cleanFilters resets store selections and price flag', async () => {
    const options = useOptionsStore();
    const filters = useFiltersStore();
    options.setGenres([{ id: 'g1', name: 'Unisex', selected: false }]);
    filters.setGenres(['g1']);
    filters.setSelectedServiceIds(['s1']);

    const emitted: Array<{ e: string; v: unknown }> = [];
    type EmitFn = (e: string, v: unknown) => void;
    const emit: EmitFn = (e, v) => emitted.push({ e, v });

    const composable = useFilterService(emit);
    composable.includePriceRange.value = true;
    composable.cleanFilters();
    await nextTick();

    expect(filters.selectedGenres).toEqual([]);
    expect(filters.selectedServicesIDs).toEqual([]);
    expect(composable.includePriceRange.value).toBe(false);
    expect(emitted.some((x) => x.e === 'update:services')).toBe(true);
  });
});

