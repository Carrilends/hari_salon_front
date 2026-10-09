/**
 * Lo que el cajón manda a `POST /reservations` (B4). Con sesión el backend
 * liga la reserva a la cuenta por el JWT y ya no exige `contact`; sin sesión
 * lo exige, con nombre de 3+ y teléfono de 7+ (`ReservationContactDto`).
 */
import {
  armarSolicitud,
  hayErrores,
  MENSAJES_DATOS,
  nombreDeContacto,
  validarDatos,
} from 'src/helpers/reserva-envio';

const BASE = {
  fecha: '2026/10/08',
  hora: '10:30',
  serviceIds: ['s1', 's2'],
  estilistaId: null,
  nombre: '',
  telefono: '',
};
const SESION = { nombre: 'Laura Gómez', correo: 'laura@correo.com' };

describe('validarDatos', () => {
  it('sin sesión pide nombre, teléfono y la casilla', () => {
    const errores = validarDatos({
      conSesion: false,
      nombre: 'Al',
      telefono: '300 12',
      consentimiento: false,
    });

    expect(errores).toEqual({
      nombre: MENSAJES_DATOS.nombre,
      telefono: MENSAJES_DATOS.telefono,
      consentimiento: MENSAJES_DATOS.consentimiento,
    });
    expect(hayErrores(errores)).toBe(true);
  });

  it('sin sesión, con todo bien, no hay errores', () => {
    const errores = validarDatos({
      conSesion: false,
      nombre: ' Ana ',
      telefono: '300 123 4567',
      consentimiento: true,
    });

    expect(errores).toEqual({});
    expect(hayErrores(errores)).toBe(false);
  });

  it('el teléfono cuenta dígitos, no espacios ni signos', () => {
    expect(
      validarDatos({
        conSesion: false,
        nombre: 'Ana',
        telefono: '+ 57 - - -',
        consentimiento: true,
      }).telefono
    ).toBe(MENSAJES_DATOS.telefono);
  });

  it('con sesión no pide nombre ni casilla, y el teléfono es opcional', () => {
    expect(
      validarDatos({
        conSesion: true,
        nombre: '',
        telefono: '',
        consentimiento: false,
      })
    ).toEqual({});
  });

  it('con sesión, un teléfono a medias sí es un error', () => {
    expect(
      validarDatos({
        conSesion: true,
        nombre: '',
        telefono: '300',
        consentimiento: false,
      })
    ).toEqual({ telefono: MENSAJES_DATOS.telefono });
  });
});

describe('nombreDeContacto', () => {
  it('usa el nombre de la cuenta si tiene 3 caracteres o más', () => {
    expect(nombreDeContacto('  Laura Gómez ', 'laura@correo.com')).toBe(
      'Laura Gómez'
    );
  });

  it('con un nombre corto o vacío, la parte local del correo', () => {
    expect(nombreDeContacto('Al', 'alejandra@correo.com')).toBe('alejandra');
    expect(nombreDeContacto('', 'ana@correo.com')).toBe('ana');
  });

  it('si tampoco llega, el correo entero (siempre pasa el mínimo)', () => {
    expect(nombreDeContacto('', 'al@x.co')).toBe('al@x.co');
  });
});

describe('armarSolicitud', () => {
  it('convierte el día y la hora de Bogotá a ISO en UTC', () => {
    expect(armarSolicitud({ ...BASE, sesion: SESION })?.scheduledAt).toBe(
      '2026-10-08T15:30:00.000Z'
    );
  });

  it('con sesión y sin teléfono, no manda contact', () => {
    expect(armarSolicitud({ ...BASE, sesion: SESION })).toEqual({
      scheduledAt: '2026-10-08T15:30:00.000Z',
      serviceIds: ['s1', 's2'],
    });
  });

  it('con sesión y teléfono, manda el nombre de la cuenta', () => {
    expect(
      armarSolicitud({ ...BASE, sesion: SESION, telefono: ' 3001234567 ' })
        ?.contact
    ).toEqual({ name: 'Laura Gómez', phone: '3001234567' });
  });

  it('con sesión, nombre corto y teléfono, manda la parte local del correo', () => {
    expect(
      armarSolicitud({
        ...BASE,
        sesion: { nombre: 'Al', correo: 'alejandra@correo.com' },
        telefono: '3001234567',
      })?.contact
    ).toEqual({ name: 'alejandra', phone: '3001234567' });
  });

  it('sin sesión, manda lo que escribió, recortado', () => {
    expect(
      armarSolicitud({
        ...BASE,
        sesion: null,
        nombre: '  Ana María ',
        telefono: ' 300 123 4567 ',
      })?.contact
    ).toEqual({ name: 'Ana María', phone: '300 123 4567' });
  });

  it('con estilista elegida manda workerId; sin preferencia, no', () => {
    expect(
      armarSolicitud({ ...BASE, sesion: SESION, estilistaId: 'w-monica' })
        ?.workerId
    ).toBe('w-monica');
    expect(armarSolicitud({ ...BASE, sesion: SESION })).not.toHaveProperty(
      'workerId'
    );
  });

  it('una hora imposible no arma nada', () => {
    expect(
      armarSolicitud({ ...BASE, hora: '25:00', sesion: SESION })
    ).toBeNull();
  });
});
