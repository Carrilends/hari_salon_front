<template>
  <q-page class="politica">
    <div class="politica__marco">
      <header class="politica__cabecera">
        <p class="politica__antetitulo">Política de datos</p>
        <h1 class="politica__titulo">
          Política de Tratamiento de Datos Personales
        </h1>
        <p class="politica__subtitulo">
          Peluquería Marlene — Sopó, Cundinamarca, Colombia
        </p>
        <p class="politica__version-linea" data-test="version-linea">
          Versión {{ POLICY_VERSION }} · actualizada el {{ LAST_UPDATED_LABEL }}
        </p>
      </header>

      <aside class="politica__indice">
        <nav aria-label="Contenido de la política" data-test="indice">
          <p class="politica__indice-titulo">Contenido</p>
          <button
            type="button"
            class="politica__alternar m-boton--ancho"
            aria-controls="politica-indice-lista"
            :aria-expanded="indiceAbierto ? 'true' : 'false'"
            data-test="alternar-indice"
            @click="alternarIndice"
          >
            <span class="politica__alternar-rotulo">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"
                />
              </svg>
              Contenido · {{ SECCIONES.length }} secciones
            </span>
            <svg
              class="politica__chevron"
              :class="{ 'politica__chevron--abierto': indiceAbierto }"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <ol
            id="politica-indice-lista"
            class="politica__lista"
            :class="{ 'politica__lista--abierta': indiceAbierto }"
          >
            <li v-for="seccion in SECCIONES" :key="seccion.id">
              <a
                class="politica__enlace"
                :class="{ 'politica__enlace--activo': activa === seccion.id }"
                :href="`#${seccion.id}`"
                :aria-current="activa === seccion.id ? 'location' : undefined"
                data-test="indice-entrada"
                @click.prevent="irA(seccion.id)"
              >
                <span
                  class="politica__punto"
                  :class="{ 'politica__punto--activo': activa === seccion.id }"
                  aria-hidden="true"
                />
                <span class="politica__indice-numero">{{
                  seccion.numero
                }}</span>
                <span
                  class="politica__indice-titulo-seccion"
                  data-test="titulo-entrada"
                  >{{ seccion.titulo }}</span
                >
              </a>
            </li>
          </ol>
        </nav>

        <div class="politica__version-ficha" data-test="version-ficha">
          <StrokeIcon
            class="politica__version-icono"
            nombre="privacidad"
            :tamano="20"
          />
          <div>
            <p class="politica__version-etiqueta" data-test="version-etiqueta">
              Versión {{ POLICY_VERSION }}
            </p>
            <p class="politica__version-fecha" data-test="version-fecha">
              Actualizada el {{ LAST_UPDATED_LABEL }}
            </p>
          </div>
        </div>
      </aside>

      <article class="politica__documento">
        <section
          id="politica-responsable"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">1</span
            ><span data-test="titulo-seccion">Responsable del tratamiento</span>
          </h2>
          <p>
            Peluquería Marlene, establecimiento de servicios de belleza ubicado
            en Carrera 3 #1-18, Sopó, Cundinamarca (Colombia), actúa como
            responsable del tratamiento de los datos personales recolectados a
            través de este portal web.
          </p>
          <ul>
            <li><strong>NIT:</strong> 35413608</li>
            <li>
              <strong>Correo electrónico:</strong>&nbsp;<a
                class="politica__enlace-texto"
                href="mailto:lcarrionalvarez@gmail.com"
                >lcarrionalvarez@gmail.com</a
              >
            </li>
            <li>
              <strong>Teléfono / WhatsApp:</strong>&nbsp;<a
                class="politica__enlace-texto"
                href="tel:+573208977571"
                >+57 320 897 7571</a
              >
            </li>
          </ul>
          <p class="politica__nota">
            A través de estos canales el titular puede presentar consultas y
            reclamos para ejercer sus derechos sobre sus datos personales.
          </p>
        </section>

        <section
          id="politica-marco-legal"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">2</span
            ><span data-test="titulo-seccion">Marco legal aplicable</span>
          </h2>
          <p>
            Esta política se rige por la Constitución Política de Colombia, la
            <strong>Ley 1581 de 2012</strong> (Régimen General de Protección de
            Datos Personales), el <strong>Decreto 1377 de 2013</strong>, el
            <strong>Decreto 587 de 2016</strong> y demás normas concordantes.
          </p>
        </section>

        <section
          id="politica-datos"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">3</span
            ><span data-test="titulo-seccion">Datos que se recolectan</span>
          </h2>
          <p>
            Durante el registro y uso del portal, Peluquería Marlene recolecta
            los siguientes datos personales del titular:
          </p>
          <ul>
            <li>Nombre completo.</li>
            <li>Correo electrónico.</li>
            <li>
              Credenciales de acceso (contraseña, almacenada de forma cifrada).
            </li>
            <li>
              Número de teléfono,
              <strong>solo si el titular lo aporta</strong> al reservar, para
              recibir los avisos de su cita por WhatsApp.
            </li>
            <li>
              El <strong>texto de la conversación</strong>, si el titular decide
              usar el asistente del portal.
            </li>
          </ul>
          <p>
            Adicionalmente, cuando el titular agenda una reserva, se procesan
            datos asociados a la cita (servicios, fecha y hora), los cuales se
            comunican al establecimiento a través del canal de WhatsApp del
            negocio para su confirmación.
          </p>
        </section>

        <section
          id="politica-finalidades"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">4</span
            ><span data-test="titulo-seccion">Finalidades del tratamiento</span>
          </h2>
          <p>
            Los datos personales se utilizan para las siguientes finalidades:
          </p>
          <ul>
            <li>
              Crear, autenticar y administrar la cuenta del usuario en el
              portal.
            </li>
            <li>
              Permitir la gestión del perfil personal (actualización de nombre,
              correo electrónico y contraseña).
            </li>
            <li>
              Asociar al usuario las reseñas que publique voluntariamente en la
              sección de testimonios.
            </li>
            <li>
              Facilitar la coordinación de reservas a través del canal oficial
              de WhatsApp del establecimiento.
            </li>
            <li>
              Enviar al titular los
              <strong>avisos de su cita</strong> —creación, cambio de hora,
              cancelación y confirmación— por correo electrónico y, si aportó su
              teléfono, por WhatsApp.
            </li>
            <li>
              Atender sus consultas sobre servicios, disponibilidad y reservas a
              través del <strong>asistente del portal</strong>, cuyo uso es
              voluntario.
            </li>
            <li>
              Cumplir con las obligaciones legales, contables y contractuales
              aplicables al negocio.
            </li>
          </ul>
        </section>

        <section
          id="politica-encargados"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">5</span
            ><span data-test="titulo-seccion"
              >Encargados del tratamiento y transferencia internacional</span
            >
          </h2>
          <p>
            Para operar el portal, Peluquería Marlene se apoya en proveedores
            que tratan datos personales
            <strong>por cuenta y según las instrucciones</strong> del
            establecimiento, y no para finalidades propias. Varios de ellos
            están ubicados <strong>fuera de Colombia</strong>, de modo que
            existe una <strong>transferencia internacional</strong> de datos en
            los términos de la Ley 1581 de 2012. Cada uno recibe únicamente lo
            imprescindible para su función:
          </p>
          <ul>
            <li>
              <strong>Google</strong> — inicio de sesión con Google. Si el
              titular elige ese acceso, Google recibe su solicitud y devuelve su
              nombre, su correo y el identificador de su cuenta. El portal no le
              envía reservas ni historial.
            </li>
            <li>
              <strong>Resend</strong> — correo transaccional. Recibe la
              dirección de correo para enviar la verificación de la cuenta, el
              restablecimiento de contraseña y los avisos de la cita.
            </li>
            <li>
              <strong>Meta</strong> — avisos por la API de WhatsApp Business.
              Recibe el número de teléfono y el contenido del aviso: fecha,
              estilista y servicios. No recibe el precio ni datos de terceros.
            </li>
            <li>
              <strong>Google (Gemini)</strong> — proveedor del asistente
              conversacional. Recibe el texto de la conversación de quien abre
              el chat, para redactar la respuesta.
            </li>
            <li>
              <strong>TypeSafe</strong> — verificación de la reserva antes de
              crearla, para que el asistente no agende algo distinto de lo que
              se pidió. Recibe los últimos mensajes de la conversación y los
              nombres de los servicios con el día y la hora propuestos.
              <strong>No recibe</strong> el nombre del titular, ni su teléfono,
              ni el identificador de su cuenta, ni el identificador de su
              reserva.
            </li>
          </ul>
          <p>
            El portal, su base de datos y las imágenes del catálogo se alojan en
            infraestructura de proveedores también ubicados fuera de Colombia,
            que actúan como custodios y no emplean la información para ninguna
            finalidad propia.
          </p>
          <p class="politica__nota">
            El uso del asistente conversacional es voluntario: el titular puede
            reservar por el formulario del portal o por WhatsApp sin abrir el
            chat, y la primera respuesta del asistente advierte de que se trata
            de un sistema automático y de que el mensaje se procesa con un
            proveedor ubicado fuera del país.
          </p>
        </section>

        <section
          id="politica-derechos"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">6</span
            ><span data-test="titulo-seccion">Derechos del titular</span>
          </h2>
          <p>
            Conforme a la Ley 1581 de 2012 y al Decreto 1377 de 2013, el titular
            de los datos personales tiene derecho a:
          </p>
          <ul>
            <li>
              <strong>Conocer</strong> los datos personales que sobre él reposan
              en el portal, así como sus finalidades.
            </li>
            <li>
              <strong>Actualizar y rectificar</strong> los datos que sean
              parciales, inexactos, incompletos o induzcan a error.
            </li>
            <li>
              <strong>Suprimir</strong> los datos tratados y revocar la
              autorización otorgada cuando no se respeten los principios,
              derechos y garantías constitucionales y legales.
            </li>
            <li>
              <strong>Solicitar prueba</strong> de la autorización otorgada para
              el tratamiento.
            </li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio
              (SIC) por infracciones al régimen de protección de datos.
            </li>
          </ul>
        </section>

        <section
          id="politica-ejercicio"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">7</span
            ><span data-test="titulo-seccion">Ejercicio de los derechos</span>
          </h2>
          <p>
            Para ejercer los derechos descritos, el titular puede comunicarse
            con Peluquería Marlene a través del canal de contacto indicado en la
            sección 1. La respuesta a las consultas se dará en los términos y
            plazos establecidos por la ley.
          </p>
        </section>

        <section
          id="politica-seguridad"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">8</span
            ><span data-test="titulo-seccion">Medidas de seguridad</span>
          </h2>
          <p>
            Peluquería Marlene implementa medidas técnicas y administrativas
            razonables para proteger la confidencialidad, integridad y
            disponibilidad de los datos personales. En particular, las
            contraseñas se almacenan cifradas con algoritmos de hashing estándar
            y las sesiones se gestionan mediante tokens firmados.
          </p>
        </section>

        <section
          id="politica-consentimiento"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">9</span
            ><span data-test="titulo-seccion">Consentimiento informado</span>
          </h2>
          <p>
            El tratamiento de los datos personales recolectados a través del
            formulario de registro requiere la autorización previa, expresa e
            informada del titular, manifestada mediante una casilla de
            aceptación no premarcada. Sin este consentimiento, el portal no
            permite completar el registro.
          </p>
        </section>

        <section
          id="politica-vigencia"
          class="politica__seccion"
          data-test="seccion"
        >
          <h2 class="politica__h2" tabindex="-1">
            <span class="politica__numero" data-test="numero-seccion">10</span
            ><span data-test="titulo-seccion">Vigencia</span>
          </h2>
          <p>
            La presente política se encuentra vigente desde la fecha indicada al
            inicio del documento y podrá actualizarse cuando los cambios
            normativos o funcionales del portal lo requieran. Las modificaciones
            se comunicarán a través de este mismo portal.
          </p>
        </section>
      </article>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { useSeccionVisible } from 'src/composables/politica/useSeccionVisible';
