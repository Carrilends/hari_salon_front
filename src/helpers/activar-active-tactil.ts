/**
 * Hace que iOS Safari aplique `:active` a un toque.
 *
 * WebKit en iOS solo pinta `:active` cuando el toque cae en un documento con
 * algún oyente de `touchstart`. Sin él, el hundido de «Realce y hundido»
 * (`app.scss`) no se ve en un iPhone, que es justo donde más se pulsa. El
 * oyente no hace nada y es pasivo: no puede frenar el desplazamiento.
 *
 * Una sola vez por documento. Sin documento (`quasar ssg generate` evalúa los
 * arranques en Node) no hace nada.
 */
const activados = new WeakSet<Document>();

export function activarActiveTactil(
  doc: Document | null = typeof document !== 'undefined' ? document : null
): void {
  if (!doc || activados.has(doc)) return;
  activados.add(doc);
  doc.addEventListener('touchstart', () => undefined, { passive: true });
}
