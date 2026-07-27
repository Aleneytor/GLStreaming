"use client";

export type Moneda = "ves" | "usd";

/**
 * Campo de monto con selector de moneda (Bs / $).
 *
 * El negocio cobra en bolívares, pero muchas veces el dueño piensa el cobro en
 * dólares («me pagó 4 $»). Este campo deja elegir la moneda de ENTRADA: si es
 * USD, la base traduce a Bs con la BCV que congela. Debajo se muestra siempre
 * el equivalente en la otra moneda, como ayuda visual.
 *
 * Es controlado: el padre lleva `monto` y `moneda` en su estado (así puede,
 * por ejemplo, cambiar el texto del botón según si hay monto). Emite dos campos
 * ocultos, `monto` y `moneda`, que leen las acciones de servidor.
 */
export function CampoMonto({
  monto,
  setMonto,
  moneda,
  setMoneda,
  bcv,
  inputId = "monto",
  placeholder,
  required,
  className,
}: {
  monto: string;
  setMonto: (v: string) => void;
  moneda: Moneda;
  setMoneda: (m: Moneda) => void;
  /** BCV vigente, para mostrar el equivalente en la otra moneda. */
  bcv?: number | null;
  inputId?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const numero = Number(monto.replace(/\./g, "").replace(",", "."));
  const valido = Number.isFinite(numero) && numero > 0;
  const tasa = bcv && bcv > 0 ? bcv : null;

  // Equivalente en la moneda contraria: si escribo en Bs, muestro el USD; si
  // escribo en USD, muestro los Bs. Es solo referencia; la base congela lo suyo.
  const equivalente =
    tasa && valido
      ? moneda === "ves"
        ? `≈ ${(numero / tasa).toFixed(2)} $`
        : `≈ ${Math.round(numero * tasa).toLocaleString("es-VE")} Bs`
      : null;

  const btn = (m: Moneda) =>
    `px-3 py-2 text-sm font-medium transition ${
      moneda === m
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
    }`;

  return (
    <div className={className}>
      <div className="flex items-stretch gap-2">
        <div className="flex min-h-11 overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-700">
          <button type="button" onClick={() => setMoneda("ves")} className={btn("ves")}>
            Bs
          </button>
          <button type="button" onClick={() => setMoneda("usd")} className={btn("usd")}>
            $
          </button>
        </div>
        <input
          id={inputId}
          name="monto"
          inputMode="decimal"
          required={required}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder={placeholder ?? (moneda === "ves" ? "Bs recibidos" : "$ recibidos")}
          aria-label={moneda === "ves" ? "Bolívares recibidos" : "Dólares recibidos"}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-emerald-600 dark:focus:ring-emerald-950"
        />
      </div>
      <input type="hidden" name="moneda" value={moneda} />
      {equivalente && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {equivalente} a {tasa?.toLocaleString("es-VE")} Bs/USD
        </p>
      )}
    </div>
  );
}
