/**
 * F4: el front valida igual que el backend (`create-faq.dto.ts`): pregunta
 * 5–180 y respuesta 5–5000. Se mide sobre el texto recortado, que es lo que
 * se envía; así nada de lo que el front deja pasar lo rechaza el servidor.
 */
import {
  errorDeCampo,
  erroresDePregunta,
  LIMITES_PREGUNTA,
} from 'src/helpers/validar-pregunta';

describe('validar-pregunta', () => {
  it('los límites son los del backend', () => {
    expect(LIMITES_PREGUNTA).toEqual({
      pregunta: { min: 5, max: 180 },
      respuesta: { min: 5, max: 5000 },
    });
  });

  it('vacío (o solo espacios) pide escribirlo', () => {
    expect(errorDeCampo('pregunta', '   ')).toBe('Escribe la pregunta.');
    expect(errorDeCampo('respuesta', '')).toBe('Escribe la respuesta.');
  });

  it('menos de 5 caracteres tras recortar no vale', () => {
    expect(errorDeCampo('pregunta', '  ¿Si?  ')).toBe(
      'Escribe al menos 5 caracteres.'
    );
  });

  it('5 caracteres justos valen', () => {
    expect(errorDeCampo('pregunta', '¿Qué?')).toBeNull();
  });

  it('pasarse del máximo no vale', () => {
    expect(errorDeCampo('pregunta', 'a'.repeat(181))).toBe(
      'Máximo 180 caracteres.'
    );
    expect(errorDeCampo('respuesta', 'a'.repeat(5001))).toBe(
      'Máximo 5000 caracteres.'
    );
    expect(errorDeCampo('respuesta', 'a'.repeat(5000))).toBeNull();
  });

  it('reúne los errores de los dos campos y omite los que están bien', () => {
    expect(
      erroresDePregunta({ pregunta: '¿Hay parqueadero?', respuesta: '' })
    ).toEqual({ respuesta: 'Escribe la respuesta.' });
    expect(
      erroresDePregunta({ pregunta: '¿Hay parqueadero?', respuesta: 'Sí, cerca.' })
    ).toEqual({});
  });
});
