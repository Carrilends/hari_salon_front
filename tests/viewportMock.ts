/**
 * `window.matchMedia` de jsdom existe pero no evalúa consultas: devuelve
 * siempre `matches: false`, así que cualquier componente que se reparta anchos
 * con una consulta de medios se comportaría en las pruebas como si la ventana
 * fuera infinita.
 *
 * Esto lo sustituye por uno que sí evalúa `max-width` y `max-height` contra un
 * tamaño que la prueba fija, y que además guarda las escuchas para poder
 * simular que la ventana cambia de tamaño (`cambiar`). El `matches` es un
 * *getter*: se recalcula al leerlo, que es lo que hacen los oyentes al
 * despertar.
 */
export function fijarViewport({ ancho = 1280, alto = 900 } = {}) {
  const estado = { ancho, alto };
  const escuchas: Array<() => void> = [];

  window.matchMedia = ((consulta: string) => ({
    get matches() {
      const maxAncho = /\(max-width:\s*(\d+)px\)/.exec(consulta);
      if (maxAncho) return estado.ancho <= Number(maxAncho[1]);
      const maxAlto = /\(max-height:\s*(\d+)px\)/.exec(consulta);
      if (maxAlto) return estado.alto <= Number(maxAlto[1]);
      const minAncho = /\(min-width:\s*(\d+)px\)/.exec(consulta);
      if (minAncho) return estado.ancho >= Number(minAncho[1]);
      return false;
    },
    media: consulta,
    addEventListener: (_evento: string, cb: () => void) => escuchas.push(cb),
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;

  return {
    cambiar(nuevas: { ancho?: number; alto?: number }) {
      Object.assign(estado, nuevas);
      escuchas.forEach((cb) => cb());
    },
  };
}
