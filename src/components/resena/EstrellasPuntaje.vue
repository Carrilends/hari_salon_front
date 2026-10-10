<template>
  <fieldset
    ref="raiz"
    class="estrellas"
    data-test="estrellas-puntaje"
    :aria-describedby="error ? idError : undefined"
  >
    <legend class="sr">Tu puntaje, de 1 a 5</legend>
    <div class="estrellas__fila">
      <label
        v-for="n in 5"
        :key="n"
        class="estrellas__opcion"
        data-test="estrella"
      >
        <input
          type="radio"
          class="sr estrellas__radio"
          :name="nombre"
          :value="n"
          :checked="modelValue === n"
          :aria-label="`${n} de 5`"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? idError : undefined"
          @change="emit('update:modelValue', n)"
        />
        <svg
          class="estrellas__icono"
          :class="{ 'estrellas__icono--llena': llena(n) }"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"
          />
        </svg>
      </label>
      <span class="estrellas__texto" data-test="puntaje-texto">
        {{ textoPuntaje(modelValue) }}
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { textoPuntaje } from 'src/helpers/resena';

/**
 * El puntaje de la reseña (R1, tablero ResenaA): cinco radios del mismo grupo
 * —las flechas los recorren, como en cualquier grupo de radios— pintados como
 * estrellas de oro profundo, llenas hasta el elegido. Empieza SIN valor: el
 * `select` de antes venía en 5 y la mitad de las reseñas eran 5 por inercia.
 */
defineOptions({ name: 'EstrellasPuntaje' });

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    nombre: string;
    error?: string;
    idError?: string;
  }>(),
  { error: '', idError: undefined }
);

const emit = defineEmits<{ (e: 'update:modelValue', puntaje: number): void }>();

const raiz = ref<HTMLFieldSetElement | null>(null);

function llena(n: number): boolean {
  return props.modelValue !== null && n <= props.modelValue;
}

/** Para el formulario: el foco va a la marcada, o a la primera si no hay. */
function enfocar(): void {
  const marcada = raiz.value?.querySelector<HTMLInputElement>('input:checked');
  const primera = raiz.value?.querySelector<HTMLInputElement>('input');
  (marcada ?? primera)?.focus();
}

defineExpose({ enfocar });
</script>

<style scoped lang="scss">
/**
 * Tablero ResenaA: estrellas de 40 px en casillas de 52 (38 y 50 en móvil),
 * oro profundo (6,2:1 sobre nieve), llenas hasta el puntaje y de trazo las
 * demás. Los radios salen de la vista con `.sr` (`app.scss`) y el foco se pinta
 * en la estrella de al lado: `:has()` no llega a Safari 13.1.
 */
.estrellas {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.estrellas__fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.estrellas__opcion {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: var(--m-oro-profundo);
  cursor: pointer;
}

.estrellas__icono {
  width: 40px;
  height: 40px;
  border-radius: var(--m-radio-panel);
  fill: none;
}

.estrellas__icono--llena {
  fill: currentColor;
}

.estrellas__radio:focus-visible + .estrellas__icono {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.estrellas__texto {
  margin-left: 10px;
  font-family: var(--m-font-sans);
  font-size: 14px;
  color: var(--m-tinta);
}

@media (max-width: 699px) {
  .estrellas__fila {
    gap: 2px;
  }

  .estrellas__opcion {
    width: 50px;
    height: 50px;
  }

  .estrellas__icono {
    width: 38px;
    height: 38px;
  }

  .estrellas__texto {
    flex-basis: 100%;
    margin: 2px 0 0;
    font-size: 13px;
  }
}
</style>
