import {
  MENSAJE_CON_RESERVAS,
  cabecerasDeDias,
  citasDeHoy,
  formatearDuracion,
  horaYFechaEnSalon,
  inicialDe,
  lunesDe,
  mensajeAlEliminar,
  mensajeAlGuardar,
  porcentajeDeCarga,
  resumenDeSemana,
  rotuloCortoSemana,
  rotuloLargoSemana,
  sumarDias,
  textoCarga,
  validarNombre,
} from 'src/helpers/semana-estilistas';
import { DIAS, HOY, diasCon, reservaDePrueba } from './fixtures/estilistas';

describe('las fechas de la semana', () => {
  it('suma días cruzando de mes', () => {
    expect(sumarDias('2026-09-28', 6)).toBe('2026-10-04');
    expect(sumarDias('2026-10-05', -7)).toBe('2026-09-28');
  });

  it('el lunes de un domingo es el ANTERIOR', () => {
    expect(lunesDe('2026-10-11')).toBe('2026-10-05');
    expect(lunesDe('2026-10-05')).toBe('2026-10-05');
  });

  it('cruza el año hacia atrás', () => {
    expect(lunesDe('2026-01-01')).toBe('2025-12-29');
  });
});

describe('los rótulos de la semana', () => {
  it('dentro de un mes: «5 – 11 oct 2026»', () => {
    expect(rotuloCortoSemana('2026-10-05')).toBe('5 – 11 oct 2026');
  });

  it('entre dos meses nombra los dos', () => {
    expect(rotuloCortoSemana('2026-09-28')).toBe('28 sep – 4 oct 2026');
  });

  it('entre dos años nombra los dos años', () => {
    expect(rotuloCortoSemana('2025-12-29')).toBe('29 dic 2025 – 4 ene 2026');
  });

  it('el largo, dentro de un mes y entre dos', () => {
    expect(rotuloLargoSemana('2026-10-05')).toBe(
      'semana del 5 al 11 de octubre'
    );
    expect(rotuloLargoSemana('2026-09-28')).toBe(
      'semana del 28 de septiembre al 4 de octubre'
    );
  });
});

describe('las cabeceras de los días', () => {
  it('nombra cada día y marca solo hoy', () => {
    const cabeceras = cabecerasDeDias(DIAS, HOY);

    expect(cabeceras.map((c) => `${c.corto} ${c.numero}`)).toEqual([
      'Lun 5',
      'Mar 6',
      'Mié 7',
      'Jue 8',
      'Vie 9',
      'Sáb 10',
      'Dom 11',
    ]);
    expect(cabeceras.map((c) => c.inicial).join('')).toBe('LMMJVSD');
    expect(cabeceras.filter((c) => c.esHoy).map((c) => c.fecha)).toEqual([HOY]);
    expect(cabeceras[2].nombreLargo).toBe('miércoles');
  });

  it('una semana sin hoy no marca nada', () => {
    expect(cabecerasDeDias(DIAS, '2026-10-20').some((c) => c.esHoy)).toBe(
      false
    );
  });
});

describe('las cifras', () => {
  it.each([
    [0, '—'],
    [30, '30 min'],
    [60, '1 h'],
    [65, '1 h 05'],
    [90, '1 h 30'],
    [690, '11 h 30'],
    [1320, '22 h'],
  ])('%i minutos se escriben «%s»', (minutos, texto) => {
    expect(formatearDuracion(minutos)).toBe(texto);
  });

  it('el porcentaje de carga redondea y nunca pasa de 100', () => {
    expect(porcentajeDeCarga(180, 720)).toBe(25);
    expect(porcentajeDeCarga(900, 720)).toBe(100);
    expect(porcentajeDeCarga(0, 720)).toBe(0);
    expect(porcentajeDeCarga(60, 0)).toBe(0);
  });

  it('el texto de la barra dice las horas reales, también por encima del horario', () => {
    expect(textoCarga(180, 720)).toBe('3 h reservadas de 12 h');
    expect(textoCarga(780, 720)).toBe('13 h reservadas de 12 h');
    expect(textoCarga(0, 600)).toBe('Sin citas · 10 h de horario');
  });

  it('el resumen suma la semana', () => {
    expect(resumenDeSemana(diasCon([180, 120, 90, 240, 330, 360, 0]))).toEqual({
      usados: 1320,
      capacidad: 4800,
    });
  });

  it('la inicial sale del nombre, o «?» si no hay', () => {
    expect(inicialDe('  monica')).toBe('M');
    expect(inicialDe('')).toBe('?');
  });
});

