import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MisVentasRevendedor } from "@/features/revendedor/mis-ventas";

export const dynamic = "force-dynamic";

function Tarjeta({ titulo, valor }: { titulo: string; valor: string | number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

async function VistaAdmin() {
  const supabase = await createClient();

  // Cada consulta pasa por RLS con la identidad del admin.
  const [plataformas, productos, cuentas, clientes] = await Promise.all([
    supabase.from("plataformas").select("*", { count: "exact", head: true }),
    supabase.from("productos_plataforma").select("*", { count: "exact", head: true }),
    supabase.from("cuentas").select("*", { count: "exact", head: true }),
    supabase.from("clientes").select("*", { count: "exact", head: true }),
  ]);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tarjeta titulo="Plataformas" valor={plataformas.count ?? 0} />
      <Tarjeta titulo="Productos" valor={productos.count ?? 0} />
      <Tarjeta titulo="Cuentas" valor={cuentas.count ?? 0} />
      <Tarjeta titulo="Clientes" valor={clientes.count ?? 0} />
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  const admin = esAdmin(usuario);
  const { q } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {admin ? "Resumen" : "Mis ventas"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Hola, {usuario?.nombre}.
        </p>
      </div>

      {admin ? <VistaAdmin /> : <MisVentasRevendedor q={q} />}
    </div>
  );
}
