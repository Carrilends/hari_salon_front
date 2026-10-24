/**
 * Red de seguridad independiente de la pila E2E: se carga en la API con
 * `NODE_OPTIONS=--require <este archivo>` (`entornoApi()` en `pila.mjs`) y
 * corta toda conexión de salida que no sea a la propia máquina.
 *
 * No depende de cómo el backend lea su `.env`. Si los tokens vacíos dejaran de
 * ganar al `.env` (otra versión de `@nestjs/config`, un `envFilePath` o un
 * `override` nuevos) y la API eligiera la Cloud API de WhatsApp, Resend,
 * TypeSafe, Google o Cloudinary, la petición tampoco saldría: no hay red fuera
 * del bucle local.
 *
 * Se tapan tres niveles:
 * - `globalThis.fetch` (undici): rechaza;
 * - `http.request/get` y `https.request/get`: lanzan;
 * - `net.Socket.prototype.connect` (por debajo de todo lo anterior, de `tls` y
 *   de cualquier cliente): el socket se destruye con error, como un
 *   ECONNREFUSED, sin llegar a conectar.
 *
 * Se permite: 127.0.0.0/8, `::1`, `localhost` y los sockets de Unix
 * (PostgreSQL va por TCP a 127.0.0.1). Solo con `E2E_CON_GEMINI=1`, que pone
 * `yarn e2e:pila` a petición expresa, se permite además el host de la API de
 * Gemini. `yarn test:e2e` lo fija siempre a `0`.
 *
 * Al cargarse escribe en stderr una línea `[bloquear-red] activo …` con el pid,
 * el script y el resultado de una autoprueba (un `fetch` a un host externo que
 * debe quedar rechazado sin salir a la red). `pila-segura.spec.ts` busca esa
 * línea para el proceso de la API (`dist/main`).
 */
'use strict';

const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const MARCA = '[bloquear-red]';
const HOST_GEMINI = 'generativelanguage.googleapis.com';
const conGemini = process.env.E2E_CON_GEMINI === '1';

function normalizar(host) {
  return String(host ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
}

function permitido(host) {
  const h = normalizar(host);
  if (h === '' || h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '::1' || h === '0:0:0:0:0:0:0:1') return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^::ffff:127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (conGemini && h === HOST_GEMINI) return true;
  return false;
}

function errorDeBloqueo(host, via) {
  const error = new Error(
    `${MARCA} conexión de salida bloqueada (${via}) hacia «${host}»: la pila E2E solo permite la propia máquina.`
  );
  error.code = 'E2E_RED_BLOQUEADA';
  return error;
}

/** Mientras corre la autoprueba no se avisa: sus bloqueos son a propósito. */
let silencio = false;

function avisar(error) {
  if (!silencio) process.stderr.write(`${error.message}\n`);
}

// ── fetch ───────────────────────────────────────────────────────────────────
const fetchOriginal = globalThis.fetch;
if (typeof fetchOriginal === 'function') {
  globalThis.fetch = function fetchVigilado(entrada, opciones) {
    let host;
    try {
      const url =
        typeof entrada === 'string' || entrada instanceof URL
          ? new URL(String(entrada))
          : new URL(entrada.url);
      host = url.hostname;
    } catch {
      host = '';
    }
    if (!permitido(host)) {
      const error = errorDeBloqueo(host, 'fetch');
      avisar(error);
      return Promise.reject(error);
    }
    return fetchOriginal.call(this, entrada, opciones);
  };
}

// ── http / https ────────────────────────────────────────────────────────────
function hostDePeticion(args) {
  const [a, b] = args;
  if (typeof a === 'string' || a instanceof URL) {
    try {
      return new URL(String(a)).hostname;
    } catch {
      return '';
    }
  }
  const opciones = (a && typeof a === 'object' ? a : b) || {};
  if (opciones.socketPath) return 'localhost';
  return opciones.hostname ?? opciones.host ?? 'localhost';
}

for (const [nombre, modulo] of [
  ['http', http],
  ['https', https],
]) {
  for (const metodo of ['request', 'get']) {
    const original = modulo[metodo];
    modulo[metodo] = function peticionVigilada(...args) {
      const host = hostDePeticion(args);
      if (!permitido(host)) {
        const error = errorDeBloqueo(host, `${nombre}.${metodo}`);
        avisar(error);
        throw error;
      }
      return original.apply(this, args);
    };
  }
}

// ── sockets (todo lo demás) ─────────────────────────────────────────────────
const connectOriginal = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connectVigilado(...args) {
  let opciones = args[0];
  if (Array.isArray(opciones)) opciones = opciones[0];
  let host;
  if (opciones && typeof opciones === 'object') {
    host = opciones.path ? 'localhost' : opciones.host ?? 'localhost';
  } else if (typeof opciones === 'string' && !/^\d+$/.test(opciones)) {
    host = 'localhost'; // socket de Unix
  } else {
    host = typeof args[1] === 'string' ? args[1] : 'localhost';
  }
  if (!permitido(host)) {
    const error = errorDeBloqueo(host, 'net.connect');
    avisar(error);
    process.nextTick(() => this.destroy(error));
    return this;
  }
  return connectOriginal.apply(this, args);
};

// ── autoprueba y aviso ──────────────────────────────────────────────────────
// Las tres capas, contra un host externo: ninguna debe llegar a la red.
const esBloqueo = (e) => Boolean(e && e.code === 'E2E_RED_BLOQUEADA');

function probarFetch() {
  if (typeof globalThis.fetch !== 'function')
    return Promise.resolve('sin-fetch');
  return globalThis.fetch('https://example.com/').then(
    () => 'SALIO',
    (e) => (esBloqueo(e) ? 'ok' : `otro-error:${e && e.code}`)
  );
}

function probarHttps() {
  try {
    https.get('https://example.com/').destroy();
    return Promise.resolve('SALIO');
  } catch (e) {
    return Promise.resolve(esBloqueo(e) ? 'ok' : `otro-error:${e && e.code}`);
  }
}

function probarSocket() {
  return new Promise((resolver) => {
    const socket = new net.Socket();
    socket.once('connect', () => {
      socket.destroy();
      resolver('SALIO');
    });
    socket.once('error', (e) =>
      resolver(esBloqueo(e) ? 'ok' : `otro-error:${e && e.code}`)
    );
    socket.connect(443, 'example.com');
  });
}

const script = process.argv[1] ?? '(sin script)';
const permitidos = conGemini ? `loopback+${HOST_GEMINI}` : 'loopback';
silencio = true;
Promise.all([probarFetch(), probarHttps(), probarSocket()]).then(
  ([f, h, n]) => {
    silencio = false;
    const todo = [f, h, n].every((r) => r === 'ok' || r === 'sin-fetch')
      ? 'ok'
      : 'FALLO';
    process.stderr.write(
      `${MARCA} activo pid=${process.pid} script=${script} permitido=${permitidos} ` +
        `autoprueba=${todo} (fetch=${f} https=${h} socket=${n})\n`
    );
  }
);
