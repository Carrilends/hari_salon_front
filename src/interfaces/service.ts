export default interface Service {
  id: string;
  name: string;
  gender: string;
  type: string;
  price: number;
  isSpecial: boolean;
  /** Promoción activada por administración */
  havePromotion?: boolean;
  /** Descuento 0–100 (columna API `porcentageDiscount`) */
  porcentageDiscount?: number;
  duration: number;
  slug: string;
  tags: string[];
  images: Image[];
  detail: Detail;
}

export interface Image {
  id: string;
  url: string;
  isPrincipal: boolean;
  publicId: string;
  version: string;
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
