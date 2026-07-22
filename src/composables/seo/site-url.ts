/**
 * Único punto de lectura de `VITE_SITE_URL` (URL absoluta del sitio, sin barra
 * final). Lo consumen `useSeo.ts` (canonical / Open Graph) y `structuredData.ts`
 * (`@id` de los objetos schema.org).
 *
 * Está aislado en su propio módulo porque `import.meta` solo existe en el bundle
 * de Vite: Jest compila con ts-jest a CommonJS y `import.meta` falla (TS1343).
 * El `moduleNameMapper` de `jest.config.cjs` sustituye este archivo por
 * `tests/siteUrlMock.ts`, así los specs pueden importar los generadores de SEO
 * sin tocar el entorno de Vite. Mismo motivo que la nota de
 * `src/helpers/businessHours.ts`.
 */
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') || '';
