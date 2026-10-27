/**
 * La ruta sin la barra final (`/services/` → `/services`; `/` se queda).
 *
 * Las páginas se generan para `/services`, pero `quasar ssg serve` (y un
 * hosting estático con «pretty URLs») redirige a `/services/`, y Vue Router
 * casa las dos con la misma ruta. Lo que se decida por `route.path` tiene que
 * compararse así, o el navegador pinta otra cosa que el HTML y la hidratación
 * no casa.
 */
export function rutaSinBarraFinal(path: string): string {
  return path.replace(/(.)\/+$/, '$1');
}
