import { redirect } from "next/navigation";
import { obtenerUsuarioActual, esAdmin } from "@/lib/auth";
import { obtenerTasasVigentes, type TasaVigente } from "@/features/tasas/actions";
import { BotonRefrescarTasas } from "@/features/tasas/boton-refrescar";
import { evaluarFrescura } from "@/domain/tasas";

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
      <div className="rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
        <p className="font-medium">{titulo}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Todavía sin datos. Pulsa «Actualizar tasas».
        </p>
      </div>
    );
  }

  const frescura = evaluarFrescura(tasa.observada_fuente_at ?? tasa.obtenida_at);
  const simulada = tasa.fuente === "simulada";

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{titulo}</p>
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tasas de cambio</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Cada venta y cada gasto congela la tasa que usó. Por eso una tasa mala no
          se puede corregir después: se valida antes de guardarla.
        </p>
      </div>

      <BotonRefrescarTasas />

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta
          titulo="BCV (oficial)"
          descripcion="Con la que se cobra al cliente en bolívares"
          tasa={bcv}
        />
        <Tarjeta
          titulo="Paralela"
          descripcion="Con la que se valoran los costos en USDT"
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
