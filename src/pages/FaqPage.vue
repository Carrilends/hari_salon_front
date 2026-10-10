<template>
  <q-page class="preguntas" :padding="false">
    <header class="preguntas__cabeza" data-test="cabeza-preguntas">
      <p class="preguntas__antetitulo">
        Preguntas frecuentes<template v-if="esDuena">
          · vista de la dueña</template
        >
      </p>
      <h1 class="preguntas__titulo">Lo que más nos preguntan</h1>
      <p class="preguntas__lede">
        Resolvemos las dudas más comunes para que reserves con confianza.
      </p>
      <div v-if="esDuena" class="preguntas__alta">
        <button
          type="button"
          class="preguntas__agregar m-boton--ancho"
          data-test="agregar-pregunta"
          @click="abrirAlta"
        >
          <StrokeIcon nombre="mas" :tamano="18" />
          Agregar pregunta
        </button>
        <p class="preguntas__pista">
          Arrastra las filas por el asa, o usa las flechas del teclado sobre
          ella, para cambiar el orden en que las ven las clientas.
        </p>
      </div>
    </header>

    <section
      class="preguntas__lista"
      aria-label="Preguntas"
      :aria-busy="isLoading ? 'true' : 'false'"
    >
      <p
        class="preguntas__estado"
        role="status"
        data-test="estado-preguntas"
      >
        {{ logro }}
      </p>
      <p
        v-if="falloOrden"
        class="preguntas__fallo"
        role="alert"
        data-test="fallo-orden"
      >
        {{ falloOrden }}
      </p>

      <div
        v-if="isLoading"
        class="preguntas__cargando"
        data-test="preguntas-cargando"
        aria-hidden="true"
      >
        <span v-for="n in 5" :key="n" class="preguntas__esqueleto" />
      </div>
      <div
        v-else-if="isError && !faqs.length"
        class="preguntas__aviso"
        data-test="preguntas-error"
      >
        <p class="preguntas__aviso-texto">
          No pudimos cargar las preguntas. Revisa tu conexión e inténtalo otra
          vez.
        </p>
        <button
          type="button"
          class="preguntas__reintentar"
          data-test="reintentar"
          @click="refetch()"
        >
          Reintentar
        </button>
      </div>
      <p
        v-else-if="!faqs.length"
        class="preguntas__aviso preguntas__aviso-texto"
        data-test="preguntas-vacio"
      >
        {{ textoVacio }}
      </p>
      <ListaPreguntasDuena
        v-else-if="esDuena"
        :preguntas="faqs"
        @editar="abrirEdicion"
        @borrar="pedirBorrado"
        @reordenar="alReordenar"
      />
      <AcordeonPreguntas v-else :preguntas="faqs" />
    </section>

    <aside class="preguntas__ayuda" aria-label="Ayuda">
      <AyudaPreguntas />
    </aside>

    <template v-if="esDuena">
      <PreguntaDialog
        v-model:abierto="formularioAbierto"
        :pregunta="enEdicion"
        :puesto="puestoEnEdicion"
        :total="faqs.length"
        :guardando="guardandoPregunta"
        :error="errorFormulario"
        @guardar="guardarPregunta"
      />
      <BorrarPreguntaDialog
        v-model:abierta="borradoAbierto"
        :pregunta="porBorrar"
        :borrando="borrandoPregunta"
        :error="errorBorrado"
        @confirmar="confirmarBorrado"
      />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FaqItem } from 'src/api/apiTypes';
import AcordeonPreguntas from 'src/components/preguntas/AcordeonPreguntas.vue';
import AyudaPreguntas from 'src/components/preguntas/AyudaPreguntas.vue';
import BorrarPreguntaDialog from 'src/components/preguntas/BorrarPreguntaDialog.vue';
import ListaPreguntasDuena from 'src/components/preguntas/ListaPreguntasDuena.vue';
import PreguntaDialog from 'src/components/preguntas/PreguntaDialog.vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { useFaqs } from 'src/composables/faqs/useFaqs';
import { faqPageSchema } from 'src/composables/seo/structuredData';
import { useSeo } from 'src/composables/seo/useSeo';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * Preguntas frecuentes (especificación §5; tableros `PreguntasIndiceTinta` y
 * `PreguntasDuenaA`). La clienta ve el acordeón; la dueña, la lista con asa,
 * editar y borrar. Esta página solo compone y orquesta: cada pieza vive en
 * `src/components/preguntas/` y el HTTP, en `useFaqs` → `faqs-api`.
 *
 * Errores y éxitos en línea: el del formulario y el del borrado dentro de su
 * diálogo; el del orden y los «hecho», en la cabecera de la lista.
 */
