import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { obtenerTasasVigentes, type TasaVigente } from "@/features/tasas/actions";
import { BotonRefrescarTasas } from "@/features/tasas/boton-refrescar";
import { confirmadaAt, evaluarFrescura } from "@/domain/tasas";

export const dynamic = "force-dynamic";

function Tarjeta({
  titulo,
  descripcion,
  tasa,
}: {
  titulo: string;
  descripcion: string;
  tasa: TasaVigente | null;
}) {
  if (!tasa) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <p className="font-medium text-neutral-900 dark:text-white">{titulo}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Todavía sin datos. Pulsa «Actualizar tasas».
        </p>
      </div>
    );
  }

  // La antigüedad que importa es la de la última CONFIRMACIÓN, no la de la
  // observación: la BCV no publica en fin de semana y aun así su tasa es válida.
  const frescura = evaluarFrescura(confirmadaAt(tasa));
  const simulada = tasa.fuente === "simulada";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-neutral-900 dark:text-white">{titulo}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{descripcion}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${
            frescura.nivel === "inservible"
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : frescura.nivel === "vieja"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {frescura.etiqueta}
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {tasa.bs_por_usd.toLocaleString("es-VE", { maximumFractionDigits: 4 })}
        <span className="ml-1 text-base font-normal text-neutral-500">Bs/USD</span>
      </p>

      <dl className="mt-2 space-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        {tasa.fecha_vigencia && (
          <div className="flex gap-1">
            <dt>Vigente para:</dt>
            <dd>{tasa.fecha_vigencia}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt>Fuente:</dt>
          <dd>{tasa.fuente ?? "—"}</dd>
        </div>
      </dl>

      {simulada && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Valor <strong>simulado</strong>: falta configurar la fuente real en
          <code className="mx-1">.env.local</code>. No lo uses para cobrar.
        </p>
      )}
    </div>
  );
}

export default async function TasasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!esAdmin(usuario)) redirect("/dashboard");

  const { bcv, paralela } = await obtenerTasasVigentes();

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-400">Referencias de conversión</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Tasas de cambio</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Las referencias que usa la app para convertir cobros y costos, sin alterar operaciones antiguas.</p>
      </header>

      <BotonRefrescarTasas />

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta
          titulo="BCV (oficial)"
          descripcion="Ventas directas e intermediarios"
          tasa={bcv}
        />
        <Tarjeta
          titulo="Paralela"
          descripcion="Costos en USDT y vendedores/intermediarios marcados"
          tasa={paralela}
        />
      </div>

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        Se rechaza automáticamente cualquier tasa que se desvíe más de un 50 % de la
        última conocida, o que llegue sin fecha de vigencia. Si una fuente falla, se
        conserva la última válida y aquí se ve su antigüedad; nunca se inventa un valor.
      </p>
    </div>
  );
}
