"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoCliente = { error?: string; ok?: string } | null;

const esquema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  // Teléfono como texto: preserva el '+' y los ceros iniciales.
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function guardarClienteAction(
  _prev: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquema.safeParse({
    id: formData.get("id") ?? "",
    nombre: formData.get("nombre"),
    whatsapp: formData.get("whatsapp") ?? "",
    notas: formData.get("notas") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, nombre, whatsapp, notas } = parsed.data;

  const fila = {
    nombre,
    whatsapp_original: whatsapp || null,
    whatsapp_normalizado: whatsapp ? whatsapp.replace(/[^\d+]/g, "") : null,
    notas: notas || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("clientes").update(fila).eq("id", id)
    : await supabase.from("clientes").insert(fila);

  if (error) return { error: error.message };

  revalidatePath("/clientes");
  return { ok: id ? "Cliente actualizado." : "Cliente creado." };
}

/**
 * Borra un cliente. La base solo lo permite si ya no tiene servicios; si los
 * tiene, devuelve un mensaje claro para que primero se borren sus cuentas.
 */
export async function eliminarClienteAction(
  _prev: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el cliente." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_cliente", { p_cliente_id: id });
  if (error) return { error: error.message };

  revalidatePath("/clientes");
  return { ok: "Cliente borrado." };
}
