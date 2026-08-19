/**
 * Único punto de lectura de `VITE_WS_URL` (URL del WebSocket del panel, directo
 * a Railway y NO al proxy de Netlify, decisión N4). Aislado en su propio módulo
 * porque `import.meta` solo existe en el bundle de Vite: Jest compila con
 * ts-jest a CommonJS y `import.meta` falla (TS1343). El `moduleNameMapper` de
 * `jest.config.cjs` lo sustituye por `tests/wsUrlMock.ts`. Mismo motivo que
 * `src/composables/seo/site-url.ts`.
 */
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') || '';
