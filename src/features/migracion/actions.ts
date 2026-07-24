"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { cifrarSecreto, huellaSecreto } from "@/lib/crypto";
import { analizarFilas, restarUnMes } from "@/domain/importacion";
// `restarUnMes` recorta al último día válido del mes destino.
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";

/**
 * Importación masiva de la cartera existente.
 *
 * Se procesa FILA A FILA, no todo o nada: con cientos de filas, que una sola
 * mala tumbe las buenas haría la migración imposible de terminar. Cada fila sí
 * es atómica por su cuenta (lo garantiza `importar_servicio_existente`).
 *
 * MONEDA: el Excel del negocio lleva todo en divisas. Por eso el importador
 * convierte el monto a bolívares con la BCV del momento (`round(usd * bcv, 2)`),
 * la MISMA que la base congela después. El precio en USD se deriva de vuelta,
 * de modo que queda idéntico al del Excel.
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

/** Resuelve los nombres de la columna «Vendió» a ids, creando los que falten. */
async function resolverVendedores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nombres: string[],
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (nombres.length === 0) return mapa;

  const { data: existentes } = await supabase.from("vendedores").select("id, nombre");
  for (const v of existentes ?? []) {
    mapa.set(v.nombre.trim().toLowerCase(), v.id);
  }

  for (const nombre of nombres) {
    const clave = nombre.trim().toLowerCase();
    if (mapa.has(clave)) continue;
    const { data, error } = await supabase
      .from("vendedores")
      .insert({ nombre: nombre.trim() })
      .select("id")
      .single();
    if (!error && data) mapa.set(clave, data.id);
  }

  return mapa;
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
  // Por defecto los montos vienen en dólares (así está el Excel del negocio).
  const moneda = String(formData.get("moneda") ?? "usd") === "ves" ? "ves" : "usd";

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

  // Si hay montos y vienen en dólares, hace falta una BCV utilizable.
  const hayMontos = validas.some((f) => f.datos.cliente && f.datos.monto != null);
  let bcv: number | null = null;
  if (hayMontos && moneda === "usd") {
    const { bcv: tasa } = await obtenerTasasVigentes();
    const usable = tasa && evaluarFrescura(confirmadaAt(tasa)).nivel !== "inservible";
    if (!usable) {
      return {
        error:
          "Los montos están en dólares pero no hay una tasa BCV utilizable para convertirlos. Actualízala en «Tasas».",
      };
    }
    bcv = tasa.bs_por_usd;
  }

  const supabase = await createClient();

  const { data: sesionId, error: errorSesion } = await supabase.rpc("abrir_sesion_carga", {
    p_producto_id: productoId,
    p_motivo: "Migración desde el Excel del negocio",
  });
  if (errorSesion) return { error: `No se pudo abrir la sesión de carga: ${errorSesion.message}` };

  const vendedores = await resolverVendedores(supabase, analisis.vendedores);

  const hoy = hoyCaracas();
  const resultados: ResultadoFila[] = [];

  for (const fila of validas) {
    const d = fila.datos;

    // Fechas: se toman explícitas del Excel; si faltan, se derivan.
    const inicio = d.inicio ?? (d.vence ? restarUnMes(d.vence) : hoy);
    const vence = d.vence ?? sumarUnMes(inicio);

    // Monto → bolívares. En USD se convierte con la BCV del momento.
    let montoVes: number | null = null;
    if (d.cliente && d.monto != null) {
      montoVes = moneda === "usd" && bcv ? Math.round(d.monto * bcv * 100) / 100 : d.monto;
    }

    const vendedorId = d.vendio ? (vendedores.get(d.vendio.toLowerCase()) ?? null) : null;

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
      p_monto_ves: montoVes,
      p_vendedor_id: vendedorId,
      // El costo va en USD tal cual: la base lo valoriza a PARALELA (no BCV),
      // porque los egresos nacen en USDT. Se registra una sola vez por cuenta.
      p_costo_usdt: d.inversion,
      p_proveedor_nombre: d.proveedor,
      // Fecha de pago al proveedor: el ciclo empieza un mes antes de renovar,
      // así su próxima renovación cae exactamente en la fecha del Excel.
      p_prov_inicio: d.renovarProveedor ? restarUnMes(d.renovarProveedor) : null,
    });

    const etiquetaVendedor = d.vendio ? ` · vendió ${d.vendio}` : "";
    resultados.push({
      numero: fila.numero,
      ok: !error,
      mensaje: error
        ? error.message
        : d.cliente
          ? `${d.cliente} · vence ${vence}${montoVes ? ` · ${montoVes.toLocaleString("es-VE")} Bs` : " · sin cobro"}${etiquetaVendedor}`
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
      (omitidas ? ` ${omitidas} se omitieron por errores de formato.` : "") +
      (vendedores.size ? ` Revendedores: ${vendedores.size}.` : ""),
    filas: resultados,
  };
}
