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
  costo_usdt: z.string().trim().optional().or(z.literal("")),
  ciclo_inicio: z.string().trim().optional().or(z.literal("")),
  dia_ancla: z.string().trim().optional().or(z.literal("")),
});

async function registrarCicloSiCorresponde(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cuentaId: string,
  costoTexto: string,
  inicio: string,
  diaAncla: string,
): Promise<string | null> {
  if (!costoTexto) return null;

  const costo = Number(costoTexto.replace(",", "."));
  if (!Number.isFinite(costo) || costo < 0) return "El costo debe ser un número válido.";

  const { error } = await supabase.rpc("registrar_ciclo_proveedor", {
    p_cuenta_id: cuentaId,
    p_costo_usdt: costo,
    p_inicio: inicio || new Date().toISOString().slice(0, 10),
    p_dia_ancla: diaAncla ? Number(diaAncla) : null,
    p_referencia: null,
  });
  return error ? error.message : null;
}

export type EstadoAlta = { error: string } | null;

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
    costo_usdt: formData.get("costo_usdt") ?? "",
    ciclo_inicio: formData.get("ciclo_inicio") ?? "",
    dia_ancla: formData.get("dia_ancla") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const datos = parsed.data;

  const supabase = await createClient();

  const { data: cuentaId, error } = await supabase.rpc("crear_cuenta_con_unidades", {
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

  const errorCiclo = await registrarCicloSiCorresponde(
    supabase,
    cuentaId as unknown as string,
    datos.costo_usdt ?? "",
    datos.ciclo_inicio ?? "",
    datos.dia_ancla ?? "",
  );
  if (errorCiclo) {
    return { error: errorCiclo };
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}

export async function eliminarCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!cuentaId) return { error: "Falta la cuenta." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("borrar_cuenta_admin", {
    p_cuenta_id: cuentaId,
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  return null;
}

export type EstadoEdicion = { error?: string; ok?: string } | null;

export async function editarCuentaAction(
  _prev: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!cuentaId) return { error: "Cuenta no válida." };

  const alias = String(formData.get("alias") ?? "").trim();
  const proveedor = String(formData.get("proveedor") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const estado = String(formData.get("estado") ?? "activa");

  const supabase = await createClient();

  const { error: e1 } = await supabase.rpc("actualizar_cuenta", {
    p_cuenta_id: cuentaId,
    p_alias: alias || null,
    p_proveedor_nombre: proveedor || null,
    p_notas: notas || null,
    p_estado: estado,
  });
  if (e1) return { error: e1.message };

  const rotar = formData.get("rotar_credenciales") === "on";
  if (rotar) {
    const correo = String(formData.get("correo") ?? "").trim();
    const contrasena = String(formData.get("contrasena") ?? "");
    const { error: e2 } = await supabase.rpc("rotar_credenciales_cuenta", {
      p_cuenta_id: cuentaId,
      p_login_cifrado: correo ? cifrarSecreto(correo) : null,
      p_login_fingerprint: correo ? huellaSecreto(correo) : null,
      p_contrasena_cifrada: contrasena ? cifrarSecreto(contrasena) : null,
    });
    if (e2) return { error: e2.message };
    await supabase.from("eventos_auditoria").insert({
      actor_id: usuario!.id,
      accion: "rotar_credenciales",
      entidad: "cuentas",
      entidad_id: cuentaId,
      resultado: "ok",
      metadata: { desde: "inventario_inline" },
    });
  }

  const ids: string[] = [];
  const nombres: string[] = [];
  const pins: (string | null)[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("nombre_")) continue;
    const id = clave.slice("nombre_".length);
    const pinPlano = String(formData.get(`pin_${id}`) ?? "").trim();
    ids.push(id);
    nombres.push(String(valor));
    pins.push(pinPlano ? cifrarSecreto(pinPlano) : null);
  }
  if (ids.length > 0) {
    const { error: e3 } = await supabase.rpc("actualizar_unidades", {
      p_cuenta_id: cuentaId,
      p_unidad_ids: ids,
      p_nombres: nombres,
      p_pins_cifrados: pins,
    });
    if (e3) return { error: e3.message };
  }

  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("cliente_")) continue;
    const id = clave.slice("cliente_".length);
    const nombre = String(valor).trim();
    if (nombre) await supabase.from("clientes").update({ nombre }).eq("id", id);
  }

  const costoTxt = String(formData.get("costo") ?? "").trim();
  if (costoTxt) {
    const costo = Number(costoTxt.replace(",", "."));
    if (Number.isFinite(costo) && costo >= 0) {
      await supabase
        .from("ciclos_proveedor")
        .update({ costo_usdt: costo })
        .eq("cuenta_id", cuentaId)
        .eq("estado", "vigente");
    }
  }

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  return { ok: "Guardado." };
}

