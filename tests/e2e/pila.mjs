/**
 * La pila E2E local: API en 3101 contra la base `HairSalonE2E` y portal en
 * 9100. Este archivo es a la vez una biblioteca (la importan la configuración
 * de Playwright, `preparar-bd.mjs` y las pruebas) y un programa
 * (`yarn e2e:pila`, que levanta la misma pila sin pruebas).
 *
 * Falla cerrada. El `.env` del backend tiene credenciales REALES (WhatsApp
 * Cloud API, correo, Gemini): una API arrancada con él tal cual escribiría a
 * teléfonos de verdad al crear una reserva. Por eso la API de la pila la
 * arranca siempre el propio arnés, y antes de arrancarla pasan tres filtros
 * (si uno falla, no arranca nada):
 *
 * 1. `comprobarEntornoSeguro()`: el entorno que el arnés va a pasar
 *    (`entornoApi()`) tiene los tokens vacíos, la base E2E, los puertos y la
 *    red bloqueada declarada.
 * 2. `comprobarEntornoEnElBackend()`: con ese entorno, `cwd` en el backend y
 *    su propio `@nestjs/config` (`ConfigModule.forRoot()`, como la app), el
 *    `process.env` resultante sigue siendo ese. Si algún día el `.env` ganara
 *    a una variable del proceso, se detecta aquí, antes de enviar nada.
 * 3. Una red independiente de lo anterior: la API corre con
 *    `NODE_OPTIONS=--require tests/e2e/bloquear-red.cjs`, que corta toda
 *    conexión de salida que no sea a la propia máquina. Aunque los dos filtros
 *    anteriores fallaran a la vez y la API eligiera la Cloud API, la petición
 *    no saldría.
 *
 * Precedencia (comprobada en el código del backend, no supuesta):
 * `ConfigModule.forRoot()` de `@nestjs/config` 3.3.0 mezcla
 * `{ ...archivo, ...process.env }` y solo copia a `process.env` las claves que
 * NO están ya en él (`!(key in process.env)`), así que una variable del proceso
 * —aunque sea la cadena vacía— gana al `.env`. Y `notifications.module.ts`
 * elige el adaptador de consola cuando `WHATSAPP_TOKEN` recortado está vacío.
 *
 * Nunca imprime secretos: el usuario y la contraseña de la base se leen del
 * `.env` y solo viajan al entorno de `psql`.
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  createWriteStream,
} from 'node:fs';
import net from 'node:net';
import { dirname, resolve } from 'node:path';

/**
 * La raíz de `hari_salon_front`, buscada hacia arriba desde el directorio de
 * trabajo. No sale de `import.meta.url` a propósito: Playwright transpila este
 * archivo a CommonJS al cargar la configuración, y ahí `import.meta` no existe.
 */
function raizDelFront() {
  let dir = process.cwd();
  for (;;) {
    const paquete = resolve(dir, 'package.json');
    if (existsSync(paquete)) {
      try {
        if (
          JSON.parse(readFileSync(paquete, 'utf8')).name === 'hair-salon-front'
        ) {
          return dir;
        }
      } catch {
        // package.json ilegible: se sigue subiendo
      }
    }
    const arriba = dirname(dir);
    if (arriba === dir) {
      throw new Error(
        'La pila E2E se lanza desde hari_salon_front (no se encontró su package.json).'
      );
    }
    dir = arriba;
  }
}

/** ¿Este archivo es el programa que se está ejecutando? */
export function esPrograma(nombre) {
  return Boolean(
    process.argv[1] && resolve(process.argv[1]).endsWith(`/tests/e2e/${nombre}`)
  );
}

export const RAIZ_FRONT = raizDelFront();
export const RAIZ_BACK = resolve(RAIZ_FRONT, '..', 'hair_salon_back');
export const ENV_BACK = resolve(RAIZ_BACK, '.env');

export const PUERTO_API = 3101;
export const PUERTO_PORTAL = 9100;
export const URL_API = `http://127.0.0.1:${PUERTO_API}/api`;
export const URL_SALUD = `${URL_API}/health`;
export const URL_PORTAL = `http://localhost:${PUERTO_PORTAL}`;

