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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {admin ? "Centro de Operaciones" : "Mis ventas"}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Hola, {usuario?.nombre}. {admin && "Gestión rápida de clientes y renovaciones."}
          </p>
        </div>

        {admin && datosOperaciones?.bcv && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            Tasa BCV: <strong className="font-semibold text-neutral-900 dark:text-white">{datosOperaciones.bcv.toFixed(2)} Bs/$</strong>
          </div>
        )}
      </div>

      {admin && datosOperaciones ? (
        <CentroOperaciones datos={datosOperaciones} />
      ) : (
        <MisVentasRevendedor q={q} />
      )}
    </div>
  );
}