import { useSeo } from 'src/composables/seo/useSeo';

/**
 * La política como documento con índice (S4, tablero PoliticaIndice).
 *
 * EL TEXTO LEGAL NO SE TOCA AQUÍ: es obligatorio por la Ley 1581 y la tesis
 * cita lo que dice (`tests/unit/privacy-policy.spec.ts`,
 * `tests/unit/PrivacyPolicyPage.spec.ts`). Si cambia, sube `POLICY_VERSION`, la
 * fecha y `tests/unit/fixtures/politica-texto.ts` en el mismo commit.
 */
const POLICY_VERSION = '1.1';
const LAST_UPDATED_LABEL = '30 de septiembre de 2026';

/** El índice. Los títulos son los mismos de cada `<h2>` (lo vigila la prueba). */
const SECCIONES = [
  {
    id: 'politica-responsable',
    numero: 1,
    titulo: 'Responsable del tratamiento',
  },
  { id: 'politica-marco-legal', numero: 2, titulo: 'Marco legal aplicable' },
  { id: 'politica-datos', numero: 3, titulo: 'Datos que se recolectan' },
  {
    id: 'politica-finalidades',
    numero: 4,
    titulo: 'Finalidades del tratamiento',
  },
  {
    id: 'politica-encargados',
    numero: 5,
    titulo: 'Encargados del tratamiento y transferencia internacional',
  },
  { id: 'politica-derechos', numero: 6, titulo: 'Derechos del titular' },
  { id: 'politica-ejercicio', numero: 7, titulo: 'Ejercicio de los derechos' },
  { id: 'politica-seguridad', numero: 8, titulo: 'Medidas de seguridad' },
  {
    id: 'politica-consentimiento',
    numero: 9,
    titulo: 'Consentimiento informado',
  },
  { id: 'politica-vigencia', numero: 10, titulo: 'Vigencia' },
];

