<template>
  <div
    class="esqueleto-servicios"
    role="status"
    aria-label="Cargando servicios"
    data-test="esqueleto"
  >
    <div
      v-for="hueco in HUECOS"
      :key="hueco"
      class="esqueleto-servicios__hueco"
      aria-hidden="true"
      data-test="hueco"
    ></div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ServiceListSkeleton' });

/**
 * Solo para la **primera** carga. En una recarga de página las filas anteriores
 * siguen en pantalla (`placeholderData: previousData`) y cambiarlas por cajas
 * grises haría parpadear la lista entera en cada página (§6.3).
 *
 * Sin props a propósito. `/services` se prerenderiza a 1280 px (`ANCHO_SSG`) y
 * este esqueleto es lo que viaja en ese HTML, porque Vue Query no resuelve
 * durante `build:ssg`. En un teléfono el primer render del cliente mide 390:
 * si la forma saliera de `columnas`/`renglones` (clases y `--columnas` atados al
 * ancho medido en JavaScript), la hidratación no repara clases ni estilos y el
 * esqueleto se quedaba en tres columnas. Así que el marcado es el mismo para
 * todos —los seis huecos de dos filas de tres— y la forma la decide el CSS con
 * los mismos cortes de D9 que `useServiceViewport`.
 */
const HUECOS = 6;
</script>

<style scoped lang="scss">
/**
 * Los cortes son los de `useServiceViewport` (D9), escritos como consultas:
 * tres columnas desde 1240 px, dos desde 760, una por debajo, y renglones de
 * 104 px por debajo de 501. Si cambian allí, cambian aquí.
 */
.esqueleto-servicios {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--m-rejilla-gap);
}

.esqueleto-servicios__hueco {
  height: 252px;
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-carbon);
  animation: esqueleto-latido 1.4s ease-in-out infinite;
}

/* Dos columnas: dos filas son cuatro huecos. */
@media (max-width: 1239px) {
  .esqueleto-servicios {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .esqueleto-servicios__hueco:nth-child(n + 5) {
    display: none;
  }
}

/* Una columna de tarjetas (todavía no renglones): dos huecos de 252 px. */
@media (max-width: 759px) {
  .esqueleto-servicios {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--m-rejilla-gap-movil);
  }

  .esqueleto-servicios__hueco:nth-child(n + 3) {
    display: none;
  }
}

/* Renglones de móvil: cuatro de 104 px, ni una pantalla vacía ni una falsa. */
@media (max-width: 500px) {
  .esqueleto-servicios__hueco {
    height: 104px;
  }

  .esqueleto-servicios__hueco:nth-child(n + 3) {
    display: block;
  }

  .esqueleto-servicios__hueco:nth-child(n + 5) {
    display: none;
  }
}

@keyframes esqueleto-latido {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .esqueleto-servicios__hueco {
    animation: none;
    opacity: 0.7;
  }
}
</style>
