import { urlDeFotoPrincipal } from 'src/helpers/service-photo';

describe('urlDeFotoPrincipal', () => {
  it('prefiere la marcada como principal aunque no sea la primera', () => {
    expect(
      urlDeFotoPrincipal({
        images: [
          { url: 'a.jpg', isPrincipal: false },
          { url: 'b.jpg', isPrincipal: true },
        ],
      })
    ).toBe('b.jpg');
  });

  it('sin ninguna principal cae en la primera', () => {
    expect(
      urlDeFotoPrincipal({
        images: [
          { url: 'a.jpg', isPrincipal: false },
          { url: 'b.jpg', isPrincipal: false },
        ],
      })
    ).toBe('a.jpg');
  });

  it('sin fotos devuelve cadena vacía', () => {
    expect(urlDeFotoPrincipal({ images: [] })).toBe('');
    expect(urlDeFotoPrincipal({})).toBe('');
    expect(urlDeFotoPrincipal({ images: null })).toBe('');
  });
});
