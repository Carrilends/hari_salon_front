<template>
  <nav
    class="menu-mas"
    :class="`menu-mas--${variante}`"
    aria-label="Más opciones"
    data-test="menu-mas"
  >
    <div
      v-for="seccion in secciones"
      :key="seccion.id"
      class="menu-mas__seccion"
      :class="`menu-mas__seccion--${seccion.id}`"
      :role="seccion.titulo ? 'group' : undefined"
      :aria-labelledby="seccion.titulo ? idTitulo(seccion) : undefined"
      :data-test="`menu-seccion-${seccion.id}`"
    >
      <p v-if="seccion.titulo" :id="idTitulo(seccion)" class="menu-mas__titulo">
        {{ seccion.titulo }}
      </p>

      <!-- Tu cuenta, sin sesión: invitación y los dos botones (tablero). -->
      <template v-if="esCuentaSinSesion(seccion)">
        <p class="menu-mas__invitacion">
          Entra para ver, mover o cancelar tus citas.
        </p>
        <div class="menu-mas__botones">
          <router-link
            v-for="entrada in seccion.entradas"
            :key="entrada.id"
            :to="destinoDe(entrada)"
            class="menu-mas__boton m-boton"
            :class="claseDeBoton(entrada)"
            :data-test="`menu-entrada-${entrada.id}`"
            @click="elegir(entrada)"
          >
            <StrokeIcon
              v-if="entrada.id === 'iniciar-sesion' && variante === 'desplegable'"
              :nombre="entrada.icono"
              :tamano="16"
            />
            {{ entrada.rotulo }}
          </router-link>
        </div>
      </template>

      <template v-else>
        <!-- Tu cuenta, con sesión: quién es, antes de sus dos filas. -->
        <div v-if="seccion.id === 'cuenta'" class="menu-mas__perfil">
          <span class="menu-mas__avatar" aria-hidden="true" data-test="menu-avatar">
            <template v-if="iniciales">{{ iniciales }}</template>
            <StrokeIcon v-else nombre="cuenta" :tamano="20" />
          </span>
          <span class="menu-mas__quien">
            <span v-if="nombre" class="menu-mas__nombre">{{ nombre }}</span>
            <span v-if="correo" class="menu-mas__correo">{{ correo }}</span>
          </span>
        </div>

        <ul class="menu-mas__lista">
          <li v-for="entrada in seccion.entradas" :key="entrada.id" class="menu-mas__item">
            <router-link
              v-if="entrada.destino"
              :to="destinoDe(entrada)"
              class="menu-mas__entrada m-boton m-boton--ancho"
              :class="claseDeEntrada(seccion, entrada)"
              :data-test="`menu-entrada-${entrada.id}`"
              @click="elegir(entrada)"
            >
              <StrokeIcon
                class="menu-mas__icono"
                :nombre="entrada.icono"
                :tamano="tamanoDeIcono(seccion)"
              />
              <span class="menu-mas__rotulo">{{ entrada.rotulo }}</span>
              <span
                v-if="entrada.detalle === 'horario-hoy' && horarioHoy"
                class="menu-mas__detalle"
                data-test="menu-horario-hoy"
                >Hoy · {{ horarioHoy }}</span
              >
            </router-link>
            <button
              v-else
              type="button"
              class="menu-mas__entrada m-boton m-boton--ancho"
              :class="claseDeEntrada(seccion, entrada)"
              :data-test="`menu-entrada-${entrada.id}`"
              @click="elegir(entrada)"
            >
              <StrokeIcon
                class="menu-mas__icono"
                :nombre="entrada.icono"
                :tamano="tamanoDeIcono(seccion)"
              />
              <span class="menu-mas__rotulo">{{ entrada.rotulo }}</span>
              <span
                v-if="entrada.detalle === 'horario-hoy' && horarioHoy"
                class="menu-mas__detalle"
                data-test="menu-horario-hoy"
                >Hoy · {{ horarioHoy }}</span
              >
            </button>
          </li>
        </ul>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import {
  inicialesDe,
  type EntradaMenu,
  type SeccionMenu,
} from 'src/composables/shared/menuMas';

