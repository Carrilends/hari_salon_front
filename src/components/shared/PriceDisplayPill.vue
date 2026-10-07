<template>
  <div
    class="cop-price-pill"
    :class="{ 'cop-price-pill--dense': dense }"
    role="status"
    data-test="precio"
  >
    <span class="cop-price-pill__amount">{{ formatted }}</span>
    <span
      v-if="muestraBase"
      class="cop-price-pill__base"
      data-test="precio-base"
    >
      {{ formattedBase }}
    </span>
    <span class="cop-price-pill__suffix">COP</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatCopDisplay } from 'src/helpers/price-display';

/**
 * `amountBase` es el precio **antes** del descuento (D3 de la hoja de ruta): se
 * pinta tachado al lado del efectivo. Solo si de verdad es mayor — tachar una
 * cifra que no es rebaja anuncia un descuento que no existe.
 */
const props = withDefaults(
  defineProps<{
    amount: number | null | undefined;
    amountBase?: number | null;
    dense?: boolean;
  }>(),
  { amountBase: null, dense: false }
);

const formatted = computed(() => formatCopDisplay(props.amount));
const formattedBase = computed(() => formatCopDisplay(props.amountBase));

const muestraBase = computed(() => {
  const base = Number(props.amountBase ?? 0);
  const efectivo = Number(props.amount ?? 0);
  if (!Number.isFinite(base) || !Number.isFinite(efectivo)) return false;
  return base > efectivo;
});
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

/**
 * El base tachado. El color sale de un token, a diferencia del resto de esta
 * píldora, que conserva su aspecto anterior a propósito: repintarla ahora
 * cambiaría también el diálogo de reserva, que está fuera del alcance de estas
 * fases.
 */
.cop-price-pill__base {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--m-piedra);
  text-decoration: line-through;
}

.cop-price-pill--dense .cop-price-pill__base {
  font-size: 0.6875rem;
}
</style>