/** La única base que la pila puede crear, borrar o escribir. */
export const BD_E2E = 'HairSalonE2E';
/** La base de desarrollo: solo se usa como plantilla, nunca se escribe. */
export const BD_ORIGEN = 'HairSalon';
export const PUERTO_BD = 3334;

/** El registro de arranque y ejecución de la API (fuera del `outputDir`). */
export const DIR_REGISTROS = resolve(
  RAIZ_FRONT,
  'test-results',
  'e2e-registros'
);
export const REGISTRO_API = resolve(DIR_REGISTROS, 'api.log');

/** La red de seguridad independiente (ver `bloquear-red.cjs`). */
export const BLOQUEAR_RED = resolve(
  RAIZ_FRONT,
  'tests',
  'e2e',
  'bloquear-red.cjs'
);
const CHEQUEO_BACK = resolve(
  RAIZ_FRONT,
  'tests',
  'e2e',
  'comprobar-entorno-api.cjs'
);

/** Número y correo de la dueña en la pila: de prueba, nunca los reales. */
export const WHATSAPP_DUENA_PRUEBA = '573000000001';
export const CORREO_DUENA_PRUEBA = 'duena.e2e@example.test';

/** Las cuatro variables que la consigna obliga a vaciar. */
export const TOKENS_VACIOS = [
  'WHATSAPP_TOKEN',
  'EMAIL_PROVIDER',
  'GEMINI_API_KEY',
  'TYPESAFE_KEY',
];

/**
 * La propietaria de prueba. Se registra por la API y se promueve con SQL
 * dentro de `HairSalonE2E` (`asegurarPropietaria`). Contraseña de prueba de una
 * base desechable: no protege nada real.
 */
export const PROPIETARIA = {
  nombre: 'Duena de Prueba E2E',
  correo: 'duena.e2e@example.test',
  contrasena: 'DuenaE2e2026',
};

