# Flujos E2E sobre la pila local segura

Flujos de punta a punta en Chromium, con un navegador de verdad contra una
API de verdad, más una comprobación previa de que esa API es la segura:

| Archivo                         | Qué comprueba                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pila-segura.spec.ts`           | Corre primero (proyecto `pila`). La API responde en el 3101, la red de salida está cortada en su proceso, el aviso de WhatsApp de una reserva sale por el adaptador de consola y la reserva queda en `HairSalonE2E`. Si falla, los flujos no corren.                                                                                                                                              |
| `reserva-sin-cuenta.spec.ts`    | Portada → catálogo → un servicio a la bolsa → cajón → primer día con huecos y primera hora → datos con el consentimiento marcado a mano → pantalla de éxito; el `POST` fue al proxy del portal y la fila está en `HairSalonE2E`.                                                                                                                                                                  |
| `cuenta-y-mis-reservas.spec.ts` | Registro → reserva con la sesión iniciada → «Mis reservas» la muestra pendiente → cancelarla → pasa a cancelada.                                                                                                                                                                                                                                                                                  |
| `bandeja-confirma.spec.ts`      | Reserva creada por la API → la propietaria entra → la bandeja la muestra pendiente → «Confirmar» → aparece confirmada.                                                                                                                                                                                                                                                                            |
| `hora-ocupada.spec.ts`          | Se lee por la API el primer hueco libre de mañana de una estilista; la visitante lo elige en el cajón; otra persona lo ocupa por la API antes de que confirme; al confirmar, el cajón avisa «La disponibilidad cambió y ya no hay tiempo suficiente con … a las …».                                                                                                                               |
| `eliminar-cuenta.spec.ts`       | Cuenta → «Cerrar sesión» → «Eliminar mi cuenta» con contraseña (una errónea no borra) → portada con el aviso → no puede entrar ni renovar la sesión → la cita sigue en la bandeja con nombre y teléfono (o con el correo si no dio teléfono), la «para otra persona» conserva su nombre y la reseña queda como «Clienta del salón»; una cuenta de administración no ve la acción y la API da 403. |

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
E2E_CON_GEMINI=1 yarn e2e:pila      # igual, pero la API conserva el GEMINI_API_KEY del .env y puede salir al host de Gemini
```

Queda en marcha hasta Ctrl+C. Portal en <http://localhost:9100>.

## La pila falla cerrada

El `.env` de `hair_salon_back` tiene credenciales reales: una API arrancada con él
tal cual mandaría WhatsApp a teléfonos de verdad al crear una reserva. Por eso hay
varias capas, y dos de ellas no dependen de la misma cosa:

1. **La API la arranca siempre el arnés**, con `reuseExistingServer: false` en los
   dos servidores: si algo ya escucha en 3101 o 9100, Playwright se niega a empezar.
   `yarn e2e:pila` comprueba lo mismo antes de arrancar.
2. **Entorno propio** (`entornoApi()` en `pila.mjs`): `PORT=3101`,
   `DB_HOST=127.0.0.1`, `DB_PORT=3334`, `DB_NAME=HairSalonE2E`,
   `NODE_ENV=development` y `WHATSAPP_TOKEN`, `EMAIL_PROVIDER`, `GEMINI_API_KEY`,
   `TYPESAFE_KEY` vacíos. Van también vacíos `WHATSAPP_PHONE_NUMBER_ID` (sin él, el
   adaptador de la Cloud API lanza antes de `fetch`), `EMAIL_API_KEY` y
   `TYPESAFE_API_KEY` (el nombre que de verdad lee el asistente); el número
   (`573000000001`) y el correo (`duena.e2e@example.test`) de la dueña son de
   prueba; `TYPEORM_SYNCHRONIZE=false`; `FRONT_URL=http://localhost:9100`;
   `NODE_OPTIONS` carga `bloquear-red.cjs` (capa 5) y `E2E_CON_GEMINI` va siempre
   explícito (`0`, o `1` solo en `E2E_CON_GEMINI=1 yarn e2e:pila`). Lo demás (JWT,
   plantillas…) lo pone el `.env`. **Ojo:** todas estas claves ganan al `.env` por
   el mismo mecanismo (`@nestjs/config` solo copia a `process.env` las claves que el
   proceso no trae); no son redes independientes entre sí.
3. **Comprobación del entorno declarado.** `comprobarEntornoSeguro()` lanza, antes
   de arrancar nada, si no se cumple exactamente esto: las siete claves vacías
   (`WHATSAPP_TOKEN`, `EMAIL_PROVIDER`, `GEMINI_API_KEY` salvo con Gemini,
   `TYPESAFE_KEY`, `WHATSAPP_PHONE_NUMBER_ID`, `EMAIL_API_KEY`, `TYPESAFE_API_KEY`);
   `SALON_OWNER_WHATSAPP` y `SALON_NOTIFICATION_EMAIL` iguales a los de prueba;
   `DB_NAME`, `DB_HOST`, `DB_PORT`, `PORT`, `TYPEORM_SYNCHRONIZE` y `FRONT_URL` con
   los valores de arriba; `E2E_CON_GEMINI` coherente; `NODE_OPTIONS` con el
   `--require` de `bloquear-red.cjs`, que además debe existir.
4. **Comprobación previa al envío, dentro del backend.**
   `comprobarEntornoEnElBackend()` lanza `comprobar-entorno-api.cjs` con
   `cwd = hair_salon_back` y ese entorno. El script carga el `@nestjs/config` del
   backend, llama a `ConfigModule.forRoot()` como `app.module.ts` y exige que
   `process.env` siga teniendo, clave por clave, las 21 del arnés. Si el `.env`
   ganara en alguna (otra versión de `@nestjs/config`, un `envFilePath` u
   `override` nuevos), sale con código 1 y no arranca nada. No envía nada, no abre
   la base y solo imprime nombres de variables. Corre al cargar
   `playwright.e2e.config.ts` (antes de los `webServer`) y al empezar
   `yarn e2e:pila`.
