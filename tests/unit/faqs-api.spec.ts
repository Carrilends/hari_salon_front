/**
 * Todo el HTTP de las preguntas frecuentes pasa por aquí (antes vivía dentro
 * de `useFaqs`). Lo que más importa es la ruta nueva de reordenar: la URL, el
 * cuerpo y que vaya con el cliente que lleva el token de la dueña.
 */
const get = jest.fn();
const post = jest.fn();
const patch = jest.fn();
const borrar = jest.fn();

jest.mock('src/api/services-api', () => ({
  servicesApi: { get: (...a: unknown[]) => get(...a) },
  adminServiceApi: {
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => borrar(...a),
  },
}));

import {
  borrarPregunta,
  crearPregunta,
  editarPregunta,
  listarPreguntas,
  reordenarPreguntas,
} from 'src/api/faqs-api';
import { PREGUNTAS, idsDe } from './fixtures/preguntas';

beforeEach(() => jest.clearAllMocks());

describe('faqs-api', () => {
  it('reordenar manda los ids a /faqs/orden con el cliente de la dueña', async () => {
    patch.mockResolvedValue({ data: PREGUNTAS });

    const lista = await reordenarPreguntas(idsDe(PREGUNTAS));

    expect(patch).toHaveBeenCalledWith('/faqs/orden', {
      ids: ['p-reservar', 'p-cambiar', 'p-horario'],
    });
    expect(lista).toBe(PREGUNTAS);
  });

  it('la lista pública se pide sin token', async () => {
    get.mockResolvedValue({ data: PREGUNTAS });

    expect(await listarPreguntas()).toBe(PREGUNTAS);
    expect(get).toHaveBeenCalledWith('/faqs');
  });

  it('crear, editar y borrar van con el cliente de la dueña', async () => {
    post.mockResolvedValue({ data: PREGUNTAS[0] });
    patch.mockResolvedValue({ data: PREGUNTAS[1] });
    borrar.mockResolvedValue({ data: { deleted: true } });
    const cuerpo = {
      question: '¿Hay parqueadero?',
      answer: 'Sí, en la calle.',
    };

    expect(await crearPregunta(cuerpo)).toBe(PREGUNTAS[0]);
    expect(await editarPregunta('p-cambiar', cuerpo)).toBe(PREGUNTAS[1]);
    expect(await borrarPregunta('p-horario')).toEqual({ deleted: true });

    expect(post).toHaveBeenCalledWith('/faqs', cuerpo);
    expect(patch).toHaveBeenCalledWith('/faqs/p-cambiar', cuerpo);
    expect(borrar).toHaveBeenCalledWith('/faqs/p-horario');
  });
});