const FALLO_GUARDAR =
  'No se pudo guardar la pregunta. Revisa la conexión e inténtalo otra vez.';
const FALLO_BORRAR = 'No se pudo borrar la pregunta. Inténtalo otra vez.';
const FALLO_ORDEN =
  'No se pudo guardar el orden. La lista volvió a como estaba; inténtalo otra vez.';

const authStore = useAuthStore();
const {
  faqs,
  isLoading,
  isError,
  refetch,
  createFaqMutation,
  updateFaqMutation,
  removeFaqMutation,
  reordenar,
} = useFaqs();

useSeo({
  title: 'Preguntas frecuentes | Peluquería Marlene',
  description:
    'Resolvemos las dudas más comunes sobre reservas, servicios, pagos y atención en Peluquería Marlene.',
  path: '/preguntas-frecuentes',
  jsonLd: computed(() =>
    faqPageSchema(
      faqs.value.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }))
    )
  ),
});

const esDuena = computed(() => authStore.isAdmin);

const textoVacio = computed(() =>
  esDuena.value
    ? 'Todavía no hay preguntas. Agrega la primera con «Agregar pregunta».'
    : 'Aún no hay preguntas frecuentes. Vuelve pronto.'
);

/** Último «hecho» (región `status`) y fallo del orden (región `alert`). */
const logro = ref('');
const falloOrden = ref('');

// --- Crear y editar ----------------------------------------------------------

const formularioAbierto = ref(false);
const enEdicion = ref<FaqItem | null>(null);
const guardandoPregunta = ref(false);
const errorFormulario = ref<string | null>(null);

/** Puesto 1-based de la pregunta en edición, para la pista del diálogo. */
const puestoEnEdicion = computed(() => {
  const actual = enEdicion.value;
  if (!actual) return null;
  const indice = faqs.value.findIndex((faq) => faq.id === actual.id);
  return indice === -1 ? null : indice + 1;
});

function abrirAlta() {
  enEdicion.value = null;
  errorFormulario.value = null;
  formularioAbierto.value = true;
}

function abrirEdicion(faq: FaqItem) {
  enEdicion.value = faq;
  errorFormulario.value = null;
  formularioAbierto.value = true;
}

/**
 * Sin `sortOrder`: una pregunta nueva entra al final (lo decide el backend) y
 * el orden de una existente solo se cambia con el asa.
 */
async function guardarPregunta(cuerpo: { question: string; answer: string }) {
  if (guardandoPregunta.value) return;
  guardandoPregunta.value = true;
  errorFormulario.value = null;
  try {
    if (enEdicion.value) {
      await updateFaqMutation.mutateAsync({
        id: enEdicion.value.id,
        body: cuerpo,
      });
      logro.value = 'Pregunta guardada.';
    } else {
      await createFaqMutation.mutateAsync(cuerpo);
      logro.value = 'Pregunta añadida al final de la lista.';
    }
    formularioAbierto.value = false;
  } catch {
    errorFormulario.value = FALLO_GUARDAR;
  } finally {
    guardandoPregunta.value = false;
  }
}

// --- Borrar ------------------------------------------------------------------

const borradoAbierto = ref(false);
const porBorrar = ref<FaqItem | null>(null);
const borrandoPregunta = ref(false);
const errorBorrado = ref<string | null>(null);

function pedirBorrado(faq: FaqItem) {
  porBorrar.value = faq;
  errorBorrado.value = null;
  borradoAbierto.value = true;
}

async function confirmarBorrado() {
  const faq = porBorrar.value;
  if (!faq || borrandoPregunta.value) return;
  borrandoPregunta.value = true;
  errorBorrado.value = null;
  try {
    await removeFaqMutation.mutateAsync(faq.id);
    borradoAbierto.value = false;
    logro.value = `Pregunta borrada: «${faq.question}».`;
  } catch {
    errorBorrado.value = FALLO_BORRAR;
  } finally {
    borrandoPregunta.value = false;
  }
}

// --- Reordenar ---------------------------------------------------------------

/** El pintado ya es optimista en `useFaqs`; aquí solo se dice si no se guardó. */
async function alReordenar(ids: string[]) {
  falloOrden.value = '';
  const guardado = await reordenar(ids);
  if (!guardado) falloOrden.value = FALLO_ORDEN;
}

