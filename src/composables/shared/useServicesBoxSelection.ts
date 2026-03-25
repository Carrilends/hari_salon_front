import { computed, nextTick, ref } from 'vue';
import type { Tag } from 'src/interfaces/tag';
import { getChildrenServicesHelper } from 'src/helpers/service.helpers';

export type ServicesBoxEmit = (e: 'selectedServices', ids: string[]) => void;

function removeTagSubtreeFromSelection(
  tag: Tag,
  selected: Record<string, string>
) {
  tag.children?.forEach((c) => {
    delete selected[c.id];
    removeTagSubtreeFromSelection(c, selected);
  });
}

function applySelectedFlags(
  rows: Tag[][],
  selected: Record<string, string>
): Tag[][] {
  return rows.map((row) =>
    row.map((t) => ({
      ...t,
      selected: !!selected[t.id],
    }))
  );
}

/**
 * Árbol de servicios: un principal → niveles de hijos cargados bajo demanda.
 * Un solo chip seleccionable por fila (nivel 0); niveles inferiores siguen la lógica previa del componente.
 */
export function useServicesBoxSelection(
  principalServices: Tag[],
  emit: ServicesBoxEmit
) {
  const principalId = ref('');
  /** Cada índice es un nivel: hijos del padre elegido en el nivel anterior. */
  const levelRows = ref<Tag[][]>([]);
  const selectedServicesIDs = ref<Record<string, string>>({});

  let skipPrincipalSync = false;

  const principalOptions = principalServices.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const hasRootSelection = computed(() =>
    (levelRows.value[0] ?? []).some((s) => s.selected)
  );

  const syncEmit = () => {
    emit('selectedServices', Object.keys(selectedServicesIDs.value));
  };

  const setRowsWithSelectedFlags = () => {
    levelRows.value = applySelectedFlags(
      levelRows.value,
      selectedServicesIDs.value
    );
  };

  async function onPrincipalChange(val: string) {
    if (skipPrincipalSync) return;

    principalId.value = val ?? '';
    levelRows.value = [];
    selectedServicesIDs.value = {};
    if (!val) {
      syncEmit();
      return;
    }
    selectedServicesIDs.value[val] = val;
    const row0 = await getChildrenServicesHelper({ idParent: val });
    levelRows.value = [
      row0.map((t) => ({
        ...t,
        selected: !!selectedServicesIDs.value[t.id],
      })),
    ];
    setRowsWithSelectedFlags();
    syncEmit();
  }

  async function toggleAtLevel(level: number, tag: Tag, isSelection: boolean) {
    const children = tag.children ?? [];

    if (isSelection) {
      selectedServicesIDs.value[tag.id] = tag.id;
      if (children.length > 0) {
        const next = await getChildrenServicesHelper({ idParent: tag.id });
        const trimmed = levelRows.value.slice(0, level + 1);
        trimmed[level + 1] = next;
        levelRows.value = trimmed;
      } else {
        levelRows.value = levelRows.value.slice(0, level + 1);
      }
    } else {
      const deeper = levelRows.value.slice(level + 1);
      deeper.forEach((row) => {
        row.forEach((t) => delete selectedServicesIDs.value[t.id]);
      });
      levelRows.value = levelRows.value.slice(0, level + 1);
      if (children.length > 0) {
        removeTagSubtreeFromSelection(tag, selectedServicesIDs.value);
      }
      delete selectedServicesIDs.value[tag.id];
    }

    if (levelRows.value[level]) {
      levelRows.value[level] = levelRows.value[level].map((t) => ({
        ...t,
        selected: !!selectedServicesIDs.value[t.id],
      }));
    }
    setRowsWithSelectedFlags();
    syncEmit();
  }

  async function hydrateFromIds(ids: string[]) {
    const idSet = new Set(ids);
    const principal = principalServices.find((p) => idSet.has(p.id));
    if (!principal) {
      resetLocalState();
      syncEmit();
      return;
    }

    skipPrincipalSync = true;
    selectedServicesIDs.value = {};
    levelRows.value = [];
    principalId.value = principal.id;
    selectedServicesIDs.value[principal.id] = principal.id;

    let parentId = principal.id;
    const newRows: Tag[][] = [];

    while (true) {
      const row = await getChildrenServicesHelper({ idParent: parentId });
      const chosen = row.find((t) => idSet.has(t.id));
      newRows.push(
        row.map((t) => ({
          ...t,
          selected: idSet.has(t.id),
        }))
      );
      if (!chosen) break;
      selectedServicesIDs.value[chosen.id] = chosen.id;
      const nextChildren = chosen.children ?? [];
      if (nextChildren.length === 0) break;
      parentId = chosen.id;
    }

    levelRows.value = newRows;
    setRowsWithSelectedFlags();
    await nextTick();
    skipPrincipalSync = false;
    syncEmit();
  }

  /** Solo estado interno; no emite (evita bucles con props que reflejan la misma selección). */
  function resetLocalState() {
    skipPrincipalSync = true;
    principalId.value = '';
    levelRows.value = [];
    selectedServicesIDs.value = {};
    nextTick(() => {
      skipPrincipalSync = false;
    });
  }

  /** Limpia y notifica al padre (botón borrar, cierre explícito). */
  function clear() {
    resetLocalState();
    syncEmit();
  }

  return {
    principalId,
    levelRows,
    selectedServicesIDs,
    principalOptions,
    hasRootSelection,
    onPrincipalChange,
    toggleAtLevel,
    hydrateFromIds,
    resetLocalState,
    clear,
  };
}
