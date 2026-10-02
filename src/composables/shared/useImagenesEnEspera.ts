import { onMounted, ref, type Ref } from 'vue';

/**
 * Marca qué fotos ya llegaron, para que las que no den un hueco con vida en vez
 * de un agujero.
 *
 * Las fotos del inicio viven en `public/people/` sin optimizar —unos 10 MB, la
 * deuda abierta más seria para NF02—, así que en una conexión normal se ven
 * aparecer. Hasta entonces quedaba un rectángulo vacío.
 *
 * **La trampa está en el `onMounted`.** Si la foto ya estaba en caché, el evento
 * `load` se dispara ANTES de que Vue ate el manejador, y la imagen se quedaría
 * marcada como «en espera» para siempre: el hueco palpitando debajo de una foto
 * ya pintada. Por eso al montar se repasan las que ya están completas. Va en
 * `onMounted` y no en el cuerpo porque la ruta `/` se prerenderiza en Node,
 * donde no hay DOM.
 */
export function useImagenesEnEspera(raiz: Ref<HTMLElement | null>) {
  const llegadas = ref(new Set<string>());

  const marcar = (clave: string) => {
    if (llegadas.value.has(clave)) return;
    const siguiente = new Set(llegadas.value);
    siguiente.add(clave);
    llegadas.value = siguiente;
  };

  /** `error` también marca: una foto rota no debe palpitar eternamente. */
  const llego = (clave: string) => llegadas.value.has(clave);

  onMounted(() => {
    const imagenes = raiz.value?.querySelectorAll<HTMLImageElement>('img[data-foto]');
    imagenes?.forEach((img) => {
      if (img.complete && img.dataset.foto) marcar(img.dataset.foto);
    });
  });

  return { marcar, llego };
}
