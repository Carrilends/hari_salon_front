import type Service from 'src/interfaces/service';

/** Una URL de Cloudinary de verdad: las funciones de entrega solo actúan sobre estas. */
export const FOTO_CLOUDINARY =
  'https://res.cloudinary.com/demo/image/upload/v1712/marlene/bob.jpg';

/** Un servicio del catálogo. `cambios` sobreescribe lo que la prueba necesite. */
export function servicio(cambios: Partial<Service> = {}): Service {
  return {
    id: 's1',
    name: 'Bob clásico',
    gender: 'Mujer',
    type: 'hair-women',
    price: 45000,
    isSpecial: false,
    havePromotion: false,
    porcentageDiscount: 0,
    duration: 60,
    slug: 'bob_clasico',
    tags: [],
    images: [
      {
        id: 'i1',
        url: FOTO_CLOUDINARY,
        isPrincipal: true,
        publicId: 'marlene/bob',
        version: '1712',
      },
    ],
    detail: {
      id: 'd1',
      description: 'Corte recto a la altura de la mandíbula.',
      specifications: {},
    },
    ...cambios,
  };
}
