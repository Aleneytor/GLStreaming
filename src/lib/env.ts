import { z } from "zod";

/**
 * Validación de variables de entorno con Zod.
 *
 * - `serverEnv` incluye secretos que SOLO pueden leerse en el servidor.
 *   Importar este módulo desde un componente cliente debe fallar.
 * - Las variables `NEXT_PUBLIC_*` son las únicas que pueden llegar al navegador.
 */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Clave AES-256-GCM en hex: 32 bytes = 64 caracteres hex.
  GLS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "GLS_ENCRYPTION_KEY debe ser 64 caracteres hex (32 bytes)"),
  KUANTO_SUPABASE_URL: z.string().url().or(z.literal("")).default(""),
  KUANTO_SUPABASE_PUBLISHABLE_KEY: z.string().default(""),
  BCV_API_URL: z.string().url().default("https://bcvscrapper.vercel.app/api/bcv"),
  APP_TIMEZONE: z.string().default("America/Caracas"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

/** Solo debe llamarse desde código de servidor. */
export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Variables de entorno de servidor inválidas:\n" +
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
  }
  return parsed.data;
}

/** Seguro para el navegador: solo variables NEXT_PUBLIC_*. */
export function getClientEnv(): ClientEnv {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
