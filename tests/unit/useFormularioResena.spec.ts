/**
 * El formulario de la reseña sin montar nada: el borrador (que no se pierde
 * por un toque en el velo, pero tampoco lo hereda otra cuenta), la validación
 * en vivo tras el primer intento, un solo envío aunque se pulse dos veces y
 * los fallos que avisan sin borrar lo escrito.
 */
import { MENSAJE_SIN_CONEXION } from 'src/helpers/mensajes-acceso';
import { MENSAJES_RESENA } from 'src/helpers/resena';
import { useFormularioResena } from 'src/composables/reviews/useFormularioResena';
import { errorDeRed, errorHttp } from './fixtures/acceso';

const mockCrear = jest.fn();
jest.mock('src/api/reviews-api', () => ({
  crearResena: (cuerpo: unknown) => mockCrear(cuerpo),
}));
const mockInvalidar = jest.fn();
jest.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidar }),
}));

const LAURA = { nombre: 'Laura Gómez', correo: 'laura@correo.com' };

/** Un formulario abierto por Laura, con todo bien. */
function listo() {
  const formulario = useFormularioResena();
  formulario.preparar(LAURA);
  formulario.campos.puntaje = 4;
  formulario.campos.texto = '  El tinte me quedó parejo.  ';
  return formulario;
}

beforeEach(() => {
  mockCrear.mockReset();
  mockInvalidar.mockReset();
});

describe('useFormularioResena · al abrir', () => {
  it('rellena el nombre de la cuenta y deja el puntaje sin valor', () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);

    expect(formulario.campos).toEqual({
      nombre: 'Laura Gómez',
      texto: '',
      puntaje: null,
    });
    expect(formulario.estado.value).toBe('editando');
  });

  it('sin intentar enviar no enseña errores', () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);

    expect(formulario.errores.value).toEqual({});
  });

  it('volver a abrir con la misma cuenta conserva el borrador', () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);
    formulario.campos.texto = 'Me encantó el corte';
    formulario.campos.puntaje = 5;

    formulario.preparar(LAURA);

    expect(formulario.campos.texto).toBe('Me encantó el corte');
    expect(formulario.campos.puntaje).toBe(5);
  });

  it('otra cuenta no hereda el borrador', () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);
    formulario.campos.texto = 'Me encantó el corte';

    formulario.preparar({ nombre: 'Ana', correo: 'ana@correo.com' });

    expect(formulario.campos).toEqual({ nombre: 'Ana', texto: '', puntaje: null });
  });

  it('tras una reseña enviada, el formulario vuelve vacío', async () => {
    mockCrear.mockResolvedValue({});
    const formulario = listo();
    await formulario.enviar();

    formulario.preparar(LAURA);

    expect(formulario.campos.texto).toBe('');
    expect(formulario.campos.puntaje).toBeNull();
    expect(formulario.estado.value).toBe('editando');
  });
});

describe('useFormularioResena · enviar', () => {
  it('sin puntaje no envía y señala el puntaje primero', async () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);
    formulario.campos.texto = 'Bien';

    expect(await formulario.enviar()).toBe('puntaje');
    expect(mockCrear).not.toHaveBeenCalled();
    expect(formulario.errores.value).toEqual({
      puntaje: MENSAJES_RESENA.puntaje,
      texto: MENSAJES_RESENA.textoCorto,
    });
  });

  it('tras el primer intento, los errores siguen a lo que se escribe', async () => {
    const formulario = useFormularioResena();
    formulario.preparar(LAURA);
    formulario.campos.puntaje = 3;
    formulario.campos.texto = 'Bien';
    await formulario.enviar();
    expect(formulario.errores.value.texto).toBe(MENSAJES_RESENA.textoCorto);

    formulario.campos.texto = 'Bien atendida';

    expect(formulario.errores.value.texto).toBeUndefined();
  });

  it('envía el cuerpo recortado, queda enviada e invalida la lista de reseñas', async () => {
    mockCrear.mockResolvedValue({ id: 'r1' });
    const formulario = listo();
    formulario.campos.nombre = '  Laura Gómez ';

    expect(await formulario.enviar()).toBeNull();

    expect(mockCrear).toHaveBeenCalledWith({
      name: 'Laura Gómez',
      description: 'El tinte me quedó parejo.',
      score: 4,
    });
    expect(formulario.estado.value).toBe('enviada');
    expect(mockInvalidar).toHaveBeenCalledWith({ queryKey: ['reviews'] });
  });

  it('dos envíos seguidos hacen una sola petición', async () => {
    let resolver: (valor: unknown) => void = () => undefined;
    mockCrear.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      })
    );
    const formulario = listo();

    const primero = formulario.enviar();
    const segundo = formulario.enviar();
    expect(formulario.estado.value).toBe('enviando');
    resolver({});
    await primero;
    await segundo;

    expect(mockCrear).toHaveBeenCalledTimes(1);
  });

  it('sin conexión vuelve a editar, avisa y no borra lo escrito', async () => {
    mockCrear.mockRejectedValue(errorDeRed());
    const formulario = listo();

    await formulario.enviar();

    expect(formulario.estado.value).toBe('editando');
    expect(formulario.errorEnvio.value).toBe(MENSAJE_SIN_CONEXION);
    expect(formulario.campos.texto).toBe('  El tinte me quedó parejo.  ');
    expect(formulario.campos.puntaje).toBe(4);
    expect(mockInvalidar).not.toHaveBeenCalled();
  });

  it('con la sesión caducada lo dice', async () => {
    mockCrear.mockRejectedValue(errorHttp(401, 'Unauthorized'));
    const formulario = listo();

    await formulario.enviar();

    expect(formulario.errorEnvio.value).toBe(MENSAJES_RESENA.sesion);
  });

  it('reintentar limpia el aviso anterior', async () => {
    mockCrear.mockRejectedValueOnce(errorDeRed()).mockResolvedValueOnce({});
    const formulario = listo();

    await formulario.enviar();
    await formulario.enviar();

    expect(formulario.errorEnvio.value).toBe('');
    expect(formulario.estado.value).toBe('enviada');
  });
});
