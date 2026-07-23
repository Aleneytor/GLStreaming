"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoVenta = { error: string } | null;

const esquema = z.object({
  cliente_nombre: z.string().trim().min(1, "Indica el nombre del cliente."),
  cliente_whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  nombre_perfil: z.string().trim().max(80).optional().or(z.literal("")),
  cuenta_id: z.string().uuid(),
  modalidad_id: z.string().uuid("Elige la modalidad."),
  unidad_id: z.string().uuid().optional().or(z.literal("")),
  monto_ves: z.string().trim().optional().or(z.literal("")),
  vendedor_id: z.string().uuid().optional().or(z.literal("")),
  inicio: z.string().min(1, "Indica la fecha de inicio."),
  cantidad_periodos: z.coerce.number().int().min(1).max(12).default(1),
  volver_a: z.string().default("/inventario"),
});

/**
 * Registra una venta. La atomicidad y las reglas de exclusión las garantiza
 * `vender_unidad` en la base de datos (bloquea la cuenta para que dos
 * operadores no vendan el mismo perfil).
 */
export async function venderAction(
  _prev: EstadoVenta,
  formData: FormData,
): Promise<EstadoVenta> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquema.safeParse({
    cliente_nombre: formData.get("cliente_nombre"),
    cliente_whatsapp: formData.get("cliente_whatsapp") ?? "",
    nombre_perfil: formData.get("nombre_perfil") ?? "",
    cuenta_id: formData.get("cuenta_id"),
    modalidad_id: formData.get("modalidad_id"),
    unidad_id: formData.get("unidad_id") ?? "",
    monto_ves: formData.get("monto_ves") ?? "",
    vendedor_id: formData.get("vendedor_id") ?? "",
    inicio: formData.get("inicio"),
    cantidad_periodos: formData.get("cantidad_periodos") ?? 1,
    volver_a: formData.get("volver_a") ?? "/inventario",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  // El hecho fuente es el dinero recibido en bolívares; el USD lo deriva la
  // base con la BCV que congela. Dejarlo en blanco es válido: la venta queda
  // registrada y el cobro pendiente.
  let monto: number | null = null;
  if (d.monto_ves) {
    monto = Number(d.monto_ves.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(monto) || monto <= 0) {
      return { error: "El monto en bolívares debe ser un número mayor que cero." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("vender_unidad", {
    p_cuenta_id: d.cuenta_id,
    p_modalidad_id: d.modalidad_id,
    p_unidad_id: d.unidad_id || null,
    p_cliente_id: null,
    p_cliente_nombre: d.cliente_nombre,
    p_cliente_whatsapp: d.cliente_whatsapp || null,
    p_nombre_perfil: d.nombre_perfil || null,
    p_monto_ves: monto,
    p_inicio: d.inicio,
    p_cantidad_periodos: d.cantidad_periodos,
    p_vendedor_id: d.vendedor_id || null,
    p_fecha_venta: d.inicio,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventario");
  revalidatePath("/clientes");
  revalidatePath("/caja");
  revalidatePath("/cobros");
  redirect(d.volver_a);
}
