"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoCatalogo = { error?: string; ok?: string } | null;

/**
 * Catálogo y proveedores.
 *
 * Lo editable a propósito es lo COMERCIAL (nombre, si está activo, si admite
 * ventas nuevas). Las capacidades y reglas de cada producto NO se editan desde
 * la interfaz: son reglas de dominio confirmadas (`DEC-*`) y cambiarlas
 * desincronizaría las cuentas ya creadas con esa capacidad. Se cambian por
 * migración, con su justificación escrita.
 */

const esquemaProducto = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, "El nombre no puede quedar vacío."),
  estado_comercial: z.enum(["abierto", "solo_cartera", "cerrado"]),
  permite_renovaciones: z.coerce.boolean(),
  activo: z.coerce.boolean(),
});

export async function actualizarProductoAction(
  _prev: EstadoCatalogo,
  formData: FormData,
): Promise<EstadoCatalogo> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaProducto.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    estado_comercial: formData.get("estado_comercial"),
    permite_renovaciones: formData.get("permite_renovaciones") === "on",
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, ...campos } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("productos_plataforma").update(campos).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { ok: "Producto actualizado." };
}

const esquemaPlataforma = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1, "El nombre no puede quedar vacío."),
  activa: z.coerce.boolean(),
});

export async function actualizarPlataformaAction(
  _prev: EstadoCatalogo,
  formData: FormData,
): Promise<EstadoCatalogo> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaPlataforma.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    activa: formData.get("activa") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, ...campos } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("plataformas").update(campos).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { ok: "Plataforma actualizada." };
}

const esquemaProveedor = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  nombre_o_alias: z.string().trim().max(80).optional().or(z.literal("")),
  telefono_original: z.string().trim().max(40).optional().or(z.literal("")),
  tipo: z.enum(["propio", "tercero"]),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
  activo: z.coerce.boolean(),
});

/** Crea o edita un proveedor. Un tercero exige al menos nombre o teléfono. */
export async function guardarProveedorAction(
  _prev: EstadoCatalogo,
  formData: FormData,
): Promise<EstadoCatalogo> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaProveedor.safeParse({
    id: formData.get("id") ?? "",
    nombre_o_alias: formData.get("nombre_o_alias") ?? "",
    telefono_original: formData.get("telefono_original") ?? "",
    tipo: formData.get("tipo"),
    notas: formData.get("notas") ?? "",
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, ...campos } = parsed.data;

  if (campos.tipo === "tercero" && !campos.nombre_o_alias && !campos.telefono_original) {
    return { error: "Un proveedor externo necesita al menos un nombre o un teléfono." };
  }

  const supabase = await createClient();
  const fila = {
    tipo: campos.tipo,
    nombre_o_alias: campos.nombre_o_alias || null,
    // Teléfono como texto: preserva el '+' y los ceros iniciales.
    telefono_original: campos.telefono_original || null,
    telefono_normalizado: campos.telefono_original
      ? campos.telefono_original.replace(/[^\d+]/g, "")
      : null,
    notas: campos.notas || null,
    activo: campos.activo,
  };

  const { error } = id
    ? await supabase.from("proveedores").update(fila).eq("id", id)
    : await supabase.from("proveedores").insert(fila);

  if (error) return { error: error.message };

  revalidatePath("/catalogo");
  return { ok: id ? "Proveedor actualizado." : "Proveedor creado." };
}
