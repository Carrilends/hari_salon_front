export interface Tag {
  id: string;
  name: string;
  parent?: string;
  children?: Tag[];
  selected: boolean;
}

export interface GenresI extends Tag {
  name: Genres;
  /** Asignado en options-store al hidratar géneros. */
  icon?: string;
}

export type Genres = 'Masculino' | 'Femenino' | 'Unisex' | 'Niños';
