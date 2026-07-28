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

type TemaPlataforma = {
  insignia: string;
  fondo: string;
  borde: string;
  icono: string;
  texto: string;
  barra: string;
  halo: string;
};

const RESUMEN_VACIO: ResumenPlataforma = {
  cuentas: 0,
  unidades: 0,
  ventas: 0,
};

// Identidad visual propia de cada servicio. Todas las clases son estáticas para
// que Tailwind las incluya al compilar y el resultado sea igual en producción.
const TEMAS_PLATAFORMA: Record<string, TemaPlataforma> = {
  netflix: {
    insignia: "N",
    fondo: "from-red-950/80 via-neutral-950 to-neutral-950",
    borde: "border-red-900/60 hover:border-red-500/70",
    icono: "bg-red-600 text-white shadow-red-950/60",
    texto: "text-red-300",
    barra: "bg-red-500",
    halo: "bg-red-600/20",
  },
  canva: {
    insignia: "C",
    fondo: "from-cyan-950/70 via-violet-950/35 to-neutral-950",
    borde: "border-cyan-800/60 hover:border-cyan-400/70",
    icono: "bg-gradient-to-br from-cyan-400 to-violet-600 text-white shadow-cyan-950/60",
    texto: "text-cyan-300",
    barra: "bg-gradient-to-r from-cyan-400 to-violet-500",
    halo: "bg-cyan-500/20",
  },
  capcut: {
    insignia: "✕",
    fondo: "from-neutral-700/35 via-neutral-950 to-neutral-950",
    borde: "border-neutral-600/60 hover:border-white/60",
    icono: "bg-white text-black shadow-black/70",
    texto: "text-neutral-200",
    barra: "bg-white",
    halo: "bg-white/10",
  },
  crunchyroll: {
    insignia: "C",
    fondo: "from-orange-950/80 via-neutral-950 to-neutral-950",
    borde: "border-orange-900/70 hover:border-orange-400/70",
    icono: "bg-orange-500 text-white shadow-orange-950/60",
    texto: "text-orange-300",
    barra: "bg-orange-500",
    halo: "bg-orange-500/20",
  },
  "disney-plus": {
    insignia: "D+",
    fondo: "from-blue-950/90 via-indigo-950/45 to-neutral-950",
    borde: "border-blue-900/70 hover:border-blue-400/70",
    icono: "bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-blue-950/60",
    texto: "text-blue-300",
    barra: "bg-gradient-to-r from-blue-400 to-indigo-500",
    halo: "bg-blue-500/20",
  },
  flujotv: {
    insignia: "F",
    fondo: "from-emerald-950/75 via-cyan-950/30 to-neutral-950",
    borde: "border-emerald-900/70 hover:border-emerald-400/70",
    icono: "bg-gradient-to-br from-emerald-400 to-cyan-600 text-white shadow-emerald-950/60",
    texto: "text-emerald-300",
    barra: "bg-gradient-to-r from-emerald-400 to-cyan-500",
    halo: "bg-emerald-500/20",
  },
  "gemini-google-cloud": {
    insignia: "✦",
    fondo: "from-blue-950/65 via-violet-950/50 to-pink-950/25",
    borde: "border-violet-900/70 hover:border-violet-400/70",
    icono: "bg-gradient-to-br from-blue-400 via-violet-500 to-pink-500 text-white shadow-violet-950/60",
    texto: "text-violet-300",
    barra: "bg-gradient-to-r from-blue-400 via-violet-500 to-pink-400",
    halo: "bg-violet-500/20",
  },
  hbo: {
    insignia: "H",
    fondo: "from-violet-950/85 via-fuchsia-950/30 to-neutral-950",
    borde: "border-violet-900/70 hover:border-violet-400/70",
    icono: "bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white shadow-violet-950/60",
    texto: "text-violet-300",
    barra: "bg-gradient-to-r from-violet-400 to-fuchsia-500",
    halo: "bg-violet-500/20",
  },
  "paramount-plus": {
    insignia: "P+",
    fondo: "from-blue-950/85 via-sky-950/30 to-neutral-950",
    borde: "border-blue-900/70 hover:border-blue-400/70",
    icono: "bg-blue-600 text-white shadow-blue-950/60",
    texto: "text-blue-300",
    barra: "bg-blue-500",
    halo: "bg-blue-500/20",
  },
  "prime-video": {
    insignia: "▶",
    fondo: "from-sky-950/80 via-blue-950/35 to-neutral-950",
    borde: "border-sky-900/70 hover:border-sky-400/70",
    icono: "bg-sky-500 text-slate-950 shadow-sky-950/60",
    texto: "text-sky-300",
    barra: "bg-sky-400",
    halo: "bg-sky-500/20",
  },
  spotify: {
    insignia: "S",
    fondo: "from-emerald-950/90 via-neutral-950 to-neutral-950",
    borde: "border-emerald-900/70 hover:border-emerald-400/70",
    icono: "bg-emerald-500 text-black shadow-emerald-950/60",
    texto: "text-emerald-300",
    barra: "bg-emerald-500",
    halo: "bg-emerald-500/20",
  },
  telelatino: {
    insignia: "T",
    fondo: "from-rose-950/70 via-orange-950/30 to-neutral-950",
    borde: "border-rose-900/70 hover:border-rose-400/70",
    icono: "bg-gradient-to-br from-orange-400 to-rose-600 text-white shadow-rose-950/60",
    texto: "text-rose-300",
    barra: "bg-gradient-to-r from-orange-400 to-rose-500",
    halo: "bg-rose-500/20",
  },
  "universal-plus": {
    insignia: "U+",
    fondo: "from-blue-950/75 via-amber-950/25 to-neutral-950",
    borde: "border-amber-900/60 hover:border-amber-400/70",
    icono: "bg-gradient-to-br from-blue-500 to-amber-400 text-white shadow-blue-950/60",
    texto: "text-amber-300",
    barra: "bg-gradient-to-r from-blue-400 to-amber-400",
    halo: "bg-amber-500/15",
  },
  vix: {
    insignia: "ViX",
    fondo: "from-orange-950/80 via-neutral-950 to-neutral-950",
    borde: "border-orange-900/70 hover:border-orange-400/70",
    icono: "bg-orange-500 text-white shadow-orange-950/60",
    texto: "text-orange-300",
    barra: "bg-orange-500",
    halo: "bg-orange-500/20",
  },
  youtube: {
    insignia: "▶",
    fondo: "from-red-950/80 via-neutral-950 to-neutral-950",
    borde: "border-red-900/60 hover:border-red-500/70",
    icono: "bg-red-600 text-white shadow-red-950/60",
    texto: "text-red-300",
    barra: "bg-red-500",
    halo: "bg-red-600/20",
  },
};

