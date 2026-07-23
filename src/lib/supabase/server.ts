import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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
