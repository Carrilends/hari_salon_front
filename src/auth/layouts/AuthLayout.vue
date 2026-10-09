<template>
  <div class="acceso" :data-cabecera="cabecera">
    <main class="acceso__hoja">
      <!-- Escritorio (≥ 1024): marca y vuelta al portal. -->
      <header class="acceso__barra-escritorio">
        <router-link to="/" class="acceso__marca" data-test="marca">
          MARLENE
        </router-link>
        <router-link to="/" class="acceso__volver" data-test="volver-portal">
          <span aria-hidden="true">←</span> Volver al portal
        </router-link>
      </header>

      <!-- Móvil (< 1024): cabecera de foto o de barra, según la ruta (A2). -->
      <header
        v-if="cabecera === 'foto'"
        class="acceso__foto-movil"
        data-test="cabecera-foto"
      >
        <div class="acceso__foto-movil-fila">
          <span class="acceso__marca acceso__marca--movil acceso__marca--sobre-foto">
            MARLENE
          </span>
          <router-link
            to="/"
            class="acceso__cerrar m-boton"
            aria-label="Volver al portal"
            data-test="volver-portal"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </router-link>
        </div>
      </header>
      <header v-else class="acceso__barra-movil" data-test="cabecera-barra">
        <router-link
          :to="{ name: 'login', query: consultaDestino }"
          class="acceso__entrar"
          data-test="ir-a-entrar-cabecera"
        >
          <span aria-hidden="true">←</span> Entrar
        </router-link>
        <router-link
          to="/"
          class="acceso__marca acceso__marca--movil"
          data-test="marca-movil"
        >
          MARLENE
        </router-link>
      </header>

      <div class="acceso__cuerpo">
        <router-view />
      </div>

      <footer class="acceso__pie">
        <router-link
          :to="{ name: 'privacy-policy' }"
          class="acceso__pie-enlace"
          data-test="pie-politica"
          >Política de tratamiento de datos</router-link
        >
        <span data-test="pie-direccion">{{ direccion }}</span>
      </footer>
    </main>

    <aside class="acceso__foto" aria-hidden="true" data-test="foto-acceso">
      <div class="acceso__placa">
        <p class="acceso__placa-titulo">Cortes, color y estética en Sopó</p>
        <p class="acceso__placa-horario" data-test="placa-horario">
          {{ horario }}
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * Armazón del acceso en «hoja partida» (decisiones A1 y A2): desde 1024 px,
 * formulario sobre hueso a la izquierda y foto a la derecha con una placa de
 * tinta; por debajo, una sola columna con la cabecera que pida la ruta en
 * `meta.acceso.cabecera`. Dirección y horario salen de su única fuente.
 *
 * El bloque de estilos no `scoped` del final declara las clases comunes que
 * pintan las cinco páginas (`.acceso-boton`, `.acceso-enlace`…).
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { CabeceraAcceso } from 'src/auth/routes';
import { SALON_LOCALITY, SALON_STREET } from 'src/constants/salon-location';
import { BUSINESS_SCHEDULE_COPY } from 'src/helpers/businessHours';
import { redireccionSegura } from 'src/helpers/redireccion-segura';

const route = useRoute();

const cabecera = computed<CabeceraAcceso>(() => {
  const acceso = route.meta.acceso as { cabecera?: CabeceraAcceso } | undefined;
  return acceso?.cabecera ?? 'barra';
});

/** «← Entrar» conserva el destino, saneado (§7.7). */
const consultaDestino = computed(() =>
  typeof route.query.redirect === 'string'
    ? { redirect: redireccionSegura(route.query.redirect) }
    : {}
);

const direccion = `${SALON_STREET}, ${SALON_LOCALITY}`;
const horario = `${BUSINESS_SCHEDULE_COPY.weekdayLabel}: ${BUSINESS_SCHEDULE_COPY.weekdayRange} · ${BUSINESS_SCHEDULE_COPY.weekendLabel}: ${BUSINESS_SCHEDULE_COPY.weekendRange}`;
</script>

<style scoped lang="scss">
.acceso {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.acceso__hoja {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: var(--m-hueso);
}

.acceso__barra-escritorio {
  display: none;
}

.acceso__marca {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  font-family: var(--m-font-display);
  font-size: 20px;
  letter-spacing: var(--m-tracking-marca);
  color: var(--m-tinta);
  text-decoration: none;
}

.acceso__marca--movil {
  font-size: 16px;
}

/* Sobre la foto real la marca necesita fondo propio para leerse. */
.acceso__marca--sobre-foto {
  min-height: 0;
  padding: 6px 12px;
  border-radius: var(--m-radio-pildora);
  background: var(--m-hueso);
}

.acceso__volver,
.acceso__entrar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
  text-decoration: none;
}

.acceso__volver {
  height: var(--m-tactil-min);
}

.acceso__foto-movil {
  position: relative;
  flex: 0 0 auto;
  height: 150px;
  background-color: var(--m-carbon);
  background-image: url('/people/rainbow_hair.jpg');
  background-position: center;
  background-size: cover;
}

.acceso__foto-movil-fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--m-cabecera-alto-movil);
  padding: 0 8px 0 20px;
}

