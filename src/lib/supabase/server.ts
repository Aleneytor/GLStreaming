import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente con la clave `service_role`: se salta RLS.
 *
 * ÚSESE SOLO en operaciones de servidor acotadas y DESPUÉS de haber verificado
 * la autorización con la identidad real del usuario. El caso previsto es
 * entregar a un revendedor el paquete de acceso de SU PROPIA venta: primero se
 * comprueba que la venta es suya y solo entonces se leen los secretos, que él
 * no puede leer por RLS.
 *
 * Esta clave nunca llega al navegador.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions,
 * route handlers). Usa la clave anónima + la sesión del usuario desde cookies,
 * de modo que RLS aplique con su identidad real.
 *
 * Para operaciones administrativas puntuales que deban saltarse RLS existe
 * `createAdminClient()` (service_role); su uso debe ser pequeño, explícito y
 * auditado — nunca la vía por defecto.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` puede llamarse desde un Server Component donde las
            // cookies son de solo lectura; el middleware refresca la sesión.
          }
        },
      },
    },
  );
}
