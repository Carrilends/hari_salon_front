/**
 * Recrea la base de la pila E2E como copia de la de desarrollo:
 *
 *   1. comprueba que el destino es exactamente `HairSalonE2E` (si no, sale con
 *      código 2 sin tocar nada: ni Docker ni la base);
 *   2. levanta SOLO el servicio `db` de `../hair_salon_back` y espera a que
 *      acepte conexiones (nunca `api`: arrancaría con el `.env` real);
 *   3. `DROP DATABASE IF EXISTS "HairSalonE2E"` y
 *      `CREATE DATABASE "HairSalonE2E" TEMPLATE "HairSalon"`.
 *
 * La copia lleva la misma `COLLATION_VERSION` que guarda la plantilla. El
 * volumen de desarrollo se creó con glibc 2.36 y la imagen actual trae la 2.41:
 * sin ese dato, PostgreSQL rechaza la plantilla («collation version
 * mismatch»). Arreglarlo con `ALTER DATABASE "HairSalon" REFRESH COLLATION
 * VERSION` sería tocar la base de desarrollo, que esta pila no toca; así la
 * copia queda exactamente igual que el original, aviso incluido.
 *
 * `CREATE DATABASE … TEMPLATE` exige que nadie esté conectado a la plantilla.
 * Si alguien lo está (la API de desarrollo, un cliente SQL), falla con un
 * mensaje claro y NO cierra esas sesiones.
 *
 * El destino se puede pedir con `HAIR_SALON_E2E_DB`, pero solo para que la
 * negativa sea comprobable: cualquier valor distinto de `HairSalonE2E` se
 * rechaza.
 */
import { execFileSync } from 'node:child_process';
import { BD_E2E, BD_ORIGEN, RAIZ_BACK, esPrograma, psql } from './pila.mjs';

export class NegativaBd extends Error {}

/** El destino pedido; solo vale `HairSalonE2E`. */
export function destinoPedido() {
  const destino = process.env.HAIR_SALON_E2E_DB ?? BD_E2E;
  if (destino !== BD_E2E) {
    throw new NegativaBd(
      `preparar-bd se niega: el destino es «${destino}» y solo puede ser «${BD_E2E}». No se ha tocado nada.`
    );
  }
  return destino;
}

function levantarDb() {
  execFileSync('docker', ['compose', 'up', '-d', 'db'], {
    cwd: RAIZ_BACK,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
}

async function esperarPostgres(plazoMs = 60_000) {
  const limite = Date.now() + plazoMs;
  let ultimo;
  while (Date.now() < limite) {
    try {
      psql('postgres', 'SELECT 1');
      return;
    } catch (error) {
      ultimo = error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `PostgreSQL no aceptó conexiones en ${plazoMs / 1000} s: ${
      ultimo ? errorDePsql(ultimo) : ''
    }`
  );
}

/** Solo las líneas `ERROR:` de psql: el aviso de collation es ruido. */
function errorDePsql(error) {
  const texto = error?.stderr?.toString() ?? '';
  const errores = texto
    .split(/\r?\n/)
    .filter((l) => l.startsWith('ERROR:'))
    .join(' ');
  return errores || texto.trim() || error.message;
}

function versionDeCollation(bd) {
  const version = psql(
    'postgres',
    `SELECT coalesce(datcollversion, '') FROM pg_database WHERE datname = '${bd}'`,
    { tuplas: true }
  ).trim();
  if (!/^[0-9A-Za-z._-]*$/.test(version)) {
    throw new Error(`Versión de collation inesperada en «${bd}».`);
  }
  return version;
}

function sesionesEn(bd) {
  return Number(
    psql(
      'postgres',
      `SELECT count(*) FROM pg_stat_activity WHERE datname = '${bd}' AND pid <> pg_backend_pid()`,
      { tuplas: true }
    ).trim()
  );
}

export async function prepararBd() {
  const destino = destinoPedido();
  levantarDb();
  await esperarPostgres();

  const enOrigen = sesionesEn(BD_ORIGEN);
  if (enOrigen > 0) {
    throw new Error(
      `«${BD_ORIGEN}» tiene ${enOrigen} conexión(es) abiertas (¿la API de desarrollo o un cliente SQL?). ` +
        'CREATE DATABASE … TEMPLATE no puede copiarla así. Ciérralas y vuelve a intentarlo; este script no las cierra.'
    );
  }
  const enDestino = sesionesEn(destino);
  if (enDestino > 0) {
    throw new Error(
      `«${destino}» tiene ${enDestino} conexión(es) abiertas (¿una pila E2E aún en marcha?). Párala y vuelve a intentarlo.`
    );
  }

  const version = versionDeCollation(BD_ORIGEN);
  const conVersion = version ? ` COLLATION_VERSION = '${version}'` : '';
  try {
    psql('postgres', `DROP DATABASE IF EXISTS "${destino}"`);
    psql(
      'postgres',
      `CREATE DATABASE "${destino}" TEMPLATE "${BD_ORIGEN}"${conVersion}`
    );
  } catch (error) {
    const detalle = errorDePsql(error);
    if (/being accessed by other users/i.test(detalle)) {
      throw new Error(
        `«${BD_ORIGEN}» se abrió mientras se copiaba (${detalle}). Cierra esas conexiones y repite; este script no las cierra.`
      );
    }
    throw new Error(`No se pudo recrear «${destino}»: ${detalle}`);
  }
  console.log(
    `preparar-bd: «${destino}» recreada como copia de «${BD_ORIGEN}».`
  );
}

if (esPrograma('preparar-bd.mjs')) {
  prepararBd().catch((error) => {
    console.error(error.message);
    process.exit(error instanceof NegativaBd ? 2 : 1);
  });
}
