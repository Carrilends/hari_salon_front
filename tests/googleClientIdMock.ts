// Stub de `src/constants/google-client-id` para Jest (ver `moduleNameMapper` en
// jest.config.cjs). El módulo real lee `import.meta.env`, que no existe fuera
// del bundle de Vite. Sin client id: el botón de Google se oculta y avisa
// `disponible: false`, que es lo que ve cualquier prueba que no lo doble.
export function leerGoogleClientId(): string {
  return '';
}
