/**
 * Construcción de URLs de entrega de Cloudinary. **Funciones puras**: ni red ni
 * dependencias.
 *
 * Viven aparte de `cloudinaryHelpers.ts` porque aquel módulo importa las
 * instancias de Axios para firmar y subir, y esas leen `import.meta.env`, que
 * Jest no sabe compilar a CommonJS. Cualquier componente que solo quisiera
 * pintar una miniatura se veía obligado a simular dos módulos de API que no
 * usa. Aquí no hace falta nada.
 *
 * `cloudinaryHelpers.ts` las reexporta, así que quien ya las importaba de allí
 * sigue igual.
 */

/**
 * Inyecta `f_auto,q_auto` (y opcionalmente `w_<width>`) en una URL de Cloudinary
 * para que el CDN sirva el formato y tamaño óptimos por dispositivo.
 *
 * https://cloudinary.com/documentation/image_optimization
 */
export function optimizeCloudinaryUrl(
  url: string | undefined,
  width?: number
): string {
  if (
    !url ||
    !url.includes('res.cloudinary.com') ||
    !url.includes('/upload/')
  ) {
    return url || '';
  }
  const transforms = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`, 'c_limit');
  const transformPart = transforms.join(',');
  if (/\/upload\/(f_auto|q_auto|w_)/i.test(url)) return url;
  return url.replace('/upload/', `/upload/${transformPart}/`);
}

export function buildCloudinarySrcset(
  url: string | undefined,
  widths: number[] = [240, 480, 720, 1080]
): string {
  if (!url || !url.includes('res.cloudinary.com')) return '';
  return widths.map((w) => `${optimizeCloudinaryUrl(url, w)} ${w}w`).join(', ');
}
