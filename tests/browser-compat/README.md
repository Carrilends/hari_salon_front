# NF06 — Compatibilidad con navegadores modernos

> Tabla 44 de `tesis/Requerimientos.md`. Soporte verificado en **Chrome 87+, Firefox 78+, Edge 88+ y Safari 13.1+**. El portal debe renderizar y operar sin errores en los navegadores soportados.

## Cómo se verifica

Suite Playwright que ejecuta un smoke test sobre los **tres motores de renderizado** que cubren los 4 navegadores requeridos:

| Proyecto Playwright | Motor    | Navegadores cubiertos |
|---------------------|----------|-----------------------|
| `chromium-chrome87` | Blink    | Chrome 87+, Edge 88+  |
| `firefox-78`        | Gecko    | Firefox 78+           |
| `webkit-safari13`   | WebKit   | Safari 13.1+          |

Los **targets declarativos** del bundle ya están en `quasar.config.js` (`build.target.browser: ['edge88','firefox78','chrome87','safari13.1']`), por lo que Vite/Babel/autoprefixer transpilan y prefijan para ese rango.

Para cada navegador, el test recorre las rutas públicas:

- `/` (home)
- `/services`
- `/testimonios`
- `/preguntas-frecuentes`
- `/politica-tratamiento-datos`

Verifica que el HTTP status sea < 400, que el root `#q-app` esté visible (Vue montó), y captura un screenshot full-page como evidencia.

## Requisitos previos (una sola vez)

```bash
cd hari_salon_front
yarn add -D @playwright/test --ignore-engines   # ya está en package.json
npx playwright install chromium firefox webkit
```

> Si tu versión de Node es > 20, `yarn` puede bloquear por el campo `engines`. Por eso los comandos abajo se invocan vía `npx`, que no aplica esa validación.

## Ejecución

```bash
cd hari_salon_front
npx playwright test                # corre los 3 proyectos × 5 rutas = 15 tests
npx playwright show-report         # abre el reporte HTML con capturas
```

El servidor de desarrollo se levanta automáticamente (`npx quasar dev` en `http://localhost:9000`) gracias a `webServer` en `playwright.config.ts`. Si ya tienes `quasar dev` corriendo, Playwright lo reutiliza (`reuseExistingServer: true`).

## Salida esperada

```
Running 15 tests using 1 worker
  ✓  [chromium-chrome87] renderiza home (/)
  ✓  [firefox-78]        renderiza home (/)
  ✓  [webkit-safari13]   renderiza home (/)
  ...
  15 passed
```

## Evidencia para la tesis

- **Reporte HTML**: `hari_salon_front/playwright-report/index.html` (incluye miniaturas y traces).
- **Capturas full-page**: `hari_salon_front/test-results/render-renderiza-<ruta>--<engine>/<engine>-<slug>.png`. Se sugiere anexar al menos una captura por motor en el capítulo de pruebas.
- **Configuración declarativa**: `hari_salon_front/quasar.config.js:44-47` (targets de build).

## Archivos relacionados

- `hari_salon_front/playwright.config.ts` — configuración (3 proyectos, webServer, reporter).
- `hari_salon_front/tests/browser-compat/render.spec.ts` — smoke test.
- `hari_salon_front/quasar.config.js` — `build.target.browser` con las versiones del NF06.
