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
  // Ciclo de proveedor (opcional): si se indica un costo, se registra.
  costo_usdt: z.string().trim().optional().or(z.literal("")),
  ciclo_inicio: z.string().trim().optional().or(z.literal("")),
  dia_ancla: z.string().trim().optional().or(z.literal("")),
});

/** Registra el ciclo de proveedor si el formulario trae costo. */
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
    // La cuenta ya existe; se avisa para que el ciclo se registre al editar.
    return { error: `Cuenta creada, pero el ciclo no: ${errorCiclo}` };
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}

const esquemaEdicion = z.object({
  cuenta_id: z.string().uuid(),
  alias: z.string().trim().max(80).optional().or(z.literal("")),
  proveedor: z.string().trim().max(80).optional().or(z.literal("")),
  notas: z.string().trim().max(1000).optional().or(z.literal("")),
  estado: z.enum(["activa", "mantenimiento", "suspendida", "archivada"]),
  // Vacíos = no se tocan las credenciales actuales.
  correo: z.string().trim().optional().or(z.literal("")),
  contrasena: z.string().optional().or(z.literal("")),
});

/**
 * Edita una cuenta y, si se rellenaron, rota sus credenciales.
 *
 * Las credenciales vacías significan "no cambiar": así el formulario nunca
 * necesita mostrar la contraseña actual para poder editar el resto.
 */
export async function actualizarCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const parsed = esquemaEdicion.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    alias: formData.get("alias") ?? "",
    proveedor: formData.get("proveedor") ?? "",
    notas: formData.get("notas") ?? "",
    estado: formData.get("estado"),
    correo: formData.get("correo") ?? "",
    contrasena: formData.get("contrasena") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const supabase = await createClient();

  const { error: errorDatos } = await supabase.rpc("actualizar_cuenta", {
    p_cuenta_id: d.cuenta_id,
    p_alias: d.alias || null,
    p_proveedor_nombre: d.proveedor || null,
    p_notas: d.notas || null,
    p_estado: d.estado,
  });
  if (errorDatos) return { error: errorDatos.message };

  // Rotación de credenciales solo si se escribió algo.
  const correo = d.correo?.trim() ?? "";
  const contrasena = d.contrasena ?? "";
  if (correo || contrasena) {
    const { error: errorCred } = await supabase.rpc("rotar_credenciales_cuenta", {
      p_cuenta_id: d.cuenta_id,
      p_login_cifrado: correo ? cifrarSecreto(correo) : null,
      p_login_fingerprint: correo ? huellaSecreto(correo) : null,
      p_contrasena_cifrada: contrasena ? cifrarSecreto(contrasena) : null,
    });
    if (errorCred) return { error: errorCred.message };

    // Cambiar un secreto es una acción sensible: queda auditada.
    await supabase.from("eventos_auditoria").insert({
      actor_id: usuario!.id,
      accion: "rotar_credenciales",
      entidad: "cuentas",
      entidad_id: d.cuenta_id,
      resultado: "ok",
      metadata: { cambio_correo: Boolean(correo), cambio_contrasena: Boolean(contrasena) },
    });
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}

/**
 * Borra una cuenta y TODO su historial (ventas, cobros, ciclos). Es una
 * herramienta de corrección, no el flujo normal: por eso vive detrás de una
 * confirmación en la UI. La base hace el borrado en el orden correcto.
 */
export async function eliminarCuentaAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  if (!cuentaId) return { error: "Falta la cuenta." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("eliminar_cuenta", { p_cuenta_id: cuentaId });
  if (error) return { error: error.message };

  revalidatePath("/inventario");
  revalidatePath("/clientes");
  revalidatePath("/vencimientos");
  redirect("/inventario");
}

/**
 * Guarda el nombre y el PIN de los perfiles de una cuenta.
 * Los PIN se cifran aquí; vacío significa "no cambiar".
 */
export async function actualizarUnidadesAction(
  _prev: EstadoAlta,
  formData: FormData,
): Promise<EstadoAlta> {
  const cuentaId = String(formData.get("cuenta_id") ?? "");
  if (!cuentaId) return { error: "Falta la cuenta." };

  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  // Los campos vienen como nombre_<id> y pin_<id>.
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

  if (ids.length === 0) return { error: "No hay perfiles que guardar." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_unidades", {
    p_cuenta_id: cuentaId,
    p_unidad_ids: ids,
    p_nombres: nombres,
    p_pins_cifrados: pins,
  });
  if (error) return { error: error.message };

  const huboPines = pins.some((p) => p !== null);
  if (huboPines) {
    await supabase.from("eventos_auditoria").insert({
      actor_id: usuario!.id,
      accion: "rotar_pin",
      entidad: "cuentas",
      entidad_id: cuentaId,
      resultado: "ok",
    });
  }

  revalidatePath("/inventario");
  redirect("/inventario");
}

export type PerfilRevelado = { nombre: string; pin: string | null };

export type CredencialesReveladas =
  | { ok: true; correo: string; contrasena: string; perfiles: PerfilRevelado[] }
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

  // Paquete de acceso completo: además del correo/contraseña, el nombre de
  // perfil y su PIN, que es lo que se le entrega al cliente.
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

  // Auditoría: se registra el acceso, nunca el valor revelado.
  await supabase.from("eventos_auditoria").insert({
    actor_id: usuario!.id,
    accion: "revelar_credenciales",
    entidad: "cuentas",
    entidad_id: cuentaId,
    resultado: "ok",
  });

  return { ok: true, correo, contrasena, perfiles };
}

// ============================================================================
// Edición inline desde el inventario (panel que se despliega en la fila).
// Una sola acción orquesta las funciones ya probadas: datos de la cuenta,
// rotación de credenciales (solo si cambiaron), perfiles (nombre + PIN),
// nombres de cliente y costo del ciclo vigente. NO redirige: revalida y vuelve.
// ============================================================================
export type EstadoInline = { error?: string; ok?: string } | null;

export async function guardarCuentaInlineAction(
  _prev: EstadoInline,
  formData: FormData,
): Promise<EstadoInline> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const cuentaId = String(formData.get("cuenta_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!cuentaId) return { error: "Falta la cuenta." };

  const supabase = await createClient();

  // 1. Datos de la cuenta (alias/proveedor/notas/estado).
  const { error: e1 } = await supabase.rpc("actualizar_cuenta", {
    p_cuenta_id: cuentaId,
    p_alias: String(formData.get("alias") ?? "").trim() || null,
    p_proveedor_nombre: String(formData.get("proveedor") ?? "").trim() || null,
    p_notas: String(formData.get("notas") ?? "").trim() || null,
    p_estado: String(formData.get("estado") ?? "activa"),
  });
  if (e1) return { error: e1.message };

  // 2. Credenciales: solo se rotan si el usuario tocó correo o contraseña.
  if (String(formData.get("creds_cambiadas") ?? "") === "1") {
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

  // 3. Perfiles: nombre_<unidadId> y pin_<unidadId> (PIN vacío = no cambiar).
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

  // 4. Nombres de cliente: cliente_<clienteId> (RLS admin permite el update).
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("cliente_")) continue;
    const id = clave.slice("cliente_".length);
    const nombre = String(valor).trim();
    if (nombre) await supabase.from("clientes").update({ nombre }).eq("id", id);
  }

  // 5. Costo del ciclo vigente (corrección directa del importe en USDT).
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

/** Sube/baja o manda a un extremo una cuenta dentro de su producto. */
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

/** Reordena una lista completa de cuentas mediante arrastrar y soltar (Drag and Drop). */
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

