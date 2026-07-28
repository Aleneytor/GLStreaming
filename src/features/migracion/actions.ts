"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { cifrarSecreto, huellaSecreto } from "@/lib/crypto";
import {
  analizarFilas,
  baseCobroImportacion,
  calcularOrdenCuentasImportadas,
  modoDeProducto,
  restarUnMes,
  type ConfiguracionVendedorImportacion,
} from "@/domain/importacion";
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
 * convierte el monto a bolívares con la base comercial vigente: BCV para venta
 * directa/intermediario y paralela para el revendedor que tenga esa marca. La
 * base congela ambas tasas y deriva el precio USD sin deformar el Excel.
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

/**
 * Clasifica el correo de una identidad de Spotify. Los del dominio propio son
 * reutilizables tras sanear; el resto se anota como Gmail del negocio (si
 * resultara ser del cliente, se corrige a mano: no se adivina).
 */
function tipoCorreo(correo: string | null): string {
  if (!correo) return "gmail_propio";
  return /@(glstreaming\.org|glcuenta\.com)$/i.test(correo.trim())
    ? "dominio_gl"
    : "gmail_propio";
}

function sumarUnMes(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const mes = m === 12 ? 1 : m + 1;
  const anio = m === 12 ? a + 1 : a;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes - 1, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

async function sincronizarCicloProveedorImportado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cuentaId: string,
  costoUsdt: number | null,
  renovarProveedor: string | null,
  inicioCliente: string,
): Promise<string | null> {
  if (!renovarProveedor) return null;

  const { data: ciclo, error: errorCiclo } = await supabase
    .from("ciclos_proveedor")
    .select("id")
    .eq("cuenta_id", cuentaId)
    .eq("estado", "vigente")
    .maybeSingle();
  if (errorCiclo) return errorCiclo.message;

  if (ciclo) {
    const patch: {
      costo_usdt?: number;
      inicio: string;
      proxima_renovacion: string;
      dia_ancla_proveedor: number;
    } = {
      inicio: restarUnMes(renovarProveedor),
      proxima_renovacion: renovarProveedor,
      dia_ancla_proveedor: Number(renovarProveedor.slice(8, 10)),
    };
    if (costoUsdt !== null) patch.costo_usdt = costoUsdt;
    const { error } = await supabase.from("ciclos_proveedor").update(patch).eq("id", ciclo.id);
    return error?.message ?? null;
  }

  const inicioProveedor = restarUnMes(renovarProveedor) ?? inicioCliente;
  const { error } = await supabase.rpc("registrar_ciclo_proveedor", {
    p_cuenta_id: cuentaId,
    p_costo_usdt: costoUsdt ?? 0,
    p_inicio: inicioProveedor,
    p_dia_ancla: Number(renovarProveedor.slice(8, 10)),
    p_referencia: "migración",
  });
  return error?.message ?? null;
}

type VendedorExistente = {
  id: string;
  nombre: string;
  alias: string | null;
  tipo: string;
  cobra_en_paralela: boolean;
};

type VendedorResuelto = {
  id: string;
  tipo: "revendedor" | "intermediario";
  cobraEnParalela: boolean;
};