/**
 * El contenido del menú «Más» (M1 de
 * `docs/superpowers/specs/2026-10-07-menu-y-acceso-design.md`): una sola
 * pintura que colocan dos envoltorios, el `q-menu` de escritorio
 * (`MainLayout.vue`) y la hoja inferior de móvil (`MenuMasHoja.vue`).
 *
 * No decide nada: qué secciones hay lo dice `seccionesDelMenu`, y qué hacer al
 * elegir lo resuelve el armazón con el `elegir` que emite cada entrada —también
 * los enlaces, para que el menú se cierre aunque la entrada lleve a la página
 * en la que ya se está—.
 */
defineOptions({ name: 'MenuMasContenido' });

const props = defineProps<{
  secciones: SeccionMenu[];
  variante: 'desplegable' | 'hoja';
  nombre: string;
  correo: string;
  /** '8:00 a 20:00', o '' mientras nadie lo ha calculado. */
  horarioHoy: string;
}>();

const emit = defineEmits<{
  (e: 'elegir', entrada: EntradaMenu): void;
}>();

const iniciales = computed(() => inicialesDe(props.nombre, props.correo));

/** Con la variante dentro: si algún día conviven los dos envoltorios, no chocan. */
function idTitulo(seccion: SeccionMenu): string {
  return `menu-mas-titulo-${props.variante}-${seccion.id}`;
}

/** El contrato no trae bandera de sesión: la dice el propio contenido. */
function esCuentaSinSesion(seccion: SeccionMenu): boolean {
  return (
    seccion.id === 'cuenta' &&
    seccion.entradas.some((entrada) => entrada.id === 'iniciar-sesion')
  );
}

function destinoDe(entrada: EntradaMenu): RouteLocationRaw {
  return entrada.destino ?? '/';
}

function claseDeBoton(entrada: EntradaMenu): string {
  return entrada.id === 'iniciar-sesion'
    ? 'menu-mas__boton--macizo m-boton--ancho'
    : 'menu-mas__boton--contorno';
}

function claseDeEntrada(
  seccion: SeccionMenu,
  entrada: EntradaMenu
): Record<string, boolean> {
  return {
    'menu-mas__entrada--pie': seccion.id === 'pie',
    'menu-mas__entrada--salir': entrada.accion === 'cerrar-sesion',
  };
}

/** Tableros: 19 px en el desplegable, 20 en la hoja, 16 en el pie. */
function tamanoDeIcono(seccion: SeccionMenu): number {
  if (seccion.id === 'pie') return 16;
  return props.variante === 'hoja' ? 20 : 19;
}

function elegir(entrada: EntradaMenu): void {
  emit('elegir', entrada);
}
</script>

<style scoped lang="scss">
/**
 * Medidas de los tableros MenuSeccionesEscritorio y MenuSeccionesMovil;
 * colores, de los tokens. El MARCO (ancho, filete exterior, sombra) no es de
 * aquí: lo pone quien envuelve —el `.more-menu` de `MainLayout.vue` o la
 * `.menu-hoja` de `MenuMasHoja.vue`—.
 */
