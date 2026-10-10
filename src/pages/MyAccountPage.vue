<template>
  <q-page
    class="cuenta"
    :class="{ 'cuenta--movil': esMovil }"
    data-test="pagina-cuenta"
  >
    <div class="cuenta__marco">
      <template v-if="!esMovil || !seccion">
        <header class="cuenta__cabecera">
          <p class="cuenta__antetitulo">Tu cuenta</p>
          <h1 id="cuenta-titulo" class="cuenta__titulo" tabindex="-1">
            Mi cuenta
          </h1>
          <p v-if="!esMovil" class="cuenta__entradilla">
            Actualiza tu nombre, correo y contraseña.
          </p>
          <identidad-cuenta
            v-else
            :nombre="authStore.fullname"
            :correo="authStore.email"
          />
        </header>
        <aviso-verificacion
          v-if="!authStore.emailVerified"
          class="cuenta__aviso"
          :correo="authStore.email"
          :movil="esMovil"
        />
      </template>

      <indice-cuenta
        v-if="esMovil && !seccion"
        class="cuenta__indice-movil"
        variante="lista"
        :seccion="null"
        :nombre="authStore.fullname"
        :correo-verificado="authStore.emailVerified"
        :tiene-contrasena="tieneContrasena"
      />

      <div v-else class="cuenta__cuerpo">
        <aside
          v-if="!esMovil"
          class="cuenta__lateral"
          data-test="lateral-cuenta"
        >
          <identidad-cuenta
            :nombre="authStore.fullname"
            :correo="authStore.email"
          />
          <indice-cuenta
            variante="lateral"
            :seccion="seccionVisible"
            :nombre="authStore.fullname"
            :correo-verificado="authStore.emailVerified"
            :tiene-contrasena="tieneContrasena"
          />
        </aside>

        <div class="cuenta__panel" data-test="panel-cuenta">
          <router-link
            v-if="esMovil"
            :to="{ query: {} }"
            class="cuenta__volver"
            aria-label="Volver a Mi cuenta"
            data-test="volver-a-cuenta"
          >
            <span aria-hidden="true">← Mi cuenta</span>
          </router-link>
          <seccion-perfil v-if="seccionVisible === 'perfil'" :movil="esMovil" />
          <seccion-correo
            v-else-if="seccionVisible === 'correo'"
            :movil="esMovil"
          />
          <seccion-contrasena
            v-else-if="seccionVisible === 'contrasena'"
            :movil="esMovil"
          />
          <seccion-sesion
            v-else
            :movil="esMovil"
            :ocupado="saliendo"
            :error="errorSesion"
            @cerrar="cerrarAqui"
            @cerrar-todas="cerrarTodas"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
/**
 * Mi cuenta — «ficha con secciones» (plan 6; especificación §6; tablero
 * MiCuentaA).
 *
 * - La sección vive en `?seccion=` (`seccionDeConsulta`): en escritorio el
 *   índice va a la izquierda y la sección a la derecha (por defecto «Perfil»);
 *   por debajo de 900 px, sin sección se ve el índice y con sección, la sección
 *   sola con «← Mi cuenta». El «atrás» del navegador hace lo mismo.
 * - Al montar pide `GET /auth/check-status`: trae `hasPassword` y
 *   `emailVerified` al día (el perfil persistido puede ser de antes).
 * - Salir es cosa de la página: es ella quien vigila «la sesión se perdió → a
 *   entrar» y tiene que distinguirlo de una salida a propósito (`saliendo`).
 * - Errores y éxitos en línea, en cada sección. Solo «Cerrar sesión en todos
 *   los dispositivos» avisa con `useAviso`, porque tras él se navega al inicio
 *   y no queda sitio en línea.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import { useSeo } from 'src/composables/seo/useSeo';
import { useConsultaMedios } from 'src/composables/shared/useConsultaMedios';
import { useAviso } from 'src/composables/shared/useAviso';
import { aplicarSesion } from 'src/composables/cuenta/aplicarSesion';
import {
  CONSULTA_CUENTA_MOVIL,
  seccionDeConsulta,
} from 'src/helpers/secciones-cuenta';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';
import IdentidadCuenta from 'src/components/cuenta/IdentidadCuenta.vue';
import IndiceCuenta from 'src/components/cuenta/IndiceCuenta.vue';
import AvisoVerificacion from 'src/components/cuenta/AvisoVerificacion.vue';
import SeccionPerfil from 'src/components/cuenta/SeccionPerfil.vue';
import SeccionCorreo from 'src/components/cuenta/SeccionCorreo.vue';
import SeccionContrasena from 'src/components/cuenta/SeccionContrasena.vue';
import SeccionSesion from 'src/components/cuenta/SeccionSesion.vue';

useSeo({
  title: 'Mi cuenta | Peluquería Marlene',
  description: 'Gestión de cuenta personal en Peluquería Marlene.',
  path: '/mi-cuenta',
  noindex: true,
});

defineOptions({ name: 'MyAccountPage' });

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const aviso = useAviso();

/** Arranca en escritorio; la ventana real llega al montar (`useConsultaMedios`). */
const esMovil = useConsultaMedios(CONSULTA_CUENTA_MOVIL, false);