const { activa, marcar } = useSeccionVisible(SECCIONES.map((s) => s.id));

/** Solo cuenta en móvil: en escritorio la lista se ve siempre (CSS). */
const indiceAbierto = ref(false);

function alternarIndice(): void {
  indiceAbierto.value = !indiceAbierto.value;
}

/**
 * Lleva a la sección y le deja el foco en el título: quien navega con teclado
 * sigue leyendo desde ahí, no desde el índice. Primero se pliega el
 * desplegable y se espera a que el DOM lo refleje; si no, la posición se
 * mediría con la lista todavía abierta y el salto se quedaría corto en móvil.
 * Se descuenta la cabecera fija del armazón. Con movimiento reducido, salto
 * seco.
 */
async function irA(id: string): Promise<void> {
  indiceAbierto.value = false;
  marcar(id);
  await nextTick();

  const seccion = document.getElementById(id);
  if (!seccion) return;
  seccion.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });

  const cabecera =
    document.querySelector('.q-header')?.getBoundingClientRect().height ?? 0;
  const reducido =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: seccion.getBoundingClientRect().top + window.scrollY - cabecera - 16,
    behavior: reducido ? 'auto' : 'smooth',
  });
}

useSeo({
  title: 'Política de Tratamiento de Datos Personales | Peluquería Marlene',
  description:
    'Política de Tratamiento de Datos Personales de Peluquería Marlene en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013.',
  path: '/politica-tratamiento-datos',
});

