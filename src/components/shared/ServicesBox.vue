<template>
  <div
    class="services-box col-12"
    :class="{ 'services-box--contained column': containedScroll }"
  >
    <div
      class="services-box__title row q-my-md q-pa-sm"
      style="background: #f2f2f2; border-radius: 8px"
    >
      <div
        class="col-11 flex flex-center"
        style="font-size: medium; color: #5e5e62; font-weight: bold"
      >
        {{ sectionTitle }}
      </div>
      <div v-if="Object.keys(selectedServicesIDs).length > 0" class="col-1">
        <q-btn @click="clear" color="red" icon="close" size="sm" round flat />
      </div>
    </div>
    <div
      class="services-box__panel q-my-md q-pa-sm"
      style="background: #f2f2f2"
      :class="{ 'services-box__panel--contained column': containedScroll }"
    >
      <q-scroll-area
        v-if="containedScroll"
        class="services-box__scroll-area"
        visible
        :thumb-style="{ borderRadius: '4px' }"
        :bar-style="{ borderRadius: '4px' }"
      >
        <q-option-group
          :model-value="principalId"
          :options="principalOptions"
          color="primary"
          inline
          rounded
          @update:model-value="onPrincipalChange"
        />
        <q-separator class="q-mb-sm q-mt-xs" />
        <template v-for="(row, level) in levelRows" :key="'lvl-' + level">
          <div v-if="row.length > 0" class="col-12">
            <q-separator v-if="level > 0" class="q-my-sm" />
            <template v-for="tag in row" :key="tag.id">
              <q-chip
                @click="toggleAtLevel(level, tag, !tag.selected)"
                :color="tag.selected ? 'teal-14' : 'teal'"
                :disable="level === 0 && hasRootSelection && !tag.selected"
                :outline="!tag.selected"
                :class="tag.selected ? 'text-white' : 'text-black'"
                clickable
                icon="star"
              >
                {{ tag.name }}
              </q-chip>
            </template>
          </div>
        </template>
      </q-scroll-area>
      <template v-else>
        <q-option-group
          :model-value="principalId"
          :options="principalOptions"
          color="primary"
          inline
          rounded
          @update:model-value="onPrincipalChange"
        />
        <q-separator class="q-mb-sm q-mt-xs" />
        <template v-for="(row, level) in levelRows" :key="'lvl-' + level">
          <div v-if="row.length > 0" class="col-12">
            <q-separator v-if="level > 0" class="q-my-sm" />
            <template v-for="tag in row" :key="tag.id">
              <q-chip
                @click="toggleAtLevel(level, tag, !tag.selected)"
                :color="tag.selected ? 'teal-14' : 'teal'"
                :disable="level === 0 && hasRootSelection && !tag.selected"
                :outline="!tag.selected"
                :class="tag.selected ? 'text-white' : 'text-black'"
                clickable
                icon="star"
              >
                {{ tag.name }}
              </q-chip>
            </template>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useOptionsStore } from 'src/stores/options-store';
import { useServicesBoxSelection } from 'src/composables/shared/useServicesBoxSelection';

const props = defineProps({
  /** IDs de tags de servicio (sin géneros). En edición vienen del backend; al montar se hidrata el árbol. */
  initialSelectedIds: {
    type: Array,
    default: () => [],
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
  /** Título de la cabecera (filtros vs crear/editar). */
  sectionTitle: {
    type: String,
    default: 'Tu servicio es:',
  },
  /**
   * Móvil / diálogo maximizado: el panel de categorías y chips hace scroll interno
   * sin empujar el resto del layout.
   */
  containedScroll: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['selectedServices']);

const optionsStore = useOptionsStore();

const {
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
} = useServicesBoxSelection(() => [...optionsStore.principalServices], emit);

onMounted(async () => {
  if (props.isEditMode && props.initialSelectedIds?.length > 0) {
    await hydrateFromIds(props.initialSelectedIds);
  }
});

/** Si `/filters` llega después del primer montaje, los principales estaban vacíos y hydrate falló. */
watch(
  () => optionsStore.principalServices.length,
  async (len, prevLen) => {
    if (!props.isEditMode || !props.initialSelectedIds?.length) return;
    if (len === 0) return;
    if (prevLen !== 0) return;
    await hydrateFromIds(props.initialSelectedIds);
  }
);

watch(
  () => props.initialSelectedIds,
  (ids) => {
    /* Misma ref que emite el padre: no llamar a clear() aquí (emitiría otra vez y dispara bucle). */
    if (!ids?.length) resetLocalState();
  },
  { deep: true, immediate: true }
);

defineExpose({ clear, hydrateFromIds, resetLocalState });
</script>

<style lang="scss" scoped>
.services-box--contained {
  flex: 1 1 auto;
  min-height: 0;
}

.services-box__title {
  flex-shrink: 0;
}

.services-box__panel--contained {
  flex: 1 1 auto;
  min-height: 0;
}

.services-box__scroll-area {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
