export interface Tag {
  id: string;
  name: string;
  parent?: string;
}

export interface ChildTag extends Tag {
  parent: string;
}

export interface GenresI extends Tag {
  name: Genres;
}

export type Genres = 'Masculino'| 'Femenino' | 'Unisex' | 'Niños';
