export interface Tag {
  id: string;
  name: string;
  parent?: string;
  selected: boolean;
}

export interface GenresI extends Tag {
  name: Genres;
}

export type Genres = 'Masculino'| 'Femenino' | 'Unisex' | 'Niños';
