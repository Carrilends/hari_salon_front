/**
 * `quasar ssg serve` (y un hosting estático con «pretty URLs») responde a
 * `/services` con un 301 a `/services/`: el HTML se generó para `/services` y
 * el navegador hidrata en `/services/`. Lo que dependa de la ruta tiene que
 * dar lo mismo en las dos, o la hidratación no casa.
 */
import { rutaSinBarraFinal } from 'src/helpers/ruta-sin-barra';

describe('rutaSinBarraFinal', () => {
  it('quita la barra final', () => {
    expect(rutaSinBarraFinal('/services/')).toBe('/services');
    expect(rutaSinBarraFinal('/services//')).toBe('/services');
  });

  it('deja igual la que no la tiene', () => {
    expect(rutaSinBarraFinal('/services')).toBe('/services');
  });

  it('la raíz sigue siendo la raíz', () => {
    expect(rutaSinBarraFinal('/')).toBe('/');
  });
});
