/**
 * El modelo de «la bandeja» (spec §3, A1–A4): pestañas, cuentas, días y
 * textos, calculados en el cliente sobre `GET /reservations`.
 *
 * Esa lista solo trae VIGENTES (ventana sin terminar y no canceladas): no hay
 * histórico, así que ninguna pestaña promete «Pasadas». Llega en UTC y en
 * orden descendente; todo lo que se pinta va en hora de Bogotá y de la más
 * próxima a la más lejana.
 */
import {
  NOTA_CANCELADAS,
  PESTANAS_BANDEJA,
  TEXTO_VACIO,
  agruparPorDia,
  contarPorPestana,
  diaDelSalon,
  fechaLargaCapitalizada,
  filtrarPorPestana,
  franjaDeLaCita,
  horaDelSalon,
  nombreDeClienta,
  nombreDeEstilista,
  ordenarPorHora,
  procedenciaDeClienta,
  serviciosEnUnaLinea,
  textoAsignacion,
  textoDelPie,
  tituloDelDia,
  totalDeLaReserva,
} from 'src/helpers/admin-reservation-filter';
import { HOY, bandeja, reserva } from './fixtures/bandeja';

const ids = (lista: { id: string }[]) => lista.map((r) => r.id);

describe('la bandeja · pestañas (A1)', () => {
  it('ofrece cuatro pestañas y ninguna de histórico', () => {
    expect(PESTANAS_BANDEJA.map((p) => p.rotulo)).toEqual([
      'Pendientes',
      'Confirmadas',
      'Hoy',
      'Todas',
    ]);
  });

  it('cuenta cada pestaña sobre la lista de vigentes', () => {
    expect(contarPorPestana(bandeja(), HOY)).toEqual({
      pendientes: 3,
      confirmadas: 2,
      hoy: 1,
      todas: 5,
    });
  });

  it('un estado concreto deja solo sus filas', () => {
    expect(ids(filtrarPorPestana(bandeja(), 'confirmadas', HOY))).toEqual([
      'res-4',
      'res-3',
    ]);
  });

  it('«Hoy» mira el día en Bogotá, sea cual sea el estado', () => {
    expect(ids(filtrarPorPestana(bandeja(), 'hoy', HOY))).toEqual(['res-3']);
  });

  it('«Todas» no deja ninguna fuera y no devuelve la misma lista', () => {
    const lista = bandeja();
    const todas = filtrarPorPestana(lista, 'todas', HOY);

    expect(todas).toHaveLength(5);
    expect(todas).not.toBe(lista);
  });
});

describe('la bandeja · tiempo del salón (Foco 4)', () => {
  it('lee el día y la hora en Bogotá, no en UTC', () => {
    // 00:30 UTC del 8 = 19:30 del 7 en Bogotá.
    const noche = '2026-10-08T00:30:00.000Z';

    expect(diaDelSalon(noche)).toBe('2026-10-07');
    expect(horaDelSalon(noche)).toBe('19:30');
  });

  it('la franja va de la hora de inicio a la de fin', () => {
    expect(franjaDeLaCita(reserva())).toBe('10:30 a 11:30');
  });

  it('ordena de la más próxima a la más lejana (el backend las manda al revés)', () => {
    expect(ids(ordenarPorHora(bandeja()))).toEqual([
      'res-3',
      'res-1',
      'res-2',
      'res-4',
      'res-5',
    ]);
  });

  it('no reordena la lista que recibe', () => {
    const lista = bandeja();
    ordenarPorHora(lista);

    expect(lista[0].id).toBe('res-5');
  });
});

