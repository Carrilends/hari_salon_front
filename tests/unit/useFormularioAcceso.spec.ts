/**
 * La validación de los formularios de acceso (A4).
 *
 * El error de un campo aparece AL SALIR de él o AL INTENTAR ENVIAR, nunca
 * mientras se escribe por primera vez; al enviar con errores, la página manda
 * el foco al primer campo que falla. Se usan los validadores que ya existían.
 */
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import {
  enfocarCampo,
  useFormularioAcceso,
  type FormularioAcceso,
} from 'src/composables/auth/useFormularioAcceso';
import { isEmail, matches, minLength, requerido } from 'src/helpers/validators';

type Campo = 'correo' | 'contrasena' | 'repetida';

const crear = () => {
  const formulario: FormularioAcceso<Campo> = useFormularioAcceso<Campo>({
    correo: [requerido('Escribe tu correo.'), isEmail('Correo no válido.')],
    contrasena: [
      requerido('Escribe tu contraseña.'),
      minLength(8, 'Usa 8 caracteres o más.'),
    ],
    repetida: [
      matches(() => formulario.valores.contrasena.value, 'No coinciden.'),
    ],
  });
  return formulario;
};

describe('useFormularioAcceso', () => {
  it('cada campo arranca vacío y sin error visible', () => {
    const f = crear();

    expect(f.valores.correo.value).toBe('');
    expect(f.errores.value).toEqual({
      correo: '',
      contrasena: '',
      repetida: '',
    });
  });

  it('mientras se escribe por primera vez no regaña', () => {
    const f = crear();

    f.valores.correo.value = 'ana';

    expect(f.errores.value.correo).toBe('');
  });

  it('al salir del campo aparece su primer error, y solo el suyo', () => {
    const f = crear();
    f.valores.correo.value = 'ana';

    f.tocar('correo');

    expect(f.errores.value.correo).toBe('Correo no válido.');
    expect(f.errores.value.contrasena).toBe('');
  });

  it('tras tocarlo, el error sigue a la escritura y se va al corregir', () => {
    const f = crear();
    f.tocar('correo');
    expect(f.errores.value.correo).toBe('Escribe tu correo.');

    f.valores.correo.value = 'ana@correo.com';

    expect(f.errores.value.correo).toBe('');
  });

  it('las reglas se aplican en orden: manda la primera que falla', () => {
    const f = crear();
    f.tocar('contrasena');
    expect(f.errores.value.contrasena).toBe('Escribe tu contraseña.');

    f.valores.contrasena.value = 'abc';

    expect(f.errores.value.contrasena).toBe('Usa 8 caracteres o más.');
  });

  it('validarTodo enseña todos los errores y devuelve el primer campo que falla, en el orden declarado', () => {
    const f = crear();
    f.valores.correo.value = 'ana@correo.com';

    expect(f.validarTodo()).toBe('contrasena');
    expect(f.errores.value).toEqual({
      correo: '',
      contrasena: 'Escribe tu contraseña.',
      repetida: '',
    });
  });

  it('validarTodo devuelve null cuando todo está bien', () => {
    const f = crear();
    f.valores.correo.value = 'ana@correo.com';
    f.valores.contrasena.value = 'Marlene2026';
    f.valores.repetida.value = 'Marlene2026';

    expect(f.validarTodo()).toBeNull();
  });

  it('una regla puede leer otro campo (repetir la contraseña)', () => {
    const f = crear();
    f.valores.contrasena.value = 'Marlene2026';
    f.valores.repetida.value = 'Marlene2025';
    f.tocar('repetida');
    expect(f.errores.value.repetida).toBe('No coinciden.');

    f.valores.repetida.value = 'Marlene2026';

    expect(f.errores.value.repetida).toBe('');
  });

  it('esValido refleja las reglas sin enseñar errores', () => {
    const f = crear();
    expect(f.esValido.value).toBe(false);

    f.valores.correo.value = 'ana@correo.com';
    f.valores.contrasena.value = 'Marlene2026';
    f.valores.repetida.value = 'Marlene2026';

    expect(f.esValido.value).toBe(true);
    expect(f.errores.value.correo).toBe('');
  });

  it('los errores son reactivos dentro de una plantilla', async () => {
    const Prueba = defineComponent({
      setup() {
        const f = crear();
        return () =>
          h('div', [
            h('span', { 'data-test': 'error' }, f.errores.value.correo),
            h('button', {
              'data-test': 'tocar',
              type: 'button',
              onClick: () => f.tocar('correo'),
            }),
          ]);
      },
    });
    const wrapper = mount(Prueba);
    expect(wrapper.find('[data-test="error"]').text()).toBe('');

    await wrapper.find('[data-test="tocar"]').trigger('click');

    expect(wrapper.find('[data-test="error"]').text()).toBe(
      'Escribe tu correo.'
    );
  });
});

describe('enfocarCampo', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lleva el foco al control con ese id', () => {
    document.body.innerHTML = '<input id="correo" /><input id="contrasena" />';

    enfocarCampo('contrasena');

    expect(document.activeElement?.id).toBe('contrasena');
  });

  it('un id que no existe no rompe nada', () => {
    expect(() => enfocarCampo('no-existe')).not.toThrow();
  });
});
