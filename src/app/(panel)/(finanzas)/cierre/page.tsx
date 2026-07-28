import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccionesCierre } from "@/features/finanzas/acciones-cierre";

export const dynamic = "force-dynamic";

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function mesActualCaracas(): string {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${hoy.slice(0, 7)}-01`;
}

function desplazarMes(mes: string, n: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

const NOMBRE_MES = (mes: string) =>
  new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${mes}T00:00:00Z`),
  );

export default async function CierrePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesActualCaracas();
  const finMes = desplazarMes(mes, 1);
  const esMesEnCurso = mes === mesActualCaracas();

  const supabase = await createClient();

  const [{ data: cierre }, { data: vivo }] = await Promise.all([
    supabase
      .from("cierres_mensuales")
      .select("*")
      .eq("mes", mes)
      .neq("estado", "reemplazado")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Cifras en vivo: lo que daría el cierre si se calculara ahora mismo.
    supabase.rpc("resumen_financiero", { p_inicio: mes, p_fin: finMes }),
  ]);

  const r = Array.isArray(vivo) ? vivo[0] : null;
  const num = (v: unknown) => Number(v ?? 0);

  // Guardado vs. en vivo: si difieren, el borrador está desactualizado.
  const guardado = cierre;
  const desfasado =
    guardado != null &&
    r != null &&
    Math.abs(num(guardado.resultado_operativo_ves) - num(r.resultado_operativo_ves)) > 0.005;

  const fuente = guardado?.estado === "cerrado" ? guardado : (r ?? guardado);

  const capTotal = num(fuente?.dias_unidad_capacidad);
  const capOcupada = num(fuente?.dias_unidad_ocupados);
  const capPagada = num(fuente?.dias_unidad_pagados);
  const capPerdida = num(fuente?.dias_unidad_disponibles);
  const costoOciosoVes = num(fuente?.costo_ocioso_ves);
  const costoProvVes = num(fuente?.costo_proveedor_devengado_ves);
  const costoProvUsdt = num(fuente?.costo_proveedor_devengado_usdt);

  const pctOcupacion = capTotal > 0 ? Math.min(100, Math.round((capOcupada / capTotal) * 100)) : 0;
  const pctPerdido = capTotal > 0 ? Math.min(100, Math.round((capPerdida / capTotal) * 100)) : 0;
  const costoOciosoUsdt = costoProvVes > 0 ? (costoOciosoVes * costoProvUsdt) / costoProvVes : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header Banner */}
      <header className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Resumen Mensual
              </h1>
              <p className="mt-1 max-w-xl text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Control de ventas, costo de proveedores, ganancia real y rendimiento de inventario.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 self-start dark:border-slate-800 dark:bg-slate-950/60 sm:self-auto">
            <Link
              href={`/cierre?mes=${desplazarMes(mes, -1)}`}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              ← Ant.
            </Link>
            <span className="px-3 text-xs font-bold capitalize text-blue-700 dark:text-blue-400">
              {NOMBRE_MES(mes)}
            </span>
            <Link
              href={`/cierre?mes=${desplazarMes(mes, 1)}`}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Sig. →
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <strong className="block text-slate-900 dark:text-slate-100">1. Cifras en vivo</strong>
            <span className="text-slate-500 dark:text-slate-400">Se actualizan al registrar ventas, cobros o pagos.</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <strong className="block text-slate-900 dark:text-slate-100">2. Guardar borrador</strong>
            <span className="text-slate-500 dark:text-slate-400">Guarda un reporte preliminar de revisión.</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
            <strong className="block text-slate-900 dark:text-slate-100">3. Confirmar mes</strong>
            <span className="text-slate-500 dark:text-slate-400">Congela la versión oficial al cerrar el mes.</span>
          </div>
        </div>
      </header>

      {/* Tarjetas KPI Principales */}
      {fuente && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-l-4 border-slate-200/80 border-l-emerald-500 bg-white p-5 shadow-xs dark:border-slate-800 dark:border-l-emerald-500 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ganancia Final Estimada</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Operativa</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {bs(num(fuente.resultado_operativo_ves))} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              ≈ ${num(fuente.resultado_operativo_economico_usd_paralela).toFixed(2)} USD (tasa paralela)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Servicios Vendidos</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              ${num(fuente.ingreso_contractual_usd).toFixed(2)} <span className="text-xs font-medium text-slate-400">USD</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {bs(num(fuente.ingreso_cobrado_devengado_ves))} Bs cobrados del mes
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inversión Proveedores</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              ${num(fuente.costo_proveedor_devengado_usdt).toFixed(2)} <span className="text-xs font-medium text-slate-400">USDT</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {bs(num(fuente.costo_proveedor_devengado_ves))} Bs devengados
            </p>
          </div>

          <div className="rounded-2xl border border-l-4 border-slate-200/80 border-l-red-500 bg-white p-5 shadow-xs dark:border-slate-800 dark:border-l-red-500 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dinero Perdido por Ocio</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inventario vacío</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
              {bs(costoOciosoVes)} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              ≈ ${costoOciosoUsdt.toFixed(2)} USDT desaprovechados
            </p>
          </div>
        </section>
      )}

      {/* MÓDULO DESTACADO: DÍAS PERDIDOS Y RENDIMIENTO DE INVENTARIO */}
      {fuente && (
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Rendimiento de Inventario & Slots Perdidos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Análisis de capacidad pagada a proveedores vs. perfiles vendidos</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {pctOcupacion}% Ocupado
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {pctPerdido}% Perdido
              </span>
            </div>
          </div>

          {/* Barra Visual de Ocupación */}
          <div className="space-y-1.5">
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                style={{ width: `${pctOcupacion}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Vendidos: ${pctOcupacion}%`}
              />
              <div
                style={{ width: `${pctPerdido}%` }}
                className="bg-red-500 transition-all duration-500"
                title={`Perdidos: ${pctPerdido}%`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span>0%</span>
              <span>50% capacidad</span>
              <span>100% capacidad</span>
            </div>
          </div>

          {/* Tarjetas de Métricas de Ocupación */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Capacidad Total</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                {capTotal.toFixed(0)} <span className="text-xs font-normal text-slate-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Contratados al proveedor</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slots Vendidos</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {capOcupada.toFixed(0)} <span className="text-xs font-normal text-slate-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Generando ingresos ({capPagada.toFixed(0)} pagados)</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slots-Día Perdidos</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
                {capPerdida.toFixed(0)} <span className="text-xs font-normal text-slate-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Permanecieron vacíos</p>
            </div>

            <div className="rounded-xl border border-l-4 border-slate-100 border-l-red-500 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:border-l-red-500 dark:bg-slate-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Costo Ocioso Perdido</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
                {bs(costoOciosoVes)} <span className="text-xs font-normal text-slate-400">Bs</span>
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                ≈ ${costoOciosoUsdt.toFixed(2)} USDT desperdiciados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>¿Qué significa el Costo Ocioso?</strong> Es el dinero pagado a los proveedores por cuentas y perfiles que permanecieron fríos o sin vender durante los días del mes.
            </span>
          </div>
        </section>
      )}

      {/* ESTADO DEL RESUMEN Y ACCIONES */}
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Estado de la Revisión Mensual</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Confirmar el mes congela una versión oficial para auditoría sin mover dinero ni alterar ventas.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              guardado?.estado === "cerrado"
                ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : guardado
                  ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {guardado ? `${guardado.estado === "cerrado" ? "Confirmado" : "Borrador"} (v${guardado.version})` : "Cifras en vivo"}
          </span>
        </div>

        {desfasado && guardado?.estado !== "cerrado" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <svg className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>El borrador guardado ya no coincide con los datos actuales. Recalcúlalo antes de cerrar.</span>
          </div>
        )}

        <AccionesCierre mes={mes} estado={guardado?.estado ?? null} />
      </div>

      {/* DESGLOSE FINANCIERO ESTRUCTURADO EN TARJETAS */}
      {fuente ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Bloque 1: Ingresos */}
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ingresos por Servicios</h3>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Ventas contratadas en el mes</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">${num(fuente.ingreso_contractual_usd).toFixed(2)} USD</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Ingreso correspondiente al mes (Devengo)</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">${num(fuente.ingreso_comercial_devengado_usd).toFixed(2)} USD</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                  <dt className="font-semibold text-slate-900 dark:text-white">Ingreso cobrado del mes</dt>
                  <dd className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{bs(num(fuente.ingreso_cobrado_devengado_ves))} Bs</dd>
                </div>
              </dl>
            </div>

            {/* Bloque 2: Costos y Gastos */}
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Costos & Gastos Operativos</h3>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Costo de proveedores del mes</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">${num(fuente.costo_proveedor_devengado_usdt).toFixed(2)} USDT</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Costo de proveedores en Bs</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{bs(num(fuente.costo_proveedor_devengado_ves))} Bs</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Otros gastos del negocio</dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">${num(fuente.gastos_operativos_usdt).toFixed(2)} USDT</dd>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                  <dt className="text-slate-600 dark:text-slate-400">Devoluciones y correcciones</dt>
                  <dd className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">{bs(num(fuente.ajustes_clientes_ves))} Bs</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Flujo de Caja Real */}
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dinero Entrado y Salido de Caja (Efectivo / Banco)</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Movimientos Reales
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-950/40">
                <span className="text-slate-500 dark:text-slate-400">Cobros a Clientes</span>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 dark:text-white">{bs(num(fuente.cobros_ves))} Bs</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-950/40">
                <span className="text-slate-500 dark:text-slate-400">Devoluciones</span>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 dark:text-white">{bs(num(fuente.reembolsos_clientes_ves))} Bs</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800/80 dark:bg-slate-950/40">
                <span className="text-slate-500 dark:text-slate-400">Pagos a Proveedores</span>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 dark:text-white">${num(fuente.pagos_proveedor_usdt).toFixed(2)} USDT</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400">Flujo Neto Valorizado</span>
                <p className="mt-1 text-base font-bold tabular-nums text-slate-900 dark:text-white">{bs(num(fuente.flujo_caja_valorizado_ves))} Bs</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Sin datos para este mes.
        </div>
      )}
    </div>
  );
}
