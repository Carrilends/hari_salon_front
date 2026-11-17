# NF03 — Compatibilidad con navegadores actuales

El portal debe funcionar en las **versiones actuales de Chrome, Edge, Firefox y Safari**, en móvil y en computador. Decisión de Luis (2026-11-17): se descartan las versiones viejas (Chrome 87, Firefox 78, Edge 88, Safari 13.1). `build.target` de `quasar.config.js` se deja como estaba (el código se sigue generando para un rango amplio), pero ya no es una promesa.

## Cómo se verifica

Suite Playwright que corre completa en cuatro proyectos:

| Proyecto        | Navegador                                   |
|-----------------|---------------------------------------------|
| `chrome`        | Google Chrome instalado (`channel: 'chrome'`) |
| `edge`          | Microsoft Edge instalado (`channel: 'msedge'`) |
| `firefox`       | Firefox de Playwright                       |
| `webkit-safari` | Motor WebKit de Playwright (Safari)         |

Chrome y Edge usan los navegadores instalados en la máquina; Firefox y WebKit vienen con Playwright. Móvil (390 px) y computador (1280 px) se cubren con los viewports de cada prueba.

`render.spec.ts` recorre las rutas públicas (`/`, `/services`, `/testimonios`, `/preguntas-frecuentes`, `/politica-tratamiento-datos`): status < 400, `#q-app` visible y captura full-page. Las demás pruebas comprueban geometría, menú, asistente, movimiento reducido, zonas de toque y peso del inicio.

## Ejecución

```bash
cd hari_salon_front
npx playwright install firefox webkit   # una vez; Chrome y Edge deben estar instalados
npx playwright test                     # los cuatro proyectos
npx playwright test --project=firefox   # uno solo
npx playwright show-report
```

`quasar dev` se levanta solo en `http://localhost:9000` (`PW_PORT`) o se reutiliza si ya corre.

## Archivos relacionados

- `playwright.config.ts` — los cuatro proyectos y el `webServer`.
- `tests/browser-compat/*.spec.ts` — las pruebas.
