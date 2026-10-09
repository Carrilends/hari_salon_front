<template>
  <div class="campo-acceso" :class="{ 'campo-acceso--error': !!error }">
    <div class="campo-acceso__cabeza">
      <label class="campo-acceso__rotulo" :for="id">{{ rotulo }}</label>
      <slot name="accesorio" />
    </div>

    <div class="campo-acceso__caja">
      <input
        :id="id"
        class="campo-acceso__entrada"
        :class="{ 'campo-acceso__entrada--con-ojo': esContrasena }"
        :data-test="`campo-${id}`"
        :name="id"
        :type="tipoVisible"
        :value="modelValue"
        :autocomplete="autocomplete"
        :placeholder="marcador"
        :autocapitalize="tipo === 'text' ? undefined : 'none'"
        :spellcheck="tipo === 'text' ? undefined : false"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="descritoPor"
        @input="alEscribir"
        @blur="emit('blur')"
      />
      <!-- type="button" a propósito: sin él, dentro de un <form> el ojo
           enviaría el formulario con la contraseña a medias. -->
      <button
        v-if="esContrasena"
        type="button"
        class="campo-acceso__ojo m-boton-plano"
        data-test="ver-contrasena"
        :aria-pressed="visible ? 'true' : 'false'"
        :aria-label="visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'"
        @click="visible = !visible"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="2.8" />
          <path v-if="visible" d="M4 4l16 16" />
        </svg>
      </button>
    </div>

    <p
      v-if="error"
      :id="idError"
      class="campo-acceso__error"
      :data-test="`campo-${id}-error`"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * Un campo de los formularios de acceso (decisión A3): marcado llano en vez de
 * `q-input`, para que el CSS no pelee con Quasar y las pruebas monten sin
 * instalarlo. El error lo decide `useFormularioAcceso`; este componente solo
 * lo pinta y lo liga con `aria-describedby`.
 */
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    id: string;
    rotulo: string;
    modelValue: string;
    tipo?: 'email' | 'password' | 'text';
    autocomplete?: string;
    marcador?: string;
    error?: string;
    describedby?: string;
  }>(),
  {
    tipo: 'text',
    autocomplete: undefined,
    marcador: undefined,
    error: '',
    describedby: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', valor: string): void;
  (e: 'blur'): void;
}>();

const visible = ref(false);
const esContrasena = computed(() => props.tipo === 'password');
const tipoVisible = computed(() =>
  esContrasena.value && visible.value ? 'text' : props.tipo
);
const idError = computed(() => `${props.id}-error`);

/** Sin error no se apunta a un id que no existe (descripción colgante). */
const descritoPor = computed(() => {
  const ids = [props.describedby, props.error ? idError.value : ''].filter(
    (id): id is string => !!id
  );
  return ids.length ? ids.join(' ') : undefined;
});

function alEscribir(evento: Event) {
  emit('update:modelValue', (evento.target as HTMLInputElement).value);
}
</script>

<style scoped lang="scss">
.campo-acceso {
  margin-top: 18px;
}

.campo-acceso:first-child {
  margin-top: 0;
}

.campo-acceso__cabeza {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
}

.campo-acceso__rotulo {
  font-family: var(--m-font-sans);
  font-size: 11px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-piedra);
}

.campo-acceso__caja {
  position: relative;
}

/* 16 px por debajo de 1024: con menos, iOS Safari hace zoom al enfocar. */
.campo-acceso__entrada {
  display: block;
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  margin: 0;
  padding: 0 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
  font-size: 16px;
  -webkit-appearance: none;
  appearance: none;
}

/* No es texto de contenido: el rótulo está siempre visible encima. */
.campo-acceso__entrada::placeholder {
  color: var(--m-piedra);
  opacity: 0.75;
}

.campo-acceso__entrada--con-ojo {
  padding-right: 52px;
}

.campo-acceso__entrada:focus {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
  border-color: var(--m-tinta);
}

/* Después de :focus, para que el error se siga viendo con el foco dentro. */
.campo-acceso--error .campo-acceso__entrada {
  border-color: var(--m-peligro);
}

.campo-acceso__ojo {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  padding: 0;
  border: 0;
  border-radius: var(--m-radio-tarjeta);
  background: transparent;
  color: var(--m-piedra);
  cursor: pointer;
}

.campo-acceso__ojo:focus-visible {
  outline: 2px solid var(--m-oro);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .campo-acceso__ojo:hover {
    color: var(--m-tinta);
  }
}

.campo-acceso__error {
  margin: 6px 0 0;
  font-family: var(--m-font-sans);
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--m-peligro);
}

@media (min-width: 1024px) {
  .campo-acceso__entrada {
    font-size: 15px;
  }
}
</style>
