<template>
  <div
    class="lista-duena"
    :class="{ 'lista-duena--arrastrando': arrastre !== null }"
    data-test="lista-duena"
  >
    <div class="lista-duena__cabeza">
      <span class="lista-duena__total" data-test="total-preguntas"
        >{{ totalTexto }} · en el orden en que se ven</span
      >
      <span
        class="lista-duena__anuncio"
        role="status"
        aria-live="polite"
        data-test="anuncio-orden"
        >{{ anuncio }}</span
      >
    </div>

    <ol ref="listaRef" class="lista-duena__filas">
      <li
        v-for="(faq, indice) in preguntas"
        :key="faq.id"
        class="fila"
        :class="clasesDeFila(indice)"
        :style="estiloDeFila(indice)"
        :data-puesto="indice"
        data-test="fila-pregunta"
      >
        <div class="fila__barra">
          <button
            type="button"
            class="fila__asa m-boton-plano"
            :class="{ 'fila__asa--activa': arrastre?.desde === indice }"
            :data-asa="faq.id"
            data-test="asa"
            :aria-label="`Mover «${faq.question}». Arrastra, o usa las flechas del teclado`"
            @pointerdown="alPresionar($event, indice)"
            @pointermove="alMover"
            @pointerup="alSoltar"
            @pointercancel="alCancelarPuntero"
            @lostpointercapture="alCancelarPuntero"
            @keydown="alPulsarTecla($event, indice)"
          >
            <StrokeIcon nombre="asa" :tamano="20" />
          </button>
          <span class="fila__puesto" aria-hidden="true">{{ indice + 1 }}</span>
          <h2 class="fila__titulo">
            <button
              :id="`pregunta-${faq.id}`"
              type="button"
              class="fila__pregunta m-boton-plano"
              data-test="pregunta-boton"
              :aria-expanded="estaAbierta(faq.id) ? 'true' : 'false'"
              :aria-controls="`respuesta-${faq.id}`"
              @click="alternar(faq.id)"
            >
              {{ faq.question }}
            </button>
          </h2>
          <button
            type="button"
            class="fila__accion m-boton-plano"
            data-test="editar-pregunta"
            :aria-label="`Editar «${faq.question}»`"
            @click="emit('editar', faq)"
          >
            <StrokeIcon nombre="lapiz" :tamano="18" />
          </button>
          <button
            type="button"
            class="fila__accion fila__accion--borrar m-boton-plano"
            data-test="borrar-pregunta"
            :aria-label="`Borrar «${faq.question}»`"
            @click="emit('borrar', faq)"
          >
            <StrokeIcon nombre="papelera" :tamano="18" />
          </button>
        </div>
        <div
          v-show="estaAbierta(faq.id)"
          :id="`respuesta-${faq.id}`"
          class="fila__respuesta"
          role="region"
          :aria-labelledby="`pregunta-${faq.id}`"
          data-test="respuesta"
        >
          {{ faq.answer }}
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import type { FaqItem } from 'src/api/apiTypes';
import { destinoDeArrastre, moverEnLista } from 'src/helpers/orden-preguntas';

/**
 * La lista de preguntas de la dueña (F2, tablero `PreguntasDuenaA`): cada fila
 * con asa, número de puesto, la pregunta (abre su respuesta), editar y borrar.
 *
 * El asa se arrastra con eventos de puntero nativos —ratón y dedo, sin
 * librerías— y también responde a ↑/↓, porque arrastrar no es accesible por
 * sí solo. Cada cambio se anuncia en una región viva.
 *
 * Esta pieza no guarda nada: emite `reordenar` con TODOS los ids en el orden
 * nuevo y la página se encarga (pintado optimista en `useFaqs`).
 */
const props = defineProps<{ preguntas: FaqItem[] }>();

const emit = defineEmits<{
  (e: 'editar', faq: FaqItem): void;
  (e: 'borrar', faq: FaqItem): void;
  (e: 'reordenar', ids: string[]): void;
}>();

