/**
 * Genera las variantes de las fotos del portal: WebP para quien puede y JPEG
 * para quien no, cada una en los anchos que de verdad se pintan.
 *
 * Lee de `imagenes-originales/` y escribe en `public/people/`. Los resultados
 * SE COMMITEAN: el despliegue no ejecuta esto. Volver a correrlo es seguro
 * —parte siempre del original, nunca de una variante ya generada—, que es lo
 * que evita que un JPEG se vaya degradando en cada pasada.
 *
 * Los originales viven FUERA de `public/`: todo lo que hay en `public/` lo copia
 * Vite tal cual a `dist/`, así que ahí dentro se publicarían los 9,7 MB que esta
 * conversión existe para no servir.
 *
 * Anchos: el doble del tamaño en que se pinta, para pantallas de 2x, y un
 * escalón pequeño para móvil. Más escalones no mejoran nada y multiplican los
 * ficheros a mantener.
 */
import { mkdirSync, readdirSync, realpathSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  RECETAS,
  ficherosEsperados,
  nombreDeRespaldo,
  nombreDeVariante,
} from './recetas-imagenes.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ORIGINALES = join(AQUI, '../imagenes-originales');
const DESTINO = join(AQUI, '../public/people');

/** Calidad: 72 en WebP y 78 en JPEG no se distinguen a simple vista en foto. */
const CALIDAD_WEBP = 72;
const CALIDAD_JPEG = 78;

async function generar() {
  mkdirSync(DESTINO, { recursive: true });
  let escritos = 0;

  for (const [original, receta] of Object.entries(RECETAS)) {
    const entrada = join(ORIGINALES, original);
    statSync(entrada); // revienta claro si falta el original

    // Un fondo de CSS no puede usar `srcset`: de esos solo sale el respaldo.
    if (!receta.soloJpeg) {
      for (const ancho of receta.anchos) {
        const base = sharp(entrada).resize({ width: ancho, withoutEnlargement: true });

        await base
          .clone()
          .webp({ quality: CALIDAD_WEBP })
          .toFile(join(DESTINO, nombreDeVariante(original, ancho, 'webp')));
        await base
          .clone()
          .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
          .toFile(join(DESTINO, nombreDeVariante(original, ancho, 'jpg')));
        escritos += 2;
      }
    }

    // El respaldo con el nombre de siempre, para que las rutas que ya existen
    // (los fondos de CSS) no tengan que cambiar de nombre.
    const mayor = Math.max(...receta.anchos);
    await sharp(entrada)
      .resize({ width: mayor, withoutEnlargement: true })
      .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
      .toFile(join(DESTINO, nombreDeRespaldo(original)));
    escritos++;
  }

  /**
   * Lo que la receta ya no manda, fuera. Sin esto, quitar un ancho dejaría el
   * fichero viejo commiteado y desplegado para siempre: `public/people/` es un
   * directorio derivado, no un cajón donde se acumula.
   */
  const esperados = ficherosEsperados();
  let borrados = 0;
  for (const fichero of readdirSync(DESTINO)) {
    if (!/\.(jpe?g|webp)$/i.test(fichero)) continue;
    if (esperados.has(fichero)) continue;
    unlinkSync(join(DESTINO, fichero));
    borrados++;
  }

  const total = readdirSync(DESTINO)
    .filter((f) => /\.(jpe?g|webp)$/i.test(f))
    .reduce((suma, f) => suma + statSync(join(DESTINO, f)).size, 0);

  console.log(
    `${escritos} ficheros escritos · ${borrados} borrados · ${(total / 1024 / 1024).toFixed(2)} MB en public/people/`
  );
}

/**
 * Solo convierte cuando se lo invoca como programa. La prueba de unidad importa
 * este módulo para fijar la receta, y sin esta guarda el simple `import` pondría
 * a `sharp` a convertir las seis fotos dentro de la suite.
 */
// `realpathSync` y no `resolve`: Node resuelve los enlaces simbólicos en la URL
// del módulo, así que con el proyecto detrás de un enlace las dos rutas no
// coincidirían, `generar()` no correría y el script saldría con un 0 silencioso,
// indistinguible de haber funcionado.
if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  generar().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
