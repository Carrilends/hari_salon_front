/**
 * Un `IntersectionObserver` de mentira: jsdom no lo trae. Guarda lo que observa
 * y deja disparar a mano el aviso que mandaría el navegador (`emitir`).
 */
export class ObservadorFalso {
  static ultimo: ObservadorFalso | null = null;

  readonly observados: Element[] = [];

  desconectado = false;

  constructor(
    private readonly alCambiar: IntersectionObserverCallback,
    readonly opciones: IntersectionObserverInit = {}
  ) {
    ObservadorFalso.ultimo = this;
  }

  observe(elemento: Element): void {
    this.observados.push(elemento);
  }

  unobserve(): void {
    /* el composable no deja de observar una a una: desconecta todo */
  }

  disconnect(): void {
    this.desconectado = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Pares `[id, visible]`, en el orden en que los daría el navegador. */
  emitir(cambios: Array<[string, boolean]>): void {
    const entradas = cambios.map(([id, visible]) => ({
      target: document.getElementById(id) as Element,
      isIntersecting: visible,
    })) as unknown as IntersectionObserverEntry[];
    this.alCambiar(entradas, this as unknown as IntersectionObserver);
  }
}

type ConObservador = { IntersectionObserver?: unknown };

/** Lo instala en `window` y devuelve con qué dejarlo como estaba. */
export function instalarObservadorFalso(): () => void {
  const ventana = window as unknown as ConObservador;
  const previo = ventana.IntersectionObserver;
  ObservadorFalso.ultimo = null;
  ventana.IntersectionObserver = ObservadorFalso;
  return () => {
    ventana.IntersectionObserver = previo;
  };
}
