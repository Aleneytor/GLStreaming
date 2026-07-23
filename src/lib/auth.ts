import { createClient } from "@/lib/supabase/server";

export type Rol = "admin" | "revendedor";

export type UsuarioActual = {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  email: string | null;
};

/**
 * Perfil del usuario autenticado (fila de `usuarios` + correo de Auth).
 *
 * La política RLS de `usuarios` permite leer la fila propia, así que esto
 * funciona igual para admin y revendedor. Devuelve null si no hay sesión.
 */
export async function obtenerUsuarioActual(): Promise<UsuarioActual | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, activo")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  return {
    id: perfil.id,
    nombre: perfil.nombre,
    rol: perfil.rol as Rol,
    activo: perfil.activo,
    email: user.email ?? null,
  };
}

export function esAdmin(usuario: UsuarioActual | null): boolean {
  return usuario?.rol === "admin" && usuario.activo;
}
