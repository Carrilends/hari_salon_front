/**
 * El estado del salón «ahora» y la semana del diálogo de Horarios (S3).
 *
 * Se le pasan las partes del día: la prueba no depende del reloj de quien la
 * ejecute. Fechas de referencia: el viernes 9 de octubre de 2026; el lunes 12
 * es festivo (Día de la Raza, trasladado por la Ley Emiliani).
 */
import {
  estadoDelSalon,
  horarioDeFestivos,
  semanaDelSalon,
  textoEstadoSalon,
} from 'src/helpers/estado-salon';
import type { SalonNowParts } from 'src/helpers/businessHours';

const momento = (qDate: string, hora: string): SalonNowParts => {
  const [h, m] = hora.split(':').map(Number);
  return { ymd: qDate.replace(/\//g, '-'), qDate, minOfDay: h * 60 + m };
};

describe('estadoDelSalon', () => {
  it('un viernes a las 10:00 está abierto y cierra a las 20:00', () => {
    expect(estadoDelSalon(momento('2026/10/09', '10:00'))).toEqual({
      tipo: 'abierto',
      cierra: '20:00',
    });
  });

  it('a las 19:59 sigue abierto y a las 20:00 en punto ya no', () => {
    expect(estadoDelSalon(momento('2026/10/09', '19:59')).tipo).toBe('abierto');
    expect(estadoDelSalon(momento('2026/10/09', '20:00')).tipo).toBe('cerrado');
  });

  it('antes de abrir dice a qué hora abre hoy', () => {
    expect(estadoDelSalon(momento('2026/10/09', '07:59'))).toEqual({
      tipo: 'antes-de-abrir',
      abre: '8:00',
    });
  });

  it('a medianoche todavía no ha abierto', () => {
    expect(estadoDelSalon(momento('2026/10/13', '00:00'))).toEqual({
      tipo: 'antes-de-abrir',
      abre: '8:00',
    });
  });

  it('un sábado abre a las 9:00, no a las 8:00', () => {
    expect(estadoDelSalon(momento('2026/10/10', '08:30'))).toEqual({
      tipo: 'antes-de-abrir',
      abre: '9:00',
    });
  });

  it('un viernes por la noche: mañana sábado abre a las 9:00', () => {
    expect(estadoDelSalon(momento('2026/10/09', '20:00'))).toEqual({
      tipo: 'cerrado',
      abreManana: '9:00',
      mananaEsFestivo: false,
    });
  });

  it('un domingo por la noche con el lunes festivo abre a las 9:00 y lo sabe', () => {
    expect(estadoDelSalon(momento('2026/10/11', '19:30'))).toEqual({
      tipo: 'cerrado',
      abreManana: '9:00',
      mananaEsFestivo: true,
    });
  });

  it('un domingo corriente por la noche: el lunes abre a las 8:00', () => {
    expect(estadoDelSalon(momento('2026/10/18', '20:00'))).toEqual({
      tipo: 'cerrado',
      abreManana: '8:00',
      mananaEsFestivo: false,
    });
  });

  it('el 31 de diciembre por la noche cruza de año hacia un festivo', () => {
    expect(estadoDelSalon(momento('2026/12/31', '21:00'))).toEqual({
      tipo: 'cerrado',
      abreManana: '9:00',
      mananaEsFestivo: true,
    });
  });

  it('un lunes festivo cierra a las 19:00', () => {
    expect(estadoDelSalon(momento('2026/10/12', '10:00'))).toEqual({
      tipo: 'abierto',
      cierra: '19:00',
    });
  });
});

describe('textoEstadoSalon', () => {
  it('abierto', () => {
    expect(textoEstadoSalon({ tipo: 'abierto', cierra: '20:00' }, false)).toBe(
      'Abierto ahora · cierra a las 20:00'
    );
  });

  it('antes de abrir', () => {
    expect(
      textoEstadoSalon({ tipo: 'antes-de-abrir', abre: '8:00' }, false)
    ).toBe('Cerrado · abre hoy a las 8:00');
  });

  it('cerrado, mañana corriente', () => {
    expect(
      textoEstadoSalon(
        { tipo: 'cerrado', abreManana: '9:00', mananaEsFestivo: false },
        false
      )
    ).toBe('Cerrado · abre mañana a las 9:00');
  });

  it('cerrado, mañana festivo', () => {
    expect(
      textoEstadoSalon(
        { tipo: 'cerrado', abreManana: '9:00', mananaEsFestivo: true },
        false
      )
    ).toBe('Cerrado · mañana es festivo: abre a las 9:00');
  });

  it('hoy festivo, abierto o antes de abrir: anuncia el festivo con su horario', () => {
    expect(textoEstadoSalon({ tipo: 'abierto', cierra: '19:00' }, true)).toBe(
      'Hoy es festivo · 9:00 a 19:00'
    );
    expect(
      textoEstadoSalon({ tipo: 'antes-de-abrir', abre: '9:00' }, true)
    ).toBe('Hoy es festivo · 9:00 a 19:00');
  });

  it('hoy festivo pero ya cerrado: manda el «cerrado»', () => {
    expect(
      textoEstadoSalon(
        { tipo: 'cerrado', abreManana: '8:00', mananaEsFestivo: false },
        true
      )
    ).toBe('Cerrado · abre mañana a las 8:00');
  });
});

describe('semanaDelSalon', () => {
  it('va de lunes a domingo de la semana de hoy y marca solo hoy', () => {
    const filas = semanaDelSalon(momento('2026/10/09', '10:00'));

    expect(filas.map((f) => f.dia)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(filas[0].fecha).toBe('2026/10/05');
    expect(filas[6].fecha).toBe('2026/10/11');
    expect(filas.filter((f) => f.esHoy).map((f) => f.dia)).toEqual(['Viernes']);
  });

  it('entre semana de 8:00 a 20:00 y el fin de semana de 9:00 a 19:00', () => {
    const filas = semanaDelSalon(momento('2026/10/09', '10:00'));

    expect(filas[0]).toMatchObject({ abre: '8:00', cierra: '20:00' });
    expect(filas[5]).toMatchObject({ abre: '9:00', cierra: '19:00' });
    expect(filas[6]).toMatchObject({ abre: '9:00', cierra: '19:00' });
  });

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    const filas = semanaDelSalon(momento('2026/10/11', '10:00'));

    expect(filas[0].fecha).toBe('2026/10/05');
    expect(filas[6].esHoy).toBe(true);
  });

  it('un festivo de la semana sale con su horario reducido y marcado', () => {
    const filas = semanaDelSalon(momento('2026/10/13', '10:00'));

    expect(filas[0]).toMatchObject({
      fecha: '2026/10/12',
      esFestivo: true,
      abre: '9:00',
      cierra: '19:00',
    });
    expect(filas[1].esFestivo).toBe(false);
  });
});

describe('horarioDeFestivos', () => {
  it('es el horario reducido', () => {
    expect(horarioDeFestivos()).toEqual({ abre: '9:00', cierra: '19:00' });
  });
});
