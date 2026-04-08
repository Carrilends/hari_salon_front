<template>
  <q-btn
    v-if="showButton"
    round
    unelevated
    padding="sm"
    :class="[
      'service-promo-btn',
      placement === 'overlay' ? 'service-promo-btn--overlay' : 'service-promo-btn--inline',
      isOnPromotion ? 'service-promo-btn--active' : 'service-promo-btn--inactive',
    ]"
    :aria-label="isOnPromotion ? 'Servicio en promoción' : 'Promociones (próximamente)'"
    @click.stop="onClick"
  >
    <span v-if="isOnPromotion" class="service-promo-btn__pct">
      {{ pct }}%
    </span>
    <q-icon v-else name="sell" class="service-promo-btn__icon" />
  </q-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
const props = withDefaults(
  defineProps<{
    havePromotion?: boolean;
    porcentageDiscount?: number;
    /** overlay: esquina superior izquierda (cards desktop); inline: junto al precio (lista móvil) */
    placement?: 'overlay' | 'inline';
  }>(),
  {
    havePromotion: false,
    porcentageDiscount: 0,
    placement: 'overlay',
  }
);

const emit = defineEmits<{ promoClick: [] }>();
const authStore = useAuthStore();

const isOnPromotion = computed(() => {
  const pctN = Number(props.porcentageDiscount ?? 0);
  return Boolean(props.havePromotion) && pctN > 0;
});

const pct = computed(() => Math.round(Number(props.porcentageDiscount ?? 0)));

/** Admin ve siempre el control; el resto solo cuando hay promo activa. */
const showButton = computed(
  () =>
    (authStore.isLoggedIn && authStore.isAdmin) || isOnPromotion.value
);

function onClick() {
  if (!(authStore.isLoggedIn && authStore.isAdmin)) return;
  emit('promoClick');
}

defineOptions({ name: 'ServicePromoButton' });
</script>

<style lang="scss" scoped>
.service-promo-btn {
  min-width: 36px;
  min-height: 36px;
  width: 36px;
  height: 36px;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
}

.service-promo-btn--overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 9;
}

.service-promo-btn--inline {
  flex-shrink: 0;
  margin-left: 6px;
}

/* Rojo pálido / opacado — estado sin promo activa (admin) */
.service-promo-btn--inactive {
  background: rgba(229, 57, 53, 0.38) !important;
  color: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: none;
}

.service-promo-btn--overlay.service-promo-btn--inactive:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow:
    0 6px 16px rgba(229, 57, 53, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  filter: brightness(1.08);
}

/* Glassy rojo — promo activa */
.service-promo-btn--active {
  pointer-events: auto;
  background: linear-gradient(
    145deg,
    rgba(255, 92, 92, 0.85) 0%,
    rgba(229, 57, 53, 0.92) 45%,
    rgba(183, 28, 28, 0.95) 100%
  ) !important;
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  color: #fff !important;
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    0 0 0 1px rgba(255, 168, 168, 0.55),
    0 0 14px rgba(255, 86, 86, 0.9),
    0 0 28px rgba(229, 57, 53, 0.75),
    0 8px 24px rgba(183, 28, 28, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
  animation: promoGlowPulse 1.8s ease-in-out infinite;
}

.service-promo-btn--active:active {
  transform: scale(0.96);
}

@keyframes promoGlowPulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 168, 168, 0.5),
      0 0 12px rgba(255, 86, 86, 0.8),
      0 0 24px rgba(229, 57, 53, 0.65),
      0 8px 20px rgba(183, 28, 28, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 205, 205, 0.75),
      0 0 18px rgba(255, 120, 120, 0.98),
      0 0 36px rgba(244, 67, 54, 0.9),
      0 10px 30px rgba(183, 28, 28, 0.78),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
}

.service-promo-btn__pct {
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.service-promo-btn__icon {
  font-size: 18px;
}

.service-promo-btn--inline.service-promo-btn--active .service-promo-btn__pct {
  font-size: 9px;
}
</style>
