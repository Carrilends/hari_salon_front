/**
 * La pila es la segura (Review Focus 1 de la F7). Corre antes que los flujos
 * (proyecto `pila`, del que depende `chromium`): si falla, no corre ninguno.
 *
 * Antes de que esta prueba corra ya pasaron, al cargar la configuración, las
 * dos comprobaciones previas al envío (`comprobarEntornoSeguro()` y
 * `comprobarEntornoEnElBackend()`, en `pila.mjs`). Esta prueba mira la API ya
 * en marcha, en este orden:
 * 1. `GET http://127.0.0.1:3101/api/health` responde 200;
 * 2. el registro de la API (`test-results/e2e-registros/api.log`, escrito con
 *    `tee` desde el `webServer`) muestra el arranque;
 * 3. la red independiente está activa EN EL PROCESO DE LA API: la línea
 *    `[bloquear-red] activo … script=…/hair_salon_back/dist/main
 *    permitido=loopback autoprueba=ok`, que `bloquear-red.cjs` escribe tras
 *    comprobar que `fetch`, `https.get` y un socket hacia un host externo
 *    quedan cortados sin salir a la red. Sin esa línea no se hace la reserva
 *    del punto 4;
 * 4. el aviso de WhatsApp de una reserva de prueba sale por el adaptador de
 *    consola (`[WhatsAppSender:console]` + `--- WHATSAPP SIMULADO ---` +
 *    `Para: 57<su teléfono>`), sin rastro de la Cloud API ni del proveedor de
 *    correo, y la reserva quedó en `HairSalonE2E`.
 *
 * Por qué hace falta una reserva: el backend no anuncia en el arranque qué
 * adaptador eligió (la fábrica de `WHATSAPP_SENDER` en
 * `notifications.module.ts` no escribe nada); la única huella de la consola es
 * el mensaje simulado. Si, pese a las comprobaciones previas, la API hubiera
 * elegido la Cloud API, esa reserva tampoco saldría de la máquina: lo impide
 * la red del punto 3, que no depende de cómo el backend lea su `.env`.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { MARCA, crearReservaManana, telefonoDePrueba } from './apoyo';
import { BD_E2E, REGISTRO_API, URL_SALUD, psql } from './pila.mjs';

const registro = () => readFileSync(REGISTRO_API, 'utf8');

test('la API de la pila responde en 3101, avisa por consola y escribe en HairSalonE2E', async ({
  request,
}) => {
  // 1. Salud.
  const salud = await request.get(URL_SALUD);
  expect(salud.status()).toBe(200);
  expect(await salud.json()).toMatchObject({ ok: true });

  // 2. El registro es el de esta API, ya arrancada.
  expect(registro()).toContain('Nest application successfully started');

  // 3. La red de salida está cortada dentro del proceso de la API.
  const redActiva =
    /\[bloquear-red\] activo pid=\d+ script=\S*\/hair_salon_back\/dist\/main(?:\.js)? permitido=loopback autoprueba=ok /;
  await expect
    .poll(() => redActiva.test(registro()), {
      message: 'bloquear-red.cjs debe estar activo en el proceso de la API',
      timeout: 15_000,
    })
    .toBe(true);
  expect(registro()).not.toContain('autoprueba=FALLO');

  // 4. Un aviso de WhatsApp sale por la consola.
  const telefono = telefonoDePrueba(0);
  const reserva = await crearReservaManana(request, {
    name: `Pila Segura E2E ${MARCA}`,
    phone: telefono,
  });
  // La línea del logger y el sobre del mensaje simulado, con el número de ESTA
  // reserva (no vale un aviso de otra).
  const huella = new RegExp(
    `\\[WhatsAppSender:console\\]\\s*\\n--- WHATSAPP SIMULADO ---\\nPara: 57${telefono}\\n`
  );
  await expect
    .poll(() => huella.test(registro()), {
      message:
        'el aviso de WhatsApp de la reserva debe salir por el adaptador de consola',
      timeout: 15_000,
    })
    .toBe(true);
  const texto = registro();
  expect(texto).not.toContain('Cloud API de WhatsApp');
  expect(texto).not.toContain('WHATSAPP_PHONE_NUMBER_ID no está configurado');
  expect(texto).not.toContain('EmailSender:resend');

  // La reserva vive en la base E2E.
  const enE2E = psql(
    BD_E2E,
    `SELECT count(*) FROM reservations WHERE id = '${reserva.id}'`,
    {
      tuplas: true,
    }
  ).trim();
  expect(enE2E).toBe('1');
});
