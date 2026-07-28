import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resumirCuentaInventario } from "@/domain/resumen-inventario";

export const dynamic = "force-dynamic";

type ResumenPlataforma = {
  cuentas: number;
  unidades: number;
  ventas: number;
};

const RESUMEN_VACIO: ResumenPlataforma = {
  cuentas: 0,
  unidades: 0,
  ventas: 0,
};

// Cada plataforma se identifica por su NOMBRE, no por un color de fondo
// distinto (evita que compitan 14 identidades cromáticas a la vez). La
// insignia es solo la inicial, siempre en el mismo estilo neutro.
function insigniaDe(slug: string): string {
  const mapa: Record<string, string> = {
    netflix: "N",
    canva: "C",
    capcut: "✕",
    crunchyroll: "C",
    "disney-plus": "D+",
    flujotv: "F",
    "gemini-google-cloud": "G",
    hbo: "H",
    "paramount-plus": "P+",
    "prime-video": "▶",
    spotify: "S",
    telelatino: "T",
    "universal-plus": "U+",
    vix: "ViX",
    youtube: "▶",
  };
  return mapa[slug] ?? "•";
}

function TarjetaPlataforma({
  plataforma,
  resumen,
}: {
  plataforma: { id: string; nombre: string; slug: string };
  resumen: ResumenPlataforma;
}) {
  const vacia = resumen.cuentas === 0;
  const libres = Math.max(resumen.unidades - resumen.ventas, 0);
  const capacidadVisible = Math.max(resumen.unidades, resumen.ventas, 1);
  const ocupacion = vacia
    ? 0
    : Math.min(Math.round((resumen.ventas / capacidadVisible) * 100), 100);
  const estado = vacia
    ? "Sin inventario"
    : libres > 0
      ? `${libres} ${libres === 1 ? "disponible" : "disponibles"}`
      : "Sin cupos libres";

  return (
    <Link
      href={`/inventario/${plataforma.slug}`}
      className={`group relative flex overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-700 ${
        vacia ? "min-h-40" : "min-h-52"
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-sm font-black tracking-tight text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          >
            {insigniaDe(plataforma.slug)}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              vacia
                ? "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-500"
                : libres > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-400"
            }`}
          >
            {estado}
          </span>
        </span>

        <span className="mt-5 flex items-center justify-between gap-3">
          <span className="truncate text-lg font-semibold text-neutral-900 dark:text-white">
            {plataforma.nombre}
          </span>
          <span
            aria-hidden
            className="text-xl text-neutral-300 transition group-hover:translate-x-1 group-hover:text-blue-600 dark:text-neutral-700 dark:group-hover:text-blue-400"
          >
            →
          </span>
        </span>

        {vacia ? (
          <span className="mt-auto pt-4 text-sm leading-5 text-neutral-400 dark:text-neutral-500">
            Lista para recibir su primera cuenta.
          </span>
        ) : (
          <span className="mt-auto pt-5">
            <span className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl bg-neutral-50 px-2 py-2 dark:bg-neutral-800/60">
                <strong className="block text-base text-neutral-900 dark:text-white">{resumen.cuentas}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Cuentas
                </span>
              </span>
              <span className="rounded-xl bg-neutral-50 px-2 py-2 dark:bg-neutral-800/60">
                <strong className="block text-base text-neutral-900 dark:text-white">{resumen.ventas}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Vendidos
                </span>
              </span>
              <span className="rounded-xl bg-neutral-50 px-2 py-2 dark:bg-neutral-800/60">
                <strong className="block text-base text-neutral-900 dark:text-white">{libres}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Libres
                </span>
              </span>
            </span>
            <span className="mt-4 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <span
                  className="block h-full rounded-full bg-emerald-500"
                  style={{ width: `${ocupacion}%` }}
                />
              </span>
              <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
                {ocupacion}% ocupado
              </span>
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}

/**
 * Entrada del inventario: una tarjeta por plataforma.
 * Entrar en una muestra solo sus cuentas (Netflix estándar y extra juntas,
 * Disney+ aparte, etc.), en vez de mezclarlo todo en una sola lista.
 */
export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: plataformas }, { data: cuentas }] = await Promise.all([
    supabase.from("plataformas").select("id, nombre, slug").eq("activa", true),
    supabase
      .from("cuentas")
      .select(
        `id, productos_plataforma!inner ( plataforma_id ),
         unidades_inventario ( id ),
         asignaciones_inventario (
           fin, alcance, consume_capacidad, capacidad_vendible_consumida_snapshot
         )`,
      )
      .neq("estado", "archivada"),
  ]);

  const resumen = new Map<string, ResumenPlataforma>();
  for (const cuenta of cuentas ?? []) {
    const relacion = cuenta.productos_plataforma as unknown as {
      plataforma_id: string;
    };
    const previo = resumen.get(relacion.plataforma_id) ?? RESUMEN_VACIO;
    const ocupacionCuenta = resumirCuentaInventario(
      cuenta.unidades_inventario?.length ?? 0,
      cuenta.asignaciones_inventario ?? [],
    );
    resumen.set(relacion.plataforma_id, {
      cuentas: previo.cuentas + 1,
      unidades: previo.unidades + ocupacionCuenta.capacidad,
      ventas: previo.ventas + ocupacionCuenta.ocupados,
    });
  }

  const ordenadas = [...(plataformas ?? [])].sort((a, b) => {
    const resumenA = resumen.get(a.id) ?? RESUMEN_VACIO;
    const resumenB = resumen.get(b.id) ?? RESUMEN_VACIO;
    if (resumenB.ventas !== resumenA.ventas) {
      return resumenB.ventas - resumenA.ventas;
    }
    if (resumenB.cuentas !== resumenA.cuentas) {
      return resumenB.cuentas - resumenA.cuentas;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const conInventario = ordenadas.filter(
    (plataforma) => (resumen.get(plataforma.id)?.cuentas ?? 0) > 0,
  );
  const sinInventario = ordenadas.filter(
    (plataforma) => (resumen.get(plataforma.id)?.cuentas ?? 0) === 0,
  );
  const totalCuentas = cuentas?.length ?? 0;
  const totalVentas = [...resumen.values()].reduce(
    (total, actual) => total + actual.ventas,
    0,
  );
  const totalLibres = [...resumen.values()].reduce(
    (total, actual) => total + Math.max(actual.unidades - actual.ventas, 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-3xl border border-neutral-200 bg-white px-5 py-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">
              Control de stock
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
              Inventario por plataforma
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Entra directo al servicio que necesitas y revisa cuentas, ventas y
              cupos disponibles de un vistazo.
            </p>
          </div>
          <Link
            href="/inventario/nueva"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <span aria-hidden className="mr-2 text-lg leading-none">
              +
            </span>
            Nueva cuenta
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { valor: totalCuentas, etiqueta: "Cuentas" },
            { valor: totalVentas, etiqueta: "Servicios activos" },
            { valor: totalLibres, etiqueta: "Cupos libres" },
            { valor: conInventario.length, etiqueta: "Con inventario" },
          ].map((dato) => (
            <div
              key={dato.etiqueta}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/60"
            >
              <strong className="block text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                {dato.valor}
              </strong>
              <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                {dato.etiqueta}
              </span>
            </div>
          ))}
        </div>
      </section>

      {conInventario.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                Plataformas activas
              </h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Ordenadas por el movimiento actual de ventas.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {conInventario.length} activas
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {conInventario.map((plataforma) => (
              <TarjetaPlataforma
                key={plataforma.id}
                plataforma={plataforma}
                resumen={resumen.get(plataforma.id) ?? RESUMEN_VACIO}
              />
            ))}
          </div>
        </section>
      )}

      {sinInventario.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              Listas para configurar
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Estas plataformas están habilitadas, pero todavía no tienen cuentas.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sinInventario.map((plataforma) => (
              <TarjetaPlataforma
                key={plataforma.id}
                plataforma={plataforma}
                resumen={RESUMEN_VACIO}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
