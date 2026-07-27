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
    // Si la operación traía un precio en USD, se ofrece su equivalente como
    // SUGERENCIA. El monto real lo escribe el usuario: en este negocio los
    // bolívares recibidos varían de un cliente a otro.
    const precio = p.precio_comercial_usd == null ? null : Number(p.precio_comercial_usd);
    const sugerencia =
      precio != null && bcvUsable ? calcularMontoVesEsperado(precio, bcvUsable.bs_por_usd) : null;
    const bloqueado = !bcvUsable ? "Actualiza la tasa BCV antes de cobrar." : null;
    return { ...p, precio, sugerencia, bloqueado };
  });

  const totalUsd = filas.reduce((a, f) => a + (f.precio ?? 0), 0);
  const totalVes = filas.reduce((a, f) => a + (f.sugerencia ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm sm:p-6 dark:border-amber-950 dark:from-amber-950/30 dark:via-neutral-950 dark:to-orange-950/20">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-xl text-amber-700 dark:bg-amber-950 dark:text-amber-300">↓</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pagos pendientes</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Aquí solo aparecen servicios que ya entregaste o renovaste, pero cuyo dinero todavía no registraste en la app.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/80 p-3 text-xs leading-5 text-neutral-600 ring-1 ring-amber-100 dark:bg-neutral-950/60 dark:text-neutral-300 dark:ring-amber-950">
          <strong className="text-neutral-900 dark:text-white">En palabras simples:</strong> si alguien ya pagó, registra aquí cuánto recibiste. Si todavía no pagó, déjalo pendiente. Al registrar el cobro desaparecerá de esta lista y aparecerá en el resumen diario.
        </div>
      </header>

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
        <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
          <span className="text-3xl" aria-hidden>✓</span>
          <p className="mt-2 font-medium text-emerald-800 dark:text-emerald-300">Todos los pagos están registrados</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">No hay ventas ni renovaciones esperando un cobro.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Servicios esperando pago</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{filas.length}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Valor comercial</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">${totalUsd.toFixed(2)}</p>
            </div>
            {bcvUsable && (
              <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-1 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs text-amber-700 dark:text-amber-300">Referencia aproximada</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{bs(totalVes)} <span className="text-sm font-normal">Bs</span></p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filas.map((f) => (
              <div
                key={f.periodo_id}
                className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
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
                    {f.sugerencia != null && (
                      <p className="text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                        ~{bs(f.sugerencia)} Bs
                      </p>
                    )}
                  </div>
                </div>

                <BotonCobrar
                  periodoId={f.periodo_id!}
                  sugerencia={f.sugerencia}
                  bcv={bcvUsable?.bs_por_usd ?? null}
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
