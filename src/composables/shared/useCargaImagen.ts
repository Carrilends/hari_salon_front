import { nextTick, onMounted, ref, watch, type Ref } from 'vue';

/**
 * Qué fotos remotas (Cloudinary) han llegado ya, para que el hueco de las que
 * no brille (`.m-foto-cargando`) y la foto entre con un fundido
 * (`.m-foto-fundido`) en vez de saltar. Las dos clases viven en `app.scss`.
 *
 * **La clave es la URL** —el atributo `src` tal cual se le dio al `<img>`—, no
 * el componente. Así una instancia reutilizada por la rejilla, o la foto grande
 * de la ficha al elegir otra miniatura, vuelve a esperar sola: la URL nueva no
 * está en el registro. Y volver a una que ya llegó no brilla, que es lo justo:
 * está en caché.
 *
 * Sirve igual para una foto que para una lista (`v-for`): el estado es por URL.
 *
 * **La trampa del caché.** Si la foto ya estaba en caché, `load` puede haberse
 * disparado antes de que Vue atara el oyente, y el hueco brillaría para siempre
 * debajo de una foto pintada. Por eso, al montar y cada vez que cambian las
 * URL, se repasan los `<img>` de `raiz`: los que ya están `complete` con
 * `naturalWidth > 0` cuentan como llegados. Va en `onMounted` (y tras
 * `nextTick`) porque el módulo se evalúa en Node durante `quasar ssg generate`,
 * donde no hay DOM.
 *
 * No es para las fotos locales del inicio: esas tienen su propio latido
 * (`useImagenesEnEspera`) y `FotoResponsiva` no se toca.
 */
export function useCargaImagen(
  raiz: Ref<HTMLElement | null>,
  urls: () => ReadonlyArray<string | undefined>
) {
  /** URL → cómo terminó. Ausente = todavía esperando. */
  const terminadas = ref<Record<string, 'lista' | 'fallida'>>({});

  const anotar = (url: string | null | undefined, como: 'lista' | 'fallida') => {
    if (!url || terminadas.value[url] === como) return;
    terminadas.value = { ...terminadas.value, [url]: como };
  };

  const urlDe = (evento: Event) =>
    (evento.target as HTMLImageElement | null)?.getAttribute('src');

  /** Manejador de `@load`. */
  const alCargar = (evento: Event) => anotar(urlDe(evento), 'lista');

  /** Manejador de `@error`: una foto rota tampoco puede brillar para siempre. */
  const alFallar = (evento: Event) => anotar(urlDe(evento), 'fallida');

  /**
   * ¿Sigue esperando esta URL? Sin URL no hay nada que esperar, y una `data:`
   * (el sustituto en línea, `PLACEHOLDER_IMAGE`) tampoco: no viaja por la red.
   */
  const cargando = (url: string | null | undefined) =>
    Boolean(url) &&
    !(url as string).startsWith('data:') &&
    !terminadas.value[url as string];

  /** ¿Falló esta URL? Para que el componente ponga su sustituto. */
  const fallida = (url: string | null | undefined) =>
    Boolean(url) && terminadas.value[url as string] === 'fallida';

  /**
   * `complete` con `naturalWidth` 0 y un `src` es una foto que ya falló antes
   * de que hubiera oyente (revisión de código, 2026-10-07): sin anotarla como
   * fallida, esperaría para siempre y el componente nunca pondría su sustituto.
   * Una perezosa que aún no ha empezado a bajar NO entra aquí: el navegador la
   * da por `complete === false` mientras su petición está pendiente.
   */
  const repasar = () => {
    const imagenes = raiz.value?.querySelectorAll('img');
    imagenes?.forEach((img) => {
      if (!img.complete) return;
      const url = img.getAttribute('src');
      if (img.naturalWidth > 0) anotar(url, 'lista');
      else if (url) anotar(url, 'fallida');
    });
  };

  onMounted(repasar);
  watch(urls, () => nextTick(repasar));

  return { cargando, fallida, alCargar, alFallar };
}
