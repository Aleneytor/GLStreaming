"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { descifrarSecreto } from "@/lib/crypto";

export type PaqueteAcceso =
  | {
      ok: true;
      correo: string;
      contrasena: string;
      perfil: string | null;
      pin: string | null;
      renovacion: string | null;
      cliente: string;
    }
  | { ok: false; error: string };

/**
 * Entrega el paquete de acceso de una venta (DEC-97).
 *
 * Lo recibe el administrador y también el REVENDEDOR dueño de esa venta: son
 * los mismos datos que se le pasan al cliente final (correo, contraseña,
 * nombre de perfil, PIN y la fecha de renovación).
 *
 * Seguridad, en este orden:
 *  1. Se comprueba la propiedad con la identidad REAL del usuario (su sesión).
 *  2. Solo entonces se usa la clave de servicio para leer los secretos, que el
 *     revendedor no puede leer por RLS.
 *  3. Se descifra en memoria y se registra la entrega: quedan las VERSIONES y
 *     los metadatos, nunca el valor.
 */
export async function entregarAccesoAction(
  suscripcionId: string,
): Promise<PaqueteAcceso> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario || !usuario.activo) return { ok: false, error: "No autorizado." };

  const supabase = await createClient();
  const admin = esAdmin(usuario);

  // 1. Propiedad: el admin puede con cualquiera; el revendedor solo con la suya.
  //    La vista v_mis_ventas_revendedor ya filtra por su identidad.
  if (!admin) {
    const { data: propia } = await supabase
      .from("v_mis_ventas_revendedor")
      .select("suscripcion_id")
      .eq("suscripcion_id", suscripcionId)
      .maybeSingle();

    if (!propia) return { ok: false, error: "Esa venta no es tuya." };
  }

  // 2. Con la propiedad verificada, se leen los datos con privilegios.
  const priv = createAdminClient();

  const { data: susc } = await priv
    .from("suscripciones")
    .select(
      `id, clientes ( nombre ),
       periodos_servicio ( fecha_renovacion ),
       asignaciones_inventario ( cuenta_id, unidad_id, fin )`,
    )
    .eq("id", suscripcionId)
    .maybeSingle();

  if (!susc) return { ok: false, error: "Venta no encontrada." };

  const asignacion = (susc.asignaciones_inventario ?? []).find((a) => a.fin === null);
  if (!asignacion) return { ok: false, error: "Esta venta no tiene un recurso asignado." };

  const { data: credencial } = await priv
    .from("credenciales_cuenta")
    .select("login_cifrado, contrasena_cifrada, version_clave")
    .eq("cuenta_id", asignacion.cuenta_id)
    .is("eliminada_at", null)
    .maybeSingle();

  if (!credencial) return { ok: false, error: "La cuenta no tiene credenciales cargadas." };

  let perfil: string | null = null;
  let pin: string | null = null;
  let versionPin: number | null = null;

  if (asignacion.unidad_id) {
    const { data: unidad } = await priv
      .from("unidades_inventario")
      .select("nombre_visible, numero_slot, secretos_unidad ( pin_cifrado, version_clave )")
      .eq("id", asignacion.unidad_id)
      .maybeSingle();

    perfil = unidad?.nombre_visible ?? (unidad ? `Perfil ${unidad.numero_slot}` : null);
    const secreto = Array.isArray(unidad?.secretos_unidad)
      ? unidad?.secretos_unidad[0]
      : unidad?.secretos_unidad;
    if (secreto?.pin_cifrado) {
      try {
        pin = descifrarSecreto(secreto.pin_cifrado);
        versionPin = secreto.version_clave ?? null;
      } catch {
        pin = null;
      }
    }
  }

  let correo = "";
  let contrasena = "";
  try {
    correo = credencial.login_cifrado ? descifrarSecreto(credencial.login_cifrado) : "";
    contrasena = credencial.contrasena_cifrada
      ? descifrarSecreto(credencial.contrasena_cifrada)
      : "";
  } catch {
    return { ok: false, error: "No se pudieron descifrar (¿cambió la clave?)." };
  }

  const periodos = susc.periodos_servicio ?? [];
  const renovacion =
    [...periodos].sort((a, b) => (a.fecha_renovacion < b.fecha_renovacion ? 1 : -1))[0]
      ?.fecha_renovacion ?? null;

  // 3. Se registra la entrega: versiones y metadatos, NUNCA los secretos.
  await priv.from("entregas_acceso").insert({
    suscripcion_id: suscripcionId,
    tipo: "reenvio",
    estado: "entregada",
    credencial_cuenta_version: credencial.version_clave ?? null,
    secreto_unidad_version: versionPin,
    nombre_perfil_snapshot: perfil,
    fecha_renovacion_snapshot: renovacion,
    entregada_por_id: usuario.id,
    entregada_at: new Date().toISOString(),
    canal: "panel",
  });

  await priv.from("eventos_auditoria").insert({
    actor_id: usuario.id,
    accion: "entregar_acceso",
    entidad: "suscripciones",
    entidad_id: suscripcionId,
    resultado: "ok",
    metadata: { rol: usuario.rol },
  });

  const cliente = Array.isArray(susc.clientes) ? susc.clientes[0] : susc.clientes;

  return {
    ok: true,
    correo,
    contrasena,
    perfil,
    pin,
    renovacion,
    cliente: cliente?.nombre ?? "",
  };
}
