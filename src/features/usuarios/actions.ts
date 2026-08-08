"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export type EstadoUsuario = { error?: string; ok?: string } | null;

const esquemaCrearRevendedor = z.object({
  email: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  vendedor_id: z.string().uuid().optional().or(z.literal("")),
});

/**
 * Crea un usuario revendedor (auth.user + public.usuarios) y opcionalmente
 * lo vincula a un vendedor existente para que pueda ver sus ventas en el portal.
 */
export async function crearUsuarioRevendedorAction(
  _prev: EstadoUsuario,
  formData: FormData,
): Promise<EstadoUsuario> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaCrearRevendedor.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nombre: formData.get("nombre"),
    vendedor_id: formData.get("vendedor_id") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { email, password, nombre, vendedor_id } = parsed.data;

  // Crear el usuario de Auth con la service_role (API de administración).
  const admin = createAdminClient();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      }),
    },
  );

  if (!res.ok) {
    const detalle = await res.text();
    if (res.status === 422) {
      return { error: "Ya existe un usuario con ese correo." };
    }
    return { error: `Error al crear el usuario (${res.status}): ${detalle}` };
  }

  const { id: authUserId } = await res.json();

  // El trigger on_auth_user_created ya insertó en public.usuarios con rol='revendedor'.
  // Aseguramos el nombre por si el trigger no lo leyó del user_metadata.
  const supabase = await createClient();
  await supabase
    .from("usuarios")
    .update({ nombre, activo: true })
    .eq("id", authUserId);

  // Si se eligió un vendedor existente, vincularlo.
  if (vendedor_id) {
    const { error: vinculoError } = await supabase
      .from("vendedores")
      .update({ usuario_id: authUserId })
      .eq("id", vendedor_id);

    if (vinculoError) {
      // No fallar la operación entera: el usuario ya está creado.
      console.error("No se pudo vincular el vendedor:", vinculoError.message);
    }
  }

  revalidatePath("/usuarios");
  revalidatePath("/catalogo");
  return { ok: `Revendedor «${nombre}» creado.` };
}
