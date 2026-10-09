/**
 * El cálculo de la tira de días y de las fichas de hora (contrato §4.1 de la
 * hoja de ruta de las vistas). Lo usan el cajón de reserva, «Cambiar fecha» de
 * Mis reservas y «Mover» de la bandeja de la dueña: la regla vive aquí una vez.
 */
import {
  diasDeLaTira,
  franjaDe,
  huecosDelDia,
  rangoDeLaTira,
} from 'src/helpers/reserva-huecos';
import { AHORA, disponibilidad, estilista } from './fixtures/reserva';

const OCUPACION = {
  '2026/10/08': { usedMinutes: 0, capacityMinutes: 2160 },
  '2026/10/09': { usedMinutes: 1500, capacityMinutes: 2160 },
  '2026/10/10': { usedMinutes: 1800, capacityMinutes: 1800 },
  '2026/10/13': { usedMinutes: 2120, capacityMinutes: 2160 },
};

describe('franjaDe', () => {
  it('mañana antes de las 12, tarde hasta las 17, noche desde las 17', () => {
    expect(franjaDe(480)).toBe('manana');
    expect(franjaDe(719)).toBe('manana');
    expect(franjaDe(720)).toBe('tarde');
    expect(franjaDe(1019)).toBe('tarde');
    expect(franjaDe(1020)).toBe('noche');
  });
});

describe('diasDeLaTira', () => {
  it('son catorce días desde hoy, en formato QDate', () => {
    const dias = diasDeLaTira(AHORA);

    expect(dias).toHaveLength(14);
    expect(dias[0].fecha).toBe('2026/10/07');
    expect(dias[13].fecha).toBe('2026/10/20');
  });

  it('solo el primero es hoy', () => {
    const dias = diasDeLaTira(AHORA);

    expect(dias[0].esHoy).toBe(true);
    expect(dias.slice(1).every((d) => !d.esHoy)).toBe(true);
  });

  it('nombra el día de la semana en versalitas y da su número', () => {
    const dias = diasDeLaTira(AHORA);

    expect(dias[0].diaSemanaCorto).toBe('MIÉ');
    expect(dias[1].diaSemanaCorto).toBe('JUE');
    expect(dias[3].diaSemanaCorto).toBe('SÁB');
    expect(dias[1].numero).toBe(8);
  });

  it('cruza el fin de mes sin perderse', () => {
    const dias = diasDeLaTira({
      ymd: '2026-10-25',
      qDate: '2026/10/25',
      minOfDay: 600,
    });

    expect(dias[13].fecha).toBe('2026/11/07');
    expect(dias[13].numero).toBe(7);
  });

  /** B3: el festivo no está cerrado; atiende con el horario reducido. */
  it('marca el festivo y le da su horario de 9:00 a 19:00', () => {
    const dias = diasDeLaTira(AHORA);
    const lunes = dias.find((d) => d.fecha === '2026/10/12');
    const jueves = dias.find((d) => d.fecha === '2026/10/08');

    expect(lunes?.esFestivo).toBe(true);
    expect(lunes?.horario).toEqual({ abre: '9:00', cierra: '19:00' });
    expect(jueves?.esFestivo).toBe(false);
    expect(jueves?.horario).toEqual({ abre: '8:00', cierra: '20:00' });
  });

  it('sin ocupación, la disponibilidad es desconocida (no se inventa)', () => {
    expect(
      diasDeLaTira(AHORA).every((d) => d.disponibilidad === 'desconocida')
    ).toBe(true);
  });

  it('con ocupación, distingue libre, poca y sin hueco', () => {
    const dias = diasDeLaTira(AHORA, OCUPACION, 60);
    const de = (fecha: string) =>
      dias.find((d) => d.fecha === fecha)?.disponibilidad;

    expect(de('2026/10/08')).toBe('libre');
    expect(de('2026/10/09')).toBe('poca');
    expect(de('2026/10/10')).toBe('sin-hueco');
    expect(de('2026/10/11')).toBe('desconocida');
  });

  it('un día con hueco, pero más corto que la bolsa, es sin hueco', () => {
    const dias = diasDeLaTira(AHORA, OCUPACION, 60);

    expect(dias.find((d) => d.fecha === '2026/10/13')?.disponibilidad).toBe(
      'sin-hueco'
    );
  });

  it('acepta otro número de días', () => {
    expect(diasDeLaTira(AHORA, undefined, 0, 7)).toHaveLength(7);
  });

  /**
   * Las claves de `byDate` llegan del backend en QDate (`'YYYY/MM/DD'`,
   * `get-occupancy.use-case.ts`) y se usan tal cual. Si algún día llegaran
   * con guiones, la tira no puede quedarse en «desconocida» en silencio.
   */
  it('lee las claves de byDate tal cual llegan, con barras o con guiones', () => {
    const conBarras = diasDeLaTira(AHORA, OCUPACION, 60);
    const conGuiones = diasDeLaTira(
      AHORA,
      {
        '2026-10-08': { usedMinutes: 0, capacityMinutes: 2160 },
        '2026-10-10': { usedMinutes: 1800, capacityMinutes: 1800 },
      },
      60
    );

    expect(conBarras[1].disponibilidad).toBe('libre');
    expect(conGuiones[1].disponibilidad).toBe('libre');
    expect(conGuiones[3].disponibilidad).toBe('sin-hueco');
    expect(conGuiones[1].fecha).toBe('2026/10/08');
  });
});

