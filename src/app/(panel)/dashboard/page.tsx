import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { MisVentasRevendedor } from "@/features/revendedor/mis-ventas";
import { obtenerDatosOperaciones } from "@/features/operaciones/obtener-operaciones";
import { CentroOperaciones } from "@/features/operaciones/centro-operaciones";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  const admin = esAdmin(usuario);
  const { q } = await searchParams;

  const datosOperaciones = admin ? await obtenerDatosOperaciones() : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* El revendedor tiene su propia cabecera en el panel; aquí solo la del admin. */}
      {admin && (
        <header className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Centro de operaciones</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              ¡Hola, {usuario?.nombre}!
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Control centralizado de renovaciones, cobros y retiros.
            </p>
          </div>

          {datosOperaciones?.bcv && (
            <div className="flex items-center gap-2 self-start rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Tasa BCV:</span>
              <strong className="font-bold tabular-nums text-neutral-900 dark:text-white">
                {datosOperaciones.bcv.toFixed(2)} Bs/$
              </strong>
            </div>
          )}
        </header>
      )}

      {admin && datosOperaciones ? (
        <CentroOperaciones datos={datosOperaciones} />
      ) : (
        <MisVentasRevendedor q={q} />
      )}
    </div>
  );
}
