import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BotonAcceso } from "@/features/ventas/boton-acceso";

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

async function VistaRevendedor() {
  const supabase = await createClient();

  // Única ventana del revendedor: sus propias ventas (la vista filtra por su id).
  const { data: ventas } = await supabase
    .from("v_mis_ventas_revendedor")
    .select("suscripcion_id, estado, cliente, plataforma, producto, modalidad");

  if (!ventas || ventas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        Todavía no tienes ventas registradas.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {ventas.map((v) => (
        <li
          key={v.suscripcion_id}
          className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{v.cliente}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {v.plataforma} · {v.producto}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs capitalize dark:bg-neutral-800">
              {v.estado}
            </span>
          </div>
          {/* El revendedor obtiene el mismo paquete que le pasa a su cliente. */}
          <BotonAcceso suscripcionId={v.suscripcion_id} />
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const usuario = await obtenerUsuarioActual();
  const admin = esAdmin(usuario);

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

      {admin ? <VistaAdmin /> : <VistaRevendedor />}
    </div>
  );
}
