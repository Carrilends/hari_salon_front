/**
 * `true` en el bundle del servidor (`quasar ssg generate` pinta las páginas en
 * Node), `false` en el navegador. Vite lo sustituye por una constante, así que
 * la rama que no toca se cae del bundle.
 *
 * Está aislado en su propio módulo porque `import.meta` solo existe en el
 * bundle de Vite: Jest compila con ts-jest a CommonJS y `import.meta` falla. El
 * `moduleNameMapper` de `jest.config.cjs` lo sustituye por
 * `tests/enServidorMock.ts` (mismo motivo que `src/composables/seo/site-url.ts`).
 */
export const EN_SERVIDOR: boolean = Boolean(import.meta.env.SSR);
