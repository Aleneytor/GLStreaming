/**
 * Normaliza una relación anidada de Supabase.
 *
 * El generador de tipos representa las relaciones anidadas como arreglo aunque
 * la relación sea "muchos a uno" (una cuenta tiene UN producto). Esta ayuda
 * devuelve el único elemento, evitando `@ts-expect-error` repartidos por la UI.
 */
export function uno<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}
