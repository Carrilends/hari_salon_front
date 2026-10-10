/**
 * Mi cuenta elige su sección por `?seccion=` (plan 6, C1): así el «atrás» del
 * navegador vuelve del formulario al índice en el móvil, y un enlace puede
 * llevar directo a «Contraseña». Lo que no sea una sección conocida no cuenta.
 */
import {
  CONSULTA_CUENTA_MOVIL,
  SECCIONES_CUENTA,
  seccionDeConsulta,
} from 'src/helpers/secciones-cuenta';

describe('seccionDeConsulta', () => {
  it.each(['perfil', 'correo', 'contrasena', 'sesion'])('acepta %s', (s) => {
    expect(seccionDeConsulta(s)).toBe(s);
  });

  it.each([undefined, null, '', 'otra', 'PERFIL', 42])(
    'descarta %p',
    (valor) => {
      expect(seccionDeConsulta(valor)).toBeNull();
    }
  );

  it('de un arreglo (?seccion=a&seccion=b) toma el primero', () => {
    expect(seccionDeConsulta(['correo', 'perfil'])).toBe('correo');
  });

  it('las secciones van en el orden del índice', () => {
    expect(Array.from(SECCIONES_CUENTA)).toEqual([
      'perfil',
      'correo',
      'contrasena',
      'sesion',
    ]);
  });

  it('el patrón de móvil (índice y sección a pantalla completa) es por debajo de 900 px', () => {
    expect(CONSULTA_CUENTA_MOVIL).toBe('(max-width: 899px)');
  });
});
