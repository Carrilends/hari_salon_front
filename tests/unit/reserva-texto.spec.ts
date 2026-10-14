/**
 * Cómo dice el cajón de reserva las fechas, las horas y los precios. Sin `Intl`
 * de fecha: el nombre del día y del mes no puede depender del idioma del
 * navegador de la clienta.
 */
import {
  cantidadDeServicios,
  diaYNumero,
  duracionAprox,
  fechaLarga,
  franjaTexto,
  horaCorta,
  iniciales,
  mesYAnio,
  partesDeFecha,
  precioTexto,
  sumarMinutos,
} from 'src/helpers/reserva-texto';

describe('reserva-texto', () => {
  it('dice la fecha como la lee una clienta, con barras o con guiones', () => {
    expect(fechaLarga('2026/10/08')).toBe('Jueves 8 de octubre');
    expect(fechaLarga('2026-10-12')).toBe('Lunes 12 de octubre');
  });

  it('una fecha imposible no se pinta', () => {
    expect(fechaLarga('2026/02/30')).toBe('');
    expect(partesDeFecha('ayer')).toBeNull();
  });

  it('acorta el día para la nota de festivo', () => {
    expect(diaYNumero('2026/10/12')).toBe('Lunes 12');
  });

  it('nombra el mes de la tira con su año', () => {
    expect(mesYAnio('2026/10/08')).toBe('Octubre 2026');
    expect(mesYAnio('2026/11/01')).toBe('Noviembre 2026');
  });

  it('quita el cero a la izquierda de la hora', () => {
    expect(horaCorta('08:30')).toBe('8:30');
    expect(horaCorta('17:00')).toBe('17:00');
  });

  it('suma minutos y dice la franja de la cita', () => {
    expect(sumarMinutos('10:30', 60)).toBe('11:30');
    expect(sumarMinutos('19:30', 30)).toBe('20:00');
    expect(franjaTexto('10:30', 60)).toBe('10:30 a 11:30');
    expect(franjaTexto('09:00', 90)).toBe('9:00 a 10:30');
  });

  it('el precio lleva el signo y los puntos de miles', () => {
    expect(precioTexto(85000)).toBe('$ 85.000');
    expect(precioTexto(0)).toBe('$ 0');
  });

  it('la duración es aproximada, y sin servicios lo dice', () => {
    expect(duracionAprox(60)).toBe('aprox. 1 h');
    expect(duracionAprox(90)).toBe('aprox. 1 h 30 min');
    expect(duracionAprox(0)).toBe('sin servicios');
  });

  it('cuenta los servicios en singular y en plural', () => {
    expect(cantidadDeServicios(1)).toBe('1 servicio');
    expect(cantidadDeServicios(2)).toBe('2 servicios');
  });

  it('saca hasta dos iniciales del nombre', () => {
    expect(iniciales('Laura Gómez')).toBe('LG');
    expect(iniciales('  ana  ')).toBe('A');
    expect(iniciales('María José Pérez')).toBe('MJ');
    expect(iniciales('')).toBe('');
  });

});
