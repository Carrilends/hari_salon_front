
export default interface Service {
  id: string;
  name: string;
  gender: string;
  type: string;
  price: number;
  isSpecial: boolean;
  slug: string;
  tags: string[];
  images: Image[];
  detail: Detail;
}

interface Image {
  id: string;
  url: string;
  isPrincipal: boolean;
}

interface Detail {
  id: string;
  description: string;
  specifications: Specifications;
}

export type faceTypes =
  | 'Round'
  | 'Oval'
  | 'Square'
  | 'Heart'
  | 'Long'
  | 'Diamond';

interface Specifications {
  faceTypes?: faceTypes[];
}
