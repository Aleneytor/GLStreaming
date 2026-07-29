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

  const estadoBadge = guardado
    ? guardado.estado === "cerrado"
      ? { texto: `Confirmado · v${guardado.version}`, clase: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" }
      : { texto: `Borrador · v${guardado.version}`, clase: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" }
    : { texto: "Cifras en vivo", clase: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" };

  return (
    <div className="space-y-5">
      {/* Cabecera: título + navegador de mes + estado */}
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Cierre del mes</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Resumen mensual</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Ventas, costo de proveedores, ganancia real y rendimiento del inventario.</p>
          </div>

          <div className="flex items-center gap-1 self-start rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950/60">
            <Link
              href={`/cierre?mes=${desplazarMes(mes, -1)}`}
              aria-label="Mes anterior"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 transition hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              ←
            </Link>
            <span className="min-w-28 px-2 text-center text-xs font-semibold capitalize text-neutral-900 dark:text-white">
              {NOMBRE_MES(mes)}
            </span>
            <Link
              href={`/cierre?mes=${desplazarMes(mes, 1)}`}
              aria-label="Mes siguiente"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 transition hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              →
            </Link>
          </div>
        </div>
      </header>

      {/* KPIs principales */}
      {fuente && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-l-4 border-neutral-200 border-l-emerald-500 bg-white p-4 shadow-xs dark:border-neutral-800 dark:border-l-emerald-500 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Ganancia final estimada</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {bs(num(fuente.resultado_operativo_ves))} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              ≈ ${num(fuente.resultado_operativo_economico_usd_paralela).toFixed(2)} USD a paralela
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Servicios vendidos</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
              ${num(fuente.ingreso_contractual_usd).toFixed(2)} <span className="text-xs font-medium text-neutral-400">USD</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {bs(num(fuente.ingreso_cobrado_devengado_ves))} Bs cobrados
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Inversión proveedores</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
              ${num(fuente.costo_proveedor_devengado_usdt).toFixed(2)} <span className="text-xs font-medium text-neutral-400">USDT</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {bs(num(fuente.costo_proveedor_devengado_ves))} Bs devengados
            </p>
          </div>

          <div className="rounded-2xl border border-l-4 border-neutral-200 border-l-red-500 bg-white p-4 shadow-xs dark:border-neutral-800 dark:border-l-red-500 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Perdido por ocio</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
              {bs(costoOciosoVes)} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              ≈ ${costoOciosoUsdt.toFixed(2)} USDT sin aprovechar
            </p>
          </div>
        </section>
      )}

      {/* Rendimiento del inventario */}
      {fuente && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Rendimiento del inventario</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Capacidad pagada al proveedor frente a lo realmente vendido.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500" />{pctOcupacion}% ocupado
              </span>
              <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400">
                <span className="size-2 rounded-full bg-red-500" />{pctPerdido}% perdido
              </span>
            </div>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div style={{ width: `${pctOcupacion}%` }} className="bg-emerald-500 transition-all duration-500" />
            <div style={{ width: `${pctPerdido}%` }} className="bg-red-500 transition-all duration-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Capacidad total</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">
                {capTotal.toFixed(0)} <span className="text-xs font-normal text-neutral-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">Contratados al proveedor</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Slots vendidos</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {capOcupada.toFixed(0)} <span className="text-xs font-normal text-neutral-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{capPagada.toFixed(0)} pagados</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Slots perdidos</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
                {capPerdida.toFixed(0)} <span className="text-xs font-normal text-neutral-400">slots-día</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">Permanecieron vacíos</p>
            </div>
            <div className="rounded-xl border border-l-4 border-neutral-200 border-l-red-500 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:border-l-red-500 dark:bg-neutral-950/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Costo ocioso</span>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
                {bs(costoOciosoVes)} <span className="text-xs font-normal text-neutral-400">Bs</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">≈ ${costoOciosoUsdt.toFixed(2)} USDT</p>
            </div>
          </div>

          <details className="text-xs text-neutral-500 dark:text-neutral-400">
            <summary className="cursor-pointer font-medium text-neutral-600 dark:text-neutral-300">¿Qué es el costo ocioso?</summary>
            <p className="mt-1.5">Es el dinero pagado a los proveedores por cuentas y perfiles que permanecieron fríos o sin vender durante el mes.</p>
          </details>
        </section>
      )}

      {/* Estado de la revisión + acciones */}
      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Estado de la revisión</h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Guardar un borrador y luego confirmar congela una versión oficial, sin mover dinero.
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estadoBadge.clase}`}>{estadoBadge.texto}</span>
        </div>

        {desfasado && guardado?.estado !== "cerrado" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>El borrador guardado ya no coincide con los datos actuales. Recalcúlalo antes de cerrar.</span>
          </div>
        )}

        <AccionesCierre mes={mes} estado={guardado?.estado ?? null} />
      </section>

      {/* Desglose financiero */}
      {fuente ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ingresos */}
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-white">Ingresos por servicios</h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-400">Ventas contratadas en el mes</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">${num(fuente.ingreso_contractual_usd).toFixed(2)} USD</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-400">Ingreso del mes (devengo)</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">${num(fuente.ingreso_comercial_devengado_usd).toFixed(2)} USD</dd>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                  <dt className="font-semibold text-neutral-900 dark:text-white">Ingreso cobrado del mes</dt>
                  <dd className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{bs(num(fuente.ingreso_cobrado_devengado_ves))} Bs</dd>
                </div>
              </dl>
            </div>

            {/* Costos y gastos */}
            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="border-b border-neutral-100 pb-3 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-white">Costos y gastos operativos</h3>
              <dl className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-400">Costo de proveedores del mes</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">${num(fuente.costo_proveedor_devengado_usdt).toFixed(2)} USDT</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-400">Costo de proveedores en Bs</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{bs(num(fuente.costo_proveedor_devengado_ves))} Bs</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-600 dark:text-neutral-400">Otros gastos del negocio</dt>
                  <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">${num(fuente.gastos_operativos_usdt).toFixed(2)} USDT</dd>
                </div>
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                  <dt className="text-neutral-600 dark:text-neutral-400">Devoluciones y correcciones</dt>
                  <dd className="font-semibold tabular-nums text-red-700 dark:text-red-400">{bs(num(fuente.ajustes_clientes_ves))} Bs</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Flujo de caja real */}
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Dinero entrado y salido de caja</h3>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">Movimientos reales</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                <span className="text-neutral-500 dark:text-neutral-400">Cobros a clientes</span>
                <p className="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-white">{bs(num(fuente.cobros_ves))} Bs</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                <span className="text-neutral-500 dark:text-neutral-400">Devoluciones</span>
                <p className="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-white">{bs(num(fuente.reembolsos_clientes_ves))} Bs</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                <span className="text-neutral-500 dark:text-neutral-400">Pagos a proveedores</span>
                <p className="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-white">${num(fuente.pagos_proveedor_usdt).toFixed(2)} USDT</p>
              </div>
              <div className="rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-800/80">
                <span className="text-neutral-600 dark:text-neutral-400">Flujo neto valorizado</span>
                <p className="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-white">{bs(num(fuente.flujo_caja_valorizado_ves))} Bs</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Sin datos para este mes.
        </div>
      )}
    </div>
  );
}