describe('las citas de hoy', () => {
  it('lee la hora y el día en Bogotá', () => {
    expect(horaYFechaEnSalon('2026-10-07T13:30:00.000Z')).toEqual({
      ymd: '2026-10-07',
      hora: '8:30',
    });
  });

  it('una cita a las 22:30 de Bogotá es del día de Bogotá, aunque en UTC ya sea mañana', () => {
    expect(horaYFechaEnSalon('2026-10-08T03:30:00.000Z')).toEqual({
      ymd: '2026-10-07',
      hora: '22:30',
    });
  });

  it('filtra por estilista y por hoy, sin canceladas, en orden de hora', () => {
    const reservas = [
      reservaDePrueba({
        id: 'r-tarde',
        scheduledAt: '2026-10-07T19:00:00.000Z',
        endedAt: '2026-10-07T20:30:00.000Z',
        services: [
          {
            serviceId: 'a',
            name: 'Uñas acrílicas',
            price: 1,
            durationMinutes: 90,
          },
        ],
      }),
      reservaDePrueba({ id: 'r-manana' }),
      reservaDePrueba({ id: 'r-otra', workerId: 'w-ale' }),
      reservaDePrueba({ id: 'r-cancelada', status: 'cancelada' }),
      reservaDePrueba({
        id: 'r-manana-siguiente',
        scheduledAt: '2026-10-08T13:30:00.000Z',
        endedAt: '2026-10-08T15:00:00.000Z',
      }),
      reservaDePrueba({
        id: 'r-dos',
        scheduledAt: '2026-10-07T15:30:00.000Z',
        endedAt: '2026-10-07T16:30:00.000Z',
        services: [
          {
            serviceId: 'b',
            name: 'Wolf cut mujer',
            price: 1,
            durationMinutes: 30,
          },
          { serviceId: 'c', name: 'Lavado', price: 1, durationMinutes: 30 },
        ],
      }),
    ];

    expect(citasDeHoy(reservas, 'w-mon', HOY)).toEqual([
      { id: 'r-manana', desde: '8:30', hasta: '10:00', servicios: 'Balayage' },
      {
        id: 'r-dos',
        desde: '10:30',
        hasta: '11:30',
        servicios: 'Wolf cut mujer + 1',
      },
      {
        id: 'r-tarde',
        desde: '14:00',
        hasta: '15:30',
        servicios: 'Uñas acrílicas',
      },
    ]);
  });
});

describe('los mensajes', () => {
  const http = (status: number) => ({ response: { status, data: {} } });

  it('solo el 409 dice que tiene reservas', () => {
    expect(mensajeAlEliminar(http(409))).toBe(MENSAJE_CON_RESERVAS);
    expect(MENSAJE_CON_RESERVAS).toBe(
      'No se puede eliminar: tiene reservas registradas'
    );
    expect(mensajeAlEliminar(http(400))).toBe(
      'La opción predeterminada no se puede eliminar.'
    );
    expect(mensajeAlEliminar(http(404))).toBe(
      'Esta estilista ya no existe. Actualiza la página.'
    );
  });

  it('un fallo de red no se confunde con «tiene reservas»', () => {
    expect(mensajeAlEliminar({ message: 'Network Error' })).toBe(
      'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.'
    );
    expect(mensajeAlEliminar(undefined)).toBe(
      'No se pudo eliminar. Revisa la conexión e inténtalo de nuevo.'
    );
  });

  it('al guardar: 400 es el nombre, lo demás la conexión', () => {
    expect(mensajeAlGuardar(http(400))).toBe(
      'Revisa el nombre: entre 2 y 120 caracteres.'
    );
    expect(mensajeAlGuardar({ message: 'Network Error' })).toBe(
      'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.'
    );
  });

  it('valida el nombre como el backend (2–120), ya recortado', () => {
    expect(validarNombre('')).toBe('Escribe al menos 2 caracteres.');
    expect(validarNombre(' a ')).toBe('Escribe al menos 2 caracteres.');
    expect(validarNombre('Ana')).toBeNull();
    expect(validarNombre('x'.repeat(121))).toBe('Máximo 120 caracteres.');
  });
});
