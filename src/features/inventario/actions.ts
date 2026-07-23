"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cifrarSecreto, huellaSecreto } from "@/lib/crypto";

const esquemaCuenta = z.object({
  producto_id: z.string().uuid("Elige un producto."),
  capacidad: z.coerce.number().int().positive("La capacidad debe ser mayor que cero."),
  alias: z.string().trim().max(80).optional().or(z.literal("")),
  proveedor_id: z.string().uuid().optional().or(z.literal("")),
  // Credenciales: texto plano SOLO en memoria del servidor; se cifran abajo.
  correo: z.string().trim().min(1, "El correo de la cuenta es obligatorio."),
  contrasena: z.string().min(1, "La contraseña de la cuenta es obligatoria."),
});

export type EstadoAlta = { error: string } | null;

/**
 * Alta de cuenta. Cifra las credenciales en el servidor y delega la escritura
 * a `crear_cuenta_con_unidades`, que es atómica: cuenta + unidades + credencial
 * se crean juntas o no se crea nada.
 */
export async function crearCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const parsed = esquemaCuenta.safeParse({
    producto_id: formData.get("producto_id"),
    capacidad: formData.get("capacidad"),
    alias: formData.get("alias") ?? "",
    proveedor_id: formData.get("proveedor_id") ?? "",
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
    p_proveedor_id: datos.proveedor_id || null,
    p_login_cifrado: cifrarSecreto(datos.correo),
    p_login_fingerprint: huellaSecreto(datos.correo),
    p_contrasena_cifrada: cifrarSecreto(datos.contrasena),
    p_nombres_unidades: null,
  });

  if (error) {
    // Los mensajes de la función ya son de negocio ("exige capacidad 5", etc.).
    return { error: error.message };
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}
