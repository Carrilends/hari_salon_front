# Flujos E2E sobre la pila local segura

Cuatro flujos de punta a punta en Chromium, con un navegador de verdad contra una
API de verdad, más una comprobación previa de que esa API es la segura:

| Archivo                         | Qué comprueba                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pila-segura.spec.ts`           | Corre primero (proyecto `pila`). La API responde en el 3101, el aviso de WhatsApp de una reserva sale por el adaptador de consola y la reserva queda en `HairSalonE2E`. Si falla, los flujos no corren.                                                             |
| `reserva-sin-cuenta.spec.ts`    | Portada → catálogo → un servicio a la bolsa → cajón → primer día con huecos y primera hora → datos con el consentimiento marcado a mano → pantalla de éxito.                                                                                                        |
| `cuenta-y-mis-reservas.spec.ts` | Registro → reserva con la sesión iniciada → «Mis reservas» la muestra pendiente → cancelarla → pasa a cancelada.                                                                                                                                                    |
| `bandeja-confirma.spec.ts`      | Reserva creada por la API → la propietaria entra → la bandeja la muestra pendiente → «Confirmar» → aparece confirmada.                                                                                                                                              |
| `hora-ocupada.spec.ts`          | Se lee por la API el primer hueco libre de mañana de una estilista; la visitante lo elige en el cajón; otra persona lo ocupa por la API antes de que confirme; al confirmar, el cajón avisa «La disponibilidad cambió y ya no hay tiempo suficiente con … a las …». |

`apoyo.ts` reúne lo común: las rutas reales de la API (`POST /service/search`,
`GET /workers/availability`, `POST /reservations`), las fechas en hora de Bogotá y
los pasos del portal que se repiten. Las pruebas localizan por rol y texto visible,
como `tests/browser-compat/`; donde un elemento no tiene nombre accesible propio
(la rejilla de horas, la tarjeta de una reserva) se usa su `data-test`. No se toca
el código del portal.

## Ejecutar

```bash
cd hari_salon_front
nvm use            # Node 20: yarn 1 aborta con Node 21+ por el campo `engines`
yarn test:e2e      # = node tests/e2e/preparar-bd.mjs && npx playwright test -c playwright.e2e.config.ts
```

Con Node 21+ y sin `nvm`, los mismos dos comandos funcionan a mano:
`node tests/e2e/preparar-bd.mjs && npx playwright test -c playwright.e2e.config.ts`.

Informe HTML: `playwright-report/e2e/`. Trazas de los fallos: `test-results/e2e/`.

Para las ejecuciones manuales (Tarea 7 de la F7), la misma pila sin pruebas:

```bash
yarn e2e:pila                       # recrea la base, levanta API y portal, crea la propietaria
E2E_CON_GEMINI=1 yarn e2e:pila      # igual, pero la API conserva el GEMINI_API_KEY del .env
```

Queda en marcha hasta Ctrl+C. Portal en <http://localhost:9100>.

## La pila falla cerrada

El `.env` de `hair_salon_back` tiene credenciales reales: una API arrancada con él
tal cual mandaría WhatsApp a teléfonos de verdad al crear una reserva. Por eso:

1. **La API la arranca siempre el arnés**, con `reuseExistingServer: false` en los
   dos servidores: si algo ya escucha en 3101 o 9100, Playwright se niega a empezar.
   `yarn e2e:pila` comprueba lo mismo antes de arrancar.
2. **Entorno propio** (`entornoApi()` en `pila.mjs`): `PORT=3101`,
   `DB_HOST=127.0.0.1`, `DB_PORT=3334`, `DB_NAME=HairSalonE2E`,
   `NODE_ENV=development` y `WHATSAPP_TOKEN`, `EMAIL_PROVIDER`, `GEMINI_API_KEY`,
   `TYPESAFE_KEY` vacíos. Como segunda red también van vacíos
   `WHATSAPP_PHONE_NUMBER_ID` (sin él, el adaptador de la Cloud API lanza antes de
   ir a la red), `EMAIL_API_KEY` y `TYPESAFE_API_KEY` (el nombre que de verdad lee el
   asistente); el número y el correo de la dueña son de prueba; `TYPEORM_SYNCHRONIZE`
   es `false` y `FRONT_URL` apunta al 9100. `comprobarEntornoSeguro()` lanza si
   alguna de esas condiciones no se cumple. Lo demás (JWT, plantillas…) lo pone el
   `.env`: `@nestjs/config` solo copia a `process.env` las claves que el proceso no
   trae, así que el entorno del arnés gana, aunque sea una cadena vacía.
3. **Base propia.** `preparar-bd.mjs` levanta solo el servicio `db` del backend
   (nunca `api`), se niega a seguir si el destino no es exactamente `HairSalonE2E`
   (sale con código 2 sin tocar Docker ni la base), y recrea esa base como copia de
   `HairSalon` con `CREATE DATABASE … TEMPLATE`. Si `HairSalon` tiene conexiones
   abiertas, falla con un mensaje claro y no las cierra. La copia conserva la
   `COLLATION_VERSION` de la plantilla (el volumen se creó con glibc 2.36 y la
   imagen trae la 2.41; sin ese dato PostgreSQL rechaza la plantilla), para no
   tener que tocar `HairSalon` con `REFRESH COLLATION VERSION`. `psql()` solo abre
   sesiones en `postgres` y `HairSalonE2E`.
4. **Puertos propios:** API en 3101, portal en 9100 (con `DEV_API_TARGET` y
   `VITE_WS_URL` hacia el 3101).

Comprobar la negativa: `HAIR_SALON_E2E_DB=HairSalon node tests/e2e/preparar-bd.mjs`
sale con código 2 y no toca nada.

### Dónde se ve que WhatsApp va por consola

El `webServer` de la API escribe su salida con `tee` en
`test-results/e2e-registros/api.log` (fuera del `outputDir`, que Playwright vacía al
empezar; `tee` lo trunca en cada arranque). `pila-segura.spec.ts` lo lee. El backend
no anuncia al arrancar qué adaptador eligió, así que la prueba crea una reserva con
un teléfono de prueba y espera en el registro `[WhatsAppSender:console]` seguido de
`--- WHATSAPP SIMULADO ---` y `Para: 57<ese teléfono>`, sin rastro de la Cloud API
ni del proveedor de correo. `yarn e2e:pila` escribe en el mismo archivo.

## Datos de prueba

- Base: `HairSalonE2E`, recreada en cada `yarn test:e2e` y en cada `yarn e2e:pila`.
  Lo que se escriba en ella se pierde la siguiente vez.
- Correos únicos por ejecución: `e2e+<etiqueta>.<marca de tiempo>@example.test`.
  Teléfonos `300 000 1xxx`: el aviso solo se imprime en la consola.
- **Propietaria de prueba:** `duena.e2e@example.test`, contraseña `DuenaE2e2026`.
  Se registra por la API (`POST /api/auth/register`) y se promueve con
  `UPDATE users SET roles = ARRAY['admin']` dentro de `HairSalonE2E`
  (`asegurarPropietaria()` en `pila.mjs`; la llaman `bandeja-confirma.spec.ts` y
  `yarn e2e:pila`). Solo existe en la copia desechable.
- Clientas de prueba registradas por el flujo 2: contraseña `ClaveE2e2026`.

## Notas

- `pila.mjs` no usa `import.meta`: Playwright lo transpila a CommonJS al cargar la
  configuración. La raíz del front se busca hacia arriba desde el directorio de
  trabajo, por el `name` de su `package.json`.
- La API corre con `start:dev` (`nest start --watch`), que recompila en
  `hair_salon_back/dist/` (carpeta ignorada por git).
- Jest no ve esta carpeta (`testPathIgnorePatterns` en `jest.config.cjs`).