export async function actualizarCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const res = await editarCuentaAction(null, formData);
  return res && "error" in res && res.error ? { error: res.error } : null;
}

export async function actualizarUnidadesAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const res = await editarCuentaAction(null, formData);
  return res && "error" in res && res.error ? { error: res.error } : null;
}

export type PerfilRevelado = { nombre: string; pin: string | null };

export type CredencialesReveladas =
  | { ok: true; correo: string; contrasena: string; perfiles: PerfilRevelado[] }
  | { ok: false; error: string };

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
    return {
      ok: false,
      error: "No se pudieron descifrar (¿cambió GLS_ENCRYPTION_KEY?).",
    };
  }

  const { data: unidades } = await supabase
    .from("unidades_inventario")
    .select("numero_slot, nombre_visible, secretos_unidad ( pin_cifrado )")
    .eq("cuenta_id", cuentaId)
    .order("numero_slot");

  const perfiles: PerfilRevelado[] = (unidades ?? []).map((u) => {
    const secreto = Array.isArray(u.secretos_unidad)
      ? u.secretos_unidad[0]
      : u.secretos_unidad;
    let pin: string | null = null;
    try {
      pin = secreto?.pin_cifrado ? descifrarSecreto(secreto.pin_cifrado) : null;
    } catch {
      pin = null;
    }
    return { nombre: u.nombre_visible ?? `Perfil ${u.numero_slot}`, pin };
  });

  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario!.id,
    accion: "revelar_credenciales",
    entidad: "cuentas",
    entidad_id: cuentaId,
    resultado: "ok",
  });

  return { ok: true, correo, contrasena, perfiles };
}

export type EstadoInline = { error?: string; ok?: string } | null;

export async function guardarCuentaInlineAction(
  _prev: EstadoInline,
  formData: FormData,
): Promise<EstadoInline> {
  return editarCuentaAction(_prev, formData);
}

export async function moverCuentaAction(formData: FormData): Promise<void> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return;

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const accion = String(formData.get("accion") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!cuentaId || !["subir", "bajar", "inicio", "final"].includes(accion)) return;

  const supabase = await createClient();
  await supabase.rpc("mover_cuenta", { p_cuenta_id: cuentaId, p_accion: accion });
  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
}

export async function reordenarListaCuentasAction(
  cuentaIds: string[],
  slug: string,
): Promise<void> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return;
  if (!cuentaIds || cuentaIds.length === 0) return;

  const supabase = await createClient();
  const baseOrden = Date.now();

  for (let i = 0; i < cuentaIds.length; i++) {
    await supabase
      .from("cuentas")
      .update({ orden: baseOrden - i })
      .eq("id", cuentaIds[i]);
  }

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
}

