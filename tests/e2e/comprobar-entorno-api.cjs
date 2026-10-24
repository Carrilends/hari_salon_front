/**
 * Comprobación previa al envío: ¿el backend, cargando su `.env` como lo hace
 * la aplicación, se queda con el entorno de la pila E2E?
 *
 * La lanza `comprobarEntornoEnElBackend()` (`pila.mjs`) ANTES de arrancar
 * ningún servidor, con `cwd = hair_salon_back` y el entorno de `entornoApi()`.
 * Carga el `@nestjs/config` instalado en el backend y llama a
 * `ConfigModule.forRoot()` sin opciones, igual que `src/app.module.ts:34`; con
 * eso `process.env` queda como lo verá la API. Después compara, clave por
 * clave, con lo que el arnés quiere: si el `.env` hubiera ganado en alguna
 * (otra versión de `@nestjs/config`, un `envFilePath` u `override` nuevos), lo
 * dice y sale con código 1, y no arranca nada.
 *
 * No envía nada ni abre la base: solo lee el `.env`. Imprime nombres de
 * variables, nunca sus valores. Lo esperado llega por stdin (JSON).
 */
'use strict';

const { readFileSync } = require('node:fs');

async function main() {
  const esperado = JSON.parse(readFileSync(0, 'utf8'));
  const desdeBack = (m) =>
    require(require.resolve(m, { paths: [process.cwd()] }));
  desdeBack('reflect-metadata');
  const { ConfigModule } = desdeBack('@nestjs/config');
  await ConfigModule.forRoot();

  const claves = Object.keys(esperado).sort();
  const distintas = claves.filter(
    (clave) => process.env[clave] !== esperado[clave]
  );
  if (distintas.length) {
    process.stderr.write(
      `comprobar-entorno-api: el backend NO se queda con el entorno E2E en: ${distintas.join(
        ', '
      )}. No se arranca nada.\n`
    );
    process.exit(1);
  }
  process.stdout.write(
    `comprobar-entorno-api: ok, tras ConfigModule.forRoot() el backend ve las ${
      claves.length
    } claves del arnés (${claves.join(', ')}).\n`
  );
}

main().catch((error) => {
  process.stderr.write(`comprobar-entorno-api: ${error.message}\n`);
  process.exit(1);
});
