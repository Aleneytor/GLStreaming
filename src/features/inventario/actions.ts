"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { cifrarSecreto, descifrarSecreto, huellaSecreto } from "@/lib/crypto";

const esquemaCuenta = z.object({
  producto_id: z.string().uuid("Elige un producto."),
  capacidad: z.coerce.number().int().positive("La capacidad debe ser mayor que cero."),
  alias: z.string().trim().max(80).optional().or(z.literal("")),
  proveedor: z.string().trim().max(80).optional().or(z.literal("")),
  notas: z.string().trim().max(1000).optional().or(z.literal("")),
  correo: z.string().trim().min(1, "El correo de la cuenta es obligatorio."),
  contrasena: z.string().min(1, "La contraseña de la cuenta es obligatoria."),
});

export type EstadoAlta = { error: string } | null;

/**
 * Alta de cuenta. Cifra las credenciales en el servidor y delega la escritura
 * a `crear_cuenta_con_unidades`, que es atómica.
 */
export async function crearCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const parsed = esquemaCuenta.safeParse({
    producto_id: formData.get("producto_id"),
    capacidad: formData.get("capacidad"),
    alias: formData.get("alias") ?? "",
    proveedor: formData.get("proveedor") ?? "",
    notas: formData.get("notas") ?? "",
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const datos = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase.rpc("crear_cuenta_con_unidades", {
    p_producto_id: datos.producto_id,
    p_capacidad: datos.capacidad,
    p_alias: datos.alias || null,
    p_proveedor_id: null,
    p_proveedor_nombre: datos.proveedor || null,
    p_notas: datos.notas || null,
    p_login_cifrado: cifrarSecreto(datos.correo),
    p_login_fingerprint: huellaSecreto(datos.correo),
    p_contrasena_cifrada: cifrarSecreto(datos.contrasena),
    p_nombres_unidades: null,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventario");
  redirect("/inventario");
}

export type CredencialesReveladas =
  | { ok: true; correo: string; contrasena: string }
  | { ok: false; error: string };

/**
 * Revela las credenciales de una cuenta al administrador.
 *
 * Regla de dominio: el revelado es manual, temporal y AUDITADO. Los valores se
 * descifran en memoria del servidor y viajan una sola vez en la respuesta; no
 * se guardan en ningún sitio ni se escriben en la auditoría (esta solo registra
 * quién miró qué y cuándo).
 */
export async function revelarCredencialesAction(
  cuentaId: string,
): Promise<CredencialesReveladas> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credenciales_cuenta")
    .select("login_cifrado, contrasena_cifrada")
    .eq("cuenta_id", cuentaId)
    .is("eliminada_at", null)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Esta cuenta no tiene credenciales guardadas." };
  }

  let correo = "";
  let contrasena = "";
  try {
    correo = data.login_cifrado ? descifrarSecreto(data.login_cifrado) : "";
    contrasena = data.contrasena_cifrada ? descifrarSecreto(data.contrasena_cifrada) : "";
  } catch {
    // Suele indicar que la clave de cifrado cambió respecto a cuando se guardó.
    return {
      ok: false,
      error: "No se pudieron descifrar (¿cambió GLS_ENCRYPTION_KEY?).",
    };
  }

  // Auditoría: se registra el acceso, nunca el valor revelado.
  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario!.id,
    accion: "revelar_credenciales",
    entidad: "cuentas",
    entidad_id: cuentaId,
    resultado: "ok",
  });

  return { ok: true, correo, contrasena };
}
