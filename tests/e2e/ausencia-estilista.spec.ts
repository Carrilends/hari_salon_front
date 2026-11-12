/**
 * Flujo 7 — la propietaria marca ausente a una estilista desde «Mis estilistas».
 *
 * Preparación por la API (nombres ficticios, nada de las estilistas reales):
 * - se crean «Estilista A …» y «Estilista B …»;
 * - mañana, A tiene dos citas: a las 10:00 (Clienta Mueve) y a las 11:00
 *   (Clienta Cancela), con el servicio más corto del catálogo;
 * - todas las demás estilistas asignables quedan ocupadas en esas dos ventanas,
 *   y B solo en la de las 11:00. Así la de las 10:00 solo puede pasar a B y la
 *   de las 11:00 no tiene a nadie: se cancela.
 *
 * Luego, en el portal:
 * 1. la propietaria marca a A ausente mañana de 10:00 a 12:00;
 * 2. la vista previa dice que una pasa a B y la otra se cancela;
 * 3. tras confirmar, la bandeja muestra la movida con B y el aviso fijado de
 *    la cancelada, que ya no está en la lista;
 * 4. en el cajón de reserva, con A, mañana de 10:00 a 11:30 sale ocupado.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
} from '@playwright/test';
import {
  MARCA,
  URL_API,
  abrirCajon,
  anadirPrimerServicio,
  continuar,
  crearReserva,
  disponibilidad,
  fechaLarga,
  hoyEnBogota,
  instanteDeBogota,
  irAlCatalogoDesdePortada,
  literal,
  servicios,
  sumarDias,
  telefonoDePrueba,
  type Disponibilidad,
} from './apoyo';
import { PROPIETARIA, URL_PORTAL, asegurarPropietaria } from './pila.mjs';

test.beforeAll(async () => {
  await asegurarPropietaria();
});

const SUFIJO = String(MARCA).slice(-6);
const ESTILISTA_A = `Estilista A ${SUFIJO}`;
const ESTILISTA_B = `Estilista B ${SUFIJO}`;
const CLIENTA_MUEVE = `Clienta Mueve E2E ${MARCA}`;
const CLIENTA_CANCELA = `Clienta Cancela E2E ${MARCA}`;

async function tokenDeLaPropietaria(request: APIRequestContext) {
  const r = await request.post(`${URL_API}/auth/login`, {
    data: { email: PROPIETARIA.correo, password: PROPIETARIA.contrasena },
  });
  expect(r.status(), `POST /auth/login → ${r.status()}`).toBe(201);
  return ((await r.json()) as { token: string }).token;
}

async function crearEstilista(
  request: APIRequestContext,
  token: string,
  nombre: string
): Promise<string> {
  const r = await request.post(`${URL_API}/workers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: nombre },
  });
  expect(r.status(), `POST /workers → ${r.status()} ${await r.text()}`).toBe(
    201
  );
  return ((await r.json()) as { id: string }).id;
}

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** ¿La estilista tiene libre la ventana [inicio, inicio + duración)? */
function libre(d: Disponibilidad, id: string, inicio: string, dur: number) {
  const w = d.workers.find((x) => x.id === id);
  const t = aMin(inicio);
  return !w?.reservations.some((b) => t < b.endMin && b.startMin < t + dur);
}

