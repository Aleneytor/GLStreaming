"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

/**
 * Egresos: pagos al proveedor y gastos operativos.
 *
 * Los dos nacen en USDT y la base los valoriza con la paralela del momento
 * (migración 0017). La UI nunca envía la tasa: si pudiera, un formulario viejo
 * abierto en otra pestaña congelaría un valor equivocado.
 */

export type EstadoEgreso = { error?: string; ok?: string } | null;

const numero = (v: FormDataEntryValue | null) =>
  Number(String(v ?? "").trim().replace(",", "."));

// ---------------------------------------------------------------------------
// Renovación del proveedor (crea el ciclo y, si toca, su único pago)
// ---------------------------------------------------------------------------
const esquemaRenovacion = z.object({
  cuenta_id: z.string().uuid(),
  costo_usdt: z.string().trim().min(1, "Indica el costo del ciclo."),
  inicio: z.string().min(1, "Indica el inicio del ciclo."),
  dia_ancla: z.string().trim().optional().or(z.literal("")),
  referencia: z.string().trim().max(120).optional().or(z.literal("")),
  pagado: z.string().optional(),
  volver_a: z.string().default("/egresos"),
});

export async function renovarProveedorAction(
  _prev: EstadoEgreso,
  formData: FormData,
): Promise<EstadoEgreso> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaRenovacion.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    costo_usdt: formData.get("costo_usdt"),
    inicio: formData.get("inicio"),
    dia_ancla: formData.get("dia_ancla") ?? "",
    referencia: formData.get("referencia") ?? "",
    pagado: formData.get("pagado") ?? undefined,
    volver_a: formData.get("volver_a") ?? "/egresos",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const costo = numero(d.costo_usdt);
  if (!Number.isFinite(costo) || costo < 0) {
    return { error: "El costo debe ser cero o mayor." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_renovacion_y_pago", {
    p_cuenta_id: d.cuenta_id,
    p_costo_usdt: costo,
    p_inicio: d.inicio,
    p_dia_ancla: d.dia_ancla ? Number(d.dia_ancla) : undefined,
    p_referencia: d.referencia || undefined,
    p_pagar: d.pagado === "on",
  });
  if (error) return { error: error.message };

  revalidatePath(d.volver_a);
  revalidatePath("/caja");
  return { ok: costo > 0 && d.pagado === "on" ? "Ciclo y pago registrados." : "Ciclo registrado." };
}

// ---------------------------------------------------------------------------
// Pago suelto de un ciclo ya registrado
// ---------------------------------------------------------------------------
export async function pagarCicloAction(
  _prev: EstadoEgreso,
  formData: FormData,
): Promise<EstadoEgreso> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cicloId = String(formData.get("ciclo_id") ?? "");
  const fecha = String(formData.get("fecha_pago") ?? "");
  if (!cicloId) return { error: "Falta el ciclo." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_pago_proveedor", {
    p_ciclo_id: cicloId,
    p_fecha_pago: fecha || undefined,
    p_referencia: String(formData.get("referencia") ?? "") || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/egresos");
  revalidatePath("/caja");
  return { ok: "Pago registrado." };
}

// ---------------------------------------------------------------------------
// Gasto operativo
// ---------------------------------------------------------------------------
const esquemaGasto = z.object({
  categoria: z.string().min(1, "Elige una categoría."),
  monto_usdt: z.string().trim().min(1, "Indica el monto en USDT."),
  fecha_gasto: z.string().min(1, "Indica la fecha."),
  descripcion: z.string().trim().max(200).optional().or(z.literal("")),
  contraparte: z.string().trim().max(120).optional().or(z.literal("")),
  nota: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function registrarGastoAction(
  _prev: EstadoEgreso,
  formData: FormData,
): Promise<EstadoEgreso> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const parsed = esquemaGasto.safeParse({
    categoria: formData.get("categoria"),
    monto_usdt: formData.get("monto_usdt"),
    fecha_gasto: formData.get("fecha_gasto"),
    descripcion: formData.get("descripcion") ?? "",
    contraparte: formData.get("contraparte") ?? "",
    nota: formData.get("nota") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const monto = numero(d.monto_usdt);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: "El monto debe ser mayor que cero." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_gasto_operativo", {
    p_categoria: d.categoria,
    p_monto_usdt: monto,
    p_fecha_gasto: d.fecha_gasto,
    p_descripcion: d.descripcion || undefined,
    p_contraparte: d.contraparte || undefined,
    p_nota: d.nota || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/egresos");
  revalidatePath("/caja");
  return { ok: "Gasto registrado." };
}

export async function revertirGastoAction(
  _prev: EstadoEgreso,
  formData: FormData,
): Promise<EstadoEgreso> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("revertir_gasto_operativo", {
    p_gasto_id: String(formData.get("gasto_id") ?? ""),
    p_motivo: String(formData.get("motivo") ?? "") || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath("/egresos");
  revalidatePath("/caja");
  return { ok: "Gasto revertido." };
}
