/**
 * Lo que comparten los flujos E2E: la API de la pila (rutas y cuerpos reales
 * del backend, con su prefijo `/api` y la validación estricta de sus DTO),
 * fechas en hora de Bogotá y los datos de prueba.
 *
 * Nada de aquí importa código del portal: la prueba mira el portal desde
 * fuera, como una clienta. Los dos textos que se repiten (la fecha larga del
 * cajón y la hora corta) se reescriben aquí con el mismo formato que
 * `src/helpers/reserva-texto.ts`; si el portal los cambia, el localizador
 * falla y se ve.
 */
import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { URL_API } from './pila.mjs';

export { URL_API };

/** Marca única por ejecución, para correos y nombres que no choquen. */
export const MARCA = Date.now();

export const correoDePrueba = (etiqueta: string) =>
  `e2e+${etiqueta}.${MARCA}@example.test`;

/**
 * Un móvil colombiano de prueba (300 000 1xxx). En la pila E2E el aviso sale
 * por el adaptador de consola y, además, la API no tiene red de salida
 * (`bloquear-red.cjs`): no se manda nada a ningún número.
 */
export const telefonoDePrueba = (n: number) =>
  `300000${String(1000 + (n % 1000)).padStart(4, '0')}`;

export const CONTRASENA_DE_PRUEBA = 'ClaveE2e2026';

// ── Fechas del salón ─────────────────────────────────────────────────────────

const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** 'YYYY-MM-DD' de hoy en Bogotá. */
export function hoyEnBogota(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function sumarDias(ymd: string, dias: number): string {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** 'Domingo 25 de octubre', como lo dice el cajón. */
export function fechaLarga(ymd: string): string {
  const [a, m, d] = ymd.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]}`;
}

/** '09:00' → '9:00', como lo dice el cajón. */
export const horaCorta = (hhmm: string) => hhmm.replace(/^0(\d):/, '$1:');

/** Para meter un texto literal en una expresión regular. */
export const literal = (texto: string) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(
    2,
    '0'
  )}`;

/** Bogotá no tiene horario de verano: siempre UTC−5. */
export const instanteDeBogota = (ymd: string, hhmm: string) =>
  `${ymd}T${hhmm}:00-05:00`;

// ── API de la pila ───────────────────────────────────────────────────────────

export type Servicio = { id: string; name: string; duration: number };

type Estilista = {
  id: string;
  name: string;
  isDefault: boolean;
  assignable: boolean;
  availableMinutes: number;
  reservations: { startMin: number; endMin: number }[];
};

export type Disponibilidad = {
  workers: Estilista[];
  dayBounds: {
    openMin: number;
    closeMin: number;
    effectiveStartMin: number;
    isToday: boolean;
  };
  salonNow: { ymd: string; minOfDay: number };
};

/**
 * Los servicios del catálogo (`POST /service/search` → `[servicios, total]`),
 * o los que casan con `nombre`.
 */
export async function servicios(
  request: APIRequestContext,
  nombre?: string
): Promise<Servicio[]> {
  const r = await request.post(`${URL_API}/service/search`, {
    data: nombre ? { name: nombre, limit: 50 } : { limit: 50 },
  });
  expect(r.ok(), `POST /service/search → ${r.status()}`).toBeTruthy();
  const [lista] = (await r.json()) as [Servicio[], number];
  expect(lista.length).toBeGreaterThan(0);
  return lista;
}

export async function disponibilidad(
  request: APIRequestContext,
  ymd: string
): Promise<Disponibilidad> {
  const r = await request.get(`${URL_API}/workers/availability`, {
    params: { date: ymd },
  });
  expect(r.ok(), `GET /workers/availability → ${r.status()}`).toBeTruthy();
  return (await r.json()) as Disponibilidad;
}

/**
 * El primer hueco libre de una estilista ese día para una cita de
 * `duracion` minutos, con la rejilla del cajón: cada 30 min desde la
 * apertura, sin pisar ninguna de sus reservas y con tiempo antes del cierre.
 */
export function primerHuecoLibre(
  d: Disponibilidad,
  estilistaId: string,
  duracion: number
): string | null {
  const w = d.workers.find((x) => x.id === estilistaId);
  if (!w || w.availableMinutes < duracion) return null;
  const { openMin, closeMin, effectiveStartMin, isToday } = d.dayBounds;
  for (let t = openMin; t + duracion <= closeMin; t += 30) {
    if (t < effectiveStartMin) continue;
    if (isToday && t <= d.salonNow.minOfDay) continue;
    const pisa = w.reservations.some(
      (b) => t < b.endMin && b.startMin < t + duracion
    );
    if (!pisa) return aHora(t);
  }
  return null;
}

export type ReservaCreada = { id: string; workerId: string; status: string };

/** `POST /reservations` como reserva sin cuenta (con contacto). */
export async function crearReserva(
  request: APIRequestContext,
  datos: {
    ymd: string;
    hora: string;
    serviceIds: string[];
    workerId?: string;
    contacto: { name: string; phone: string };
  }
): Promise<ReservaCreada> {
  const r = await request.post(`${URL_API}/reservations`, {
    data: {
      scheduledAt: instanteDeBogota(datos.ymd, datos.hora),
      serviceIds: datos.serviceIds,
      ...(datos.workerId ? { workerId: datos.workerId } : {}),
      contact: datos.contacto,
    },
  });
  expect(
    r.status(),
    `POST /reservations → ${r.status()} ${await r.text()}`
  ).toBe(201);
  return (await r.json()) as ReservaCreada;
}

/**
 * Una reserva sin cuenta en el primer hueco libre de mañana con cualquier
 * estilista asignable. Mañana nunca es «hoy», así que no depende de la hora a
 * la que corra la prueba.
 */
export async function crearReservaManana(
  request: APIRequestContext,
  contacto: { name: string; phone: string }
): Promise<ReservaCreada & { ymd: string; hora: string; estilista: string }> {
  const ymd = sumarDias(hoyEnBogota(), 1);
  const [servicio] = await servicios(request);
  const d = await disponibilidad(request, ymd);
  for (const w of d.workers.filter((x) => x.assignable)) {
    const hora = primerHuecoLibre(d, w.id, servicio.duration);
    if (!hora) continue;
    const creada = await crearReserva(request, {
      ymd,
      hora,
      serviceIds: [servicio.id],
      workerId: w.id,
      contacto,
    });
    return { ...creada, ymd, hora, estilista: w.name };
  }
  throw new Error(`Mañana (${ymd}) no queda hueco con ninguna estilista.`);
}

// ── Portal ───────────────────────────────────────────────────────────────────

/**
 * «Continuar» ignora los toques durante 400 ms tras cambiar de paso (para que
 * un doble toque no confirme sin ver «Tus datos»). La prueba espera ese rato.
 */
export async function continuar(page: Page) {
  await page.waitForTimeout(450);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}

/** Portada → catálogo, por el botón «Servicios» de la cabecera. */
export async function irAlCatalogoDesdePortada(page: Page) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name: 'Servicios' })
    .click();
  await expect(page).toHaveURL(/\/services$/);
}

