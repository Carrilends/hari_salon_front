<template>
  <div class="datos" data-test="paso-datos">
    <article class="datos__cita" data-test="tarjeta-cita">
      <div class="datos__cita-cabeza">
        <h3 class="cajon-etiqueta datos__cita-rotulo">Tu cita</h3>
        <button
          type="button"
          class="cajon-enlace datos__cambiar"
          data-test="cambiar-cita"
          @click="emit('cambiar')"
        >
          Cambiar
        </button>
      </div>
      <p class="datos__cita-cuando">{{ cita.cuando }}</p>
      <p class="datos__cita-detalle">{{ cita.detalle }}</p>
      <p class="datos__cita-detalle">{{ cita.servicios }}</p>
    </article>

    <template v-if="conSesion">
      <h3 class="cajon-etiqueta">Reservas como</h3>
      <div class="datos__cuenta" data-test="reservas-como">
        <span class="datos__iniciales" aria-hidden="true">{{
          iniciales(nombreVisible)
        }}</span>
        <div class="datos__cuenta-textos">
          <p class="datos__cuenta-nombre">{{ nombreVisible }}</p>
          <p class="datos__cuenta-correo">{{ cuenta.correo }}</p>
        </div>
        <span class="datos__cuenta-hecho" aria-hidden="true">
          <StrokeIcon nombre="check" :tamano="18" />
        </span>
      </div>
      <p class="datos__nota">Tu cita quedará en «Mis reservas».</p>
    </template>

    <template v-else>
      <h3 class="cajon-etiqueta">Tus datos de contacto</h3>
      <label class="datos__rotulo" for="reserva-nombre">Nombre</label>
      <input
        id="reserva-nombre"
        class="datos__campo"
        :class="{ 'datos__campo--error': !!errores.nombre }"
        data-test="campo-nombre"
        type="text"
        autocomplete="name"
        maxlength="80"
        placeholder="Tu nombre"
        :value="nombre"
        :aria-invalid="errores.nombre ? 'true' : undefined"
        :aria-describedby="errores.nombre ? 'reserva-nombre-error' : undefined"
        @input="emit('update:nombre', valorDe($event))"
      />
      <p
        v-if="errores.nombre"
        id="reserva-nombre-error"
        class="datos__error"
        data-test="error-nombre"
      >
        {{ errores.nombre }}
      </p>
    </template>

    <label class="datos__rotulo" for="reserva-telefono"
      >Teléfono<span v-if="conSesion" class="datos__opcional">
        (opcional)</span
      ></label
    >
    <input
      id="reserva-telefono"
      class="datos__campo"
      :class="{ 'datos__campo--error': !!errores.telefono }"
      data-test="campo-telefono"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      maxlength="20"
      placeholder="300 000 0000"
      :value="telefono"
      :aria-invalid="errores.telefono ? 'true' : undefined"
      :aria-describedby="describeTelefono"
      @input="emit('update:telefono', valorDe($event))"
    />
    <p id="reserva-telefono-ayuda" class="datos__ayuda">
      {{
        conSesion
          ? 'Si lo dejas, te avisamos de tu cita por WhatsApp.'
          : 'Te avisamos de tu cita por WhatsApp.'
      }}
    </p>
    <p
      v-if="errores.telefono"
      id="reserva-telefono-error"
      class="datos__error"
      data-test="error-telefono"
    >
      {{ errores.telefono }}
    </p>

    <p v-if="conSesion" class="datos__politica" data-test="politica-aceptada">
      Aceptaste la
      <a
        class="cajon-enlace"
        :href="RUTA_POLITICA"
        target="_blank"
        rel="noopener"
        >política de tratamiento de datos</a
      >
      al crear tu cuenta; no hace falta marcarla otra vez.
    </p>

    <template v-else>
      <label class="datos__consentimiento">
        <input
          class="datos__casilla"
          data-test="casilla-consentimiento"
          type="checkbox"
          :checked="consentimiento"
          :aria-invalid="errores.consentimiento ? 'true' : undefined"
          :aria-describedby="
            errores.consentimiento ? 'reserva-consentimiento-error' : undefined
          "
          @change="emit('update:consentimiento', marcadoDe($event))"
        />
        <span>
          Autorizo el tratamiento de mis datos para gestionar la reserva, según
          la
          <a
            class="cajon-enlace"
            :href="RUTA_POLITICA"
            target="_blank"
            rel="noopener"
            >política de tratamiento de datos</a
          >.
        </span>
      </label>
      <p
        v-if="errores.consentimiento"
        id="reserva-consentimiento-error"
        class="datos__error"
        data-test="error-consentimiento"
      >
        {{ errores.consentimiento }}
      </p>
      <p class="datos__entrar">
        ¿Tienes cuenta?
        <button
          type="button"
          class="cajon-enlace"
          data-test="entrar"
          @click="emit('entrar')"
        >
          Entra
        </button>
        y no tendrás que escribir tus datos.
      </p>
    </template>

    <p
      v-if="errorEnvio"
      class="datos__fallo"
      role="alert"
      data-test="error-envio"
    >
      {{ errorEnvio }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { CitaElegida } from 'src/components/reserva/tipos';
import type { ErroresDatos } from 'src/helpers/reserva-envio';
import { iniciales } from 'src/helpers/reserva-texto';

/**
 * Paso 3 del cajón (B4). La casilla de tratamiento de datos solo existe sin
 * sesión, y nunca premarcada (Ley 1581): quien tiene cuenta la aceptó al
 * crearla (`CreateUserDto` la exige al registrarse, y `GoogleLoginDto` al crear la cuenta con Google).
 *
 * Ningún texto promete un correo: el backend no escribe a la clienta por
 * correo (solo a la dueña); a ella, por WhatsApp si deja teléfono.
 */
defineOptions({ name: 'PasoDatos' });

const props = defineProps<{
  conSesion: boolean;
  cuenta: { nombre: string; correo: string };
  cita: CitaElegida;
  nombre: string;
  telefono: string;
  consentimiento: boolean;
  errores: ErroresDatos;
  errorEnvio: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:nombre', valor: string): void;
  (e: 'update:telefono', valor: string): void;
  (e: 'update:consentimiento', valor: boolean): void;
  (e: 'cambiar'): void;
  (e: 'entrar'): void;
}>();

const RUTA_POLITICA = '/politica-tratamiento-datos';

/** Una cuenta de Google puede no traer nombre: la parte local del correo. */
const nombreVisible = computed(
  () => props.cuenta.nombre.trim() || props.cuenta.correo.split('@')[0] || ''
);

/** La ayuda siempre; el error, solo si lo hay (nada de ids colgantes). */
const describeTelefono = computed(() =>
  props.errores.telefono
    ? 'reserva-telefono-ayuda reserva-telefono-error'
    : 'reserva-telefono-ayuda'
);

const valorDe = (evento: Event) => (evento.target as HTMLInputElement).value;
const marcadoDe = (evento: Event) =>
  (evento.target as HTMLInputElement).checked;
</script>

<style scoped lang="scss">
/** Tableros ReservaCajonPasos (móvil 3) y ReservaCajonEstados (escritorio 3). */
.datos__cita {
  margin-bottom: 26px;
  padding: 16px 18px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
}

.datos__cita-cabeza {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.datos__cita-rotulo {
  margin: 0;
}

.datos__cambiar {
  min-height: var(--m-tactil-min);
  font-size: 12.5px;
}

.datos__cita-cuando {
  margin: 0 0 6px;
  font-family: var(--m-font-display);
  font-size: 20px;
}

.datos__cita-detalle {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.datos__cuenta {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
}

.datos__iniciales {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-display);
  font-size: 17px;
  letter-spacing: 0.04em;
}

.datos__cuenta-textos {
  flex: 1 1 auto;
  min-width: 0;
}

.datos__cuenta-nombre {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}

.datos__cuenta-correo {
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--m-piedra);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.datos__cuenta-hecho {
  color: var(--m-oro-profundo);
}

.datos__nota,
.datos__ayuda,
.datos__entrar {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--m-piedra);
}

.datos__rotulo {
  display: block;
  margin: 18px 0 6px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--m-piedra);
}

.datos__opcional {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
}

.datos__campo {
  box-sizing: border-box;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 15px;
}

.datos__campo::placeholder {
  color: var(--m-piedra);
  opacity: 0.75;
}

.datos__campo:focus {
  border-color: var(--m-tinta);
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.datos__campo--error {
  border-color: var(--m-rosa-profundo);
}

.datos__error {
  margin: 6px 0 0;
  font-size: 12.5px;
  color: var(--m-rosa-profundo);
}

.datos__politica {
  margin: 26px 0 0;
  padding-top: 16px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.datos__consentimiento {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--m-piedra);
  cursor: pointer;
}

.datos__casilla {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin: 1px 0 0;
  accent-color: var(--m-tinta);
}

.datos__casilla:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.datos__entrar {
  margin-top: 16px;
}

.datos__fallo {
  margin: 20px 0 0;
  padding: 12px 14px;
  border: var(--m-filete-grosor) solid var(--m-rosa-profundo);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  font-size: 13px;
  line-height: 1.5;
  color: var(--m-rosa-profundo);
}
</style>