type Arrastre = {
  /** La pregunta que se arrastra: su id y su texto, por si la lista cambia. */
  id: string;
  titulo: string;
  /** El orden de los ids al empezar: si cambia a mitad del gesto, se cancela. */
  orden: string;
  pointerId: number | null;
  desde: number;
  destino: number;
  yInicial: number;
  desplazamiento: number;
  /** Centro vertical de cada fila, medido al empezar a arrastrar. */
  mitades: number[];
};

const listaRef = ref<HTMLOListElement | null>(null);
const arrastre = ref<Arrastre | null>(null);
const anuncio = ref('');
const abiertas = ref<string[]>([]);
/** El asa que debe recuperar el foco cuando llegue el orden nuevo. */
let asaPorEnfocar: string | null = null;
/** El asa que tenía el foco justo antes de que llegara una lista nueva. */
let asaFocada: string | null = null;
/** Este componente acaba de emitir un orden y espera verlo de vuelta. */
let movimientoLocal = false;
const ordenDe = (lista: FaqItem[]) => lista.map((faq) => faq.id).join();
let ordenVisto = ordenDe(props.preguntas);

const total = computed(() => props.preguntas.length);
const totalTexto = computed(
  () => `${total.value} pregunta${total.value === 1 ? '' : 's'}`
);

const estaAbierta = (id: string) => abiertas.value.includes(id);

function alternar(id: string) {
  abiertas.value = estaAbierta(id)
    ? abiertas.value.filter((otra) => otra !== id)
    : abiertas.value.concat(id);
}

function clasesDeFila(indice: number) {
  const actual = arrastre.value;
  if (!actual) return {};
  return {
    'fila--arrastrada': actual.desde === indice,
    'fila--destino-arriba':
      actual.destino === indice && actual.destino < actual.desde,
    'fila--destino-abajo':
      actual.destino === indice && actual.destino > actual.desde,
  };
}

function estiloDeFila(indice: number) {
  const actual = arrastre.value;
  return actual && actual.desde === indice
    ? { transform: `translateY(${actual.desplazamiento}px)` }
    : undefined;
}

function mover(desde: number, hasta: number) {
  const faq = props.preguntas[desde];
  const nueva = moverEnLista(props.preguntas, desde, hasta);
  anuncio.value = `«${faq.question}» está ahora en el puesto ${hasta + 1} de ${
    total.value
  }.`;
  movimientoLocal = true;
  emit(
    'reordenar',
    nueva.map((item) => item.id)
  );
}

function alPulsarTecla(evento: KeyboardEvent, indice: number) {
  if (evento.key === 'Escape' && arrastre.value) {
    evento.preventDefault();
    cancelar();
    return;
  }
  const paso =
    evento.key === 'ArrowUp' ? -1 : evento.key === 'ArrowDown' ? 1 : 0;
  if (paso === 0 || arrastre.value) return;
  // Las flechas desplazarían la página: aquí mueven la pregunta.
  evento.preventDefault();

  const faq = props.preguntas[indice];
  const destino = indice + paso;
  if (destino < 0) {
    anuncio.value = `«${faq.question}» ya es la primera.`;
    return;
  }
  if (destino >= total.value) {
    anuncio.value = `«${faq.question}» ya es la última.`;
    return;
  }
  asaPorEnfocar = faq.id;
  mover(indice, destino);
}

/**
 * Antes de que Vue pinte la lista nueva, se apunta qué asa tiene el foco: al
 * mover el nodo de la fila el navegador lo suelta sobre `body`.
 */
watch(
  () => props.preguntas,
  () => {
    const enfocado =
      typeof document === 'undefined' ? null : document.activeElement;
    asaFocada =
      enfocado && listaRef.value?.contains(enfocado)
        ? enfocado.getAttribute('data-asa')
        : null;
  },
  { flush: 'pre' }
);

/**
 * Al llegar el orden nuevo Vue mueve el nodo de la fila, y mover el nodo
 * enfocado le quita el foco: la siguiente flecha ya no haría nada. Se le
 * devuelve a su asa. `flush: 'post'` para buscarla con el DOM ya movido.
 */
