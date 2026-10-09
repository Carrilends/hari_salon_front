/**
 * `?redirect=` solo admite rutas internas (§7.7).
 *
 * El menú (M4), los guardas de sesión y el asistente mandan a entrar con
 * `redirect`; al volver, el login y ahora también el registro (A12) navegan a
 * ese destino. Sin sanear, `?redirect=//otro.sitio` sería una redirección
 * abierta, y `?redirect=/auth/login` devolvería al login a quien acaba de
 * entrar.
 */
import {
  DESTINO_POR_DEFECTO,
  redireccionSegura,
} from 'src/helpers/redireccion-segura';

describe('redireccionSegura', () => {
  it('el destino por defecto es el catálogo', () => {
    expect(DESTINO_POR_DEFECTO).toBe('/services');
  });

  it.each([
    '/testimonios',
    '/mis-reservas',
    '/services?pagina=2#lista',
    '/mi-cuenta',
    '/autorizado',
    '/authors',
  ])('%s es interna y se respeta', (ruta) => {
    expect(redireccionSegura(ruta)).toBe(ruta);
  });

  it('recorta los espacios de alrededor de una ruta interna', () => {
    expect(redireccionSegura('  /testimonios ')).toBe('/testimonios');
  });

  it.each([
    'https://otro.sitio/robo',
    'otro.sitio',
    '//otro.sitio',
    '/\\otro.sitio',
    '/\t/otro.sitio',
    'javascript:alert(1)',
    '',
    '   ',
  ])('%j no es interna: va al catálogo', (valor) => {
    expect(redireccionSegura(valor)).toBe('/services');
  });

  it.each([[undefined], [null], [42], [['/testimonios']]] as unknown[][])(
    '%j no es una cadena: va al catálogo',
    (valor: unknown) => {
      expect(redireccionSegura(valor)).toBe('/services');
    }
  );

  it.each([
    '/auth/login',
    '/auth/register?redirect=/x',
    '/auth',
    '/auth?x=1',
    '/Auth/login',
  ])('%s volvería al acceso (bucle): va al catálogo', (ruta) => {
    expect(redireccionSegura(ruta)).toBe('/services');
  });
});