export async function venderUnidadRapidaAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const unidadId = String(formData.get("unidad_id") ?? "") || null;
  const clienteNombre = String(formData.get("cliente_nombre") ?? "").trim();
  const clienteWhatsapp = String(formData.get("cliente_whatsapp") ?? "").trim();
  const precioUsdTxt = String(formData.get("precio_usd") ?? "").trim();
  const slug = String(formData.get("slug") ?? "");

  if (!cuentaId || !clienteNombre || !precioUsdTxt) {
    return { error: "Indica el cliente y el precio en USD." };
  }

  const precioUsd = Number(precioUsdTxt.replace(",", "."));
  if (!Number.isFinite(precioUsd) || precioUsd <= 0) {
    return { error: "El precio debe ser un monto mayor que cero." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("vender_unidad", {
    p_cuenta_id: cuentaId,
    p_unidad_id: unidadId,
    p_cliente_nombre: clienteNombre,
    p_cliente_whatsapp: clienteWhatsapp || null,
    p_precio_usd: precioUsd,
    p_monto_usd: precioUsd,
  });

  if (error) return { error: error.message };

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  revalidatePath("/caja");
  revalidatePath("/vencimientos");
  revalidatePath("/clientes");

  return { ok: "Venta registrada con éxito." };
}

export async function editarVentaDirectaAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const unidadId = String(formData.get("unidad_id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  const clienteNombre = String(formData.get("cliente_nombre") ?? "").trim();
  const clienteWhatsapp = String(formData.get("cliente_whatsapp") ?? "").trim();
  const nombrePerfil = String(formData.get("nombre_perfil") ?? "").trim();
  const pinPerfil = String(formData.get("pin_perfil") ?? "").trim();
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();

  if (clienteId && clienteNombre) {
    await supabase.from("clientes").update({
      nombre: clienteNombre,
      whatsapp_original: clienteWhatsapp || null,
    }).eq("id", clienteId);
  }

  if (unidadId) {
    await supabase.from("unidades_inventario").update({
      nombre_visible: nombrePerfil || null,
    }).eq("id", unidadId);

    if (pinPerfil) {
      const pinCifrado = cifrarSecreto(pinPerfil);
      await supabase.from("secretos_unidad").upsert({
        unidad_id: unidadId,
        pin_cifrado: pinCifrado,
        rotada_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  revalidatePath("/vencimientos");
  revalidatePath("/clientes");

  return { ok: "Datos de la venta actualizados." };
}

export async function cancelarVentaConLimpiezaAction(
  formData: FormData,
): Promise<void> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return;

  const suscripcionId = String(formData.get("suscripcion_id") ?? "");
  const unidadId = String(formData.get("unidad_id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!suscripcionId) return;

  const supabase = await createClient();

  // 1. Cancelar suscripción y liberar asignación
  const { error: e1 } = await supabase.rpc("cancelar_y_liberar", {
    p_suscripcion_id: suscripcionId,
    p_motivo: "cancelacion_manual_inventario",
  });
  if (e1) return;

  // 2. Restablecer el nombre del perfil a nulo para que vuelva a decir Perfil X
  if (unidadId) {
    await supabase
      .from("unidades_inventario")
      .update({ nombre_visible: null })
      .eq("id", unidadId);
  }

  // 3. Verificar si al cliente le quedan otros servicios activos
  if (clienteId) {
    const { count } = await supabase
      .from("suscripciones")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteId)
      .neq("estado", "cancelada");

    if (count === 0) {
      await supabase.rpc("borrar_cliente", { p_cliente_id: clienteId });
    }
  }

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  revalidatePath("/vencimientos");
  revalidatePath("/clientes");
}

export async function registrarPagoProveedorRapidoAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const costoUsdtTxt = String(formData.get("costo_usdt") ?? "").trim();
  const slug = String(formData.get("slug") ?? "");

  if (!cuentaId || !costoUsdtTxt) return { error: "Indica el monto pagado al proveedor." };

  const costoUsdt = Number(costoUsdtTxt.replace(",", "."));
  if (!Number.isFinite(costoUsdt) || costoUsdt < 0) {
    return { error: "El costo debe ser un monto válido." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("registrar_ciclo_proveedor", {
    p_cuenta_id: cuentaId,
    p_costo_usdt: costoUsdt,
    p_inicio: new Date().toISOString().slice(0, 10),
    p_dia_ancla: null,
    p_referencia: "pago_rapido_inventario",
  });

  if (error) return { error: error.message };

  revalidatePath(slug ? `/inventario/${slug}` : "/inventario");
  revalidatePath("/finanzas");

  return { ok: "Pago a proveedor registrado y 30 días extendidos." };
}
