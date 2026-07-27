import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BotonDeshacerCobro } from "@/features/finanzas/boton-deshacer-cobro";

export const dynamic = "force-dynamic";

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ETIQUETA: Record<string, string> = {
  cobro_cliente: "Cobro",
  reverso_cliente: "Devolución",
  pago_proveedor: "Pago a proveedor",
  gasto_operativo: "Gasto",
};

function desplazar(dia: string, dias: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { dia: diaParam } = await searchParams;
  const hoy = hoyCaracas();
  // El día vive en la URL: se puede compartir el enlace de un día concreto.
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(diaParam ?? "") ? diaParam! : hoy;

  const supabase = await createClient();

  const [{ data: movimientos }, { data: ventas }, { data: resumen }] = await Promise.all([
    supabase
      .from("v_movimientos_caja")
      .select("*")
      .eq("fecha", dia)
      .order("tipo"),
    supabase.from("v_ventas_diarias").select("*").eq("fecha", dia).maybeSingle(),
    // El mismo motor que usa el cierre mensual, aplicado a un solo día.
    supabase.rpc("resumen_financiero", { p_inicio: dia, p_fin: desplazar(dia, 1) }),
  ]);

  const r = Array.isArray(resumen) ? resumen[0] : null;
  const entradas = (movimientos ?? []).filter((m) => Number(m.monto_ves) > 0);
  const salidas = (movimientos ?? []).filter((m) => Number(m.monto_ves) < 0);
  const totalEntradas = entradas.reduce((a, m) => a + Number(m.monto_ves), 0);
  const totalSalidas = salidas.reduce((a, m) => a - Number(m.monto_ves), 0);
  const flujo = totalEntradas - totalSalidas;

  const num = (v: unknown) => Number(v ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm sm:p-6 dark:border-emerald-950 dark:from-emerald-950/30 dark:via-neutral-950 dark:to-teal-950/20">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-xl text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">▣</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Resumen diario</h1>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Lo que realmente entró y salió de tu negocio durante el día.</p>
          </div>
        </div>
      </header>

      {/* Navegación por día */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/caja?dia=${desplazar(dia, -1)}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          ← Anterior
        </Link>
        <p className="text-sm font-medium tabular-nums">
          {dia}
          {dia === hoy && (
            <span className="ml-2 text-xs font-normal text-neutral-500">(hoy, en vivo)</span>
          )}
        </p>
        <Link
          href={`/caja?dia=${desplazar(dia, 1)}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Siguiente →
        </Link>
      </div>

      {/* 1. Caja del día */}
      <section>
        <div className="mb-3">
          <h2 className="font-semibold">Dinero movido</h2>
          <p className="text-xs text-neutral-500">Cuenta solo pagos registrados, no promesas ni servicios pendientes.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Recibiste</p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {bs(totalEntradas)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">Pagaste</p>
          <p className="text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            {bs(totalSalidas)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Diferencia del día</p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              flujo < 0 ? "text-red-600 dark:text-red-400" : ""
            }`}
          >
            {bs(flujo)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
        </div>
      </section>

      {/* 2. Ventas del día (hecho comercial, no caja) */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Actividad comercial
        </h2>
        <div className="flex flex-wrap gap-5 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Nuevas</p>
            <p className="text-lg font-semibold tabular-nums">{ventas?.ventas_nuevas ?? 0}</p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Renovaciones</p>
            <p className="text-lg font-semibold tabular-nums">{ventas?.renovaciones ?? 0}</p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Precio USD</p>
            <p className="text-lg font-semibold tabular-nums">
              {num(ventas?.ventas_usd).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 dark:text-neutral-400">Esperado Bs</p>
            <p className="text-lg font-semibold tabular-nums">
              {bs(num(ventas?.ventas_esperadas_ves))}
            </p>
          </div>
        </div>
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
          Esta sección cuenta servicios vendidos o renovados hoy. Puede no coincidir con “Recibiste” si un pago quedó pendiente o si hoy cobraste algo de otro día.
        </p>
      </section>

      {/* 3. Resultado devengado del día */}
      {r && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Ganancia generada por los servicios hoy
          </h2>
          <p className="text-xs text-neutral-500">Distribuye ingresos y costos según los días de servicio que corresponden a hoy; no significa efectivo recibido hoy.</p>
          <dl className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white text-sm dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
            {[
              ["Ingreso cobrado devengado", `${bs(num(r.ingreso_cobrado_devengado_ves))} Bs`],
              ["Costo del proveedor devengado", `${bs(num(r.costo_proveedor_devengado_ves))} Bs`],
              ["Margen bruto", `${bs(num(r.margen_bruto_ves))} Bs`],
              ["Gastos operativos", `${bs(num(r.gastos_operativos_ves))} Bs`],
              ["Resultado operativo", `${bs(num(r.resultado_operativo_ves))} Bs`],
              [
                "Resultado económico (a paralela)",
                `${num(r.resultado_operativo_economico_usd_paralela).toFixed(2)} USD`,
              ],
              ["Costo ocioso", `${bs(num(r.costo_ocioso_ves))} Bs`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 p-3">
                <dt className="text-neutral-600 dark:text-neutral-400">{k}</dt>
                <dd className="shrink-0 font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 4. Detalle de movimientos */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Detalle del dinero ({movimientos?.length ?? 0})
        </h2>
        {(movimientos?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Sin movimientos este día.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {movimientos?.map((m) => {
              const monto = Number(m.monto_ves);
              return (
                <li
                  key={`${m.tipo}-${m.movimiento_id}`}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">{m.concepto}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {ETIQUETA[m.tipo ?? ""] ?? m.tipo}
                      {m.plataforma_nombre ? ` · ${m.plataforma_nombre}` : ""}
                      {m.referencia ? ` · ${m.referencia}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p
                      className={
                        monto < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {monto > 0 ? "+" : ""}
                      {bs(monto)} Bs
                    </p>
                    {m.monto_usdt != null && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {Number(m.monto_usdt).toFixed(2)} USDT
                      </p>
                    )}
                    {m.tipo === "cobro_cliente" && m.movimiento_id && (
                      <div className="mt-1">
                        <BotonDeshacerCobro
                          pagoId={m.movimiento_id}
                          volverA={`/caja?dia=${dia}`}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