.acceso__cerrar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  border-radius: 50%;
  background: var(--m-hueso);
  color: var(--m-tinta);
}

.acceso__barra-movil {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  height: var(--m-cabecera-alto-movil);
  padding: 0 8px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.acceso__entrar {
  height: var(--m-tactil-min);
  padding: 0 12px;
}

.acceso__barra-movil .acceso__marca {
  padding-right: 12px;
}

.acceso__cuerpo {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  padding: 24px var(--m-banda-margen-movil) 32px;
}

.acceso__pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  min-height: 64px;
  padding: 10px var(--m-banda-margen-movil);
  box-sizing: border-box;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  font-size: 12px;
  color: var(--m-piedra);
}

.acceso__pie-enlace {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  color: var(--m-piedra);
  text-decoration: none;
}

.acceso__foto {
  display: none;
}

.acceso__marca:focus-visible,
.acceso__volver:focus-visible,
.acceso__entrar:focus-visible,
.acceso__pie-enlace:focus-visible,
.acceso__cerrar:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .acceso__volver:hover,
  .acceso__entrar:hover,
  .acceso__pie-enlace:hover {
    color: var(--m-tinta);
  }

  .acceso__cerrar:hover {
    color: var(--m-oro-profundo);
  }
}

@media (min-width: 1024px) {
  .acceso__hoja {
    flex: 0 0 auto;
    width: min(620px, 50%);
    padding: 0 56px;
  }

  .acceso__foto-movil,
  .acceso__barra-movil {
    display: none;
  }

  .acceso__barra-escritorio {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    height: 84px;
  }

  .acceso__cuerpo {
    padding: 32px 0;
  }

  .acceso__pie {
    flex-wrap: nowrap;
    height: 64px;
    padding: 0;
  }

  .acceso__foto {
    display: block;
    position: relative;
    flex: 1 1 auto;
    min-height: 100vh;
    background-color: var(--m-carbon);
    background-image: url('/people/rainbow_hair.jpg');
    background-position: center;
    background-size: cover;
  }

  .acceso__placa {
    position: absolute;
    right: 40px;
    bottom: 40px;
    left: 40px;
    padding: 22px 26px;
    border-radius: var(--m-radio-foto);
    background: var(--m-tinta);
    color: var(--m-hueso);
  }

  .acceso__placa-titulo {
    margin: 0 0 8px;
    font-family: var(--m-font-display);
    font-size: 22px;
    line-height: 1.3;
  }

  .acceso__placa-horario {
    margin: 0;
    font-size: 12.5px;
    color: var(--m-piedra-clara);
  }
}
</style>

<style lang="scss">
/*
 * Piezas comunes de las cinco pantallas de acceso. NO scoped a propósito: las
 * pintan las páginas hijas y lo que estas meten en las ranuras de
 * `EstadoAcceso`, que no llevan el atributo de ámbito de este archivo. Todas
 * empiezan por `acceso-` (con guion; las del armazón llevan `__`) y la Tarea 13
 * vigila que cada una que use una página esté definida aquí.
 */
.acceso-pagina {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
}

.acceso-antetitulo {
  margin: 0 0 12px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.acceso-titulo {
  margin: 0 0 8px;
  font-family: var(--m-font-display);
  font-size: 29px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--m-tinta);
}

.acceso-entradilla {
  margin: 0 0 22px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

/* Botón principal: tinta maciza en píldora, a lo ancho del formulario. */
.acceso-boton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-top: 22px;
  padding: 0 20px;
  box-sizing: border-box;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

.acceso-boton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Enlace de contenido sobre claro: rosa profundo (6,4:1) con filete rosa. */
.acceso-enlace {
  padding: 0 0 1px;
  border: 0;
  color: var(--m-rosa-profundo);
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
  background: none;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

/* Enlace suelto (fuera de una frase): 44 px de alto, subrayado al texto. */
.acceso-enlace--suelto {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  padding: 0;
  border-bottom: 0;
  font-size: 12.5px;
  text-decoration: underline;
  text-decoration-color: var(--m-filete-rosa);
  text-underline-offset: 3px;
}

.acceso-pie-formulario {
  margin: 22px 0 0;
  font-size: 14px;
  text-align: center;
  color: var(--m-piedra);
}

.acceso-secundario {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--m-tactil-min);
  margin-top: 10px;
  font-size: 13px;
  color: var(--m-piedra);
  text-decoration: none;
}

.acceso-nota {
  margin: 6px 0 0;
  font-size: 11.5px;
  text-align: center;
  color: var(--m-piedra);
}

.acceso-vivo {
  min-height: 1.5em;
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--m-tinta);
}

.acceso-boton:focus-visible,
.acceso-enlace:focus-visible,
.acceso-secundario:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  /* Rótulo en oro sobre la tinta del botón: 5,8:1. */
  .acceso-boton:hover:not(:disabled) {
    color: var(--m-oro);
  }

  .acceso-enlace:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }

  .acceso-secundario:hover {
    color: var(--m-oro-profundo);
  }
}

@media (min-width: 1024px) {
  .acceso-pagina {
    margin: auto;
  }

  .acceso-titulo {
    font-size: 36px;
  }

  .acceso-entradilla {
    margin-bottom: 26px;
    font-size: 14px;
  }
}
</style>
