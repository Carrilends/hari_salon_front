/**
 * Las cuatro secciones del inicio llevan dentro los UUID de etiqueta y género
 * con los que se filtra el catálogo. Si alguien los cambia al mover el fichero,
 * el inicio sigue pintando bien y los filtros dejan de traer nada: un fallo
 * mudo. Esta prueba los fija.
 */
import { INDEX_SECTIONS } from 'src/constants/index-sections';

describe('secciones del inicio', () => {
  it('son cuatro, con título, descripción e imagen', () => {
    expect(INDEX_SECTIONS).toHaveLength(4);
    for (const seccion of INDEX_SECTIONS) {
      expect(seccion.title.length).toBeGreaterThan(0);
      expect(seccion.description.length).toBeGreaterThan(0);
      expect(seccion.imgPath).toMatch(/^\/people\//);
    }
  });

  it('conserva los identificadores con los que se filtra el catálogo', () => {
    expect(INDEX_SECTIONS[0].filterFormat).toEqual({
      genres: ['47b511ec-2288-4a83-aa51-947d81ecc29b'],
      services: ['83c6a558-805c-4156-94f6-fa7ea55c7d84'],
    });
    expect(INDEX_SECTIONS[1].filterFormat).toEqual({
      genres: ['9d53d0d4-225d-4e2d-b8c1-636e8252986f'],
      services: ['fb2460ea-0400-44d5-a0dc-13275cf33462'],
    });
    expect(INDEX_SECTIONS[2].filterFormat).toEqual({
      services: ['d4ffbd0d-b9e0-4d8d-bb5f-054b37e61c9f'],
    });
    expect(INDEX_SECTIONS[3].filterFormat).toEqual({
      services: ['517d44ba-ff4c-4077-b99a-1ca8021fa21a'],
    });
  });
});
