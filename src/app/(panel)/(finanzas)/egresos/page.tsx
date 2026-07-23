import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uno } from "@/lib/supabase/util";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";
import { FormGasto } from "@/features/finanzas/form-gasto";
import { FormRenovacionProveedor } from "@/features/finanzas/form-renovacion-proveedor";

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

export default async function EgresosPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const hoy = hoyCaracas();
  const supabase = await createClient();

  const [{ data: ciclos }, { data: categorias }, { data: gastos }, { paralela }] =
    await Promise.all([
      supabase
        .from("v_ciclos_proveedor_estado")
        .select("*")
        .order("proxima_renovacion", { ascending: true }),
      supabase.from("categorias_gasto").select("nombre").eq("activa", true).order("nombre"),
      supabase
        .from("gastos_operativos")
        .select("id, fecha_gasto, monto_usdt, monto_ves_snapshot, descripcion, tipo, categorias_gasto ( nombre )")
        .eq("estado", "confirmado")
        .order("fecha_gasto", { ascending: false })
        .limit(15),
      obtenerTasasVigentes(),
    ]);

  const frescura = paralela ? evaluarFrescura(confirmadaAt(paralela)) : null;
  const paralelaUsable = paralela && frescura?.nivel !== "inservible" ? paralela : null;
  const simulada = paralela?.fuente === "simulada";

  // Un ciclo con costo cero no espera pago: no debe ensuciar la lista de deuda.
  const porPagar = (ciclos ?? []).filter((c) => !c.pagado && !c.sin_desembolso);
  const alDia = (ciclos ?? []).filter((c) => c.pagado || c.sin_desembolso);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Egresos</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Pagos a proveedores y gastos del negocio. Todo nace en USDT y se
          valoriza con la tasa paralela del momento.
        </p>
      </div>

      {!paralelaUsable && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No hay tasa paralela confirmada.{" "}
          <Link href="/tasas" className="underline">
            Actualízala
          </Link>{" "}
          antes de registrar un egreso.
        </p>
      )}
      {paralelaUsable && simulada && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          La paralela vigente es un valor <strong>simulado</strong>. Lo que
          registres quedará congelado con esa tasa.
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Pagos a proveedores ({porPagar.length} por pagar)
        </h2>

        {(ciclos?.length ?? 0) === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Todavía no hay ciclos de proveedor registrados. Se crean al dar de
            alta una cuenta con costo.
          </p>
        ) : (
          [...porPagar, ...alDia].map((c) => {
            const dias = c.dias_para_renovar ?? 0;
            return (
              <details
                key={c.ciclo_id}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <summary className="cursor-pointer list-none p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {c.plataforma_nombre} · {c.cuenta_alias ?? c.producto_nombre}
                      </span>
                      <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                        {c.proveedor_nombre_snapshot} · renueva {c.proxima_renovacion}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums">
                        {Number(c.costo_usdt ?? 0).toFixed(2)} USDT
                      </span>
                      <span
                        className={`mt-1 block rounded-full px-2 py-0.5 text-xs ${
                          c.sin_desembolso
                            ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            : c.pagado
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : dias < 0
                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {c.sin_desembolso
                          ? "sin costo"
                          : c.pagado
                            ? "pagado"
                            : dias < 0
                              ? `vencido hace ${-dias} d`
                              : `faltan ${dias} d`}
                      </span>
                    </span>
                  </span>
                </summary>
                <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
                  <FormRenovacionProveedor
                    cuentaId={c.cuenta_id!}
                    costoSugerido={c.costo_usdt == null ? null : Number(c.costo_usdt)}
                    diaAncla={c.dia_ancla_proveedor}
                    inicioSugerido={c.proxima_renovacion ?? hoy}
                  />
                </div>
              </details>
            );
          })
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Gastos operativos
        </h2>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <FormGasto
            categorias={(categorias ?? []).map((c) => c.nombre)}
            hoy={hoy}
            paralela={paralelaUsable?.bs_por_usd ?? null}
          />
        </div>

        {(gastos?.length ?? 0) > 0 && (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {gastos?.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    {uno(g.categorias_gasto)?.nombre?.replace(/_/g, " ")}
                    {g.descripcion ? ` · ${g.descripcion}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {g.fecha_gasto}
                    {g.tipo === "reverso" ? " · reverso" : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p>{Number(g.monto_usdt).toFixed(2)} USDT</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {bs(Number(g.monto_ves_snapshot ?? 0))} Bs
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
