<template>
  <marco-seccion
    antetitulo="Perfil"
    titulo="Tu nombre"
    entradilla="Así te saludamos en el portal y así firmas tus reseñas."
    :movil="movil"
  >
    <form novalidate data-test="form-perfil" @submit.prevent="guardar">
      <campo-acceso
        id="nombre"
        v-model="valores.nombre.value"
        rotulo="Nombre"
        autocomplete="name"
        :error="errores.nombre"
        @blur="tocar('nombre')"
      />
      <aviso-acceso v-if="errorServidor" class="cuenta-aviso">{{
        errorServidor
      }}</aviso-acceso>
      <aviso-acceso v-if="logro" variante="tranquilo" class="cuenta-aviso">{{
        logro
      }}</aviso-acceso>
      <acciones-cuenta
        texto-guardar="Guardar nombre"
        :enviando="enviando"
        :sin-cambios="sinCambios"
        :con-descartar="!movil"
        :ancho="movil"
        @descartar="descartar"
      />
    </form>
  </marco-seccion>
</template>

<script setup lang="ts">
/**
 * Perfil (plan 6, C1–C2): el nombre. `PATCH /auth/me/profile` renombra
 * también las reseñas de la autora (puerto `ReviewAuthorRenamer`), y el éxito
 * lo dice. Errores y éxito en línea, con las piezas del acceso.
 */
import { computed, ref } from 'vue';
import { authApi } from 'src/api/auth-api';
import { useAuthStore } from 'src/stores/auth-store';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { aplicarSesion } from 'src/composables/cuenta/aplicarSesion';
import { errorDeCuenta } from 'src/helpers/mensajes-cuenta';
import { minTrimmedLength, requerido } from 'src/helpers/validators';
import CampoAcceso from 'src/components/auth/CampoAcceso.vue';
import AvisoAcceso from 'src/components/auth/AvisoAcceso.vue';
import MarcoSeccion from 'src/components/cuenta/MarcoSeccion.vue';
import AccionesCuenta from 'src/components/cuenta/AccionesCuenta.vue';

withDefaults(defineProps<{ movil?: boolean }>(), { movil: false });

const authStore = useAuthStore();

type CampoPerfil = 'nombre';

const formulario: FormularioAcceso<CampoPerfil> =
  useFormularioAcceso<CampoPerfil>({
    // Los textos del registro; el backend exige 3+ (`UpdateProfileDto`).
    nombre: [
      requerido('Escribe tu nombre.'),
      minTrimmedLength(3, 'Escribe tu nombre completo (3 letras o más).'),
    ],
  });
const { valores, errores, tocar, validarTodo, reiniciar } = formulario;
reiniciar({ nombre: authStore.fullname });

const enviando = ref(false);
const errorServidor = ref('');
const logro = ref('');

const sinCambios = computed(
  () => valores.nombre.value.trim() === authStore.fullname.trim()
);

function descartar() {
  reiniciar({ nombre: authStore.fullname });
  errorServidor.value = '';
  logro.value = '';
}

async function guardar() {
  if (enviando.value || sinCambios.value) return;
  errorServidor.value = '';
  logro.value = '';
  const primero = validarTodo();
  if (primero) {
    enfocarCampo(primero);
    return;
  }
  enviando.value = true;
  try {
    const sesion = await authApi.updateProfile({
      fullName: valores.nombre.value.trim(),
    });
    aplicarSesion(sesion);
    reiniciar({ nombre: sesion.fullName });
    logro.value = 'Guardamos tu nombre. También cambia en tus reseñas.';
  } catch (err: unknown) {
    errorServidor.value = errorDeCuenta(err, 'perfil').texto;
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped lang="scss">
.cuenta-aviso {
  margin-top: 18px;
}
</style>
