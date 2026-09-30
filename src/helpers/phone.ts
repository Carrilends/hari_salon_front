/**
 * Utilidades puras del teléfono del salón. El número viaja por el portal en
 * formato E.164 sin signos —es lo que exigen `wa.me` y `tel:`— y aquí se le da
 * la forma que lee una persona.
 */

/** Deja solo los dígitos: `'+57 320 897 74 71'` → `'573208977471'`. */
export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

/** `tel:` en E.164, listo para un `href`. */
export const telHref = (e164: string): string => `tel:+${onlyDigits(e164)}`;

/**
 * Agrupa un móvil colombiano (`57` + 10 dígitos) como se escribe aquí:
 * `+57 320 897 74 71`. Si el número no encaja en ese patrón no se le inventan
 * grupos; se devuelve en E.164 con el `+` delante.
 */
export const formatSalonPhone = (e164: string): string => {
  const digits = onlyDigits(e164);
  const colombian = /^57(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits);

  return colombian
    ? `+57 ${colombian[1]} ${colombian[2]} ${colombian[3]} ${colombian[4]}`
    : `+${digits}`;
};
