"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";

export type EstadoAccion = { error?: string; ok?: string } | null;

async function guard() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return null;
  return usuario;
}

function refrescar() {
  revalidatePath("/inventario");
  revalidatePath("/vencimientos");
  revalidatePath("/clientes");
}

const esquemaRenovar = z.object({
  suscripcion_id: z.string().uuid(),
  inicio: z.string().min(1, "Indica la fecha de inicio."),
  meses: z.coerce.number().int().min(1).max(12).default(1),
  precio_usd: z.string().trim().optional().or(z.literal("")),
  tardia: z.string().optional(),
});

/**
 * Renueva una suscripción. La "renovación tardía" existe porque el cliente
 * pudo pagar días después: en ese caso el período nuevo arranca en la fecha
 * real del pago, no en la que le tocaba.
 */
export async function renovarAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const parsed = esquemaRenovar.safeParse({
    suscripcion_id: formData.get("suscripcion_id"),
    inicio: formData.get("inicio"),
    meses: formData.get("meses") ?? 1,
    precio_usd: formData.get("precio_usd") ?? "",
    tardia: formData.get("tardia") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const precio = parsed.data.precio_usd
    ? Number(parsed.data.precio_usd.replace(",", "."))
    : null;
  if (precio !== null && (!Number.isFinite(precio) || precio < 0)) {
    return { error: "El precio debe ser un número válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("renovar_suscripcion", {
    p_suscripcion_id: parsed.data.suscripcion_id,
    p_inicio: parsed.data.inicio,
    p_meses: parsed.data.meses,
    p_precio_usd: precio,
    p_tardia: parsed.data.tardia === "on",
  });
  if (error) return { error: error.message };

  refrescar();
  return { ok: "Renovación registrada." };
}

export async function cambiarEstadoAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const id = String(formData.get("suscripcion_id") ?? "");
  const estado = String(formData.get("estado") ?? "");
  if (!id || !["activa", "pausada"].includes(estado)) {
    return { error: "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_suscripcion", {
    p_suscripcion_id: id,
    p_nuevo_estado: estado,
    p_motivo: String(formData.get("motivo") ?? "") || null,
  });
  if (error) return { error: error.message };

  refrescar();
  return { ok: estado === "pausada" ? "Servicio pausado." : "Servicio reactivado." };
}

/** Cancela y deja el recurso en saneamiento (paso 1 de 2). */
export async function cancelarAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await guard();
  if (!usuario) return { error: "No autorizado." };

  const id = String(formData.get("suscripcion_id") ?? "");
  if (!id) return { error: "Falta la suscripción." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_y_liberar", {
    p_suscripcion_id: id,
    p_motivo: String(formData.get("motivo") ?? "no_renovacion"),
  });
  if (error) return { error: error.message };

  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario.id,
    accion: "cancelar_y_liberar",
    entidad: "suscripciones",
    entidad_id: id,
    resultado: "ok",
  });

  refrescar();
  return { ok: "Cancelado. El perfil queda pendiente de limpieza." };
}

/** Confirma la limpieza remota: el perfil vuelve al stock (paso 2 de 2). */
export async function confirmarLimpiezaAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await guard();
  if (!usuario) return { error: "No autorizado." };

  const id = String(formData.get("operacion_id") ?? "");
  if (!id) return { error: "Falta la operación." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirmar_limpieza", {
    p_operacion_id: id,
    p_evidencia: String(formData.get("evidencia") ?? "") || null,
  });
  if (error) return { error: error.message };

  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario.id,
    accion: "confirmar_limpieza",
    entidad: "operaciones_remotas",
    entidad_id: id,
    resultado: "ok",
  });

  refrescar();
  return { ok: "Limpieza confirmada. El perfil vuelve a estar disponible." };
}

export async function recordatorioAction(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  if (!(await guard())) return { error: "No autorizado." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("fijar_recordatorio", {
    p_suscripcion_id: String(formData.get("suscripcion_id") ?? ""),
    p_fecha: String(formData.get("recontactar_el") ?? "") || null,
    p_nota: String(formData.get("nota") ?? "") || null,
  });
  if (error) return { error: error.message };

  refrescar();
  return { ok: "Recordatorio guardado." };
}
