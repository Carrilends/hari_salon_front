// Stub de `src/composables/seo/site-url` para Jest (ver `moduleNameMapper` en
// jest.config.cjs). El módulo real lee `import.meta.env`, que no existe fuera
// del bundle de Vite. Un sitio sin URL absoluta deja canonicals y `@id`
// relativos, que es justo lo que los specs de SEO necesitan comprobar.
export const SITE_URL = '';
