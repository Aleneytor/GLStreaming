import "server-only";
import { validarFechaVigencia, validarValorTasa } from "@/domain/tasas";

/**
 * Adaptadores de las fuentes de tasas.
 *
 * Aíslan las dos dependencias externas: si mañana cambia el contrato de una
 * fuente o se decide publicar un endpoint propio, solo se toca este archivo.
 *
 * Ambos validan ANTES de devolver: una fuente que responde con basura no debe
 * contaminar el historial financiero. Si algo no cuadra, se devuelve un error y
 * la aplicación conserva la última tasa válida — nunca se inventa un valor.
 */

export type Observacion = {
  tipo: "bcv" | "paralela";
  bs_por_usd: number;
  fuente: string;
  /** Identidad estable en la fuente: permite guardar sin duplicar. */
  fuente_registro_id: string | null;
  /** Fecha oficial de vigencia (solo BCV). */
  fecha_vigencia: string | null;
  /** Instante en que la fuente observó el dato. */
  observada_fuente_at: string;
  detalle_fuentes: unknown | null;
  simulada: boolean;
};

export type ResultadoFuente =
  | { ok: true; observacion: Observacion }
  | { ok: false; error: string };

const TIMEOUT_MS = 10_000;

async function fetchConTimeout(url: string, init?: RequestInit): Promise<Response> {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: control.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// BCV — tasa oficial
// ---------------------------------------------------------------------------
export async function obtenerBcv(ultimaConocida?: number | null): Promise<ResultadoFuente> {
  const url = process.env.BCV_API_URL;
  if (!url) return { ok: false, error: "Falta BCV_API_URL." };

  let datos: unknown;
  try {
    const res = await fetchConTimeout(url);
    if (!res.ok) return { ok: false, error: `La fuente BCV respondió ${res.status}.` };
    datos = await res.json();
  } catch (e) {
    return { ok: false, error: `No se pudo consultar la BCV: ${(e as Error).message}` };
  }

  const d = datos as Record<string, unknown>;
  if (d?.success !== true) {
    return { ok: false, error: "La fuente BCV no reportó éxito." };
  }

  // La fuente sustituye la fecha oficial por la del día si no la encuentra;
  // por eso se exige y se valida explícitamente.
  const fecha = validarFechaVigencia(d.date);
  if (!fecha.valida) return { ok: false, error: fecha.motivo };

  const valor = validarValorTasa(d.usd, ultimaConocida);
  if (!valor.valida) return { ok: false, error: valor.motivo };

  return {
    ok: true,
    observacion: {
      tipo: "bcv",
      bs_por_usd: d.usd as number,
      fuente: typeof d.source === "string" ? d.source : "bcv",
      // Identidad lógica de una publicación: tipo + fecha + valor.
      fuente_registro_id: `${d.date}:${d.usd}`,
      fecha_vigencia: d.date as string,
      observada_fuente_at:
        typeof d.fetchedAt === "string" ? d.fetchedAt : new Date().toISOString(),
      detalle_fuentes: null,
      simulada: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Paralela — última fila de `p2p_rate_history` (proyecto Kuanto)
// ---------------------------------------------------------------------------
export async function obtenerParalela(
  ultimaConocida?: number | null,
): Promise<ResultadoFuente> {
  const url = process.env.KUANTO_SUPABASE_URL;
  const key = process.env.KUANTO_SUPABASE_PUBLISHABLE_KEY;

  // Sin credenciales se trabaja con un valor simulado: permite construir y
  // probar el resto sin depender de la fuente externa.
  if (!url || !key) {
    const base = ultimaConocida && ultimaConocida > 0 ? ultimaConocida : 40;
    return {
      ok: true,
      observacion: {
        tipo: "paralela",
        bs_por_usd: base,
        fuente: "simulada",
        fuente_registro_id: `sim:${Date.now()}`,
        fecha_vigencia: null,
        observada_fuente_at: new Date().toISOString(),
        detalle_fuentes: null,
        simulada: true,
      },
    };
  }

  const consulta =
    `${url.replace(/\/$/, "")}/rest/v1/p2p_rate_history` +
    `?select=id,price,details,created_at&order=created_at.desc,id.desc&limit=1`;

  let filas: unknown;
  try {
    // Solo lectura y con la clave PÚBLICA: nunca se usa una clave privilegiada
    // de un proyecto ajeno, ni se invoca a su productor (eso insertaría filas).
    const res = await fetchConTimeout(consulta, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false, error: `La fuente paralela respondió ${res.status}.` };
    filas = await res.json();
  } catch (e) {
    return { ok: false, error: `No se pudo consultar la paralela: ${(e as Error).message}` };
  }

  const fila = Array.isArray(filas) ? (filas[0] as Record<string, unknown>) : null;
  if (!fila) return { ok: false, error: "La fuente paralela no devolvió observaciones." };

  const precio = typeof fila.price === "string" ? Number(fila.price) : fila.price;
  const valor = validarValorTasa(precio, ultimaConocida);
  if (!valor.valida) return { ok: false, error: valor.motivo };

  return {
    ok: true,
    observacion: {
      tipo: "paralela",
      bs_por_usd: precio as number,
      fuente: "kuanto",
      fuente_registro_id: fila.id != null ? String(fila.id) : null,
      fecha_vigencia: null,
      observada_fuente_at:
        typeof fila.created_at === "string" ? fila.created_at : new Date().toISOString(),
      detalle_fuentes: fila.details ?? null,
      simulada: false,
    },
  };
}
