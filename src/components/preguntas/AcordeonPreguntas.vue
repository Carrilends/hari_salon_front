<template>
  <div class="acordeon" data-test="acordeon-preguntas">
    <div
      v-for="faq in preguntas"
      :key="faq.id"
      class="acordeon__item"
      data-test="pregunta"
    >
      <h2 class="acordeon__titulo">
        <button
          :id="`pregunta-${faq.id}`"
          type="button"
          class="acordeon__pregunta m-boton-plano m-boton--ancho"
          data-test="pregunta-boton"
          :aria-expanded="estaAbierta(faq.id) ? 'true' : 'false'"
          :aria-controls="`respuesta-${faq.id}`"
          @click="alternar(faq.id)"
        >
          <span class="acordeon__texto">{{ faq.question }}</span>
          <StrokeIcon
            class="acordeon__signo"
            :nombre="estaAbierta(faq.id) ? 'menos' : 'mas'"
            :tamano="20"
          />
        </button>
      </h2>
      <div
        v-show="estaAbierta(faq.id)"
        :id="`respuesta-${faq.id}`"
        class="acordeon__respuesta"
        role="region"
        :aria-labelledby="`pregunta-${faq.id}`"
        data-test="respuesta"
      >
        {{ faq.answer }}
      </div>
    </div>
    <p class="acordeon__total" data-test="total-preguntas">{{ totalTexto }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { FaqItem } from 'src/api/apiTypes';

/**
 * El acordeón público de preguntas frecuentes (F1, tablero
 * `PreguntasIndiceTinta`): preguntas en Marcellus sobre hueso, un «+» en oro
 * profundo que pasa a «−» al abrir. Sin la línea «Orden: N» de antes.
 *
 * Las respuestas se esconden con `v-show` y no con `v-if`: una vez cargadas
 * las preguntas, el texto de todas está en el DOM y abrir una no vuelve a
 * montar nada. (No hay precarga en el servidor: el prerenderizado no las
 * trae, así que esto no pone las respuestas en el HTML estático.)
 */
const props = defineProps<{ preguntas: FaqItem[] }>();

const abiertas = ref<string[]>([]);

const estaAbierta = (id: string) => abiertas.value.includes(id);

function alternar(id: string) {
  abiertas.value = estaAbierta(id)
    ? abiertas.value.filter((otra) => otra !== id)
    : abiertas.value.concat(id);
}

const totalTexto = computed(() => {
  const total = props.preguntas.length;
  return `${total} pregunta${total === 1 ? '' : 's'}`;
});

defineOptions({ name: 'AcordeonPreguntas' });
</script>

<style scoped lang="scss">
.acordeon {
  border-top: var(--m-filete-grosor) solid var(--m-filete);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.acordeon__item {
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.acordeon__titulo {
  margin: 0;
  font: inherit;
}

.acordeon__pregunta {
  width: 100%;
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--m-radio-tarjeta);
  background: none;
  color: var(--m-tinta);
  text-align: left;
  cursor: pointer;
  font-family: var(--m-font-display);
  font-size: 20px;
  line-height: 1.3;
}

.acordeon__pregunta:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.acordeon__texto {
  flex-grow: 1;
  padding: 12px 0;
}

.acordeon__signo {
  flex-shrink: 0;
  color: var(--m-oro-profundo);
}

/* `pre-line` respeta los saltos de línea que la dueña escribió en la respuesta
   sin arrastrar la sangría del marcado. */
.acordeon__respuesta {
  margin: 0;
  padding: 0 64px 26px 16px;
  color: var(--m-piedra);
  font-size: 15.5px;
  line-height: 1.7;
  white-space: pre-line;
}

.acordeon__total {
  margin: 0;
  padding: 18px 16px 0;
  color: var(--m-piedra);
  font-size: 12.5px;
}

@media (max-width: 899px) {
  .acordeon__pregunta {
    min-height: 58px;
    gap: 12px;
    padding: 0;
    font-size: 17px;
  }

  .acordeon__respuesta {
    padding: 0 28px 18px 0;
    font-size: 14.5px;
    line-height: 1.65;
  }

  .acordeon__total {
    padding: 14px 0 0;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .acordeon__pregunta:hover {
    color: var(--m-oro-profundo);
  }
}
</style>
