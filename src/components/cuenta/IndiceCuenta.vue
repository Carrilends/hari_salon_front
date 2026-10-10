<template>
  <nav
    class="indice"
    :class="`indice--${variante}`"
    aria-label="Secciones de la cuenta"
    data-test="indice-cuenta"
    :data-variante="variante"
  >
    <!-- aria-current y las clases van a mano: RouterLink ignora la consulta
         y marcaría todas las secciones como actuales (ver la prueba). -->
    <router-link
      v-for="entrada in entradas"
      :key="entrada.id"
      :to="{ query: { seccion: entrada.id } }"
      class="indice__entrada"
      :class="{ 'indice__entrada--actual': esActual(entrada.id) }"
      :aria-current="esActual(entrada.id) ? 'page' : undefined"
      active-class=""
      exact-active-class=""
      :data-test="`entrada-${entrada.id}`"
    >
      <span
        v-if="variante === 'lateral'"
        class="indice__punto"
        aria-hidden="true"
      />
      <span class="indice__textos">
        <span class="indice__rotulo">{{ entrada.rotulo }}</span>
        <span
          v-if="variante === 'lista' && entrada.detalle"
          class="indice__detalle"
          :class="{ 'indice__detalle--marca': entrada.marca }"
          :data-test="`detalle-${entrada.id}`"
          >{{ entrada.detalle }}</span
        >
      </span>
      <span
        v-if="variante === 'lateral' && entrada.marca"
        class="indice__marca"
        data-test="marca-sin-confirmar"
        >Sin confirmar</span
      >
      <svg
        v-if="variante === 'lista'"
        class="indice__chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </router-link>

    <div
      v-if="variante === 'lateral'"
      class="indice__filete"
      aria-hidden="true"
    />

    <router-link
      to="/mis-reservas"
      class="indice__entrada indice__entrada--enlace"
      active-class=""
      exact-active-class=""
      data-test="entrada-mis-reservas"
    >
      <stroke-icon
        v-if="variante === 'lateral'"
        class="indice__icono"
        nombre="reservas"
        :tamano="17"
      />
      <span class="indice__textos">
        <span class="indice__rotulo">Mis reservas</span>
      </span>
      <span
        v-if="variante === 'lateral'"
        class="indice__flecha"
        aria-hidden="true"
        >→</span
      >
      <svg
        v-else
        class="indice__chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </router-link>

    <router-link
      :to="{ query: { seccion: 'sesion' } }"
      class="indice__entrada indice__entrada--salir"
      :class="{ 'indice__entrada--actual': esActual('sesion') }"
      :aria-current="esActual('sesion') ? 'page' : undefined"
      active-class=""
      exact-active-class=""
      data-test="entrada-sesion"
    >
      <stroke-icon class="indice__icono" nombre="salir" :tamano="17" />
      <span class="indice__textos">
        <span class="indice__rotulo">Cerrar sesión</span>
      </span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
/**
 * El índice de Mi cuenta (plan 6, C1). Dos variantes del mismo contenido:
 * - `lateral` (escritorio): columna de 260 px; la sección actual va sobre nieve
 *   con un punto oro profundo y `aria-current="page"`; «Sin confirmar» como
 *   marca en texto junto a «Correo».
 * - `lista` (móvil): filas de 56 px con su detalle debajo y un chevrón; es un
 *   índice que lleva a pantallas completas, así que nada es «actual».
 * «Cerrar sesión» es una sección (`?seccion=sesion`), no un botón suelto: C4
 * necesita sitio para «en todos los dispositivos».
 */
import { computed } from 'vue';
import type { SeccionCuenta } from 'src/helpers/secciones-cuenta';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';

const props = defineProps<{
  variante: 'lateral' | 'lista';
  seccion: SeccionCuenta | null;
  nombre: string;
  correoVerificado: boolean;
  tieneContrasena: boolean;
}>();

type Entrada = {
  id: 'perfil' | 'correo' | 'contrasena';
  rotulo: string;
  detalle: string;
  marca: boolean;
};

const entradas = computed<Entrada[]>(() => [
  {
    id: 'perfil',
    rotulo: 'Perfil',
    detalle: props.nombre.trim(),
    marca: false,
  },
  {
    id: 'correo',
    rotulo: 'Correo',
    detalle: props.correoVerificado ? '' : 'Sin confirmar',
    marca: !props.correoVerificado,
  },
  {
    id: 'contrasena',
    rotulo: 'Contraseña',
    detalle: props.tieneContrasena ? '' : 'Entras con Google',
    marca: false,
  },
]);

function esActual(id: SeccionCuenta): boolean {
  return props.variante === 'lateral' && props.seccion === id;
}
</script>

<style scoped lang="scss">
.indice {
  display: flex;
  flex-direction: column;
  font-family: var(--m-font-sans);
}

.indice--lateral {
  padding-top: 10px;
}

.indice--lista {
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.indice__entrada {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--m-tactil-min);
  padding: 0 12px;
  border-radius: var(--m-radio-tarjeta);
  color: var(--m-piedra);
  font-size: 14.5px;
  text-decoration: none;
}

.indice__entrada:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.indice__entrada--actual {
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-weight: 500;
}

.indice__punto {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: transparent;
}

.indice__entrada--actual .indice__punto {
  background: var(--m-oro-profundo);
}

.indice__textos {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
}

.indice__marca {
  margin-left: auto;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.indice__filete {
  height: var(--m-filete-grosor);
  margin: 10px 0;
  background: var(--m-filete);
}

.indice__icono {
  flex-shrink: 0;
  color: var(--m-oro-profundo);
}

.indice__flecha {
  margin-left: auto;
  color: var(--m-oro-profundo);
}

.indice__chevron {
  flex-shrink: 0;
  color: var(--m-oro-profundo);
}

.indice--lista .indice__entrada {
  min-height: 56px;
  padding: 0;
  border-radius: 0;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  color: var(--m-tinta);
  font-size: 15px;
}

.indice--lista .indice__entrada--salir {
  min-height: 52px;
  gap: 10px;
  border-bottom: 0;
  color: var(--m-piedra);
  font-size: 14px;
}

.indice--lista .indice__entrada--salir .indice__icono {
  color: var(--m-piedra);
}

.indice__detalle {
  font-size: 12px;
  color: var(--m-piedra);
  overflow-wrap: anywhere;
}

.indice__detalle--marca {
  color: var(--m-oro-profundo);
}

@media (hover: hover) and (pointer: fine) {
  .indice__entrada:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
