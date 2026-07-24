"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { cifrarSecreto, huellaSecreto } from "@/lib/crypto";
import { analizarFilas, restarUnMes } from "@/domain/importacion";

/**
 * Importación masiva de la cartera existente.
 *
 * Se procesa FILA A FILA, no todo o nada: con cientos de filas, que una sola
 * mala tumbe las 114 buenas haría la migración imposible de terminar. Cada fila
 * sí es atómica por su cuenta (lo garantiza `importar_servicio_existente`), y
 * al final se devuelve el detalle de qué entró y qué no.
 */

export type ResultadoFila = {
  numero: number;
  ok: boolean;
  mensaje: string;
};

export type EstadoImportacion = {
  error?: string;
  resumen?: string;
  filas?: ResultadoFila[];
} | null;

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sumarUnMes(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const mes = m === 12 ? 1 : m + 1;
  const anio = m === 12 ? a + 1 : a;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes - 1, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

export async function importarAction(
  _prev: EstadoImportacion,
  formData: FormData,
): Promise<EstadoImportacion> {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) return { error: "No autorizado." };

  const texto = String(formData.get("filas") ?? "");
  const productoId = String(formData.get("producto_id") ?? "");
  const modalidadId = String(formData.get("modalidad_id") ?? "");
  const capacidad = Number(formData.get("capacidad") ?? 0);
  const vendedorId = String(formData.get("vendedor_id") ?? "");

  if (!texto.trim()) return { error: "No pegaste ninguna fila." };
  if (!productoId || !modalidadId || !capacidad) {
    return { error: "Falta elegir el producto." };
  }

  // Se analiza con el MISMO código que dibujó la vista previa.
  const analisis = analizarFilas(texto, capacidad);
  const validas = analisis.filas.filter((f) => f.errores.length === 0);
  if (validas.length === 0) {
    return { error: "Ninguna fila es válida. Corrige los errores marcados." };
  }

  const supabase = await createClient();

  const { data: sesionId, error: errorSesion } = await supabase.rpc("abrir_sesion_carga", {
    p_producto_id: productoId,
    p_motivo: "Migración desde el Excel del negocio",
  });
  if (errorSesion) return { error: `No se pudo abrir la sesión de carga: ${errorSesion.message}` };

  const hoy = hoyCaracas();
  const resultados: ResultadoFila[] = [];

  for (const fila of validas) {
    const d = fila.datos;
    // Del vencimiento se deduce el inicio: es el dato que existe en el Excel.
    const vence = d.vence ?? sumarUnMes(hoy);
    const inicio = d.vence ? restarUnMes(d.vence) : hoy;

    const { error } = await supabase.rpc("importar_servicio_existente", {
      p_sesion_id: sesionId as unknown as string,
      p_producto_id: productoId,
      p_capacidad: capacidad,
      p_login_cifrado: cifrarSecreto(d.correo),
      p_login_fingerprint: huellaSecreto(d.correo),
      p_contrasena_cifrada: cifrarSecreto(d.contrasena),
      p_alias: null,
      p_numero_slot: fila.slot,
      p_nombre_perfil: d.perfil ?? d.cliente ?? null,
      p_pin_cifrado: d.pin ? cifrarSecreto(d.pin) : null,
      p_modalidad_id: modalidadId,
      p_cliente_nombre: d.cliente,
      p_cliente_whatsapp: d.whatsapp,
      p_inicio: inicio,
      p_fecha_renovacion: vence,
      p_monto_ves: d.cliente ? d.montoVes : null,
      p_vendedor_id: vendedorId || null,
    });

    resultados.push({
      numero: fila.numero,
      ok: !error,
      mensaje: error
        ? error.message
        : d.cliente
          ? `${d.cliente} · vence ${vence}${d.montoVes ? ` · ${d.montoVes} Bs` : " · sin cobro"}`
          : `Perfil ${fila.slot} cargado libre`,
    });
  }

  revalidatePath("/inventario");
  revalidatePath("/clientes");
  revalidatePath("/vencimientos");
  revalidatePath("/cobros");
  revalidatePath("/caja");

  const ok = resultados.filter((r) => r.ok).length;
  const fallidas = resultados.length - ok;
  const omitidas = analisis.conError;

  return {
    resumen:
      `Importadas ${ok} de ${resultados.length} filas.` +
      (fallidas ? ` ${fallidas} fallaron.` : "") +
      (omitidas ? ` ${omitidas} se omitieron por errores de formato.` : ""),
    filas: resultados,
  };
}
