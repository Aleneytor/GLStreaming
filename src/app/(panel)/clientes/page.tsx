import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EditorCliente, type ClienteFila } from "@/features/clientes/editor-cliente";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { q } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("clientes")
    .select("id, nombre, whatsapp_original, notas, suscripciones ( id, estado )")
    .is("archived_at", null);

  if (q) consulta = consulta.ilike("nombre", `%${q}%`);

  const { data: clientes } = await consulta.order("nombre");

  const filas: ClienteFila[] = (clientes ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    whatsapp_original: c.whatsapp_original,
    notas: c.notas,
    suscripciones_activas: (c.suscripciones ?? []).filter((s) => s.estado === "activa")
      .length,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {filas.length} {filas.length === 1 ? "cliente" : "clientes"}
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre…"
          aria-label="Buscar clientes"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300"
        />
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Buscar
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Nuevo cliente
        </h2>
        <EditorCliente />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Registrados
        </h2>
        {filas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            {q ? "Ningún cliente coincide." : "Todavía no hay clientes."}
          </p>
        ) : (
          filas.map((c) => <EditorCliente key={c.id} cliente={c} />)
        )}
      </section>
    </div>
  );
}
