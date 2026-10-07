/**
 * El envoltorio de `$q.notify`. Existe porque los avisos de Quasar salen en
 * verde y rojo de fábrica, y esos dos colores no están en tinta/hueso/oro.
 *
 * La pintura se afirma aquí sobre la constante exportada, no montando: es un
 * objeto de JavaScript, no una regla de CSS, así que es real en la prueba.
 */
const notify = jest.fn();

jest.mock('quasar', () => ({ useQuasar: () => ({ notify }) }));

import {
  ESTILO_AVISO,
  POSICION_AVISO,
  useAviso,
} from 'src/composables/shared/useAviso';

beforeEach(() => notify.mockReset());

describe('useAviso', () => {
  it('avisa del logro con el mensaje que se le da', () => {
    useAviso().logro('Servicio eliminado');

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({
      message: 'Servicio eliminado',
      position: POSICION_AVISO,
    });
  });

  /**
   * R13: `--m-peligro` es solo del botón que borra. El aviso de fallo usa la
   * misma tinta por su nombre de paleta (`--m-rosa-profundo`, 6,4:1 con hueso).
   */
  it('pinta cada tono con la paleta, en línea, porque el aviso vive en el body', () => {
    useAviso().fallo('No se pudo eliminar el servicio');

    const estilo = String(notify.mock.calls[0][0].attrs.style);
    expect(estilo).toContain('var(--m-rosa-profundo)');
    expect(estilo).toContain('var(--m-hueso)');
    expect(estilo).not.toContain('--m-peligro');
  });

  it('marca el tono en el nodo, para poder verlo en el navegador', () => {
    useAviso().atencion('Debes seleccionar al menos un género');

    expect(notify.mock.calls[0][0].attrs['data-tono']).toBe('atencion');
  });

  it('el fallo se queda más tiempo en pantalla que el logro', () => {
    const aviso = useAviso();
    aviso.logro('hecho');
    aviso.fallo('roto');

    expect(notify.mock.calls[1][0].timeout).toBeGreaterThan(
      notify.mock.calls[0][0].timeout
    );
  });

  it('ningún tono trae un color escrito a mano', () => {
    for (const estilo of Object.values(ESTILO_AVISO)) {
      expect(estilo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(estilo).not.toMatch(/\brgba?\(/);
      expect(estilo).toContain('var(--m-');
    }
  });

  it('los tres tonos son los que la fase usa, ni uno más', () => {
    expect(Object.keys(ESTILO_AVISO).sort()).toEqual([
      'atencion',
      'fallo',
      'logro',
    ]);
  });
});
