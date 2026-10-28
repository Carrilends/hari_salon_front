/**
 * Prueba de la compilación: durante `yarn build:ssg`, el render solo habla con
 * la API de `SSG_API_URL`. Se anota, y hace que el proceso termine con código
 * 1:
 * - una petición con base relativa (`/api/…`, la `VITE_API_URL` del
 *   navegador). En Node, axios 1.x la construye con `new URL('/api/…')` sin
 *   base, que lanza `ERR_INVALID_URL` antes de abrir ningún socket: se vigila
 *   ese `new URL`;
 * - cualquier conexión TCP a un destino distinto de `SSG_API_URL`, que además
 *   se corta.
 *
 * Uso (con la pila E2E en marcha):
 *
 *   NODE_OPTIONS="--require $PWD/tests/ssg/vigilar-peticiones.cjs" \
 *     SSG_API_URL=http://localhost:3101/api yarn build:ssg
 *
 * Se engancha a `globalThis.URL` y a `net.Socket.prototype.connect`, por
 * debajo de `http`, de axios y de `fetch`. Los sockets de Unix (sin puerto) no se miran. Sin
 * `SSG_API_URL` no hace nada: la compilación ya falla por su cuenta.
 */
'use strict';

const net = require('node:net');

const MARCA = '[vigilar-peticiones]';
const api = process.env.SSG_API_URL ? new URL(process.env.SSG_API_URL) : null;

const LOCALES = new Set(['localhost', '127.0.0.1', '::1']);
const normalizar = (host) =>
  String(host ?? 'localhost')
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

function permitido(host, puerto) {
  if (!api) return true;
  const puertoApi = Number(api.port || (api.protocol === 'https:' ? 443 : 80));
  if (Number(puerto) !== puertoApi) return false;
  const h = normalizar(host);
  const hApi = normalizar(api.hostname);
  return h === hApi || (LOCALES.has(h) && LOCALES.has(hApi));
}

const vetadas = [];

if (api) {
  const URLOriginal = globalThis.URL;
  globalThis.URL = class URLVigilada extends URLOriginal {
    constructor(entrada, base) {
      if (base === undefined && typeof entrada === 'string' && entrada.startsWith('/api')) {
        vetadas.push(`relativa ${entrada}`);
        process.stderr.write(`${MARCA} petición con URL relativa: ${entrada}\n`);
      }
      super(entrada, base);
    }
  };

  const conectar = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function connectVigilado(...args) {
    // `net.createConnection` llama con los argumentos ya normalizados: un
    // array `[opciones, callback]`. Quien llama a mano pasa `(opciones)` o
    // `(puerto, host)`.
    const primero = Array.isArray(args[0]) ? args[0][0] : args[0];
    const opciones =
      primero && typeof primero === 'object'
        ? primero
        : { port: primero, host: typeof args[1] === 'string' ? args[1] : undefined };
    if (opciones.path === undefined && opciones.port !== undefined) {
      if (!permitido(opciones.host, opciones.port)) {
        const destino = `${normalizar(opciones.host)}:${opciones.port}`;
        vetadas.push(destino);
        process.stderr.write(
          `${MARCA} petición fuera de SSG_API_URL (${api.host}) cortada: ${destino}\n`
        );
        process.nextTick(() =>
          this.destroy(new Error(`${MARCA} conexión a ${destino} no permitida`))
        );
        return this;
      }
    }
    return conectar.apply(this, args);
  };

  process.on('exit', () => {
    if (vetadas.length) {
      process.stderr.write(
        `${MARCA} ${vetadas.length} petición(es) fuera de SSG_API_URL: ${[
          ...new Set(vetadas),
        ].join(', ')}\n`
      );
      process.exitCode = 1;
    }
  });
}
