<template>
  <div
    class="cop-price-pill"
    :class="{ 'cop-price-pill--dense': dense }"
    role="status"
  >
    <span class="cop-price-pill__amount">{{ formatted }}</span>
    <span class="cop-price-pill__suffix">COP</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatCopDisplay } from 'src/helpers/price-display';

const props = withDefaults(
  defineProps<{
    amount: number | null | undefined;
    dense?: boolean;
  }>(),
  { dense: false }
);

const formatted = computed(() => formatCopDisplay(props.amount));
</script>

<style scoped lang="scss">
.cop-price-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.5rem 0.9rem 0.5rem 0.75rem;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.94) 0%,
    rgba(253, 248, 250, 0.92) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 4px 18px rgba(45, 32, 40, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  width: fit-content;
  max-width: 100%;
}

.cop-price-pill--dense {
  padding: 0.3rem 0.65rem 0.3rem 0.55rem;
  gap: 0.25rem;

  .cop-price-pill__amount {
    font-size: 0.875rem;
  }

  .cop-price-pill__suffix {
    font-size: 0.55rem;
  }
}

.cop-price-pill__amount {
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: #ad1457;
}

.cop-price-pill__suffix {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #7a726c;
  text-transform: uppercase;
}
</style>
