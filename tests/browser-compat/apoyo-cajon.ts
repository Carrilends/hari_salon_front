import type { Page } from '@playwright/test';
import { json, servirApiVacia } from './api-offline';

/** Un servicio sin datos reales, lo justo para llenar la bolsa. */
const SERVICIO = {
  id: 's1',
  name: 'Corte de prueba',
  gender: 'mujer',
  type: 'Cortes',
  price: 30000,
  isSpecial: false,
  duration: 45,
  slug: 'corte-de-prueba',
  tags: [],
  images: [],
  detail: { id: 'd1', description: '', specifications: {} },
};

/** API en blanco, con una estilista libre todo el día y la bolsa con un servicio. */
export async function prepararConBolsa(page: Page) {
  await servirApiVacia(page);
  await page.route(
    (url) => url.pathname === '/api/workers/availability',
    (route) => {
      const fecha =
        new URL(route.request().url()).searchParams.get('date') ?? '2026-01-01';
      return route.fulfill(
        json({
          workers: [
            {
              id: 'w1',
              name: 'Estilista de prueba',
              isDefault: false,
              assignable: true,
              usedMinutes: 0,
              capacityMinutes: 720,
              availableMinutes: 720,
              reservations: [],
            },
          ],
          dayBounds: { openMin: 480, closeMin: 1200, effectiveStartMin: 480, isToday: false },
          salonNow: { ymd: fecha, minOfDay: 0, tz: 'America/Bogota' },
        }),
      );
    },
  );
  await page.addInitScript((servicio) => {
    window.localStorage.setItem(
      'book',
      JSON.stringify({ bookings: [{ service: servicio }], showDialog: false }),
    );
  }, SERVICIO);
}