5. **Red de salida cortada, independiente de todo lo anterior.** La API corre con
   `NODE_OPTIONS=--require tests/e2e/bloquear-red.cjs`, que heredan npm, el CLI de
   Nest y el proceso `dist/main`. Ese archivo hace que `globalThis.fetch` rechace,
   `http`/`https` `.request`/`.get` lancen y `net.Socket#connect` (lo que hay por
   debajo de todo, también de `tls`) destruya el socket con error para cualquier
   host que no sea `127.0.0.0/8`, `::1` o `localhost`. Con `E2E_CON_GEMINI=1`
   (solo `yarn e2e:pila`) deja pasar además `generativelanguage.googleapis.com`.
   Cubre la Cloud API de WhatsApp, Resend, TypeSafe, Google y Cloudinary aunque
   la API llegara a elegirlas. PostgreSQL va por TCP a 127.0.0.1 y no se ve
   afectado. Al cargarse escribe
   `[bloquear-red] activo pid=… script=… permitido=loopback autoprueba=ok (…)`,
   después de comprobar que las tres capas cortan un host externo sin salir a la
   red.
6. **Base propia.** `preparar-bd.mjs` levanta solo el servicio `db` del backend
   (nunca `api`), se niega a seguir si el destino no es exactamente `HairSalonE2E`
   (sale con código 2 sin tocar Docker ni la base), y recrea esa base como copia de
   `HairSalon` con `CREATE DATABASE … TEMPLATE`. Si `HairSalon` tiene conexiones
   abiertas, falla con un mensaje claro y no las cierra. La copia conserva la
   `COLLATION_VERSION` de la plantilla (el volumen se creó con glibc 2.36 y la
   imagen trae la 2.41; sin ese dato PostgreSQL rechaza la plantilla), para no
   tener que tocar `HairSalon` con `REFRESH COLLATION VERSION`. `psql()` solo abre
   sesiones en `postgres` y `HairSalonE2E`.
7. **Puertos y URL del portal fijados.** API en 3101; portal en 9100 con
   `DEV_API_TARGET` y `VITE_WS_URL` hacia el 3101 y `VITE_API_URL=/api` (relativa,
   por el proxy). Vite da prioridad a las `VITE_*` del proceso, así que una URL
   absoluta en el `.env` local del front no lleva los flujos a otra API.
   `reserva-sin-cuenta.spec.ts` comprueba que el `POST` sale a
   `http://localhost:9100/api/reservations` y que la fila aparece en `HairSalonE2E`.

Comprobar las negativas:

```bash
HAIR_SALON_E2E_DB=HairSalon node tests/e2e/preparar-bd.mjs     # código 2, no toca nada
node -r ./tests/e2e/bloquear-red.cjs -e "fetch('https://example.com').catch(e => console.log(e.code))"
# → E2E_RED_BLOQUEADA
```

### Qué mira `pila-segura.spec.ts`

El `webServer` de la API escribe su salida con `tee` en
`test-results/e2e-registros/api.log` (fuera del `outputDir`, que Playwright vacía al
empezar; `tee` lo trunca en cada arranque). La prueba lee ese registro:

1. `GET /api/health` en el 3101 responde 200 y el registro muestra el arranque;
2. aparece `[bloquear-red] activo … script=…/hair_salon_back/dist/main
permitido=loopback autoprueba=ok`, es decir, la red está cortada en el proceso de
   la API, y no hay ningún `autoprueba=FALLO`. Sin eso no sigue;
3. el backend no anuncia al arrancar qué adaptador de WhatsApp eligió, así que crea
   una reserva con un teléfono de prueba y espera `[WhatsAppSender:console]`,
   `--- WHATSAPP SIMULADO ---` y `Para: 57<ese teléfono>`, sin rastro de la Cloud API
   ni del proveedor de correo. Comprueba también que la reserva quedó en
   `HairSalonE2E`.

`yarn e2e:pila` escribe en el mismo archivo.

## Datos de prueba

- Base: `HairSalonE2E`, recreada en cada `yarn test:e2e` y en cada `yarn e2e:pila`.
  Lo que se escriba en ella se pierde la siguiente vez.
- Correos únicos por ejecución: `e2e+<etiqueta>.<marca de tiempo>@example.test`.
  Teléfonos `300 000 1xxx`: el aviso solo se imprime en la consola, y la API no tiene
  red de salida para mandarlo a ningún sitio.
- **Propietaria de prueba:** `duena.e2e@example.test`, contraseña `DuenaE2e2026`.
  Se registra por la API (`POST /api/auth/register`) y se promueve con
  `UPDATE users SET roles = ARRAY['admin']` dentro de `HairSalonE2E`
  (`asegurarPropietaria()` en `pila.mjs`; la llaman `bandeja-confirma.spec.ts`,
  `eliminar-cuenta.spec.ts` y `yarn e2e:pila`). Solo existe en la copia desechable.
- Clientas de prueba registradas por el flujo 2: contraseña `ClaveE2e2026`.

## Notas

- `pila.mjs` no usa `import.meta`: Playwright lo transpila a CommonJS al cargar la
  configuración. La raíz del front se busca hacia arriba desde el directorio de
  trabajo, por el `name` de su `package.json`.
- La API corre con `start:dev` (`nest start --watch`), que recompila en
  `hair_salon_back/dist/` (carpeta ignorada por git).
- Jest no ve esta carpeta (`testPathIgnorePatterns` en `jest.config.cjs`).