const TEMA_PREDETERMINADO: TemaPlataforma = {
  insignia: "•",
  fondo: "from-slate-800/70 via-neutral-950 to-neutral-950",
  borde: "border-slate-700 hover:border-slate-400",
  icono: "bg-slate-600 text-white shadow-black/60",
  texto: "text-slate-300",
  barra: "bg-slate-400",
  halo: "bg-slate-500/20",
};

function TarjetaPlataforma({
  plataforma,
  resumen,
}: {
  plataforma: { id: string; nombre: string; slug: string };
  resumen: ResumenPlataforma;
}) {
  const tema = TEMAS_PLATAFORMA[plataforma.slug] ?? TEMA_PREDETERMINADO;
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
      className={`group relative isolate flex overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 active:scale-[0.99] ${
        vacia ? "min-h-44" : "min-h-56"
      } ${tema.fondo} ${tema.borde}`}
    >
      <span
        aria-hidden
        className={`absolute -right-12 -top-14 -z-10 size-40 rounded-full blur-3xl transition group-hover:scale-125 ${tema.halo}`}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-3">
          <span
            aria-hidden
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black tracking-tight shadow-lg ${tema.icono}`}
          >
            {tema.insignia}
          </span>
          <span
            className={`rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-medium backdrop-blur ${
              vacia ? "text-neutral-400" : tema.texto
            }`}
          >
            {estado}
          </span>
        </span>

        <span className="mt-5 flex items-center justify-between gap-3">
          <span className="truncate text-lg font-semibold text-white">
            {plataforma.nombre}
          </span>
          <span
            aria-hidden
            className="text-xl text-white/40 transition group-hover:translate-x-1 group-hover:text-white"
          >
            →
          </span>
        </span>

        {vacia ? (
          <span className="mt-auto pt-4 text-sm leading-5 text-neutral-400">
            Lista para recibir su primera cuenta.
          </span>
        ) : (
          <span className="mt-auto pt-5">
            <span className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl bg-black/25 px-2 py-2 backdrop-blur-sm">
                <strong className="block text-base text-white">{resumen.cuentas}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                  Cuentas
                </span>
              </span>
              <span className="rounded-xl bg-black/25 px-2 py-2 backdrop-blur-sm">
                <strong className="block text-base text-white">{resumen.ventas}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                  Vendidos
                </span>
              </span>
              <span className="rounded-xl bg-black/25 px-2 py-2 backdrop-blur-sm">
                <strong className="block text-base text-white">{libres}</strong>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                  Libres
                </span>
              </span>
            </span>
            <span className="mt-4 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className={`block h-full rounded-full ${tema.barra}`}
                  style={{ width: `${ocupacion}%` }}
                />
              </span>
              <span className="text-[11px] tabular-nums text-neutral-400">
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
      <section className="relative isolate overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black px-5 py-6 shadow-2xl shadow-black/20 sm:px-7 sm:py-7">
        <span
          aria-hidden
          className="absolute -right-20 -top-28 -z-10 size-72 rounded-full bg-gradient-to-br from-red-500/20 via-violet-500/15 to-emerald-500/20 blur-3xl"
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Control de stock
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Inventario por plataforma
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
              Entra directo al servicio que necesitas y revisa cuentas, ventas y
              cupos disponibles de un vistazo.
            </p>
          </div>
          <Link
            href="/inventario/nueva"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/20 transition hover:bg-neutral-200 active:scale-[0.98]"
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
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
            >
              <strong className="block text-xl font-semibold tabular-nums text-white">
                {dato.valor}
              </strong>
              <span className="mt-0.5 block text-xs text-neutral-400">
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
