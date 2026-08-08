import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";
import { calcularMontoVesEsperado } from "@/domain/dinero";
import { BotonCobrar } from "@/features/finanzas/boton-cobrar";
import { EstadoVacio } from "@/components/estado-vacio";

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
    <div className="space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Cuentas por cobrar</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Por cobrar</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Servicios que ya entregaste o renovaste, cuyo dinero todavía no registraste en la app.
        </p>
        <details className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          <summary className="cursor-pointer font-medium text-neutral-600 dark:text-neutral-300">¿Cómo funciona?</summary>
          <p className="mt-1.5">Si el cliente ya pagó, registra aquí cuánto recibiste; si no, déjalo pendiente. Al registrar el cobro desaparece de esta lista y pasa al resumen diario.</p>
        </details>
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
        <EstadoVacio
          variante="ok"
          titulo="Todos los pagos están registrados"
          sugerencia="No hay ventas ni renovaciones esperando un cobro."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-l-4 border-neutral-200 border-l-amber-500 bg-white p-4 dark:border-neutral-800 dark:border-l-amber-500 dark:bg-neutral-900">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Servicios esperando pago</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{filas.length}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Valor comercial</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">${totalUsd.toFixed(2)}</p>
            </div>
            {bcvUsable && (
              <div className="col-span-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:col-span-1 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Referencia aproximada</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">{bs(totalVes)} <span className="text-sm font-normal text-neutral-400">Bs</span></p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filas.map((f) => (
              <div
                key={f.periodo_id}
                className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
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
