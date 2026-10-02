/**
 * Una foto que nadie usa es peso muerto que igualmente se despliega. Había 3,4
 * MB —un tercio de `public/people/`— sin una sola referencia en el código.
 *
 * La prueba lee el disco y el código: si alguien añade una foto y olvida usarla,
 * o quita el último uso de una que sigue ahí, esto se pone rojo.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '../..');
const FOTOS = join(RAIZ, 'public/people');

/** Todo el código fuente, concatenado, donde puede nombrarse una foto. */
function fuentes(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) fuentes(ruta, acumulado);
    else if (/\.(vue|ts|js|scss|html)$/.test(entrada.name))
      acumulado.push(readFileSync(ruta, 'utf8'));
  }
  return acumulado;
}

describe('las fotos de public/people', () => {
  it('todas se usan en alguna parte', () => {
    const codigo = fuentes(join(RAIZ, 'src')).join('\n');
    const huerfanas = readdirSync(FOTOS)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      // Las variantes (`-760.webp`) no se nombran en el código: las construye
      // `FotoResponsiva` en tiempo de ejecución. Lo que se vigila aquí son los
      // originales.
      .filter((f) => !/-\d+\.(jpe?g|webp)$/i.test(f))
      .filter((f) => !codigo.includes(f));

    expect(huerfanas).toEqual([]);
  });

  /**
   * Un `background-image` no admite `<picture>`, y `image-set()` no llega a la
   * matriz de NF06. El arreglo aquí es el simple: el mismo JPEG, más pequeño.
   * Esta prueba vigila el peso, que es lo único que importa de esos cuatro.
   */
  it('el fondo de los formularios pesa lo que debe pesar', () => {
    const { size } = statSync(join(FOTOS, 'rainbow_hair.jpg'));

    expect(size).toBeLessThan(180 * 1024);
  });
});