watch(
  () => props.preguntas,
  async (nuevas) => {
    const orden = ordenDe(nuevas);
    const cambioElOrden = orden !== ordenVisto;
    ordenVisto = orden;
    const fueLocal = movimientoLocal;
    if (cambioElOrden) movimientoLocal = false;

    // Si el orden cambia a mitad de un arrastre (reversión, refresco, borrado),
    // los índices guardados ya no apuntan a la misma pregunta: se cancela. Una
    // lista nueva con el mismo orden (la respuesta de un guardado anterior)
    // no toca el gesto.
    let anunciado = false;
    if (arrastre.value && arrastre.value.orden !== orden) {
      const { titulo } = arrastre.value;
      arrastre.value = null;
      anuncio.value = `Orden sin cambios: la lista cambió mientras movías «${titulo}».`;
      anunciado = true;
    }
    // Un orden que no salió de aquí (reversión tras un fallo) deja el aviso
    // viejo —«está ahora en el puesto 2»— diciendo algo falso.
    if (cambioElOrden && !fueLocal && !anunciado) {
      anuncio.value = 'El orden de la lista cambió.';
    }

    const id = asaPorEnfocar ?? (cambioElOrden ? asaFocada : null);
    asaPorEnfocar = null;
    asaFocada = null;
    if (!id) return;
    await nextTick();
    listaRef.value?.querySelector<HTMLElement>(`[data-asa="${id}"]`)?.focus();
  },
  { flush: 'post' }
);

function alPresionar(evento: PointerEvent, indice: number) {
  // Solo el botón principal (el dedo y el lápiz también son 0).
  if (typeof evento.button === 'number' && evento.button !== 0) return;
  // Un segundo puntero (otro dedo) no le quita el arrastre al primero.
  if (arrastre.value || evento.isPrimary === false) return;
  const filas = Array.from(
    listaRef.value?.querySelectorAll<HTMLElement>(
      '[data-test="fila-pregunta"]'
    ) ?? []
  );
  const mitades = filas.map((fila) => {
    const caja = fila.getBoundingClientRect();
    return caja.top + caja.height / 2;
  });
  // Con el puntero capturado, `pointermove` y `pointerup` siguen llegando al
  // asa aunque el dedo se salga de ella.
  const asa = evento.currentTarget as HTMLElement | null;
  if (
    asa &&
    typeof asa.setPointerCapture === 'function' &&
    typeof evento.pointerId === 'number'
  ) {
    asa.setPointerCapture(evento.pointerId);
  }
  arrastre.value = {
    id: props.preguntas[indice].id,
    titulo: props.preguntas[indice].question,
    orden: ordenDe(props.preguntas),
    pointerId: typeof evento.pointerId === 'number' ? evento.pointerId : null,
    desde: indice,
    destino: indice,
    yInicial: evento.clientY,
    desplazamiento: 0,
    mitades,
  };
  anuncio.value = `Arrastrando «${props.preguntas[indice].question}», puesto ${
    indice + 1
  } de ${total.value}.`;
}

/** ¿El evento es del puntero que empezó el arrastre? */
const esDelArrastre = (evento: PointerEvent, actual: Arrastre) =>
  actual.pointerId === null ||
  typeof evento.pointerId !== 'number' ||
  evento.pointerId === actual.pointerId;

function alMover(evento: PointerEvent) {
  const actual = arrastre.value;
  if (!actual || !esDelArrastre(evento, actual)) return;
  actual.desplazamiento = evento.clientY - actual.yInicial;
  actual.destino = destinoDeArrastre(
    actual.mitades,
    evento.clientY,
    actual.desde
  );
  anuncio.value = `Suelta para dejarla en el puesto ${actual.destino + 1}`;
}

function alSoltar(evento: PointerEvent) {
  const actual = arrastre.value;
  if (!actual || !esDelArrastre(evento, actual)) return;
  arrastre.value = null;
  if (actual.destino === actual.desde) {
    anuncio.value = `«${actual.titulo}» se queda en el puesto ${
      actual.desde + 1
    }.`;
    return;
  }
  mover(actual.desde, actual.destino);
}

