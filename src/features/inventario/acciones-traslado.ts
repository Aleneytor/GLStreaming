"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esAdmin, obtenerUsuarioActual } from "@/lib/auth";
import { descifrarSecreto, enmascararLogin } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";

export type DestinoTraslado = {
  cuentaId: string;
  unidadId: string | null;
  etiqueta: string;
  alcance: "unidad" | "cuenta" | "principal";
};

export type ResultadoDestinosTraslado =
  | { ok: true; destinos: DestinoTraslado[] }
  | { ok: false; error: string };

export async function obtenerDestinosTrasladoAction(
  suscripcionId: string,
): Promise<ResultadoDestinosTraslado> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { ok: false, error: "Solo un administrador puede mover servicios." };

  const id = z.string().uuid().safeParse(suscripcionId);
  if (!id.success) return { ok: false, error: "La suscripción no es válida." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listar_destinos_traslado", {
    p_suscripcion_id: id.data,
  });

  if (error) return { ok: false, error: error.message };

  let filas = (data ?? []) as Array<{
    cuenta_id: string;
    unidad_id: string | null;
    cuenta_alias: string | null;
    cuenta_orden: number | null;
    unidad_numero: number | null;
    alcance: string;
  }>;
  const unidadesCandidatas = filas
    .map((destino) => destino.unidad_id)
    .filter((unidadId): unidadId is string => Boolean(unidadId));
  if (unidadesCandidatas.length > 0) {
    const { data: preparadas, error: errorPreparadas } = await supabase
      .from("identidades_spotify")
      .select("unidad_preparada_id")
      .in("unidad_preparada_id", unidadesCandidatas);
    if (errorPreparadas) {
      return { ok: false, error: errorPreparadas.message };
    }
    const reservadas = new Set(
      (preparadas ?? [])
        .map((identidad) => identidad.unidad_preparada_id)
        .filter((unidadId): unidadId is string => Boolean(unidadId)),
    );
    filas = filas.filter(
      (destino) => !destino.unidad_id || !reservadas.has(destino.unidad_id),
    );
  }
  const cuentas = [...new Set(filas.map((destino) => destino.cuenta_id))];
  const { data: credenciales } = cuentas.length
    ? await supabase
        .from("credenciales_cuenta")
        .select("cuenta_id, login_cifrado")
        .in("cuenta_id", cuentas)
        .is("eliminada_at", null)
    : { data: [] };
  const loginPorCuenta = new Map<string, string>();
  for (const credencial of credenciales ?? []) {
    if (!credencial.login_cifrado) continue;
    try {
      loginPorCuenta.set(
        credencial.cuenta_id,
        enmascararLogin(descifrarSecreto(credencial.login_cifrado)),
      );
    } catch {
      // Una credencial antigua ilegible no impide usar el resto de destinos.
    }
  }

  const destinos = filas.map((destino) => {
    const alias =
      destino.cuenta_alias?.trim() ||
      loginPorCuenta.get(destino.cuenta_id) ||
      `Cuenta …${destino.cuenta_id.slice(-6)}`;
    const cupo = destino.unidad_numero
      ? ` · cupo ${destino.unidad_numero}`
      : destino.alcance === "principal"
        ? " · uso principal"
        : " · cuenta completa";
    return {
      cuentaId: destino.cuenta_id,
      unidadId: destino.unidad_id,
      etiqueta: `${alias}${cupo}`,
      alcance: destino.alcance as DestinoTraslado["alcance"],
    };
  });

  return { ok: true, destinos };
}

export type EstadoTraslado = { ok?: string; error?: string } | null;

const trasladoSchema = z.object({
  suscripcion_id: z.string().uuid(),
  cuenta_destino_id: z.string().uuid(),
  unidad_destino_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  slug: z.string().min(1),
});

export async function trasladarServicioPorFallaAction(
  _estado: EstadoTraslado,
  formData: FormData,
): Promise<EstadoTraslado> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "Solo un administrador puede mover servicios." };

  const entrada = trasladoSchema.safeParse({
    suscripcion_id: formData.get("suscripcion_id"),
    cuenta_destino_id: formData.get("cuenta_destino_id"),
    unidad_destino_id: formData.get("unidad_destino_id") ?? "",
    slug: formData.get("slug"),
  });
  if (!entrada.success) return { error: "Selecciona un destino válido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("trasladar_servicio_por_falla", {
    p_suscripcion_id: entrada.data.suscripcion_id,
    p_cuenta_destino_id: entrada.data.cuenta_destino_id,
    p_unidad_destino_id: entrada.data.unidad_destino_id || undefined,
  });
  if (error) return { error: error.message };

  revalidatePath(`/inventario/${entrada.data.slug}`);
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  revalidatePath("/clientes");

  return {
    ok: "Servicio movido. La cuenta anterior quedó en mantenimiento y el nuevo acceso está listo para entregar.",
  };
}
