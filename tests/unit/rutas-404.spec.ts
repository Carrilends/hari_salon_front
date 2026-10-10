/**
 * La 404 pasa dentro de `MainLayout` (R3) para tener cabecera. vue-router 4 no
 * casa por orden sino por especificidad: el comodín solo recoge lo que nadie
 * más casa, y no puede tragarse ni las rutas del portal (con o sin barra
 * final, que es como las sirve Netlify) ni las del acceso.
 */
import { createMemoryHistory, createRouter } from 'vue-router';
import routes from 'src/router/routes';

const router = createRouter({ history: createMemoryHistory(), routes });

describe('la 404 dentro del armazón', () => {
  it.each([
    '/no-existe',
    '/no/existe/tampoco',
    '/servicios',
    '/testimonios/abc',
    '/auth/no-existe',
  ])('%s cae en la 404, con la cabecera del portal', (ruta) => {
    const resuelta = router.resolve(ruta);

    expect(resuelta.name).toBe('not-found');
    expect(resuelta.matched).toHaveLength(2);
    expect(resuelta.matched[0].path).toBe('/');
  });

  it.each([
    '/',
    '/services',
    '/services/',
    '/testimonios',
    '/preguntas-frecuentes',
    '/politica-tratamiento-datos',
    '/mi-cuenta',
    '/mis-reservas',
    '/reservas',
    '/mis-empleados',
  ])('%s sigue en su página', (ruta) => {
    expect(router.resolve(ruta).name).not.toBe('not-found');
    expect(router.resolve(ruta).matched.length).toBeGreaterThan(1);
  });

  it.each([
    ['/auth/login', 'login'],
    ['/auth/register', 'register'],
    ['/auth/olvide-contrasena', 'forgot-password'],
  ])('%s sigue en el acceso', (ruta, nombre) => {
    const resuelta = router.resolve(ruta);

    expect(resuelta.name).toBe(nombre);
    expect(resuelta.matched[0].path).toBe('/auth');
  });

  it('ya no hay una 404 suelta fuera del armazón', () => {
    expect(routes.map((r) => r.path)).not.toContain('/:catchAll(.*)*');
  });

  /**
   * `includeStaticRoutes` del SSG solo prerenderiza rutas sin parámetros: la
   * 404 la pinta el cliente sobre el respaldo SPA.
   */
  it('la 404 es dinámica, así que el SSG no la prerenderiza', () => {
    const raiz = routes.find((r) => r.path === '/');
    const hija = raiz?.children?.find((h) => h.name === 'not-found');

    expect(hija?.path).toBe('/:catchAll(.*)*');
  });
});