.menu-mas {
  display: block;
  width: 100%;
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

/// M5: lo ÚNICO en versalitas. Oro profundo: el claro no es texto sobre claro.
.menu-mas__titulo {
  margin: 0 0 6px;
  font-size: 10.5px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.menu-mas__lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

// --- Tu cuenta --------------------------------------------------------------

.menu-mas__seccion--cuenta {
  background: var(--m-hueso);
}

.menu-mas--desplegable .menu-mas__seccion--cuenta {
  padding: 18px 20px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.menu-mas--hoja .menu-mas__seccion--cuenta {
  margin: 4px 0 12px;
  padding: 16px;
  border-radius: var(--m-radio-tarjeta);
}

.menu-mas__invitacion {
  margin: 0 0 14px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--m-piedra);
}

.menu-mas--hoja .menu-mas__invitacion {
  margin-bottom: 12px;
}

.menu-mas__botones {
  display: flex;
  gap: 8px;
}

/// Botones de la casa: en versalitas, como todo botón del portal (M5 rige las filas).
.menu-mas__boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: var(--m-tactil-min);
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  line-height: 1.2;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}

.menu-mas--hoja .menu-mas__boton {
  min-height: 46px;
}

.menu-mas__boton--macizo {
  flex: 1 1 auto;
  padding: 0 12px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.menu-mas__boton--contorno {
  flex: 0 0 auto;
  padding: 0 16px;
  background: transparent;
  color: var(--m-tinta);
}

.menu-mas__perfil {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.menu-mas__avatar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 16px;
  letter-spacing: 0.06em;
}

/// `min-width: 0` deja que el texto parta dentro del flex en vez de estirarlo.
.menu-mas__quien {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.menu-mas__nombre {
  font-size: 15px;
  font-weight: 500;
  overflow-wrap: break-word;
  word-break: break-word;
}

.menu-mas__correo {
  font-size: 12px;
  color: var(--m-piedra);
  overflow-wrap: break-word;
  word-break: break-word;
}

// --- El salón y La peluquería ----------------------------------------------

.menu-mas--desplegable .menu-mas__seccion--salon,
.menu-mas--desplegable .menu-mas__seccion--peluqueria {
  padding: 14px 8px 8px;
}

.menu-mas--desplegable .menu-mas__seccion--salon .menu-mas__titulo,
.menu-mas--desplegable .menu-mas__seccion--peluqueria .menu-mas__titulo {
  padding: 0 12px;
}

.menu-mas--hoja .menu-mas__seccion--salon {
  margin-bottom: 8px;
}

.menu-mas--hoja .menu-mas__seccion--salon .menu-mas__titulo,
.menu-mas--hoja .menu-mas__seccion--peluqueria .menu-mas__titulo {
  margin-bottom: 4px;
  padding: 0 8px;
}

/// M5: caja normal. Se anulan a mano la caja y el espaciado por si algún
/// estilo global de botón los trae.
.menu-mas__entrada {
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--m-tactil-min);
  padding: 0 12px;
  border: 0;
  border-radius: var(--m-radio-tarjeta);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 14.5px;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: normal;
  text-align: left;
  text-decoration: none;
  text-transform: none;
  cursor: pointer;
}

.menu-mas--hoja .menu-mas__entrada {
  min-height: 48px;
  padding: 0 8px;
  font-size: 15px;
}

/// Las dos filas de la cuenta con sesión: sin sangría, con un filete encima.
.menu-mas__seccion--cuenta .menu-mas__entrada {
  min-height: 46px;
  padding: 0;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: 0;
  font-size: 15px;
}

.menu-mas__icono {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
}

.menu-mas__rotulo {
  flex: 1 1 auto;
  min-width: 0;
}

.menu-mas__detalle {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--m-piedra);
  white-space: nowrap;
}

// --- El pie -----------------------------------------------------------------

.menu-mas__seccion--pie {
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.menu-mas--desplegable .menu-mas__seccion--pie {
  padding: 4px 8px;
}

.menu-mas--hoja .menu-mas__seccion--pie {
  margin-top: 8px;
  padding-top: 4px;
}

.menu-mas__seccion--pie .menu-mas__lista {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.menu-mas__entrada--pie {
  width: auto;
  gap: 12px;
  font-size: 12.5px;
  color: var(--m-piedra);
}

.menu-mas--hoja .menu-mas__entrada--pie {
  min-height: var(--m-tactil-min);
  font-size: 12.5px;
}

.menu-mas__entrada--pie .menu-mas__icono {
  color: var(--m-piedra);
}

.menu-mas__entrada--salir,
.menu-mas__entrada--salir .menu-mas__icono {
  color: var(--m-tinta);
}

// --- Foco y realce ------------------------------------------------------------

.menu-mas__entrada:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: -2px;
}

.menu-mas__boton:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento —subir 1 px,
 * bajar 1 px al pulsar— es el global de `app.scss` (`m-boton`, `m-boton--ancho`).
 */
@media (hover: hover) and (pointer: fine) {
  .menu-mas__entrada:hover {
    background: var(--m-hueso);
  }

  // Sobre el hueso de la cuenta el fondo no se vería: cambia el color.
  .menu-mas__seccion--cuenta .menu-mas__entrada:hover {
    color: var(--m-oro-profundo);
  }

  .menu-mas__entrada--pie:hover {
    color: var(--m-tinta);
  }

  // Tinta maciza: el rótulo se enciende en oro (5,8:1 sobre tinta).
  .menu-mas__boton--macizo:hover {
    color: var(--m-oro);
  }

  .menu-mas__boton--contorno:hover {
    border-color: var(--m-oro-profundo);
    color: var(--m-oro-profundo);
  }
}
</style>
