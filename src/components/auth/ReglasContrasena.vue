<template>
  <ul
    :id="id"
    class="reglas"
    data-test="reglas-contrasena"
    aria-live="polite"
  >
    <li
      v-for="regla in reglas"
      :key="regla.clave"
      class="reglas__item"
      :class="{ 'reglas__item--cumple': regla.cumple }"
      :data-test="`regla-${regla.clave}`"
      :data-cumple="regla.cumple ? 'si' : 'no'"
    >
      <svg
        v-if="regla.cumple"
        class="reglas__marca"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span v-else class="reglas__hueco" aria-hidden="true">
        <span class="reglas__punto" />
      </span>
      <span>{{ regla.texto }}</span>
      <span class="reglas__estado">{{
        regla.cumple ? '(cumplida)' : '(pendiente)'
      }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
/**
 * Las reglas de la contraseña como lista viva (decisión A6): cada una se marca
 * mientras la clienta escribe. Es la misma política que valida el backend
 * (`CreateUserDto` / `ResetPasswordDto`: 8 o más, mayúscula, minúscula y
 * número, sin símbolo obligatorio). Se usa en crear cuenta y en restablecer.
 */
import { computed } from 'vue';
import {
  hasLowercase,
  hasNumber,
  hasUppercase,
  minLength,
} from 'src/helpers/validators';

const props = withDefaults(defineProps<{ valor: string; id?: string }>(), {
  id: 'reglas-contrasena',
});

type Regla = {
  clave: 'largo' | 'mayuscula' | 'minuscula' | 'numero';
  texto: string;
  cumple: boolean;
};

const reglas = computed<Regla[]>(() => [
  {
    clave: 'largo',
    texto: '8 caracteres o más',
    cumple: minLength(8)(props.valor) === true,
  },
  {
    clave: 'mayuscula',
    texto: 'Una mayúscula',
    cumple: hasUppercase()(props.valor) === true,
  },
  {
    clave: 'minuscula',
    texto: 'Una minúscula',
    cumple: hasLowercase()(props.valor) === true,
  },
  {
    clave: 'numero',
    texto: 'Un número',
    cumple: hasNumber()(props.valor) === true,
  },
]);
</script>

<style scoped lang="scss">
.reglas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 10px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--m-font-sans);
  font-size: 12.5px;
}

.reglas__item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--m-piedra);
}

.reglas__item--cumple {
  color: var(--m-tinta);
}

.reglas__marca {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
}

.reglas__hueco {
  display: flex;
  flex: 0 0 auto;
  justify-content: center;
  width: 14px;
}

/* No es color de texto: solo un punto que marca «pendiente». */
.reglas__punto {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--m-piedra-clara);
}

/* Solo para lectores de pantalla. */
.reglas__estado {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
