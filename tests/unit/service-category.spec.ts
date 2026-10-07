/**
 * La categoría de un servicio, en un solo sitio (§8.1 de la hoja de ruta).
 *
 * Dos datos imperfectos y una cadena que los ordena: `service.type` guarda
 * rótulos en inglés que escribe el sembrado (`hair-women`, `brows-lashes`), y
 * **casi nunca está** —el sembrado no lo rellena y el DTO del backend lo tiene
 * comentado—, así que el respaldo real es la primera etiqueta. Si no hay ninguna
 * de las dos, cadena vacía y quien pinte decide no pintar la línea.
 *
 * Lo prueba aquí la fase B y lo consume también la ficha de la fase D: un
 * servicio no puede llamarse «Barbería» en la tarjeta y «Fade/Degradado» en la
 * ficha.
 */
import {
  etiquetaDeCategoria,
  etiquetasDeServicio,
} from 'src/helpers/service-category';

describe('etiquetasDeServicio', () => {
  /**
   * `/service/search` trae las etiquetas con `leftJoinAndSelect`, es decir como
   * objetos con `name`, aunque la interfaz del front las tenga tipadas como
   * `string[]`.
   */
  it('saca el nombre de las etiquetas vengan como objetos o como texto', () => {
    expect(
      etiquetasDeServicio({
        tags: [{ id: 't1', name: 'Fade/Degradado' }, 'Adulto'],
      })
    ).toEqual(['Fade/Degradado', 'Adulto']);
  });

  /**
   * `normalizeServiceTags` de `ServicePage.vue` reenvía las etiquetas como
   * identificadores al aplicar una promoción: un uuid no es una etiqueta y no
   * puede acabar pintado como categoría.
   */
  it('descarta identificadores, vacíos y espacios', () => {
    expect(
      etiquetasDeServicio({
        tags: [
          '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
          '   ',
          '  Universal  ',
          null,
        ],
      })
    ).toEqual(['Universal']);
  });

  it('sin etiquetas devuelve una lista vacía, no revienta', () => {
    expect(etiquetasDeServicio({})).toEqual([]);
    expect(etiquetasDeServicio({ tags: [] })).toEqual([]);
  });
});

describe('etiquetaDeCategoria', () => {
  it('traduce los seis tipos que escribe el sembrado', () => {
    expect(etiquetaDeCategoria({ type: 'hair-women' })).toBe('Cortes de dama');
    expect(etiquetaDeCategoria({ type: 'hair-men' })).toBe('Barbería');
    expect(etiquetaDeCategoria({ type: 'nails' })).toBe('Uñas');
    expect(etiquetaDeCategoria({ type: 'makeup' })).toBe('Maquillaje');
    expect(etiquetaDeCategoria({ type: 'brows-lashes' })).toBe(
      'Cejas y pestañas'
    );
    expect(etiquetaDeCategoria({ type: 'tinting' })).toBe('Color y tinturas');
  });

  it('no se pierde por mayúsculas ni por espacios de sobra', () => {
    expect(etiquetaDeCategoria({ type: '  Hair-Women ' })).toBe(
      'Cortes de dama'
    );
  });

  /** El `type` traducido manda: la etiqueta es solo el respaldo. */
  it('con tipo conocido y etiquetas, gana el tipo', () => {
    expect(
      etiquetaDeCategoria({ type: 'nails', tags: ['Fade/Degradado'] })
    ).toBe('Uñas');
  });

  /**
   * El caso normal del catálogo real: el sembrado no escribe `type`, así que la
   * categoría que ve la clienta es la primera etiqueta.
   */
  it('sin tipo cae en la primera etiqueta', () => {
    expect(
      etiquetaDeCategoria({
        tags: [{ id: 't1', name: 'Fade/Degradado' }, 'Adulto'],
      })
    ).toBe('Fade/Degradado');
    expect(etiquetaDeCategoria({ type: '', tags: ['Universal'] })).toBe(
      'Universal'
    );
    expect(etiquetaDeCategoria({ type: null, tags: ['Universal'] })).toBe(
      'Universal'
    );
  });

  /** Un tipo que no está en la tabla tampoco se pinta en crudo: cae a la etiqueta. */
  it('con un tipo desconocido cae en la primera etiqueta, no lo pinta en inglés', () => {
    const categoria = etiquetaDeCategoria({ type: 'spa', tags: ['Uñas gel'] });

    expect(categoria).toBe('Uñas gel');
    expect(categoria).not.toBe('spa');
  });

  it('sin tipo y sin etiquetas no dice nada, y la línea no se pinta', () => {
    expect(etiquetaDeCategoria({})).toBe('');
    expect(etiquetaDeCategoria({ type: '', tags: [] })).toBe('');
    expect(
      etiquetaDeCategoria({
        type: 'spa',
        tags: ['3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
      })
    ).toBe('');
  });
});
