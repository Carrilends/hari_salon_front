/**
 * Único punto de lectura de `VITE_WHATSAPP_PHONE`: el teléfono al que apunta el
 * *click-to-chat* del portal (el número propio de Marlene, no la línea dedicada
 * de la Cloud API, que vive en el backend). Aislado en su propio módulo porque
 * `import.meta` solo existe en el bundle de Vite: Jest compila con ts-jest a
 * CommonJS y `import.meta` falla (TS1343). El `moduleNameMapper` de
 * `jest.config.cjs` lo sustituye por `tests/whatsappPhoneMock.ts`. Mismo motivo
 * que `src/api/ws-url.ts` y `src/composables/seo/site-url.ts`.
 *
 * Sin variable de entorno se usa el número del negocio
 * (`SALON_PHONE_E164`), que es el que estuvo escrito a mano hasta ahora.
 */
import { SALON_PHONE_E164 } from 'src/constants/salon-location';
import { onlyDigits } from 'src/helpers/phone';

export const WHATSAPP_PHONE =
  onlyDigits((import.meta.env.VITE_WHATSAPP_PHONE as string | undefined) ?? '') ||
  SALON_PHONE_E164;
