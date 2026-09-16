/**
 * Guarda de exhaustividad para uniones discriminadas: en el `default` de un
 * `switch`, si algún miembro quedó sin cubrir, `value` no es `never` y el código
 * deja de compilar. Si a pesar de todo llega algo en ejecución (un evento nuevo
 * del backend que el front no conoce), lanza en vez de fallar en silencio.
 */
export function assertNever(value: never, what = 'valor'): never {
  throw new Error(`${what} no contemplado: ${JSON.stringify(value)}`);
}
