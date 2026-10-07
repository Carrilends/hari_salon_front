/**
 * El paso 2 del formulario no avanza sin una imagen. El mensaje vivía dentro
 * de un `$q.notify` en la plantilla, así que no se podía probar sin montar el
 * stepper entero: ahora es una función pura y el aviso flotante ya no es el
 * único sitio donde la dueña lo lee.
 */
import {
  ERROR_SIN_IMAGENES,
  validarPasoImagenes,
} from 'src/helpers/service-form-validation';

describe('validarPasoImagenes', () => {
  it('sin imágenes devuelve el mensaje que se pinta junto al campo', () => {
    expect(validarPasoImagenes([])).toBe(ERROR_SIN_IMAGENES);
    expect(ERROR_SIN_IMAGENES).toBe('Debes seleccionar al menos una imagen');
  });

  it('un formulario recién abierto tampoco pasa', () => {
    expect(validarPasoImagenes(undefined)).toBe(ERROR_SIN_IMAGENES);
    expect(validarPasoImagenes(null)).toBe(ERROR_SIN_IMAGENES);
  });

  it('con una imagen ya no hay error', () => {
    expect(validarPasoImagenes([{ url: 'blob:x' }])).toBe('');
  });
});