function alCancelarPuntero(evento: PointerEvent) {
  const actual = arrastre.value;
  if (actual && esDelArrastre(evento, actual)) cancelar();
}

function cancelar() {
  const actual = arrastre.value;
  if (!actual) return;
  arrastre.value = null;
  anuncio.value = `Orden sin cambios: «${
    actual.titulo
  }» se queda en el puesto ${actual.desde + 1}.`;
}

defineOptions({ name: 'ListaPreguntasDuena' });
</script>

<style scoped lang="scss">
.lista-duena {
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

/* Mientras se arrastra, que el gesto no seleccione el texto de las filas. */
.lista-duena--arrastrando {
  -webkit-user-select: none;
  user-select: none;
}

.lista-duena__cabeza {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
  margin-bottom: 12px;
}

.lista-duena__total {
  color: var(--m-oro-profundo);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.lista-duena__anuncio {
  color: var(--m-piedra);
  font-size: 12.5px;
  /* Reserva de sitio: al aparecer «Arrastrando…» (en móvil ocupa su propia
     línea) la lista no se corre y las mitades medidas siguen valiendo. */
  display: block;
  min-height: 2.6em;
  line-height: 1.3;
}

.lista-duena__filas {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.fila {
  position: relative;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  background: var(--m-hueso);
}

/* La fila levantada: nieve, filete alrededor (sin cambiar su caja) y sombra. */
.fila--arrastrada {
  z-index: 1;
  outline: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-nieve);
  box-shadow: var(--m-sombra-flotante);
}

/* La línea de 2 px que marca dónde caerá (tablero). */
.fila--destino-arriba::before,
.fila--destino-abajo::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--m-tinta);
}

.fila--destino-arriba::before {
  top: -1px;
}

.fila--destino-abajo::after {
  bottom: -1px;
}

.fila__barra {
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}

.fila__asa,
.fila__accion {
  width: var(--m-tactil-min);
  height: var(--m-tactil-min);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: none;
  cursor: pointer;
}

/* `touch-action: none`: con el dedo en el asa, el navegador no desplaza la
   página; el gesto es nuestro. */
.fila__asa {
  color: var(--m-piedra);
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.fila__asa--activa {
  background: var(--m-aviso-fondo);
  cursor: grabbing;
}

.fila__accion {
  color: var(--m-oro-profundo);
}

.fila__accion--borrar {
  color: var(--m-peligro);
}

.fila__puesto {
  width: 22px;
  flex-shrink: 0;
  margin-right: 8px;
  color: var(--m-piedra);
  font-size: 12px;
  text-align: right;
}

.fila__titulo {
  flex-grow: 1;
  min-width: 0;
  margin: 0;
  font: inherit;
}

.fila__pregunta {
  width: 100%;
  min-height: 52px;
  padding: 6px 8px;
  border: 0;
  background: none;
  color: var(--m-tinta);
  text-align: left;
  cursor: pointer;
  font-family: var(--m-font-display);
  font-size: 19px;
  line-height: 1.3;
}

.fila__asa:focus-visible,
.fila__pregunta:focus-visible,
.fila__accion:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

.fila__respuesta {
  margin: 0;
  padding: 0 140px 22px 60px;
  color: var(--m-piedra);
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
}

@media (max-width: 899px) {
  .fila__barra {
    min-height: 60px;
    gap: 0;
    padding: 0;
  }

  .fila__puesto {
    display: none;
  }

  .fila__pregunta {
    padding: 6px 4px;
    font-size: 16px;
  }

  .fila__respuesta {
    padding: 0 12px 16px 44px;
    font-size: 14px;
    line-height: 1.6;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .fila__asa:hover {
    background: var(--m-aviso-fondo);
    color: var(--m-tinta);
  }

  .fila__pregunta:hover {
    color: var(--m-oro-profundo);
  }

  .fila__accion:hover {
    color: var(--m-tinta);
  }

  .fila__accion--borrar:hover {
    background: var(--m-aviso-fondo);
  }
}
</style>
