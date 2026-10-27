// Stub de `src/composables/shared/en-servidor` para Jest (ver `moduleNameMapper`
// en jest.config.cjs). El módulo real lee `import.meta.env.SSR`, que no existe
// fuera del bundle de Vite. En las pruebas se está en el navegador; la que
// quiera fingir el servidor lo pide con `jest.mock`.
export const EN_SERVIDOR = false;