defineOptions({ name: 'FaqPage' });
</script>

<style scoped lang="scss">
/**
 * Tres áreas. En móvil, una columna: banda tinta, lista sobre hueso y la caja
 * de ayuda. Desde 900 px, la cabeza y la ayuda forman la columna tinta de la
 * izquierda (400 px) y la lista ocupa el resto; la fila de la ayuda se estira
 * (`1fr`) para que la tinta llegue hasta abajo. Todo CSS: la ruta se
 * prerenderiza y no hay `window` que consultar.
 */
.preguntas {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'cabeza'
    'lista'
    'ayuda';
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.preguntas__cabeza {
  grid-area: cabeza;
  padding: 28px var(--m-banda-margen-movil) 26px;
  background: var(--m-tinta);
  color: var(--m-hueso);
}

.preguntas__antetitulo {
  margin: 0 0 10px;
  color: var(--m-oro);
  font-size: 10px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
}

.preguntas__titulo {
  margin: 0 0 8px;
  font-family: var(--m-font-display);
  font-size: 29px;
  font-weight: 400;
  line-height: 1.12;
}

.preguntas__lede {
  margin: 0;
  color: var(--m-piedra-clara);
  font-size: 14px;
  line-height: 1.6;
}

.preguntas__alta {
  margin-top: 18px;
}

/* Oro macizo con rótulo tinta (5,8:1). */
.preguntas__agregar {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: var(--m-radio-pildora);
  background: var(--m-oro);
  color: var(--m-tinta);
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 11.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.preguntas__agregar:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 2px;
}

.preguntas__pista {
  margin: 12px 0 0;
  color: var(--m-piedra-clara);
  font-size: 12.5px;
  line-height: 1.55;
}

.preguntas__lista {
  grid-area: lista;
  min-width: 0;
  padding: 6px var(--m-banda-margen-movil) 0;
}

.preguntas__ayuda {
  grid-area: ayuda;
  padding: 22px var(--m-banda-margen-movil) var(--m-flotante-despeje);
}

.preguntas__estado {
  margin: 0;
  color: var(--m-piedra);
  font-size: 12.5px;
}

.preguntas__fallo {
  margin: 0 0 12px;
  padding: 10px 14px;
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-aviso-fondo);
  color: var(--m-tinta);
  font-size: 13.5px;
}

.preguntas__cargando {
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.preguntas__esqueleto {
  height: 58px;
  display: flex;
  align-items: center;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
}

.preguntas__esqueleto::before {
  content: '';
  width: 60%;
  height: 12px;
  border-radius: var(--m-radio-tarjeta);
  background: var(--m-filete);
}

.preguntas__aviso {
  margin: 24px 0;
}

.preguntas__aviso-texto {
  color: var(--m-piedra);
  font-size: 15px;
  line-height: 1.6;
}

.preguntas__reintentar {
  min-height: var(--m-tactil-min);
  margin-top: 12px;
  padding: 0 20px;
  border: var(--m-filete-grosor) solid var(--m-tinta);
  border-radius: var(--m-radio-pildora);
  background: none;
  color: var(--m-tinta);
  cursor: pointer;
  font-family: var(--m-font-sans);
  font-size: 12px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
}

.preguntas__reintentar:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (min-width: 900px) {
  .preguntas {
    grid-template-columns: 400px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'cabeza lista'
      'ayuda lista';
  }

  .preguntas__cabeza {
    padding: 64px 40px 0 var(--m-banda-margen);
  }

  .preguntas__antetitulo {
    margin-bottom: 14px;
    font-size: 11px;
  }

  .preguntas__titulo {
    margin-bottom: 16px;
    font-size: 42px;
    line-height: 1.1;
  }

  .preguntas__lede {
    margin-bottom: 36px;
    font-size: 15px;
    line-height: 1.7;
  }

  .preguntas__alta {
    margin: 0 0 26px;
    padding-bottom: 26px;
    border-bottom: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  }

  .preguntas__agregar {
    min-height: 50px;
    font-size: 12px;
  }

  .preguntas__lista {
    padding: 64px var(--m-banda-margen) var(--m-flotante-despeje) 64px;
  }

  .preguntas__ayuda {
    padding: 0 40px 64px var(--m-banda-margen);
    background: var(--m-tinta);
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .preguntas__agregar:hover {
    background: var(--m-oro-claro);
  }

  .preguntas__reintentar:hover {
    border-color: var(--m-oro);
  }
}
</style>