/**
 * En el catálogo: ficha del primer servicio → «Añadir a la reserva». No navega
 * con `goto`: la sesión vive solo en memoria y una recarga la perdería.
 */
export async function anadirPrimerServicio(page: Page): Promise<string> {
  await expect(page).toHaveURL(/\/services$/);
  const primera = page
    .getByRole('button', { name: /^Ver el detalle de / })
    .first();
  await expect(primera).toBeVisible();
  const nombre = ((await primera.getAttribute('aria-label')) ?? '').replace(
    /^Ver el detalle de /,
    ''
  );
  await primera.click();
  const ficha = page.getByRole('dialog', { name: `Ficha de ${nombre}` });
  await ficha.getByRole('button', { name: 'Añadir a la reserva' }).click();
  await expect(
    ficha.getByRole('button', { name: 'Ya está en tu bolsa' })
  ).toBeVisible();
  await ficha
    .getByRole('button', { name: 'Cerrar la ficha del servicio' })
    .click();
  await expect(ficha).toBeHidden();
  return nombre;
}

/** Abre el cajón desde «Reservar» de la cabecera. */
export async function abrirCajon(page: Page) {
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('button', { name: 'Reservar' })
    .click();
  const cajon = page.getByRole('dialog', { name: 'Tu reserva' });
  await expect(cajon).toBeVisible();
  return cajon;
}

/** En «Cuándo»: la primera hora habilitada del día que propone el cajón. */
export async function elegirPrimeraHora(cajon: Locator): Promise<string> {
  await expect(
    cajon.getByRole('heading', { name: 'A qué hora' })
  ).toBeVisible();
  const ficha = cajon
    .locator('[data-test="fichas-hora"]')
    .getByRole('button', { disabled: false })
    .first();
  await expect(ficha).toBeVisible();
  await ficha.click();
  await expect(ficha).toHaveAttribute('aria-pressed', 'true');
  return (await ficha.innerText()).trim();
}
