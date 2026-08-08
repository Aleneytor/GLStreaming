import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { obtenerTasasVigentes } from "@/features/tasas/actions";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";
import { hoyCaracas } from "@/domain/fechas";
import { FormGastoPersonal } from "@/features/personal/form-gasto-personal";
import { ItemGastoPersonal } from "@/features/personal/item-gasto-personal";

export const dynamic = "force-dynamic";

function finMes(fecha: string) {
  const [y, m] = fecha.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${fecha.slice(0, 5)}${String(m).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}

const bs = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { mes } = await searchParams;
  const hoy = hoyCaracas();
  const mesActual = /^\d{4}-\d{2}$/.test(mes ?? "") ? (mes as string) : hoy.slice(0, 7);
  const desde = `${mesActual}-01`;
  const hasta = finMes(desde);

  const supabase = await createClient();
  const [{ data: gastos, error }, { bcv, paralela }] = await Promise.all([
    supabase
      .from("gastos_personales")
      .select(
        "id, fecha_gasto, concepto, descripcion, nota, moneda_original, monto_original, monto_usd, monto_ves, tasa_tipo, tasa_bs_por_usd_snapshot, created_at",
      )
      .is("archived_at", null)
      .gte("fecha_gasto", desde)
      .lte("fecha_gasto", hasta)
      .order("fecha_gasto", { ascending: false })
      .order("created_at", { ascending: false }),
    obtenerTasasVigentes(),
  ]);
  if (error) throw new Error(`No se pudo cargar los gastos personales: ${error.message}`);

  const frescuraBcv = bcv ? evaluarFrescura(confirmadaAt(bcv)) : null;
  const frescuraParalela = paralela ? evaluarFrescura(confirmadaAt(paralela)) : null;
  const bcvUsable = bcv && frescuraBcv?.nivel !== "inservible" ? bcv : null;
  const paralelaUsable = paralela && frescuraParalela?.nivel !== "inservible" ? paralela : null;

  const filas = gastos ?? [];
  const totalUsd = filas.reduce((acc, fila) => acc + Number(fila.monto_usd ?? 0), 0);
  const totalBs = filas.reduce((acc, fila) => acc + Number(fila.monto_ves ?? 0), 0);

  const mesAnterior = (() => {
    const [y, m] = mesActual.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();
  const mesSiguiente = (() => {
    const [y, m] = mesActual.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          Uso personal del administrador
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
          Gastos personales
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Apartado privado para anotar gastos tuyos usando BCV o paralela. No entra en
          finanzas del negocio, no suma ni resta caja y no afecta cierres.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Mes</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">{mesActual}</p>
          <p className="mt-2 flex gap-2 text-xs">
            <a href={`/personal?mes=${mesAnterior}`} className="rounded-lg border px-2 py-1">← anterior</a>
            <a href={`/personal?mes=${mesSiguiente}`} className="rounded-lg border px-2 py-1">siguiente →</a>
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total referencial USD</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            ${totalUsd.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total referencial Bs</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-white">
            {bs(totalBs)} Bs
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_1.4fr]">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Nuevo gasto
          </h2>
          <div className="mt-3">
            <FormGastoPersonal
              hoy={hoy}
              bcv={bcvUsable?.bs_por_usd ?? null}
              paralela={paralelaUsable?.bs_por_usd ?? null}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Historial del mes
          </h2>

          {filas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
              No has registrado gastos personales en {mesActual}.
            </div>
          ) : (
            <ul className="space-y-3">
              {filas.map((fila) => (
                <ItemGastoPersonal
                  key={fila.id}
                  gasto={{
                    ...fila,
                    monto_original: Number(fila.monto_original),
                    monto_usd: Number(fila.monto_usd),
                    monto_ves: Number(fila.monto_ves),
                    tasa_bs_por_usd_snapshot: Number(fila.tasa_bs_por_usd_snapshot),
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
