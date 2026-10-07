/**
 * La categoría de un servicio: **la única fuente** (§8.1 de la hoja de ruta).
 *
 * La resuelven la tarjeta y el renglón de la lista (fase B) y la ficha de
 * detalle (fase D). Vivía en dos sitios y cada uno la calculaba a su manera, con
 * lo que el mismo servicio se rotulaba distinto según dónde se mirara.
 *
 * La cadena, en este orden:
 *
 * 1. **`service.type` traducido.** Es una columna de texto libre que solo
 *    escribe el sembrado (`hair_salon_back/src/service/seed/mappings/*.ts`) y lo
 *    que escribe son rótulos en inglés (`hair-women`). Un valor que no esté en
 *    la tabla no se pinta en crudo: pasa al punto 2.
 * 2. **La primera etiqueta.** El sembrado **no** rellena `type` y el DTO del
 *    backend lo tiene comentado, así que esto no es el caso raro, es el normal:
 *    la etiqueta es el único dato de categoría que trae un servicio de verdad.
 * 3. **Cadena vacía**, y quien pinta decide no pintar la línea. Mejor eso que
 *    inventarse una categoría.
 *
 * Los nombres traducidos son los del lienzo (tablero «Servicios · mostrador en
 * tinta»).
 */

/** Lo poco que hace falta de un servicio para rotularlo. */
export type ServicioRotulable = {
  type?: string | null;
  tags?: unknown;
};

const ETIQUETAS: Record<string, string> = {
  'hair-women': 'Cortes de dama',
  'hair-men': 'Barbería',
  nails: 'Uñas',
  makeup: 'Maquillaje',
  'brows-lashes': 'Cejas y pestañas',
  tinting: 'Color y tinturas',
};

/**
 * `normalizeServiceTags` de `ServicePage.vue` reenvía las etiquetas como
 * identificadores al aplicar una promoción. Un uuid no es una etiqueta: se
 * descarta antes de que llegue a pantalla.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EtiquetaCruda = string | { name?: string } | null | undefined;

/**
 * Los nombres de etiqueta utilizables. `/service/search` las trae con
 * `leftJoinAndSelect`, o sea como objetos con `name`, aunque
 * `src/interfaces/service.ts` las tenga tipadas como `string[]`: se aceptan las
 * dos formas y se tira lo que no sea un nombre.
 */
export function etiquetasDeServicio(servicio: ServicioRotulable): string[] {
  const crudas = (servicio?.tags ?? []) as EtiquetaCruda[];
  if (!Array.isArray(crudas)) return [];
  return crudas
    .map((etiqueta) =>
      typeof etiqueta === 'string' ? etiqueta : etiqueta?.name ?? ''
    )
    .map((nombre) => String(nombre).trim())
    .filter((nombre) => nombre.length > 0 && !UUID.test(nombre));
}

export function etiquetaDeCategoria(servicio: ServicioRotulable): string {
  const clave = String(servicio?.type ?? '')
    .trim()
    .toLowerCase();
  const traducido = ETIQUETAS[clave];
  if (traducido) return traducido;
  return etiquetasDeServicio(servicio)[0] ?? '';
}
