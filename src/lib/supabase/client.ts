import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa exclusivamente la clave anónima (pública). Todas las operaciones pasan
 * por RLS con la identidad del usuario autenticado; el navegador nunca recibe
 * la clave `service_role`.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
