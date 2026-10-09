/**
 * Único punto de lectura de `VITE_GOOGLE_CLIENT_ID`: el client id público de
 * Google Identity Services (viaja al navegador; no es un secreto). Aislado en
 * su propio módulo porque `import.meta` solo existe en el bundle de Vite: Jest
 * compila con ts-jest a CommonJS y `import.meta` falla (TS1343). El
 * `moduleNameMapper` de `jest.config.cjs` lo sustituye por
 * `tests/googleClientIdMock.ts`. Mismo motivo que `src/api/ws-url.ts`.
 *
 * Es una función, no una constante, para que la prueba del botón pueda cambiar
 * el valor entre casos.
 */
export function leerGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
}
