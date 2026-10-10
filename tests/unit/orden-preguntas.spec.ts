import {
  destinoDeArrastre,
  moverEnLista,
  ordenarPorIds,
} from 'src/helpers/orden-preguntas';

describe('moverEnLista', () => {
  it('lleva un elemento hacia abajo', () => {
    expect(moverEnLista(['a', 'b', 'c', 'd'], 0, 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('lleva un elemento hacia arriba', () => {
    expect(moverEnLista(['a', 'b', 'c', 'd'], 3, 1)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('no toca la lista original', () => {
    const lista = ['a', 'b', 'c'];
    moverEnLista(lista, 0, 2);
    expect(lista).toEqual(['a', 'b', 'c']);
  });

  it('un destino fuera de la lista se queda en el borde', () => {
    expect(moverEnLista(['a', 'b', 'c'], 0, 9)).toEqual(['b', 'c', 'a']);
    expect(moverEnLista(['a', 'b', 'c'], 2, -4)).toEqual(['c', 'a', 'b']);
  });

  it('un origen que no existe devuelve una copia igual', () => {
    expect(moverEnLista(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });
});

describe('ordenarPorIds', () => {
  const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('pone los elementos en el orden de los ids', () => {
    expect(ordenarPorIds(lista, ['c', 'a', 'b']).map((x) => x.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('ignora ids que no están y deja al final los que no se nombran', () => {
    expect(ordenarPorIds(lista, ['b', 'zz']).map((x) => x.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });
});

describe('destinoDeArrastre', () => {
  // Tres filas de 60 px: centros en 30, 90 y 150.
  const mitades = [30, 90, 150];

  it('sin pasar el centro de la vecina, se queda donde estaba', () => {
    expect(destinoDeArrastre(mitades, 80, 0)).toBe(0);
  });

  it('al pasar el centro de la siguiente, baja un puesto', () => {
    expect(destinoDeArrastre(mitades, 100, 0)).toBe(1);
  });

  it('más allá de la última, va al final', () => {
    expect(destinoDeArrastre(mitades, 170, 0)).toBe(2);
  });

  it('hacia arriba, por encima de la primera, va al principio', () => {
    expect(destinoDeArrastre(mitades, 10, 2)).toBe(0);
  });

  it('la fila arrastrada no cuenta como vecina', () => {
    expect(destinoDeArrastre(mitades, 95, 1)).toBe(1);
  });
});