const seccion = computed(() => seccionDeConsulta(route.query.seccion));
const seccionVisible = computed(() => seccion.value ?? 'perfil');
/** `null` (no se sabe aún) cuenta como «sí»: es el caso común. */
const tieneContrasena = computed(() => authStore.hasPassword !== false);

const saliendo = ref<'aqui' | 'todas' | null>(null);
const errorSesion = ref('');

function irAEntrar() {
  void router.push({ name: 'login', query: { redirect: '/mi-cuenta' } });
}

onMounted(() => {
  if (!authStore.isLoggedIn) {
    irAEntrar();
    return;
  }
  authApi
    .checkStatus()
    .then((sesion) => {
      // Puede llegar después de pulsar «Cerrar sesión»: no reabrirla.
      if (authStore.isLoggedIn && !saliendo.value) aplicarSesion(sesion);
    })
    .catch(() => {
      // La página funciona con el perfil que ya había; si la renovación
      // falló, el almacén ya se cerró y el `watch` de abajo manda a entrar.
    });
});

// La sesión se pierde estando aquí (la renovación falló, otra pestaña salió):
// a entrar, y de vuelta aquí. Una salida a propósito va al inicio.
watch(
  () => authStore.isLoggedIn,
  (conSesion) => {
    // Solo si NO fue a propósito: «Cerrar sesión» del menú también cierra el
    // almacén y su destino es el inicio. Sin token aún pero sin sesión = la
    // vigencia se agotó sin barrido: también involuntario.
    if (
      !conSesion &&
      !saliendo.value &&
      (authStore.sesionCaducada || authStore.token)
    )
      irAEntrar();
  }
);

// El foco sigue a la sección: en móvil la pantalla cambia entera, y en
// escritorio el formulario de la derecha también.
watch(seccion, async (nueva) => {
  await nextTick();
  const id =
    esMovil.value && !nueva ? 'cuenta-titulo' : 'cuenta-titulo-seccion';
  document.getElementById(id)?.focus();
});

async function cerrarAqui() {
  if (saliendo.value) return;
  saliendo.value = 'aqui';
  errorSesion.value = '';
  // Como el menú: revoca el refresh en el servidor, pero un fallo no impide
  // cerrar la sesión local.
  try {
    await authApi.logout();
  } catch {
    /* la sesión local se cierra igual */
  }
  authStore.logout();
  await router.push({ path: '/' });
}

async function cerrarTodas() {
  if (saliendo.value) return;
  saliendo.value = 'todas';
  errorSesion.value = '';
  try {
    await authApi.logoutAll();
  } catch (err: unknown) {
    // Si falla, NO se cierra la local: la clienta creería que cerró las demás.
    saliendo.value = null;
    // La renovación que dispara un 401 pudo cerrar la sesión (el `watch` la
    // ignoró porque `saliendo` estaba puesto): reintentar sería otro 401.
    if (!authStore.isLoggedIn) {
      irAEntrar();
      return;
    }
    errorSesion.value = errorDeCuenta(err, 'cerrar-todas').texto;
    return;
  }
  authStore.logout();
  aviso.logro('Cerraste la sesión en todos tus dispositivos.');
  await router.push({ path: '/' });
}
</script>

<style scoped lang="scss">
.cuenta {
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.cuenta__marco {
  box-sizing: border-box;
  max-width: 1088px;
  margin: 0 auto;
  padding: 34px var(--m-banda-margen) 64px;
}

.cuenta__antetitulo {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.cuenta__titulo {
  margin: 0 0 8px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 38px;
  line-height: 1.1;
}

/* Recibe el foco por programa al volver al índice; no es un control. */
.cuenta__titulo:focus {
  outline: none;
}

.cuenta__entradilla {
  margin: 0;
  font-size: 14.5px;
  color: var(--m-piedra);
}

.cuenta__aviso {
  margin-top: 22px;
}

.cuenta__cuerpo {
  display: flex;
  align-items: flex-start;
  gap: 48px;
  margin-top: 26px;
}

.cuenta__lateral {
  width: 260px;
  flex-shrink: 0;
}

.cuenta__panel {
  flex-grow: 1;
  min-width: 0;
  max-width: 620px;
}

.cuenta__volver {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  margin: 0 0 14px -12px;
  padding: 0 12px;
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
  text-decoration: none;
}

.cuenta__volver:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.cuenta--movil .cuenta__marco {
  padding: 22px var(--m-banda-margen-movil) 40px;
}

.cuenta--movil .cuenta__antetitulo {
  margin-bottom: 8px;
  font-size: 10px;
  letter-spacing: var(--m-tracking-etiqueta);
}

.cuenta--movil .cuenta__titulo {
  margin-bottom: 18px;
  font-size: 28px;
}

.cuenta--movil .cuenta__aviso {
  margin-top: 16px;
}

.cuenta--movil .cuenta__cuerpo {
  display: block;
  margin-top: 0;
}

.cuenta--movil .cuenta__panel {
  max-width: none;
}

.cuenta__indice-movil {
  margin-top: 14px;
}

@media (hover: hover) and (pointer: fine) {
  .cuenta__volver:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
