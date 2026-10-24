/**
 * La pila E2E local: API en 3101 contra la base `HairSalonE2E` y portal en
 * 9100. Este archivo es a la vez una biblioteca (la importan la configuración
 * de Playwright, `preparar-bd.mjs` y las pruebas) y un programa
 * (`yarn e2e:pila`, que levanta la misma pila sin pruebas).
 *
 * Falla cerrada. El `.env` del backend tiene credenciales REALES (WhatsApp
 * Cloud API, correo, Gemini): una API arrancada con él tal cual escribiría a
 * teléfonos de verdad al crear una reserva. Por eso la API de la pila la
 * arranca siempre el propio arnés con `entornoApi()`, que vacía esos tokens, y
 * `comprobarEntornoSeguro()` se niega a seguir si alguno quedara con valor.
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
 * (JWT, plantillas…), porque `ConfigModule` lo carga debajo de esto.
 *
 * Además de las cuatro variables de la consigna se vacían o se fijan otras,
 * como segunda red: `WHATSAPP_PHONE_NUMBER_ID` vacío hace que el adaptador de
 * la Cloud API lance ANTES de ir a la red aunque hubiera token
 * (`cloud-api-whatsapp-sender.adapter.ts`), el número de la dueña es uno de
 * prueba, `TYPESAFE_API_KEY` es el nombre que de verdad lee el módulo del
 * asistente, y `TYPEORM_SYNCHRONIZE=false` impide que TypeORM reescriba el
 * esquema de la copia.
 *
 * @param {{ conGemini?: boolean }} [opciones] `conGemini` solo lo usa
 *   `yarn e2e:pila` con `E2E_CON_GEMINI=1`: conserva el `GEMINI_API_KEY` del
 *   `.env`. La configuración de Playwright nunca lo pasa.
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
    // Segunda red (ver arriba).
    WHATSAPP_PHONE_NUMBER_ID: '',
    SALON_OWNER_WHATSAPP: '573000000001',
    EMAIL_API_KEY: '',
    TYPESAFE_API_KEY: '',
    TYPEORM_SYNCHRONIZE: 'false',
    TYPEORM_LOGGING: 'false',
    // El aviso por correo a la dueña sale por consola, pero con una dirección
    // de prueba: el registro no guarda ninguna real.
    SALON_NOTIFICATION_EMAIL: 'duena.e2e@example.test',
    // El portal E2E vive en 9100: CORS y el socket del panel lo admiten.
    FRONT_URL: URL_PORTAL,
    // Registro sin códigos de color, para poder buscar en él.
    NO_COLOR: '1',
  };
  if (conGemini) {
    entorno.GEMINI_API_KEY = leerEnvBack().GEMINI_API_KEY ?? '';
  }
  return entorno;
}

/**
 * Se niega a seguir si el entorno pudiera alcanzar un servicio real o la base
 * de desarrollo. `permitirGemini` solo lo usa `yarn e2e:pila`.
 */
export function comprobarEntornoSeguro(
  entorno,
  { permitirGemini = false } = {}
) {
  const fallos = [];
  for (const clave of TOKENS_VACIOS) {
    if (clave === 'GEMINI_API_KEY' && permitirGemini) continue;
    if (entorno[clave] !== '') fallos.push(`${clave} debe estar vacío`);
  }
  if (entorno.WHATSAPP_PHONE_NUMBER_ID !== '') {
    fallos.push('WHATSAPP_PHONE_NUMBER_ID debe estar vacío');
  }
  if (entorno.DB_NAME !== BD_E2E) fallos.push(`DB_NAME debe ser ${BD_E2E}`);
  if (entorno.PORT !== String(PUERTO_API)) {
    fallos.push(`PORT debe ser ${PUERTO_API}`);
  }
  if (fallos.length) {
    throw new Error(`Entorno de la API E2E inseguro: ${fallos.join('; ')}.`);
  }
  return entorno;
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
      env: {
        ...process.env,
        DEV_API_TARGET: `http://127.0.0.1:${PUERTO_API}`,
        VITE_WS_URL: `http://127.0.0.1:${PUERTO_API}`,
        VITE_SITE_URL: URL_PORTAL,
      },
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
      `  API      ${URL_API}  (base ${BD_E2E}, avisos por consola)`,
      `  registro ${REGISTRO_API}`,
      `  propietaria de prueba: ${PROPIETARIA.correo} (contraseña en tests/e2e/README.md)`,
      conGemini
        ? '  Gemini: CON la clave del .env (E2E_CON_GEMINI=1)'
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
