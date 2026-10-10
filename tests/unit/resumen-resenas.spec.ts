/**
 * La nota de Testimonios (S1): media con una cifra decimal y coma, cuántas
 * reseñas, y las barras de 5 a 1 estrellas. Puro: recibe la lista.
 */
import {
  fechaCorta,
  inicialDe,
  resumenDeResenas,
  textoTotal,
} from 'src/helpers/resumen-resenas';

const conNotas = (...notas: unknown[]) =>
  notas.map((score) => ({ score: score as number }));

describe('resumenDeResenas', () => {
  it('saca la media con coma decimal y una cifra', () => {
    const resumen = resumenDeResenas(conNotas(5, 5, 4, 4));

    expect(resumen.total).toBe(4);
    expect(resumen.media).toBe(4.5);
    expect(resumen.mediaTexto).toBe('4,5');
  });

  it('una media entera también lleva su decimal', () => {
    expect(resumenDeResenas(conNotas(5, 5)).mediaTexto).toBe('5,0');
  });

  it('cuenta las barras de 5 a 1, con su porcentaje', () => {
    expect(resumenDeResenas(conNotas(5, 5, 4, 4)).barras).toEqual([
      { estrellas: 5, cuantas: 2, porcentaje: 50 },
      { estrellas: 4, cuantas: 2, porcentaje: 50 },
      { estrellas: 3, cuantas: 0, porcentaje: 0 },
      { estrellas: 2, cuantas: 0, porcentaje: 0 },
      { estrellas: 1, cuantas: 0, porcentaje: 0 },
    ]);
  });

  it('sin reseñas: total 0, media 0 y barras vacías', () => {
    const resumen = resumenDeResenas([]);

    expect(resumen.total).toBe(0);
    expect(resumen.mediaTexto).toBe('0,0');
    expect(
      resumen.barras.every((b) => b.cuantas === 0 && b.porcentaje === 0)
    ).toBe(true);
  });

  it('una nota que llega como texto se cuenta; una fuera de 1–5 o vacía, no', () => {
    const resumen = resumenDeResenas(conNotas('4', 0, 7, null, 'x', 5));

    expect(resumen.total).toBe(2);
    expect(resumen.media).toBe(4.5);
  });
});

describe('textoTotal', () => {
  it('singular y plural', () => {
    expect(textoTotal(1)).toBe('1 reseña');
    expect(textoTotal(0)).toBe('0 reseñas');
    expect(textoTotal(12)).toBe('12 reseñas');
  });
});

describe('fechaCorta', () => {
  it('día, mes abreviado y año', () => {
    expect(fechaCorta('2026-05-18T15:00:00.000Z')).toBe('18 may 2026');
  });

  it('cuenta el día en hora de Bogotá, no en UTC', () => {
    // 03:00 UTC del 18 son las 22:00 del 17 en Sopó.
    expect(fechaCorta('2026-05-18T03:00:00.000Z')).toBe('17 may 2026');
  });

  it('una fecha que no se entiende no pinta nada', () => {
    expect(fechaCorta('ayer')).toBe('');
  });
});

describe('inicialDe', () => {
  it('la primera letra en mayúscula, sin espacios delante', () => {
    expect(inicialDe('  adriana')).toBe('A');
    expect(inicialDe('')).toBe('?');
  });
});
