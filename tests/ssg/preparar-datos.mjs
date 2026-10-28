/**
 * Deja en la pila E2E los datos que las páginas públicas necesitan para
 * generarse (`scripts/verificar-ssg.mjs` exige catálogo, reseñas y preguntas).
 *
 * La base `HairSalonE2E` es una copia de la de desarrollo, que hoy no tiene
 * preguntas frecuentes: si faltan, se crean tres de prueba como la
 * propietaria de prueba. Servicios y reseñas solo se comprueban; si faltan,
 * sale con código 1 sin inventarlos.
 *
 * Falla cerrada, como `tests/e2e/preparar-bd.mjs`, antes de escribir nada:
 * - el destino tiene que ser exactamente la API de la pila,
 *   `http://127.0.0.1:3101/api` (se puede pedir otro con `SSG_DATOS_API`, pero
 *   solo para que la negativa sea comprobable: cualquier otro valor sale con
 *   código 2 sin hacer ninguna petición);
 * - `GET /health` tiene que responder 200;
 * - la propietaria de prueba (`duena.e2e@example.test`, que solo existe en
 *   `HairSalonE2E`, la crea `yarn e2e:pila`) tiene que poder entrar.
 * Nunca habla con la API de desarrollo (3001). Requiere `yarn e2e:pila` en
 * marcha.
 *
 * Uso: node tests/ssg/preparar-datos.mjs
 */
import { PROPIETARIA, URL_API as URL_PILA, URL_SALUD } from '../e2e/pila.mjs';

const DESTINO_UNICO = 'http://127.0.0.1:3101/api';
const URL_API = process.env.SSG_DATOS_API ?? URL_PILA;

class Negativa extends Error {}

function comprobarDestino() {
  if (URL_PILA !== DESTINO_UNICO || URL_API !== DESTINO_UNICO) {
    throw new Negativa(
      `preparar-datos se niega: el destino es «${URL_API}» y solo puede ser «${DESTINO_UNICO}» (la pila E2E). No se ha hecho ninguna petición.`
    );
  }
}

async function comprobarPila() {
  let salud;
  try {
    salud = await fetch(URL_SALUD);
  } catch (error) {
    throw new Negativa(`preparar-datos se niega: ${URL_SALUD} no responde (${error.message}). ¿Está \`yarn e2e:pila\` en marcha?`);
  }
  if (salud.status !== 200) {
    throw new Negativa(`preparar-datos se niega: ${URL_SALUD} respondió HTTP ${salud.status}.`);
  }
}

const PREGUNTAS_DE_PRUEBA = [
  {
    question: '¿Necesito reservar con anticipación?',
    answer:
      'Te recomendamos reservar desde el portal para asegurar tu hora; si hay espacio, también te atendemos sin cita.',
  },
  {
    question: '¿Puedo cambiar la fecha de mi reserva?',
    answer: 'Sí. Desde «Mis reservas» puedes cambiar la fecha y la hora mientras la reserva no se haya cumplido.',
  },
  {
    question: '¿Qué medios de pago reciben?',
    answer: 'Recibimos efectivo y transferencia en el salón.',
  },
];

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers ?? {}) },
  });
  if (!respuesta.ok) {
    throw new Error(`${opciones.method ?? 'GET'} ${ruta}: HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

async function principal() {
  comprobarDestino();
  await comprobarPila();
  const { token } = await pedir('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: PROPIETARIA.correo, password: PROPIETARIA.contrasena }),
  }).catch((error) => {
    throw new Negativa(
      `preparar-datos se niega: la propietaria de prueba no entra en ${URL_API} (${error.message}); no es la pila E2E.`
    );
  });

  const [servicios] = await pedir('/service/search', {
    method: 'POST',
    body: JSON.stringify({
      name: '',
      selectedGenres: [],
      selectedServicesIDs: [],
      includePriceRange: false,
      includePromotionsOnly: false,
      prices: { min: 0, max: 1_000_000 },
      page: 1,
      limit: 1,
    }),
  });
  if (!servicios.length) throw new Error('La base E2E no tiene servicios.');

  const resenas = await pedir('/reviews');
  if (!resenas.length) throw new Error('La base E2E no tiene reseñas.');

  const preguntas = await pedir('/faqs');
  if (preguntas.length) {
    console.log(`[preparar-datos] Ya hay ${preguntas.length} preguntas; no se toca nada.`);
    return;
  }

  for (const pregunta of PREGUNTAS_DE_PRUEBA) {
    await pedir('/faqs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(pregunta),
    });
  }
  console.log(`[preparar-datos] Creadas ${PREGUNTAS_DE_PRUEBA.length} preguntas de prueba en ${URL_API}.`);
}

principal().catch((error) => {
  console.error(`[preparar-datos] ${error.message}`);
  process.exit(error instanceof Negativa ? 2 : 1);
});