describe('la bandeja · días (A2)', () => {
  it('titula hoy, mañana y el resto como el tablero', () => {
    expect(tituloDelDia('2026-10-07', HOY)).toBe('Hoy · miércoles 7 de octubre');
    expect(tituloDelDia('2026-10-08', HOY)).toBe('Mañana · jueves 8 de octubre');
    expect(tituloDelDia('2026-10-09', HOY)).toBe('Viernes 9 de octubre');
  });

  it('«mañana» cruza el fin de mes', () => {
    expect(tituloDelDia('2026-11-01', '2026-10-31')).toBe(
      'Mañana · domingo 1 de noviembre'
    );
  });

  it('agrupa por día, en orden, y conserva el orden por hora dentro de cada día', () => {
    const grupos = agruparPorDia(
      filtrarPorPestana(bandeja(), 'pendientes', HOY),
      HOY
    );

    expect(grupos.map((g) => g.titulo)).toEqual([
      'Mañana · jueves 8 de octubre',
      'Viernes 9 de octubre',
    ]);
    expect(ids(grupos[0].reservas)).toEqual(['res-1', 'res-2']);
    expect(ids(grupos[1].reservas)).toEqual(['res-5']);
  });

  it('la fecha del detalle va con mayúscula y sin «Hoy»', () => {
    expect(fechaLargaCapitalizada('2026-10-08')).toBe('Jueves 8 de octubre');
  });
});

describe('la bandeja · la clienta y la estilista (A4)', () => {
  it('usa el nombre del contacto', () => {
    expect(nombreDeClienta(reserva())).toBe('Andrea Ruiz');
  });

  /**
   * Con sesión y sin teléfono el portal ya no manda `contact` (plan 1, B4), y
   * `GET /reservations` no trae el nombre de la cuenta: la fila no puede
   * quedarse en blanco.
   */
  it('una reserva con sesión y sin contacto no se queda sin nombre', () => {
    expect(nombreDeClienta(reserva({ userId: 'u-9', contact: null }))).toBe(
      'Clienta con cuenta'
    );
  });

  it('un contacto con el nombre en blanco tampoco', () => {
    const sinNombre = reserva({
      contact: { name: '   ', phone: '3001234567', email: null },
    });

    expect(nombreDeClienta(sinNombre)).toBe('Clienta sin nombre');
  });

  it('dice si tiene cuenta en el portal', () => {
    expect(procedenciaDeClienta(reserva())).toBe('sin cuenta en el portal');
    expect(procedenciaDeClienta(reserva({ userId: 'u-9' }))).toBe(
      'con cuenta en el portal'
    );
  });

  it('dice quién eligió a la estilista', () => {
    expect(textoAsignacion(reserva())).toBe('La eligió la clienta');
    expect(textoAsignacion(reserva({ workerPinned: false }))).toBe(
      'La asignó el sistema'
    );
  });

  it('una estilista sin nombre no deja la línea vacía', () => {
    expect(nombreDeEstilista(reserva({ worker: { id: 'w-x', name: '' } }))).toBe(
      'Sin estilista'
    );
  });

  it('junta los servicios en una línea y suma el total', () => {
    expect(serviciosEnUnaLinea(reserva())).toBe('Wolf cut mujer + Uñas de gel');
    expect(serviciosEnUnaLinea(reserva({ services: [] }))).toBe('Sin servicios');
    expect(totalDeLaReserva(reserva())).toBe(85000);
  });
});

describe('la bandeja · textos', () => {
  it('cada pestaña vacía dice lo suyo', () => {
    expect(TEXTO_VACIO).toEqual({
      pendientes: 'No hay reservas pendientes.',
      confirmadas: 'No hay reservas confirmadas.',
      hoy: 'Hoy no hay citas.',
      todas: 'No hay reservas vigentes.',
    });
  });

  it('el pie de Pendientes explica adónde van las canceladas (tablero)', () => {
    expect(textoDelPie('pendientes')).toBe(
      'No hay más pendientes. Las canceladas salen de la lista; el aviso en tiempo real dice quién y cuándo.'
    );
    expect(textoDelPie('todas')).toBe(NOTA_CANCELADAS);
  });
});
