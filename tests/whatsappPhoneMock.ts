// Stub de `src/constants/whatsapp-phone` para Jest (ver `moduleNameMapper` en
// jest.config.cjs). El módulo real lee `import.meta.env`, que no existe fuera
// del bundle de Vite. Se devuelve el número del negocio, que es el valor por
// defecto cuando no hay `VITE_WHATSAPP_PHONE`.
export const WHATSAPP_PHONE = '573208977471';