defineOptions({
  name: 'PrivacyPolicyPage',
});
</script>

<style scoped lang="scss">
/**
 * Tablero PoliticaIndice: índice de 280 px a la izquierda, fijo al desplazar,
 * y el documento de 680 px. Por debajo de 900 px, una columna con el índice
 * plegado en un desplegable.
 */
.politica {
  background: var(--m-hueso);
  color: var(--m-tinta);
  font-family: var(--m-font-sans);
}

.politica__marco {
  display: grid;
  grid-template-columns: 280px minmax(0, 680px);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'indice cabecera'
    'indice documento';
  column-gap: 92px;
  box-sizing: border-box;
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px var(--m-banda-margen) var(--m-flotante-despeje);
}

.politica__cabecera {
  grid-area: cabecera;
}

.politica__indice {
  grid-area: indice;
  align-self: start;
  position: sticky;
  top: calc(var(--m-cabecera-alto) + 24px);
}

.politica__documento {
  grid-area: documento;
  min-width: 0;
}

.politica__antetitulo {
  margin: 0 0 14px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.politica__titulo {
  margin: 0 0 10px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 40px;
  line-height: 1.12;
}

.politica__subtitulo {
  margin: 0 0 34px;
  font-size: 14.5px;
  color: var(--m-piedra);
}

.politica__version-linea {
  display: none;
}

.politica__indice-titulo {
  margin: 0 0 8px;
  padding-bottom: 12px;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete);
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.politica__alternar {
  display: none;
}

.politica__lista {
  display: block;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13.5px;
  line-height: 1.35;
}

.politica__enlace {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--m-tactil-min);
  padding: 0 4px;
  color: var(--m-piedra);
  text-decoration: none;
}

.politica__enlace--activo {
  font-weight: 500;
  color: var(--m-tinta);
}

