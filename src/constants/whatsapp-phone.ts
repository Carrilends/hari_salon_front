/**
 * Único punto de lectura de `VITE_WHATSAPP_PHONE`: el teléfono al que apunta el
 * *click-to-chat* del portal. Desde el plan 06 (F7) es **la línea del negocio**
 * —la de la Cloud API, donde contesta el asistente—, no el móvil personal de
 * Marlene. Aislado en su propio módulo porque
 * `import.meta` solo existe en el bundle de Vite: Jest compila con ts-jest a
 * CommonJS y `import.meta` falla (TS1343). El `moduleNameMapper` de
 * `jest.config.cjs` lo sustituye por `tests/whatsappPhoneMock.ts`. Mismo motivo
 * que `src/api/ws-url.ts` y `src/composables/seo/site-url.ts`.
 *
 * Sin variable de entorno se usa el teléfono del salón (`SALON_PHONE_E164`):
 * ahí contesta una persona, no el asistente. Sirve mientras la línea no exista,
 * pero en producción `VITE_WHATSAPP_PHONE` tiene que estar puesta (F9).
 */
import { SALON_PHONE_E164 } from 'src/constants/salon-location';
import { onlyDigits } from 'src/helpers/phone';

export const WHATSAPP_PHONE =
  onlyDigits((import.meta.env.VITE_WHATSAPP_PHONE as string | undefined) ?? '') ||
  SALON_PHONE_E164;
