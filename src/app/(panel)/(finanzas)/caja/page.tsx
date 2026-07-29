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
    <div className="space-y-5">
      {/* Cabecera: título + navegador de día */}
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Caja del día</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Resumen diario</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Cobros recibidos, pagos a proveedores y flujo neto del día.</p>
          </div>

          <div className="flex items-center gap-1 self-start rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950/60">
            <Link
              href={`/caja?dia=${desplazar(dia, -1)}`}
              aria-label="Día anterior"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 transition hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              ←
            </Link>
            <span className="min-w-28 px-2 text-center text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
              {dia}
              {dia === hoy && <span className="ml-1 font-normal text-neutral-400">(hoy)</span>}
            </span>
            <Link
              href={`/caja?dia=${desplazar(dia, 1)}`}
              aria-label="Día siguiente"
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-500 transition hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              →
            </Link>
          </div>
        </div>
      </header>

      {/* 1. Caja del día */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Dinero movido en caja</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Lo efectivamente cobrado o pagado hoy (efectivo / banco).</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-l-4 border-neutral-200 border-l-emerald-500 bg-white p-5 shadow-xs dark:border-neutral-800 dark:border-l-emerald-500 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Recibiste (cobros)</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {bs(totalEntradas)} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{entradas.length} cobros registrados</p>
          </div>

          <div className="rounded-2xl border border-l-4 border-neutral-200 border-l-red-500 bg-white p-5 shadow-xs dark:border-neutral-800 dark:border-l-red-500 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Pagaste (salidas)</span>
            <p className="mt-2 text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
              {bs(totalSalidas)} <span className="text-xs font-medium">Bs</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{salidas.length} egresos/pagos</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Flujo neto del día</span>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${flujo < 0 ? "text-red-700 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}>
              {bs(flujo)} <span className="text-xs font-medium text-neutral-400">Bs</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Entradas menos salidas</p>
          </div>
        </div>
      </section>

      {/* 2. Actividad Comercial */}
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Actividad comercial del día</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Ventas y renovaciones registradas hoy en el sistema.</p>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            Hecho comercial
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Nuevas ventas</span>
            <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{ventas?.ventas_nuevas ?? 0}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Renovaciones</span>
            <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{ventas?.renovaciones ?? 0}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Precio total (USD)</span>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">${num(ventas?.ventas_usd).toFixed(2)}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-950/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Esperado en Bs</span>
            <p className="mt-1 text-lg font-bold tabular-nums text-neutral-900 dark:text-white">{bs(num(ventas?.ventas_esperadas_ves))}</p>
          </div>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Cuenta lo vendido o renovado hoy; puede no coincidir con el dinero cobrado si el pago quedó pendiente.
        </p>
      </section>

      {/* 3. Resultado devengado del día */}
      {r && (
        <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Ganancia generada hoy (devengo)</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Ingresos y costos que corresponden exactamente al día de hoy.</p>
          </div>

          <dl className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
            {[
              ["Ingreso cobrado devengado", `${bs(num(r.ingreso_cobrado_devengado_ves))} Bs`],
              ["Costo del proveedor devengado", `${bs(num(r.costo_proveedor_devengado_ves))} Bs`],
              ["Margen bruto del día", `${bs(num(r.margen_bruto_ves))} Bs`],
              ["Gastos operativos", `${bs(num(r.gastos_operativos_ves))} Bs`],
              ["Resultado operativo", `${bs(num(r.resultado_operativo_ves))} Bs`],
              [
                "Resultado económico (a paralela)",
                `${num(r.resultado_operativo_economico_usd_paralela).toFixed(2)} USD`,
              ],
              ["Costo ocioso del día", `${bs(num(r.costo_ocioso_ves))} Bs`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-neutral-600 dark:text-neutral-400">{k}</dt>
                <dd className="font-semibold tabular-nums text-neutral-900 dark:text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 4. Detalle de movimientos de caja */}
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Movimientos de caja ({movimientos?.length ?? 0})</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Detalle de dinero entrante y saliente.</p>
        </div>

        {(movimientos?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Sin movimientos registrados este día.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {movimientos?.map((m) => {
              const monto = Number(m.monto_ves);
              return (
                <li
                  key={`${m.tipo}-${m.movimiento_id}`}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate">{m.concepto}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">{ETIQUETA[m.tipo ?? ""] ?? m.tipo}</span>
                      {m.plataforma_nombre ? ` · ${m.plataforma_nombre}` : ""}
                      {m.referencia ? ` · Ref: ${m.referencia}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p
                      className={`text-sm font-bold ${
                        monto < 0
                          ? "text-red-700 dark:text-red-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {monto > 0 ? "+" : ""}
                      {bs(monto)} Bs
                    </p>
                    {m.monto_usdt != null && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        ${Number(m.monto_usdt).toFixed(2)} USDT
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
