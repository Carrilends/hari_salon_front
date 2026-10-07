/**
 * La foto con la que se muestra un servicio: la principal y, si ninguna está
 * marcada, la primera. Es la misma regla que ya siguen `bookingDialog.vue` y
 * `whatsappBooking.ts`, para que un servicio no enseñe una foto en la lista y
 * otra en la bolsa.
 */
export type ServicioConFotos = {
  images?: ReadonlyArray<{ url: string; isPrincipal?: boolean }> | null;
};

/** URL original (sin transformar) de la foto a mostrar, o cadena vacía. */
export function urlDeFotoPrincipal(servicio: ServicioConFotos): string {
  const imagenes = servicio.images;
  return (
    imagenes?.find((imagen) => imagen.isPrincipal)?.url ??
    imagenes?.[0]?.url ??
    ''
  );
}
