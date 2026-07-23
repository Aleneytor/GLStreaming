import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";
import { calcularMontoVesEsperado } from "@/domain/dinero";
import { BotonCobrar } from "@/features/finanzas/boton-cobrar";

export const dynamic = "force-dynamic";

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function CobrosPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: pendientes }, { bcv }] = await Promise.all([
    supabase
      .from("v_periodos_por_cobrar")
      .select("*")
      .order("fecha_venta", { ascending: false, nullsFirst: false }),
    obtenerTasasVigentes(),
  ]);

  // Misma regla que la base de datos (`tasa_utilizable`): una tasa sin
  // confirmar en 24 h no puede congelarse en una operación.
  const frescura = bcv ? evaluarFrescura(confirmadaAt(bcv)) : null;
  const bcvUsable = bcv && frescura?.nivel !== "inservible" ? bcv : null;

  const filas = (pendientes ?? []).map((p) => {
    const precio = p.precio_comercial_usd == null ? null : Number(p.precio_comercial_usd);
    const monto =
      precio != null && bcvUsable ? calcularMontoVesEsperado(precio, bcvUsable.bs_por_usd) : null;
    const bloqueado =
      precio == null
        ? "Esta venta no tiene precio en USD. Edítala antes de cobrar."
        : !bcvUsable
          ? "Actualiza la tasa BCV antes de cobrar."
          : null;
    return { ...p, precio, monto, bloqueado };
  });

  const totalUsd = filas.reduce((a, f) => a + (f.precio ?? 0), 0);
  const totalVes = filas.reduce((a, f) => a + (f.monto ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Por cobrar</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Ventas y renovaciones sin cobro registrado. El monto en Bs se calcula con
          la BCV del momento y queda congelado al confirmar.
        </p>
      </div>

      {!bcvUsable && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          {bcv
            ? `La tasa BCV lleva sin confirmarse ${frescura?.etiqueta?.toLowerCase()}. `
            : "Todavía no hay tasa BCV registrada. "}
          <Link href="/tasas" className="underline">
            Actualízala
          </Link>{" "}
          para poder cobrar.
        </p>
      )}

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No queda nada por cobrar. 🎉
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Pendientes</p>
              <p className="text-lg font-semibold tabular-nums">{filas.length}</p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400">Precio USD</p>
              <p className="text-lg font-semibold tabular-nums">{totalUsd.toFixed(2)}</p>
            </div>
            {bcvUsable && (
              <div>
                <p className="text-neutral-500 dark:text-neutral-400">Esperado en Bs</p>
                <p className="text-lg font-semibold tabular-nums">{bs(totalVes)}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filas.map((f) => (
              <div
                key={f.periodo_id}
                className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.cliente_nombre}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {f.plataforma_nombre} · {f.producto_nombre}
                      {f.vendedor_nombre ? ` · vendió ${f.vendedor_nombre}` : ""}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {f.tipo_operacion === "renovacion" ||
                      f.tipo_operacion === "renovacion_tardia"
                        ? "Renovación"
                        : f.tipo_operacion === "carga_inicial"
                          ? "Carga inicial"
                          : "Venta nueva"}{" "}
                      · {f.inicio} → {f.fecha_renovacion}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">
                      {f.precio != null ? `$${f.precio.toFixed(2)}` : "—"}
                    </p>
                    {f.monto != null && (
                      <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                        {bs(f.monto)} Bs
                      </p>
                    )}
                  </div>
                </div>

                <BotonCobrar
                  periodoId={f.periodo_id!}
                  montoVes={f.monto}
                  bloqueado={f.bloqueado}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