/** Lee `../hair_salon_back/.env` como pares clave-valor, sin imprimir nada. */
export function leerEnvBack() {
  if (!existsSync(ENV_BACK)) {
    throw new Error(`No existe ${ENV_BACK}: la pila E2E lo necesita.`);
  }
  const valores = {};
  for (const linea of readFileSync(ENV_BACK, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linea);
    if (!m) continue;
    let valor = m[2];
    if (/^(['"]).*\1$/.test(valor)) valor = valor.slice(1, -1);
    valores[m[1]] = valor;
  }
  return valores;
}

/** Usuario y contraseña de PostgreSQL, tomados del `.env` del backend. */
export function credencialesBd() {
  const env = leerEnvBack();
  if (!env.DB_USER || !env.DB_PASSWORD) {
    throw new Error('El .env del backend no trae DB_USER y DB_PASSWORD.');
  }
  return { usuario: env.DB_USER, contrasena: env.DB_PASSWORD };
}

/**
 * El entorno de la API E2E. Lo que no está aquí lo pone el `.env` del backend
 * (JWT, plantillas…), porque `ConfigModule` lo carga debajo de esto; que de
 * verdad quede debajo lo verifica `comprobarEntornoEnElBackend()`.
 *
 * Además de las cuatro variables de la consigna se vacían o se fijan otras.
 * No son una red independiente —dependen del mismo mecanismo que los tokens
 * vacíos—, pero cierran huecos concretos: `WHATSAPP_PHONE_NUMBER_ID` vacío
 * hace que el adaptador de la Cloud API lance antes de `fetch`; el número y el
 * correo de la dueña son de prueba; `TYPESAFE_API_KEY` es el nombre que de
 * verdad lee el asistente; `TYPEORM_SYNCHRONIZE=false` impide que TypeORM
 * reescriba el esquema de la copia. La red independiente es `NODE_OPTIONS`.
 *
 * @param {{ conGemini?: boolean }} [opciones] `conGemini` solo lo usa
 *   `yarn e2e:pila` con `E2E_CON_GEMINI=1`: conserva el `GEMINI_API_KEY` del
 *   `.env` y deja salir la red al host de Gemini. La configuración de
 *   Playwright nunca lo pasa.
 * @returns {Record<string, string>}
 */
export function entornoApi({ conGemini = false } = {}) {
  const entorno = {
    PORT: String(PUERTO_API),
    DB_HOST: '127.0.0.1',
    DB_PORT: String(PUERTO_BD),
    DB_NAME: BD_E2E,
    NODE_ENV: 'development',
    WHATSAPP_TOKEN: '',
    EMAIL_PROVIDER: '',
    GEMINI_API_KEY: '',
    TYPESAFE_KEY: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
    SALON_OWNER_WHATSAPP: WHATSAPP_DUENA_PRUEBA,
    SALON_NOTIFICATION_EMAIL: CORREO_DUENA_PRUEBA,
    EMAIL_API_KEY: '',
    TYPESAFE_API_KEY: '',
    TYPEORM_SYNCHRONIZE: 'false',
    TYPEORM_LOGGING: 'false',
    // El portal E2E vive en 9100: CORS y el socket del panel lo admiten.
    FRONT_URL: URL_PORTAL,
    // La red independiente: la heredan npm, el CLI de Nest y el proceso de la
    // API. `E2E_CON_GEMINI` va siempre explícito, para que un `1` olvidado en
    // la terminal no abra el host de Gemini en `yarn test:e2e`.
    NODE_OPTIONS: `--require "${BLOQUEAR_RED}"`,
    E2E_CON_GEMINI: conGemini ? '1' : '0',
    // Que npm no busque actualizaciones (sería una salida bloqueada más).
    NPM_CONFIG_UPDATE_NOTIFIER: 'false',
    // Registro sin códigos de color, para poder buscar en él.
    NO_COLOR: '1',
  };
  if (conGemini) {
    entorno.GEMINI_API_KEY = leerEnvBack().GEMINI_API_KEY ?? '';
  }
  return entorno;
}

/**
 * El entorno del portal E2E. `VITE_API_URL` se fija a `/api` (relativa: va
 * por el proxy de `quasar dev` al 3101) para que una URL absoluta en el
 * `.env` local del front no lleve los flujos a la API de desarrollo. Vite da
 * prioridad a las `VITE_*` del proceso sobre las del `.env`.
 */
export function entornoPortal() {
  return {
    DEV_API_TARGET: `http://127.0.0.1:${PUERTO_API}`,
    VITE_API_URL: '/api',
    // El socket del panel va directo a la API (no por el proxy): a la de la
    // pila, no a la de desarrollo del 3001.
    VITE_WS_URL: `http://127.0.0.1:${PUERTO_API}`,
    VITE_SITE_URL: URL_PORTAL,
  };
}

/**
 * Se niega a seguir si el entorno que el arnés va a pasar a la API pudiera
 * alcanzar un servicio real o la base de desarrollo. Comprueba, una por una:
 * - `WHATSAPP_TOKEN`, `EMAIL_PROVIDER`, `GEMINI_API_KEY` (salvo
 *   `permitirGemini`), `TYPESAFE_KEY`, `WHATSAPP_PHONE_NUMBER_ID`,
 *   `EMAIL_API_KEY` y `TYPESAFE_API_KEY` vacías;
 * - `SALON_OWNER_WHATSAPP` y `SALON_NOTIFICATION_EMAIL` = los de prueba;
 * - `DB_NAME=HairSalonE2E`, `DB_HOST=127.0.0.1`, `DB_PORT=3334`, `PORT=3101`;
 * - `TYPEORM_SYNCHRONIZE=false`, `FRONT_URL` = el portal E2E;
 * - `NODE_OPTIONS` carga `bloquear-red.cjs` (y el archivo existe), y
 *   `E2E_CON_GEMINI` es `1` solo con `permitirGemini`.
 * `permitirGemini` solo lo usa `yarn e2e:pila`.
 */
export function comprobarEntornoSeguro(
  entorno,
  { permitirGemini = false } = {}
) {
  const fallos = [];
  const exigir = (clave, valor) => {
    if (entorno[clave] !== valor) fallos.push(`${clave} no es el esperado`);
  };
  for (const clave of [
    ...TOKENS_VACIOS,
    'WHATSAPP_PHONE_NUMBER_ID',
    'EMAIL_API_KEY',
    'TYPESAFE_API_KEY',
  ]) {
    if (clave === 'GEMINI_API_KEY' && permitirGemini) continue;
    if (entorno[clave] !== '') fallos.push(`${clave} debe estar vacío`);
  }
  exigir('SALON_OWNER_WHATSAPP', WHATSAPP_DUENA_PRUEBA);
  exigir('SALON_NOTIFICATION_EMAIL', CORREO_DUENA_PRUEBA);
  exigir('DB_NAME', BD_E2E);
  exigir('DB_HOST', '127.0.0.1');
  exigir('DB_PORT', String(PUERTO_BD));
  exigir('PORT', String(PUERTO_API));
  exigir('TYPEORM_SYNCHRONIZE', 'false');
  exigir('FRONT_URL', URL_PORTAL);
  exigir('E2E_CON_GEMINI', permitirGemini ? '1' : '0');
  if (
    !existsSync(BLOQUEAR_RED) ||
    !String(entorno.NODE_OPTIONS ?? '').includes(`--require "${BLOQUEAR_RED}"`)
  ) {
    fallos.push('NODE_OPTIONS debe cargar tests/e2e/bloquear-red.cjs');
  }
  if (fallos.length) {
    throw new Error(`Entorno de la API E2E inseguro: ${fallos.join('; ')}.`);
  }
  return entorno;
}

/**
 * Comprobación previa al envío, dentro del backend: lanza
 * `comprobar-entorno-api.cjs` con `cwd = hair_salon_back` y el entorno dado,
 * que carga el `@nestjs/config` del backend (`ConfigModule.forRoot()`, como
 * `app.module.ts`) y exige que `process.env` siga siendo ese entorno, clave por
 * clave. No arranca la API, no abre la base y no envía nada. Lanza si algo no
 * cuadra; nunca imprime valores.
 */
export function comprobarEntornoEnElBackend(entorno) {
  try {
    return execFileSync(process.execPath, [CHEQUEO_BACK], {
      cwd: RAIZ_BACK,
      env: { ...process.env, ...entorno },
      input: JSON.stringify(entorno),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detalle = String(error?.stderr ?? '')
      .split(/\r?\n/)
      .filter((l) => l.startsWith('comprobar-entorno-api:'))
      .join(' ');
    throw new Error(detalle || `comprobar-entorno-api falló: ${error.message}`);
  }
}

/**
 * Ejecuta SQL con `psql` contra la base indicada. Solo admite `postgres` (para
 * crear y borrar) y `HairSalonE2E`: nunca abre una sesión en `HairSalon`, que
 * además impediría usarla como plantilla.
 */
export function psql(bd, sql, { tuplas = false } = {}) {
  if (bd !== 'postgres' && bd !== BD_E2E) {
    throw new Error(`psql se niega a conectarse a «${bd}».`);
  }
  const { usuario, contrasena } = credencialesBd();
  const argumentos = [
    '-h',
    '127.0.0.1',
    '-p',
    String(PUERTO_BD),
    '-d',
    bd,
    '-v',
    'ON_ERROR_STOP=1',
    '-X',
    '-q',
  ];
  if (tuplas) argumentos.push('-t', '-A');
  argumentos.push('-c', sql);
  return execFileSync('psql', argumentos, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PGUSER: usuario,
      PGPASSWORD: contrasena,
      // La imagen de Postgres avisa de un desajuste de collation en cada
      // conexión; es ruido, no un fallo.
      PGOPTIONS: '-c client_min_messages=error',
    },
  });
}

/** ¿Hay algo escuchando en ese puerto local? */
export function puertoOcupado(puerto) {
  return new Promise((resolver) => {
    const socket = net.connect({ host: '127.0.0.1', port: puerto });
    socket.once('connect', () => {
      socket.destroy();
      resolver(true);
    });
    socket.once('error', () => resolver(false));
  });
}

/**
 * Registra la propietaria de prueba por la API (si ya existe, el 409 no
 * importa) y la promueve a `admin` con SQL dentro de `HairSalonE2E`.
 */
export async function asegurarPropietaria() {
  const respuesta = await fetch(`${URL_API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: PROPIETARIA.nombre,
      email: PROPIETARIA.correo,
      password: PROPIETARIA.contrasena,
      dataPolicyAccepted: true,
    }),
  });
  if (!respuesta.ok && respuesta.status !== 409 && respuesta.status !== 400) {
    throw new Error(
      `No se pudo registrar la propietaria de prueba (HTTP ${respuesta.status}).`
    );
  }
  const filas = psql(
    BD_E2E,
    `UPDATE users SET roles = ARRAY['admin']::text[] WHERE email = '${PROPIETARIA.correo}' RETURNING id`,
    { tuplas: true }
  ).trim();
  if (!filas) {
    throw new Error('La propietaria de prueba no quedó en la base E2E.');
  }
  return PROPIETARIA;
}

async function esperarUrl(url, plazoMs) {
  const limite = Date.now() + plazoMs;
  while (Date.now() < limite) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      // aún no escucha
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} no respondió en ${plazoMs / 1000} s.`);
}

/** `yarn e2e:pila`: la pila de las pruebas, en marcha hasta Ctrl+C. */
async function levantarPila() {
  const conGemini = process.env.E2E_CON_GEMINI === '1';
  const entorno = comprobarEntornoSeguro(entornoApi({ conGemini }), {
    permitirGemini: conGemini,
  });
  console.log(comprobarEntornoEnElBackend(entorno));

  for (const puerto of [PUERTO_API, PUERTO_PORTAL]) {
    if (await puertoOcupado(puerto)) {
      throw new Error(
        `El puerto ${puerto} ya está en uso: la pila E2E no reutiliza servidores.`
      );
    }
  }

  const { prepararBd } = await import('./preparar-bd.mjs');
  await prepararBd();

  mkdirSync(DIR_REGISTROS, { recursive: true });
  const registro = createWriteStream(REGISTRO_API);
  const hijos = [];

  const api = spawn('npm', ['--prefix', RAIZ_BACK, 'run', 'start:dev'], {
    cwd: RAIZ_FRONT,
    env: { ...process.env, ...entorno },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  hijos.push(api);
  for (const flujo of [api.stdout, api.stderr]) {
    flujo.on('data', (d) => {
      registro.write(d);
      process.stdout.write(`[api] ${d}`);
    });
  }

  const portal = spawn(
    'npx',
    ['quasar', 'dev', '--port', String(PUERTO_PORTAL)],
    {
      cwd: RAIZ_FRONT,
      env: { ...process.env, ...entornoPortal() },
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: true,
    }
  );
  hijos.push(portal);

  let parando = false;
  const parar = () => {
    parando = true;
    for (const hijo of hijos) {
      try {
        process.kill(-hijo.pid, 'SIGTERM');
      } catch {
        // ya terminó
      }
    }
  };
  process.on('SIGINT', () => {
    parar();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    parar();
    process.exit(0);
  });
  for (const hijo of hijos) {
    hijo.on('exit', (codigo) => {
      if (parando) return;
      console.error(
        `Un proceso de la pila terminó (código ${codigo}); se para todo.`
      );
      parar();
      process.exit(1);
    });
  }

  await esperarUrl(URL_SALUD, 240_000);
  await esperarUrl(URL_PORTAL, 240_000);
  await asegurarPropietaria();

  console.log(
    [
      '',
      'Pila E2E en marcha (Ctrl+C para pararla):',
      `  portal   ${URL_PORTAL}`,
      `  API      ${URL_API}  (base ${BD_E2E}, avisos por consola, red de salida bloqueada)`,
      `  registro ${REGISTRO_API}`,
      `  propietaria de prueba: ${PROPIETARIA.correo} (contraseña en tests/e2e/README.md)`,
      conGemini
        ? '  Gemini: CON la clave del .env y su host abierto (E2E_CON_GEMINI=1)'
        : '  Gemini: sin clave',
      '',
    ].join('\n')
  );
}

if (esPrograma('pila.mjs')) {
  levantarPila().catch((error) => {
    console.error(`e2e:pila: ${error.message}`);
    process.exit(1);
  });
}
