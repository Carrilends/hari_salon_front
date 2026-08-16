/**
 * Prueba de regresión del branding del salón.
 *
 * El portal arrastró durante un tiempo datos de otro negocio ("Peluquería
 * Pecas", país `AR`, moneda `ARS`). Ya está corregido y centralizado en
 * `src/constants/salon-location.ts`; este spec existe para que nadie los
 * reintroduzca sin que la suite se ponga en rojo.
 */
import {
  SALON_ADDRESS,
  SALON_COUNTRY,
  SALON_LOCALITY,
  SALON_NAME,
  SALON_REGION,
  SALON_STREET,
} from 'src/constants/salon-location';
import { hairSalonSchema, reviewsSchema, servicesSchema } from 'src/composables/seo/structuredData';

const OBSOLETE = /pecas|argentina|\bARS\b|es-AR/i;

describe('branding del salón (regresión Pecas → Marlene / AR → CO / ARS → COP)', () => {
  it('expone el nombre y la ubicación reales del negocio', () => {
    expect(SALON_NAME).toBe('Peluquería Marlene');
    expect(SALON_COUNTRY).toBe('CO');
    expect(SALON_LOCALITY).toBe('Sopó');
    expect(SALON_REGION).toBe('Cundinamarca');
    expect(SALON_STREET).toBe('Carrera 3 #1-18');
    expect(SALON_ADDRESS).toContain('Sopó');
    expect(SALON_NAME).not.toMatch(OBSOLETE);
  });

  it('el esquema HairSalon no filtra datos del negocio anterior', () => {
    const schema = JSON.stringify(hairSalonSchema());

    expect(schema).not.toMatch(OBSOLETE);
    expect(schema).toContain('Peluquería Marlene');
    expect(schema).toContain('"addressCountry":"CO"');
  });

  it('el esquema HairSalon publica el horario real del salón', () => {
    // Debe seguir coincidiendo con `src/helpers/businessHours.ts` y con
    // `hair_salon_back/src/reservations/salon-schedule.ts`.
    const schema = hairSalonSchema();
    const hours = schema.openingHoursSpecification as Array<Record<string, unknown>>;

    expect(hours).toEqual([
      expect.objectContaining({ opens: '08:00', closes: '20:00' }),
      expect.objectContaining({ opens: '09:00', closes: '19:00' }),
    ]);
  });

  it('las ofertas de servicios usan COP por defecto', () => {
    const schema = JSON.stringify(servicesSchema([{ name: 'Corte de cabello', price: 20000 }]));

    expect(schema).toContain('"priceCurrency":"COP"');
    expect(schema).not.toMatch(OBSOLETE);
  });

  it('respeta una moneda explícita sin volver a la anterior', () => {
    const schema = JSON.stringify(
      servicesSchema([{ name: 'Corte', price: 20000, currency: 'USD' }]),
    );

    expect(schema).toContain('"priceCurrency":"USD"');
    expect(schema).not.toContain('ARS');
  });

  it('el esquema de reseñas se atribuye al salón correcto', () => {
    const schema = JSON.stringify(
      reviewsSchema([{ author: 'Ana', body: 'Excelente atención', rating: 5 }]),
    );

    expect(schema).toContain('Peluquería Marlene');
    expect(schema).not.toMatch(OBSOLETE);
  });
});
