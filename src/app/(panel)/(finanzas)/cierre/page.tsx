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

  const FILAS: [string, string][] = fuente
    ? [
        ["Ingreso contractual (ventas del mes)", `${num(fuente.ingreso_contractual_usd).toFixed(2)} USD`],
        ["Ingreso comercial devengado", `${num(fuente.ingreso_comercial_devengado_usd).toFixed(2)} USD`],
        ["Bs esperados devengados", `${bs(num(fuente.ves_esperados_devengados_clientes))} Bs`],
        ["Ingreso cobrado devengado", `${bs(num(fuente.ingreso_cobrado_devengado_ves))} Bs`],
        ["Costo del proveedor devengado", `${num(fuente.costo_proveedor_devengado_usdt).toFixed(2)} USDT`],
        ["Costo del proveedor devengado (Bs)", `${bs(num(fuente.costo_proveedor_devengado_ves))} Bs`],
        ["Margen bruto", `${bs(num(fuente.margen_bruto_ves))} Bs`],
        ["Gastos operativos", `${num(fuente.gastos_operativos_usdt).toFixed(2)} USDT`],
        ["Ajustes por devoluciones", `${bs(num(fuente.ajustes_clientes_ves))} Bs`],
        ["Resultado operativo", `${bs(num(fuente.resultado_operativo_ves))} Bs`],
        [
          "Resultado económico (a paralela)",
          `${num(fuente.resultado_operativo_economico_usd_paralela).toFixed(2)} USD`,
        ],
      ]
    : [];

  const CAJA: [string, string][] = fuente
    ? [
        ["Cobros de clientes", `${bs(num(fuente.cobros_ves))} Bs`],
        ["Devoluciones", `${bs(num(fuente.reembolsos_clientes_ves))} Bs`],
        ["Pagos a proveedores", `${num(fuente.pagos_proveedor_usdt).toFixed(2)} USDT`],
        ["Flujo neto valorizado", `${bs(num(fuente.flujo_caja_valorizado_ves))} Bs`],
      ]
    : [];

  const OCUPACION: [string, string][] = fuente
    ? [
        ["Días-unidad de capacidad", num(fuente.dias_unidad_capacidad).toFixed(0)],
        ["Días-unidad ocupados", num(fuente.dias_unidad_ocupados).toFixed(0)],
        ["Días-unidad con período pagado", num(fuente.dias_unidad_pagados).toFixed(0)],
        ["Días-unidad disponibles (ociosos)", num(fuente.dias_unidad_disponibles).toFixed(0)],
        ["Costo ocioso", `${bs(num(fuente.costo_ocioso_ves))} Bs`],
      ]
    : [];

  const Bloque = ({ titulo, filas }: { titulo: string; filas: [string, string][] }) => (
    <section className="space-y-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {titulo}
      </h2>
      <dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
        {filas.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 p-3">
            <dt className="text-neutral-600 dark:text-neutral-400">{k}</dt>
            <dd className="shrink-0 font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cierre mensual</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Cada período y cada ciclo se reparten por los días reales que caen
          dentro del mes. Nada se revaloriza con la tasa de hoy.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/cierre?mes=${desplazarMes(mes, -1)}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          ← Anterior
        </Link>
        <p className="text-sm font-medium capitalize">{NOMBRE_MES(mes)}</p>
        <Link
          href={`/cierre?mes=${desplazarMes(mes, 1)}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Siguiente →
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              guardado?.estado === "cerrado"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : guardado
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            }`}
          >
            {guardado ? `${guardado.estado} · v${guardado.version}` : "sin calcular"}
          </span>
          {esMesEnCurso && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Mes en curso: las cifras cambian durante el día.
            </span>
          )}
        </div>

        {desfasado && guardado?.estado !== "cerrado" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            El borrador guardado ya no coincide con los datos actuales. Recalcúlalo
            antes de cerrar.
          </p>
        )}

        <AccionesCierre mes={mes} estado={guardado?.estado ?? null} />
      </div>

      {fuente ? (
        <>
          {guardado?.estado === "cerrado" && (
            <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              Cifras oficiales del cierre (v{guardado.version}), congeladas el{" "}
              {guardado.cerrado_at?.slice(0, 10)}.
            </p>
          )}
          <Bloque titulo="Resultado" filas={FILAS} />
          <Bloque titulo="Caja del mes" filas={CAJA} />
          <Bloque titulo="Ocupación" filas={OCUPACION} />
          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
            El desglose de los días ocupados sin período pagado (cortesía, pausa,
            reserva, bloqueo, saneamiento) todavía no se calcula: por eso aparecen
            juntos dentro de «ocupados».
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Sin datos para este mes.
        </p>
      )}
    </div>
  );
}
