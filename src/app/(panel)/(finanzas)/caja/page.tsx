import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Caja</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Día de negocio en Caracas. El dinero que entró y salió hoy es una cosa;
          lo vendido y lo devengado son otras dos.
        </p>
      </div>

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
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Entró</p>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {bs(totalEntradas)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Salió</p>
          <p className="text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            {bs(totalSalidas)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Flujo neto</p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              flujo < 0 ? "text-red-600 dark:text-red-400" : ""
            }`}
          >
            {bs(flujo)}
          </p>
          <p className="text-xs text-neutral-500">Bs</p>
        </div>
      </section>

      {/* 2. Ventas del día (hecho comercial, no caja) */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Ventas del día
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Vender no es cobrar: una venta de hoy puede cobrarse mañana y su
          ingreso se devenga durante los días de servicio.
        </p>
      </section>

      {/* 3. Resultado devengado del día */}
      {r && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Resultado del día (devengado)
          </h2>
          <dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
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
          Movimientos ({movimientos?.length ?? 0})
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