.politica__punto {
  flex: 0 0 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.politica__punto--activo {
  background: var(--m-oro-profundo);
}

.politica__indice-numero {
  flex: 0 0 18px;
  color: var(--m-piedra);
}

.politica__enlace--activo .politica__indice-numero {
  color: var(--m-oro-profundo);
}

.politica__version-ficha {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 14px 16px;
  background: var(--m-nieve);
  border: var(--m-filete-grosor) solid var(--m-filete);
  border-radius: var(--m-radio-tarjeta);
}

.politica__version-icono {
  flex: 0 0 auto;
  color: var(--m-oro-profundo);
}

.politica__version-etiqueta {
  margin: 0;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.politica__version-fecha {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--m-piedra);
}

.politica__seccion {
  padding-top: 26px;
  border-top: var(--m-filete-grosor) solid var(--m-filete);
}

.politica__h2 {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 0 0 12px;
  font-family: var(--m-font-display);
  font-weight: 400;
  font-size: 23px;
  line-height: 1.25;
}

/* Recibe el foco por programa (el clic del índice), no por tabulador. */
.politica__h2:focus {
  outline: none;
}

.politica__numero {
  flex: 0 0 auto;
  font-size: 18px;
  color: var(--m-oro-profundo);
}

.politica__seccion p,
.politica__seccion li {
  font-size: 15px;
  line-height: 1.7;
  color: var(--m-tinta);
}

.politica__seccion p {
  margin: 0 0 12px;
}

.politica__seccion ul {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.politica__seccion li {
  position: relative;
  padding-left: 17px;
}

/* La viñeta del tablero: un guion de 5 px en oro profundo. */
.politica__seccion li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.85em;
  width: 5px;
  height: 1px;
  background: var(--m-oro-profundo);
}

.politica__seccion > :last-child {
  margin-bottom: 30px;
}

.politica__seccion strong {
  font-weight: 500;
}

.politica__seccion .politica__nota {
  font-size: 13px;
  line-height: 1.6;
  color: var(--m-piedra);
}

.politica__enlace-texto {
  color: var(--m-rosa-profundo);
  text-decoration: none;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa);
  overflow-wrap: break-word;
}

.politica__enlace:focus-visible,
.politica__alternar:focus-visible,
.politica__enlace-texto:focus-visible {
  outline: 2px solid var(--m-tinta);
  outline-offset: 2px;
}

@media (max-width: 899px) {
  .politica__marco {
    display: block;
    padding: 24px var(--m-banda-margen-movil) var(--m-flotante-despeje);
  }

  .politica__antetitulo {
    margin-bottom: 10px;
    font-size: 10px;
  }

  .politica__titulo {
    margin-bottom: 8px;
    font-size: 27px;
    line-height: 1.14;
  }

  .politica__subtitulo {
    margin-bottom: 4px;
    font-size: 13px;
  }

  .politica__version-linea {
    display: block;
    margin: 0 0 18px;
    font-size: 12px;
    color: var(--m-piedra);
  }

  .politica__indice {
    position: static;
  }

  .politica__indice-titulo {
    display: none;
  }

  .politica__alternar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    min-height: 48px;
    padding: 0 16px;
    background: var(--m-nieve);
    border: var(--m-filete-grosor) solid var(--m-filete);
    border-radius: var(--m-radio-tarjeta);
    font: inherit;
    color: var(--m-tinta);
    cursor: pointer;
  }

  .politica__alternar-rotulo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11.5px;
    letter-spacing: var(--m-tracking-etiqueta);
    text-transform: uppercase;
  }

  .politica__chevron--abierto {
    transform: rotate(180deg);
  }

  .politica__lista {
    display: none;
    margin-top: 8px;
    padding: 4px 8px;
    background: var(--m-nieve);
    border: var(--m-filete-grosor) solid var(--m-filete);
    border-radius: var(--m-radio-tarjeta);
  }

  .politica__lista--abierta {
    display: block;
  }

  .politica__version-ficha {
    display: none;
  }

  .politica__documento {
    margin-top: 24px;
  }

  .politica__seccion {
    padding-top: 20px;
  }

  .politica__h2 {
    gap: 10px;
    margin-bottom: 10px;
    font-size: 20px;
  }

  .politica__numero {
    font-size: 16px;
  }

  .politica__seccion p,
  .politica__seccion li {
    font-size: 14.5px;
    line-height: 1.65;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El movimiento es global, en
 * `app.scss` («Realce y hundido»).
 */
@media (hover: hover) and (pointer: fine) {
  .politica__enlace:hover {
    color: var(--m-tinta);
  }

  .politica__alternar:hover {
    border-color: var(--m-oro);
  }

  .politica__enlace-texto:hover {
    border-bottom-color: var(--m-rosa-profundo);
  }
}
</style>
