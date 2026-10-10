<template>
  <marco-seccion
    antetitulo="Sesión"
    titulo="Cerrar sesión"
    entradilla="Sal de tu cuenta solo aquí o en todos tus dispositivos a la vez."
    :movil="movil"
  >
    <div class="sesion__bloque" data-test="bloque-aqui">
      <p class="sesion__subtitulo">En este dispositivo</p>
      <p class="sesion__texto">
        Para volver, entras con tu correo o con Google.
      </p>
      <button
        type="button"
        class="sesion__boton"
        :class="{ 'm-boton--ancho': movil }"
        data-test="cerrar-aqui"
        :disabled="!!ocupado"
        :aria-busy="ocupado === 'aqui' ? 'true' : undefined"
        @click="emit('cerrar')"
      >
        {{ ocupado === 'aqui' ? 'Cerrando…' : 'Cerrar sesión' }}
      </button>
    </div>

    <div class="sesion__bloque sesion__bloque--todas" data-test="bloque-todas">
      <p class="sesion__subtitulo">En todos tus dispositivos</p>
      <p class="sesion__texto">
        Cierra también la sesión en cualquier teléfono u ordenador donde hayas
        entrado; úsalo si entraste en un equipo que no es tuyo. Los demás
        dispositivos pierden el acceso en unos minutos.
      </p>
      <aviso-acceso v-if="error" class="cuenta-aviso">{{ error }}</aviso-acceso>
      <button
        type="button"
        class="sesion__boton sesion__boton--macizo"
        :class="{ 'm-boton--ancho': movil }"
        data-test="cerrar-todas"
        :disabled="!!ocupado"
        :aria-busy="ocupado === 'todas' ? 'true' : undefined"
        @click="emit('cerrar-todas')"
      >
        {{
          ocupado === 'todas'
            ? 'Cerrando…'
            : 'Cerrar sesión en todos los dispositivos'
        }}
      </button>
    </div>
  </marco-seccion>
</template>

<script setup lang="ts">
/**
 * Cerrar sesión (plan 6, C4). Presentacional: la página llama a la API, cierra
 * la sesión local y navega, porque es ella quien vigila «la sesión se perdió →
 * a entrar» y tiene que saber que esta salida es a propósito.
 *
 * «En unos minutos», no «ya»: `POST /auth/logout-all` revoca todos los refresh,
 * pero un access token ya emitido sigue valiendo hasta caducar (15 min por
 * defecto, `JWT_EXPIRES_IN`).
 */
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import MarcoSeccion from 'src/components/cuenta/MarcoSeccion.vue';

withDefaults(
  defineProps<{
    movil?: boolean;
    ocupado?: 'aqui' | 'todas' | null;
    error?: string;
  }>(),
  { movil: false, ocupado: null, error: '' }
);

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'cerrar-todas'): void;
}>();
</script>

<style scoped lang="scss">
.sesion__bloque--todas {
  margin-top: 24px;
  padding-top: 24px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.sesion__subtitulo {
  margin: 0 0 8px;
  font-family: var(--m-font-sans);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.sesion__texto {
  margin: 0;
  font-family: var(--m-font-sans);
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.sesion__boton {
  min-height: 48px;
  margin-top: 16px;
  padding: 0 24px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: transparent;
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  cursor: pointer;
}

.sesion__boton--macizo {
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.sesion__boton.m-boton--ancho {
  width: 100%;
}

.sesion__boton:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.sesion__boton:disabled {
  opacity: 0.55;
  cursor: default;
}

.cuenta-aviso {
  margin-top: 16px;
}

@media (hover: hover) and (pointer: fine) {
  .sesion__boton:not(:disabled):hover {
    border-color: var(--m-oro);
  }

  .sesion__boton--macizo:not(:disabled):hover {
    color: var(--m-oro);
  }
}
</style>