/** Resuelve «Vendió» y aplica solo la configuración que vino explícita. */
async function resolverVendedores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  configuraciones: ConfiguracionVendedorImportacion[],
  existentes: VendedorExistente[],
): Promise<Map<string, VendedorResuelto>> {
  const mapa = new Map<string, VendedorResuelto>();
  const existentesPorNombre = new Map(
    existentes.map((v) => [v.nombre.trim().toLowerCase(), v]),
  );

  for (const config of configuraciones) {
    const clave = config.nombre.trim().toLowerCase();
    const existente = existentesPorNombre.get(clave);
    if (existente) {
      const tipo = (config.tipo ?? existente.tipo) as "revendedor" | "intermediario";
      const cobraEnParalela =
        tipo === "revendedor"
          ? config.tasa
            ? config.tasa === "paralela"
            : existente.cobra_en_paralela
          : false;
      const patch: { alias?: string; tipo?: string; cobra_en_paralela?: boolean } = {};
      if (config.alias) patch.alias = config.alias;
      if (config.tipo) patch.tipo = tipo;
      if (config.tasa || tipo === "intermediario") patch.cobra_en_paralela = cobraEnParalela;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("vendedores").update(patch).eq("id", existente.id);
        if (error) throw new Error(`No se pudo actualizar a ${config.nombre}: ${error.message}`);
      }
      mapa.set(clave, { id: existente.id, tipo, cobraEnParalela });
      continue;
    }

    const tipo = config.tipo ?? (config.tasa === "paralela" ? "revendedor" : "intermediario");
    const cobraEnParalela = tipo === "revendedor" && config.tasa === "paralela";
    const { data, error } = await supabase
      .from("vendedores")
      .insert({
        nombre: config.nombre.trim(),
        alias: config.alias,
        tipo,
        cobra_en_paralela: cobraEnParalela,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`No se pudo crear a ${config.nombre}: ${error?.message ?? "sin respuesta"}`);
    }
    mapa.set(clave, { id: data.id, tipo, cobraEnParalela });
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
  // Spotify va por su propio camino: tiene identidad (el login del cliente)
  // separada de la cobertura (de dónde sale el Premium).
  const codigo = String(formData.get("producto_codigo") ?? "");
  const esFamiliar = codigo === "spotify-familiar";
  const esIndividualSpotify = codigo === "spotify-individual";

  if (!texto.trim()) return { error: "No pegaste ninguna fila." };
  if (!productoId || !modalidadId || !capacidad) {
    return { error: "Falta elegir el producto." };
  }

  // Se analiza con el MISMO código que dibujó la vista previa.
  // MISMO modo que la vista previa: si no, se guardaría otra cosa.
  const analisis = analizarFilas(texto, capacidad, modoDeProducto(codigo));

  // Blindaje contra el error que duplicó familias como Netflix. Las columnas
  // «Correo Cliente» / «Clave Cliente» son EXCLUSIVAS de Spotify familiar; un
  // individual usa el login del cliente en las columnas normales.
  if (analisis.columnasSpotify && !esFamiliar) {
    return {
      error:
        "Esta hoja es de Spotify familiar (tiene «Correo Cliente» / «Clave Cliente»). Elige el producto «Spotify — familiar».",
    };
  }
  if (esFamiliar && !analisis.columnasSpotify) {
    return {
      error:
        "Elegiste «Spotify — familiar» pero la hoja no trae «Correo Cliente» / «Clave Cliente». Si son individuales, usa «Spotify — individual».",
    };
  }

  const validas = analisis.filas.filter((f) => f.errores.length === 0);
  if (validas.length === 0) {
    return { error: "Ninguna fila es válida. Corrige los errores marcados." };
  }

  const supabase = await createClient();
  const { data: vendedoresExistentes, error: errorVendedores } = await supabase
    .from("vendedores")
    .select("id, nombre, alias, tipo, cobra_en_paralela");
  if (errorVendedores) return { error: `No se pudieron leer los vendedores: ${errorVendedores.message}` };

  const existentes = (vendedoresExistentes ?? []) as VendedorExistente[];
  const existentesPorNombre = new Map(existentes.map((v) => [v.nombre.trim().toLowerCase(), v]));
  const vendedoresValidos = new Set(
    validas.flatMap((f) => (f.datos.vendio ? [f.datos.vendio.trim().toLowerCase()] : [])),
  );
  const configuracionesValidas = analisis.configuracionesVendedores.filter((v) =>
    vendedoresValidos.has(v.nombre.trim().toLowerCase()),
  );
  const configPorNombre = new Map(
    configuracionesValidas.map((v) => [v.nombre.trim().toLowerCase(), v]),
  );

  // Si hay cobros en dólares, la conversión respeta la base del vendedor.
  const hayMontos = validas.some((f) => f.datos.cliente && f.datos.monto != null);
  let bcv: number | null = null;
  let paralela: number | null = null;
  if (hayMontos && moneda === "usd") {
    const { bcv: tasaBcv, paralela: tasaParalela } = await obtenerTasasVigentes();
    const bcvUsable = tasaBcv && evaluarFrescura(confirmadaAt(tasaBcv)).nivel !== "inservible";
    if (!bcvUsable) {
      return {
        error:
          "Los montos están en dólares pero no hay una tasa BCV utilizable para convertirlos. Actualízala en «Tasas».",
      };
    }
    bcv = tasaBcv.bs_por_usd;

    const usaParalela = validas.some((fila) => {
      if (!fila.datos.vendio || fila.datos.monto == null) return false;
      const clave = fila.datos.vendio.toLowerCase();
      const config = configPorNombre.get(clave);
      const existente = existentesPorNombre.get(clave);
      return (
        baseCobroImportacion(
          config,
          existente
            ? { tipo: existente.tipo, cobraEnParalela: existente.cobra_en_paralela }
            : null,
        ) === "paralela"
      );
    });
    if (usaParalela) {
      const usable = tasaParalela && evaluarFrescura(confirmadaAt(tasaParalela)).nivel !== "inservible";
      if (!usable) {
        return {
          error:
            "Hay cobros de revendedores a tasa paralela, pero no existe una paralela utilizable. Actualízala en «Tasas».",
        };
      }
      paralela = tasaParalela.bs_por_usd;
    }
  }

  let vendedores: Map<string, VendedorResuelto>;
  try {
    vendedores = await resolverVendedores(
      supabase,
      configuracionesValidas,
      existentes,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudieron preparar los vendedores." };
  }

  // La sesión se abre después de validar tasas y vendedores para no dejar una
  // carga huérfana si la preparación del catálogo falla.
  const { data: sesionId, error: errorSesion } = await supabase.rpc("abrir_sesion_carga", {
    p_producto_id: productoId,
    p_motivo: "Migración desde el Excel del negocio",
  });
  if (errorSesion) return { error: `No se pudo abrir la sesión de carga: ${errorSesion.message}` };

  const hoy = hoyCaracas();
  const resultados: ResultadoFila[] = [];
  const ultimaFilaPorCuenta = new Map<string, number>();
  const metadatosPorCuenta = new Map<string, (typeof validas)[number]["datos"]>();
  for (const fila of validas) {
    const clave = fila.datos.correo.toLowerCase();
    ultimaFilaPorCuenta.set(clave, fila.numero);
    const anterior = metadatosPorCuenta.get(clave);
    if (!anterior) metadatosPorCuenta.set(clave, fila.datos);
    else {
      metadatosPorCuenta.set(clave, {
        ...anterior,
        inversion: anterior.inversion ?? fila.datos.inversion,
        proveedor: anterior.proveedor ?? fila.datos.proveedor,
        renovarProveedor: anterior.renovarProveedor ?? fila.datos.renovarProveedor,
        aliasCuenta: anterior.aliasCuenta ?? fila.datos.aliasCuenta,
        notasCuenta: anterior.notasCuenta ?? fila.datos.notasCuenta,
        estadoCuenta: anterior.estadoCuenta ?? fila.datos.estadoCuenta,
        tarjetaProveedor: anterior.tarjetaProveedor ?? fila.datos.tarjetaProveedor,
        tipoProveedor: anterior.tipoProveedor ?? fila.datos.tipoProveedor,
        telefonoProveedor: anterior.telefonoProveedor ?? fila.datos.telefonoProveedor,
        notasProveedor: anterior.notasProveedor ?? fila.datos.notasProveedor,
        bloqueoAdmisionSpotify:
          anterior.bloqueoAdmisionSpotify || fila.datos.bloqueoAdmisionSpotify,
      });
    }
  }

  const cuentasImportadasEnOrden: string[] = [];
  const cuentasImportadasVistas = new Set<string>();
  const tarjetasProveedorGuardadas = new Set<string>();
  const cuentasConCicloSincronizado = new Set<string>();
  const cuentasExistentesPorHuella = new Map<string, string>();
  const { data: cuentasExistentes, error: errorCuentasExistentes } = await supabase
    .from("cuentas")
    .select("id, credenciales_cuenta ( login_fingerprint, eliminada_at )")
    .eq("producto_plataforma_id", productoId)
    .is("archived_at", null);
  if (errorCuentasExistentes) {
    return { error: `No se pudieron preparar las cuentas existentes: ${errorCuentasExistentes.message}` };
  }
  for (const cuenta of cuentasExistentes ?? []) {
    for (const credencial of cuenta.credenciales_cuenta ?? []) {
      if (credencial.login_fingerprint && !credencial.eliminada_at) {
        cuentasExistentesPorHuella.set(credencial.login_fingerprint, cuenta.id);
      }
    }
  }

  for (const fila of validas) {
    const d = fila.datos;
    const cuentaMeta = metadatosPorCuenta.get(d.correo.toLowerCase()) ?? d;
    const advertenciasMeta: string[] = [];

    // Fechas: se toman explícitas del Excel; si faltan, se derivan.
    const inicio = d.inicio ?? (d.vence ? restarUnMes(d.vence) : hoy);
    const vence = d.vence ?? sumarUnMes(inicio);

    const vendedor = d.vendio ? (vendedores.get(d.vendio.toLowerCase()) ?? null) : null;
    // Monto → bolívares. En USD usa BCV en directa/intermediario y paralela
    // únicamente para el revendedor que tenga guardada esa base.
    let montoVes: number | null = null;
    if (d.cliente && d.monto != null) {
      const tasa = vendedor?.cobraEnParalela ? paralela : bcv;
      montoVes = moneda === "usd" && tasa ? Math.round(d.monto * tasa * 100) / 100 : d.monto;
    }

    const vendedorId = vendedor?.id ?? null;
    // El ciclo del proveedor empieza un mes antes de renovar, así su próxima
    // renovación cae exactamente en la fecha del Excel.
    const provInicio = d.renovarProveedor ? restarUnMes(d.renovarProveedor) : null;
    // El costo va en USD tal cual: la base lo valoriza a PARALELA (no BCV),
    // porque los egresos nacen en USDT. Se registra una sola vez por cuenta.

    // Toda fecha de «Renovar» debe producir un ciclo, incluso con costo 0.
    // Spotify usa RPC propias que antes omitían ese caso. Sincronizar antes
    // permite volver a pegar el Excel y reparar la fecha aunque la venta exista.
    const huellaCuenta = huellaSecreto(d.correo);
    const cuentaExistenteId = cuentasExistentesPorHuella.get(huellaCuenta) ?? null;
    if (
      cuentaExistenteId &&
      cuentaMeta.renovarProveedor &&
      !cuentasConCicloSincronizado.has(cuentaExistenteId)
    ) {
      const errorCiclo = await sincronizarCicloProveedorImportado(
        supabase,
        cuentaExistenteId,
        cuentaMeta.inversion,
        cuentaMeta.renovarProveedor,
        inicio,
      );
      if (errorCiclo) advertenciasMeta.push(`ciclo del proveedor: ${errorCiclo}`);
      else cuentasConCicloSincronizado.add(cuentaExistenteId);
    }

    let data: unknown;
    let error: { message: string } | null;

    // El Premium puede salir de GPay propio (con su Gmail pagador anotado) o
    // de un proveedor externo. Vale igual para familias e individuales.
    const gpay = /gpay/i.test(cuentaMeta.proveedor ?? "") || Boolean(d.gmailPagador);
    const origenGpay = gpay
      ? /nigeria/i.test(cuentaMeta.proveedor ?? "")
        ? "gpay_nigeria"
        : "gpay_usa"
      : null;

    if (esFamiliar) {
      // Una fila = un miembro. La madre da el Premium; el miembro entra con su
      // propio login (columnas «Correo Cliente» / «Clave Cliente»).
      ({ data, error } = await supabase.rpc("importar_spotify_familiar", {
        p_sesion_id: sesionId as unknown as string,
        p_producto_id: productoId,
        p_capacidad: capacidad,
        p_madre_login_cifrado: cifrarSecreto(d.correo),
        p_madre_login_fingerprint: huellaSecreto(d.correo),
        p_madre_contrasena_cifrada: cifrarSecreto(d.contrasena),
        p_miembro_login_cifrado: d.correoCliente ? cifrarSecreto(d.correoCliente) : null,
        p_miembro_login_fingerprint: d.correoCliente ? huellaSecreto(d.correoCliente) : null,
        p_miembro_contrasena_cifrada: d.claveCliente ? cifrarSecreto(d.claveCliente) : null,
        p_miembro_tipo_correo: tipoCorreo(d.correoCliente),
        p_numero_slot: fila.slot,
        p_modalidad_id: modalidadId,
        p_cliente_nombre: d.cliente,
        p_cliente_whatsapp: d.whatsapp,
        p_inicio: inicio,
        p_fecha_renovacion: vence,
        p_monto_ves: montoVes,
        p_vendedor_id: vendedorId,
        p_costo_usdt: d.inversion,
        p_proveedor_nombre: cuentaMeta.proveedor,
        p_prov_inicio: provInicio,
        // Una familia que no se vendió como individual igual tiene pagador.
        p_gmail_pagador_cifrado: d.gmailPagador ? cifrarSecreto(d.gmailPagador) : null,
        p_gmail_pagador_fingerprint: d.gmailPagador ? huellaSecreto(d.gmailPagador) : null,
        p_origen_gpay: origenGpay,
      }));
    } else if (esIndividualSpotify) {
      // Si el correo resulta ser una familia ya importada, la base lo detecta
      // sola y lo registra como venta del USO DE LA MADRE.
      ({ data, error } = await supabase.rpc("importar_spotify_individual", {
        p_sesion_id: sesionId as unknown as string,
        p_producto_id: productoId,
        p_login_cifrado: cifrarSecreto(d.correo),
        p_login_fingerprint: huellaSecreto(d.correo),
        p_contrasena_cifrada: cifrarSecreto(d.contrasena),
        p_modalidad_id: modalidadId,
        p_cobertura_tipo: gpay ? "individual_gpay_propio" : "individual_proveedor",
        p_gmail_pagador_cifrado: d.gmailPagador ? cifrarSecreto(d.gmailPagador) : null,
        p_gmail_pagador_fingerprint: d.gmailPagador ? huellaSecreto(d.gmailPagador) : null,
        p_origen_gpay: origenGpay,
        p_cliente_nombre: d.cliente,
        p_cliente_whatsapp: d.whatsapp,
        p_inicio: inicio,
        p_fecha_renovacion: vence,
        p_monto_ves: montoVes,
        p_vendedor_id: vendedorId,
        p_costo_usdt: d.inversion,
        p_proveedor_nombre: cuentaMeta.proveedor,
        p_prov_inicio: provInicio,
      }));
    } else {
      ({ data, error } = await supabase.rpc("importar_servicio_existente", {
        p_sesion_id: sesionId as unknown as string,
        p_producto_id: productoId,
        p_capacidad: capacidad,
        p_login_cifrado: cifrarSecreto(d.correo),
        p_login_fingerprint: huellaSecreto(d.correo),
        p_contrasena_cifrada: cifrarSecreto(d.contrasena),
        p_alias: cuentaMeta.aliasCuenta,
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
        p_costo_usdt: d.inversion,
        p_proveedor_nombre: cuentaMeta.proveedor,
        p_prov_inicio: provInicio,
      }));
    }

    // Al volver a pegar Spotify para recuperar fechas de proveedor, la venta
    // puede existir ya. El ciclo se sincronizó arriba; tratamos ese duplicado
    // esperado como una reparación de metadatos, no como una venta nueva.
    if (
      error &&
      (esFamiliar || esIndividualSpotify) &&
      cuentaExistenteId &&
      cuentasConCicloSincronizado.has(cuentaExistenteId) &&
      /ya est[aá].*(ocupad[oa]|vendid[oa])/i.test(error.message)
    ) {
      data = { cuenta_id: cuentaExistenteId };
      error = null;
      advertenciasMeta.push("la venta ya existía; se sincronizó la renovación del proveedor");
    }

    // Un correo/clave de miembro sin cliente es una identidad PREPARADA para
    // un cupo todavía libre. Se conserva sin inventar una venta o suscripción.
    const resultadoBase = data as { unidad_id?: string } | null;
    if (
      !error &&
      esFamiliar &&
      !d.cliente &&
      d.correoCliente &&
      resultadoBase?.unidad_id
    ) {
      const preparada = await supabase.rpc("preparar_identidad_spotify", {
        p_unidad_id: resultadoBase.unidad_id,
        p_login_cifrado: cifrarSecreto(d.correoCliente),
        p_login_fingerprint: huellaSecreto(d.correoCliente),
        p_contrasena_cifrada: d.claveCliente ? cifrarSecreto(d.claveCliente) : "",
        p_tipo_correo: tipoCorreo(d.correoCliente),
      });
      if (preparada.error) error = { message: preparada.error.message };
    }

    // Cortesía (monto 0): el servicio queda resuelto, no pendiente de cobro.
    const periodoId = (data as { periodo_id?: string } | null)?.periodo_id;
    const ids = data as {
      cuenta_id?: string;
      suscripcion_id?: string;
    } | null;
    const cuentaProcesadaId = ids?.cuenta_id ?? cuentaExistenteId;
    const esUltimaFilaCuenta =
      ultimaFilaPorCuenta.get(d.correo.toLowerCase()) === fila.numero;
    if (
      esFamiliar &&
      cuentaMeta.bloqueoAdmisionSpotify &&
      esUltimaFilaCuenta &&
      cuentaProcesadaId
    ) {
      const { error: errorBloqueo } = await supabase
        .from("coberturas_spotify")
        .update({
          estado_admision: "bloqueada_por_spotify",
          bloqueada_at: new Date().toISOString(),
          motivo_bloqueo: "Importado desde Excel: no se puede",
          desbloqueada_at: null,
        })
        .eq("cuenta_id", cuentaProcesadaId)
        .eq("tipo", "familiar");
      if (errorBloqueo) {
        error = { message: `No se pudo guardar el bloqueo de Spotify: ${errorBloqueo.message}` };
      } else {
        advertenciasMeta.push("familia bloqueada por Spotify para miembros nuevos");
      }
    }
    if (
      !error &&
      ids?.cuenta_id &&
      cuentaMeta.renovarProveedor &&
      !cuentasConCicloSincronizado.has(ids.cuenta_id)
    ) {
      const errorCiclo = await sincronizarCicloProveedorImportado(
        supabase,
        ids.cuenta_id,
        cuentaMeta.inversion,
        cuentaMeta.renovarProveedor,
        inicio,
      );
      if (errorCiclo) {
        error = { message: `No se pudo guardar la renovación del proveedor: ${errorCiclo}` };
      } else {
        cuentasConCicloSincronizado.add(ids.cuenta_id);
      }
    }
    if (!error && ids?.cuenta_id) {
      cuentasExistentesPorHuella.set(huellaCuenta, ids.cuenta_id);
    }
    if (!error && ids?.cuenta_id) {
      if (!cuentasImportadasVistas.has(ids.cuenta_id)) {
        cuentasImportadasVistas.add(ids.cuenta_id);
        cuentasImportadasEnOrden.push(ids.cuenta_id);
      }
      const patchCuenta: { alias?: string; notas?: string; estado?: string; archived_at?: string } = {};
      if (cuentaMeta.aliasCuenta) patchCuenta.alias = cuentaMeta.aliasCuenta;
      if (cuentaMeta.notasCuenta) patchCuenta.notas = cuentaMeta.notasCuenta;
      if (cuentaMeta.estadoCuenta) {
        // Archivar se difiere hasta la última fila de la cuenta: las RPC buscan
        // cuentas no archivadas y, si se hiciera antes, duplicarían la madre.
        if (
          cuentaMeta.estadoCuenta !== "archivada" ||
          ultimaFilaPorCuenta.get(d.correo.toLowerCase()) === fila.numero
        ) {
          patchCuenta.estado = cuentaMeta.estadoCuenta;
          if (cuentaMeta.estadoCuenta === "archivada") patchCuenta.archived_at = new Date().toISOString();
        }
      }
      if (Object.keys(patchCuenta).length > 0) {
        const meta = await supabase.from("cuentas").update(patchCuenta).eq("id", ids.cuenta_id);
        if (meta.error) advertenciasMeta.push(`datos de cuenta: ${meta.error.message}`);
      }
    }
    if (!error && ids?.suscripcion_id) {
      const { data: suscripcion } = await supabase
        .from("suscripciones")
        .select("cliente_id")
        .eq("id", ids.suscripcion_id)
        .single();
      if (d.notaRenovacion) {
        const meta = await supabase
          .from("suscripciones")
          .update({ nota_renovacion: d.notaRenovacion })
          .eq("id", ids.suscripcion_id);
        if (meta.error) advertenciasMeta.push(`nota de renovación: ${meta.error.message}`);
      }
      if (d.notasCliente && suscripcion?.cliente_id) {
        const meta = await supabase
          .from("clientes")
          .update({ notas: d.notasCliente })
          .eq("id", suscripcion.cliente_id);
        if (meta.error) advertenciasMeta.push(`notas del cliente: ${meta.error.message}`);
      }
    }
    if (!error && ids?.cuenta_id && (
      cuentaMeta.tipoProveedor ||
      cuentaMeta.telefonoProveedor ||
      cuentaMeta.notasProveedor ||
      cuentaMeta.tarjetaProveedor
    )) {
      const { data: cuenta } = await supabase
        .from("cuentas")
        .select("proveedor_operativo_id")
        .eq("id", ids.cuenta_id)
        .single();
      if (cuenta?.proveedor_operativo_id) {
        const patchProveedor: {
          tipo?: string;
          telefono_original?: string;
          telefono_normalizado?: string | null;
          notas?: string;
        } = {};
        if (cuentaMeta.tipoProveedor) patchProveedor.tipo = cuentaMeta.tipoProveedor;
        if (cuentaMeta.telefonoProveedor) {
          patchProveedor.telefono_original = cuentaMeta.telefonoProveedor;
          patchProveedor.telefono_normalizado =
            cuentaMeta.telefonoProveedor.replace(/[^0-9+]/g, "") || null;
        }
        if (cuentaMeta.notasProveedor) patchProveedor.notas = cuentaMeta.notasProveedor;
        const meta = await supabase
          .from("proveedores")
          .update(patchProveedor)
          .eq("id", cuenta.proveedor_operativo_id);
        if (meta.error) advertenciasMeta.push(`datos del proveedor: ${meta.error.message}`);

        if (
          cuentaMeta.tarjetaProveedor &&
          !tarjetasProveedorGuardadas.has(cuenta.proveedor_operativo_id)
        ) {
          const tarjeta = await supabase.from("tarjetas_proveedor_cifradas").upsert({
            proveedor_id: cuenta.proveedor_operativo_id,
            datos_cifrados: cifrarSecreto(JSON.stringify(cuentaMeta.tarjetaProveedor)),
            updated_at: new Date().toISOString(),
          });
          if (tarjeta.error) {
            advertenciasMeta.push(`tarjeta cifrada: ${tarjeta.error.message}`);
          } else {
            tarjetasProveedorGuardadas.add(cuenta.proveedor_operativo_id);
          }
        }
      }
    }
    if (!error && d.cliente && d.monto === 0 && periodoId) {
      await supabase.rpc("marcar_periodo_cortesia", { p_periodo_id: periodoId });
    }

    const etiquetaVendedor = d.vendio ? ` · vendió ${d.vendio}` : "";
    const etiquetaCobro = montoVes
      ? ` · ${montoVes.toLocaleString("es-VE")} Bs`
      : d.monto === 0
        ? " · cortesía"
        : " · sin cobro";
    resultados.push({
      numero: fila.numero,
      ok: !error,
      mensaje: error
        ? error.message
        : d.cliente
          ? `${d.cliente} · vence ${vence}${etiquetaCobro}${etiquetaVendedor}${
              advertenciasMeta.length ? ` · aviso: ${advertenciasMeta.join("; ")}` : ""
            }`
          : `${esFamiliar ? `Miembro ${fila.slot}` : `Perfil ${fila.slot}`} cargado libre${
              esFamiliar && d.correoCliente ? " con correo y clave preparados" : ""
            }${
              advertenciasMeta.length ? ` · aviso: ${advertenciasMeta.join("; ")}` : ""
            }`,
    });
  }

  // `orden` se lee descendente en Inventario. Se asigna el valor mayor a la
  // primera cuenta pegada para conservar exactamente la secuencia del Excel.
  // Las filas repetidas de una misma cuenta madre solo ocupan una posición.
  let avisoOrden: string | null = null;
  if (cuentasImportadasEnOrden.length > 0) {
    const { data: primeraPorOrden, error: errorMaximo } = await supabase
      .from("cuentas")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorMaximo) {
      avisoOrden = `No se pudo preparar el orden: ${errorMaximo.message}`;
    } else {
      const planOrden = calcularOrdenCuentasImportadas(
        cuentasImportadasEnOrden,
        Number(primeraPorOrden?.orden ?? Date.now() / 1000),
      );
      for (const posicion of planOrden) {
        const { error: errorOrden } = await supabase
          .from("cuentas")
          .update({ orden: posicion.orden })
          .eq("id", posicion.id);
        if (errorOrden) {
          avisoOrden = `No se pudo conservar todo el orden: ${errorOrden.message}`;
          break;
        }
      }
    }
  }

  revalidatePath("/inventario");
  revalidatePath("/clientes");
  revalidatePath("/vencimientos");
  revalidatePath("/dashboard");
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
      (vendedores.size ? ` Revendedores: ${vendedores.size}.` : "") +
      (avisoOrden
        ? ` Aviso: ${avisoOrden}`
        : cuentasImportadasEnOrden.length
          ? " Orden del Excel conservado."
          : ""),
    filas: resultados,
  };
}