test('marcar una ausencia mueve una cita, cancela otra y cierra esas horas en el cajón', async ({
  page,
  request,
  browser,
}) => {
  const manana = sumarDias(hoyEnBogota(), 1);
  const token = await tokenDeLaPropietaria(request);
  const idA = await crearEstilista(request, token, ESTILISTA_A);
  const idB = await crearEstilista(request, token, ESTILISTA_B);

  // El servicio más corto: las dos citas caben entre las 10:00 y las 12:00.
  const servicio = (await servicios(request))
    .slice()
    .sort((a, b) => a.duration - b.duration)[0];
  expect(servicio.duration).toBeLessThanOrEqual(60);

  // Las demás estilistas, ocupadas en las dos ventanas; B, solo en la de las 11.
  const d = await disponibilidad(request, manana);
  const ocupar = async (workerId: string, hora: string, n: number) => {
    if (!libre(d, workerId, hora, servicio.duration)) return;
    await crearReserva(request, {
      ymd: manana,
      hora,
      serviceIds: [servicio.id],
      workerId,
      contacto: { name: `Bloqueo E2E ${MARCA}`, phone: telefonoDePrueba(n) },
    });
  };
  let n = 700;
  for (const w of d.workers.filter(
    (x) => x.assignable && x.id !== idA && x.id !== idB
  )) {
    await ocupar(w.id, '10:00', n++);
    await ocupar(w.id, '11:00', n++);
  }
  await ocupar(idB, '11:00', n++);

  // Las dos citas de A.
  const mueve = await crearReserva(request, {
    ymd: manana,
    hora: '10:00',
    serviceIds: [servicio.id],
    workerId: idA,
    contacto: { name: CLIENTA_MUEVE, phone: telefonoDePrueba(71) },
  });
  const cancela = await crearReserva(request, {
    ymd: manana,
    hora: '11:00',
    serviceIds: [servicio.id],
    workerId: idA,
    contacto: { name: CLIENTA_CANCELA, phone: telefonoDePrueba(72) },
  });

  // 1. La propietaria entra en «Mis estilistas» y abre a A.
  await page.goto('/auth/login?redirect=/mis-empleados');
  await page.getByLabel('Correo').fill(PROPIETARIA.correo);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill(PROPIETARIA.contrasena);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/mis-empleados$/);
  await page.getByRole('button', { name: `Editar a ${ESTILISTA_A}` }).click();
  const panel = page.locator('[data-test="panel-estilista"]');
  await expect(panel.locator('[data-test="panel-titulo"]')).toHaveText(
    ESTILISTA_A
  );
  await expect(panel.locator('[data-test="sin-ausencias"]')).toBeVisible();
  await panel.getByRole('button', { name: 'Marcar ausencia' }).click();

  const dialogo = page.getByRole('dialog');
  await expect(
    dialogo.getByRole('heading', { name: 'Marcar ausencia' })
  ).toBeVisible();
  await dialogo.getByLabel('Fecha').fill(manana);
  await dialogo.getByLabel('Una franja').check();
  await dialogo.getByLabel('Desde').selectOption('10:00');
  await dialogo.getByLabel('Hasta').selectOption('12:00');
  // Sin vista previa no hay «Confirmar».
  await expect(dialogo.getByRole('button', { name: 'Confirmar' })).toHaveCount(
    0
  );
  await dialogo.getByRole('button', { name: 'Ver qué pasa' }).click();

  // 2. La vista previa: una pasa a B, otra se cancela.
  await expect(
    dialogo.getByRole('heading', { name: 'Qué pasa con sus citas' })
  ).toBeVisible();
  await expect(dialogo.locator('[data-test="resumen-ausencia"]')).toContainText(
    `${ESTILISTA_A} · ${fechaLarga(manana)} · 10:00 – 12:00`
  );
  const lineaMueve = dialogo
    .locator('[data-test="impacto-ausencia"]')
    .filter({ hasText: CLIENTA_MUEVE });
  const lineaCancela = dialogo
    .locator('[data-test="impacto-ausencia"]')
    .filter({ hasText: CLIENTA_CANCELA });
  await expect(lineaMueve.locator('[data-test="hora-impacto"]')).toHaveText(
    '10:00'
  );
  await expect(lineaMueve.locator('[data-test="destino-impacto"]')).toHaveText(
    `pasa a ${ESTILISTA_B}`
  );
  await expect(lineaCancela.locator('[data-test="hora-impacto"]')).toHaveText(
    '11:00'
  );
  await expect(
    lineaCancela.locator('[data-test="destino-impacto"]')
  ).toHaveText('se cancela');
  await expect(dialogo.locator('[data-test="impacto-ausencia"]')).toHaveCount(
    2
  );

  // Confirmar.
  await dialogo.getByRole('button', { name: 'Confirmar' }).click();
  await expect(
    dialogo.getByRole('heading', { name: 'Ausencia guardada' })
  ).toBeVisible();
  await expect(lineaMueve.locator('[data-test="destino-impacto"]')).toHaveText(
    `pasó a ${ESTILISTA_B}`
  );
  await expect(
    lineaCancela.locator('[data-test="destino-impacto"]')
  ).toHaveText('se canceló');
  await expect(dialogo.locator('[data-test="sin-resolver"]')).toHaveCount(0);
  await dialogo.getByRole('button', { name: 'Listo' }).click();
  await expect(dialogo).toBeHidden();

  // La ausencia queda en la lista del panel.
  const ausencia = panel.locator('[data-test="ausencia"]');
  await expect(ausencia).toHaveCount(1);
  await expect(ausencia.locator('[data-test="franja-ausencia"]')).toHaveText(
    '10:00 – 12:00'
  );

  // 3. La bandeja: la movida con B; la cancelada fuera, con su aviso fijado.
  await panel.getByRole('link', { name: 'Ir a Reservas →' }).click();
  await expect(page).toHaveURL(/\/reservas$/);
  await page.getByRole('tab', { name: /^Todas/ }).click();
  const filaMueve = page
    .locator('[data-test="fila-reserva"]')
    .filter({ hasText: CLIENTA_MUEVE });
  await expect(filaMueve).toHaveCount(1);
  await expect(filaMueve.locator('[data-test="fila-estilista"]')).toContainText(
    ESTILISTA_B
  );
  await expect(
    page.locator('[data-test="fila-reserva"]').filter({
      hasText: CLIENTA_CANCELA,
    })
  ).toHaveCount(0);
  const aviso = page
    .locator('[data-test="aviso"]')
    .filter({ hasText: `Cancelada por la peluquería: ${CLIENTA_CANCELA}` });
  await expect(aviso).toHaveCount(1);
  await expect(aviso.locator('[data-test="aviso-detalle"]')).toContainText(
    'ya no está en la lista'
  );

  // Lo mismo en la API: estilista nueva y estado.
  const lista = await request.get(`${URL_API}/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const vigentes = (await lista.json()) as {
    id: string;
    workerId: string;
    scheduledAt: string;
  }[];
  const movida = vigentes.find((r) => r.id === mueve.id);
  expect(movida?.workerId).toBe(idB);
  expect(new Date(movida!.scheduledAt).getTime()).toBe(
    new Date(instanteDeBogota(manana, '10:00')).getTime()
  );
  expect(vigentes.some((r) => r.id === cancela.id)).toBe(false);

  // 4. Una visitante, en el cajón con A mañana: de 10:00 a 11:30, ocupado.
  const ctx = await (browser as Browser).newContext({ baseURL: URL_PORTAL });
  const visitante = await ctx.newPage();
  await irAlCatalogoDesdePortada(visitante);
  await anadirPrimerServicio(visitante);
  const cajon = await abrirCajon(visitante);
  await continuar(visitante);
  await cajon
    .locator('[data-test="fichas-estilista"]')
    .getByRole('button', { name: new RegExp(`^${literal(ESTILISTA_A)}\\b`) })
    .click();
  await cajon
    .getByRole('button', {
      name: new RegExp(`^${literal(fechaLarga(manana))},`),
    })
    .click();
  const horas = cajon.locator('[data-test="fichas-hora"]');
  for (const hora of ['10:00', '10:30', '11:00', '11:30']) {
    await expect(
      horas.getByRole('button', { name: `${hora}, ocupada`, exact: true })
    ).toBeDisabled();
  }
  await expect(
    horas.getByRole('button', { name: '12:00', exact: true })
  ).toBeEnabled();
  await ctx.close();
});