describe('rangoDeLaTira', () => {
  it('pide la ocupación justo de los días que se pintan', () => {
    expect(rangoDeLaTira(AHORA)).toEqual({
      desde: '2026-10-07',
      hasta: '2026-10-20',
    });
    expect(rangoDeLaTira(AHORA, 7)).toEqual({
      desde: '2026-10-07',
      hasta: '2026-10-13',
    });
  });
});

describe('huecosDelDia', () => {
  const base = {
    fecha: '2026/10/08',
    duracionMin: 60,
    disponibilidad: disponibilidad(),
  };
  const libreA = (huecos: { hora: string; libre: boolean }[], hora: string) =>
    huecos.find((h) => h.hora === hora)?.libre;

  it('ofrece cada 30 min desde la apertura hasta la última hora que cabe', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: null });

    expect(huecos[0].hora).toBe('08:00');
    expect(huecos[0].minutoDelDia).toBe(480);
    expect(huecos[1].hora).toBe('08:30');
    expect(huecos[huecos.length - 1].hora).toBe('19:00');
    expect(huecos).toHaveLength(23);
  });

  it('cada hueco lleva su franja', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: null });
    const franja = (hora: string) => huecos.find((h) => h.hora === hora)?.franja;

    expect(franja('11:30')).toBe('manana');
    expect(franja('12:00')).toBe('tarde');
    expect(franja('16:30')).toBe('tarde');
    expect(franja('17:00')).toBe('noche');
  });

  it('con una estilista, ocupa todo lo que se cruza con sus citas', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: 'w-monica' });

    expect(libreA(huecos, '08:00')).toBe(true);
    // 8:30 + 1 h termina a las 9:30: se cruza con la cita de 9:00.
    expect(libreA(huecos, '08:30')).toBe(false);
    expect(libreA(huecos, '09:00')).toBe(false);
    expect(libreA(huecos, '09:30')).toBe(false);
    expect(libreA(huecos, '10:00')).toBe(true);
  });

  it('sin preferencia, basta con que una estilista pueda', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: null });

    expect(libreA(huecos, '09:00')).toBe(true);
  });

  it('la predeterminada no cuenta mientras haya alguna asignable', () => {
    const d = disponibilidad({
      workers: [
        estilista({
          id: 'w-defecto',
          name: 'Sin prefencia',
          isDefault: true,
          assignable: false,
        }),
        estilista({
          id: 'w-monica',
          name: 'Monica',
          reservations: [{ startMin: 540, endMin: 600 }],
        }),
      ],
    });

    expect(
      libreA(huecosDelDia({ ...base, disponibilidad: d, estilistaId: null }), '09:00')
    ).toBe(false);
  });

  it('sin ninguna asignable, reparte a la predeterminada, como el backend', () => {
    const d = disponibilidad({
      workers: [
        estilista({
          id: 'w-defecto',
          name: 'Sin prefencia',
          isDefault: true,
          assignable: false,
        }),
      ],
    });

    expect(
      libreA(huecosDelDia({ ...base, disponibilidad: d, estilistaId: null }), '09:00')
    ).toBe(true);
  });

  it('una estilista que no está en la respuesta no tiene horas libres', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: 'w-no-existe' });

    expect(huecos.length).toBeGreaterThan(0);
    expect(huecos.some((h) => h.libre)).toBe(false);
  });

  it('hoy no ofrece las horas que ya pasaron', () => {
    const d = disponibilidad({
      dayBounds: {
        openMin: 480,
        closeMin: 1200,
        effectiveStartMin: 555,
        isToday: true,
      },
    });
    const huecos = huecosDelDia({
      ...base,
      fecha: '2026/10/07',
      disponibilidad: d,
      estilistaId: null,
    });

    expect(huecos[0].hora).toBe('09:30');
  });

  it('un día anterior al de hoy del salón no tiene huecos', () => {
    expect(
      huecosDelDia({ ...base, fecha: '2026/10/06', estilistaId: null })
    ).toEqual([]);
  });

  it('fin de semana o festivo: de 9:00 a 19:00, según el servidor', () => {
    const d = disponibilidad({
      dayBounds: {
        openMin: 540,
        closeMin: 1140,
        effectiveStartMin: 540,
        isToday: false,
      },
    });
    const huecos = huecosDelDia({
      ...base,
      fecha: '2026/10/12',
      disponibilidad: d,
      estilistaId: null,
    });

    expect(huecos[0].hora).toBe('09:00');
    expect(huecos[huecos.length - 1].hora).toBe('18:00');
  });

  it('acepta otro paso', () => {
    const huecos = huecosDelDia({ ...base, estilistaId: null, pasoMin: 60 });

    expect(huecos.slice(0, 3).map((h) => h.hora)).toEqual([
      '08:00',
      '09:00',
      '10:00',
    ]);
  });
});
