import i18n from 'src/i18n';

/**
 * Las cuatro secciones que el inicio ofrece como puerta al catálogo.
 *
 * Los UUID son de etiquetas y géneros reales: `goToService` los manda a
 * `/services` como estado de navegación y allí alimentan el filtro. No los
 * toques sin comprobar el filtro; `tests/unit/index-sections.spec.ts` los fija.
 *
 * PENDIENTE DE PRODUCTO: las maquetas muestran «desde $X» por sección. Ese dato
 * no está aquí y calcularlo exige el catálogo entero o un endpoint nuevo; ver
 * la Tarea 4 del plan de remodelación del inicio.
 */
export interface IndexSection {
  imgPath: string;
  title: string;
  description: string;
  filterFormat?: {
    genres?: string[];
    services?: string[];
  };
}

export const INDEX_SECTIONS: IndexSection[] = [
  {
    imgPath: '/people/man_hairdress.jpg',
    title: i18n['en-US'].indexPage.man_cut,
    description:
      'Redefine tu estilo con cortes modernos, clásicos y servicios de barbería profesional. Afeitado con navaja, arreglo de barba y cuidados especiales para el caballero actual.',
    filterFormat: {
      genres: ['47b511ec-2288-4a83-aa51-947d81ecc29b'],
      services: ['83c6a558-805c-4156-94f6-fa7ea55c7d84'],
    },
  },
  {
    imgPath: '/people/women-hair-cut.jpg',
    title: i18n['en-US'].indexPage.woman_cut,
    description:
      'Transforma tu look con cortes a la medida, alisados permanentes o temporales y tratamientos que cuidan tu cabello mientras realzan tu belleza natural.',
    filterFormat: {
      genres: ['9d53d0d4-225d-4e2d-b8c1-636e8252986f'],
      services: ['fb2460ea-0400-44d5-a0dc-13275cf33462'],
    },
  },
  {
    imgPath: '/people/make-up-face-design.jpg',
    title: i18n['en-US'].indexPage.face_design,
    description:
      'Desde maquillaje social hasta técnicas profesionales para eventos, novias o sesiones fotográficas. También ofrecemos limpieza facial, perfilado de cejas y más.',
    filterFormat: {
      services: ['d4ffbd0d-b9e0-4d8d-bb5f-054b37e61c9f'],
    },
  },
  {
    imgPath: '/people/nails-design.jpg',
    title: i18n['en-US'].indexPage.nail_design,
    description:
      'Luce manos y pies impecables con nuestros servicios de cuidado y embellecimiento. Uñas acrílicas, semipermanentes, arte en uñas y tratamientos nutritivos.',
    filterFormat: {
      services: ['517d44ba-ff4c-4077-b99a-1ca8021fa21a'],
    },
  },
];
