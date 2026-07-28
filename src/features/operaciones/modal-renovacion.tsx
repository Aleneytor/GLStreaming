"use client";

import { useActionState, useState } from "react";
import { renovarAction, type EstadoAccion } from "@/features/ventas/acciones-suscripcion";
import {
  tarifaSpotify,
  type TipoCorreoTarifaSpotify,
} from "@/domain/tarifas-spotify";
import { parsearMontoFormulario } from "@/domain/dinero";
import type { VendedorOperacion } from "./obtener-operaciones";

function hoyCaracas(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ModalRenovacion({
  suscripcionId,
  clienteNombre,
  plataformaNombre,
  productoNombre,
  tipoCorreoTarifaSpotify,
  renovacionActual,
  bcv,
  paralela,
  vendedorActualId,
  vendedores,
  onCerrar,
}: {
  suscripcionId: string;
  clienteNombre: string;
  plataformaNombre: string;
  productoNombre: string;
  tipoCorreoTarifaSpotify: TipoCorreoTarifaSpotify | null;
  renovacionActual: string | null;
  bcv: number | null;
  paralela: number | null;
  vendedorActualId: string | null;
  vendedores: VendedorOperacion[];
  onCerrar: () => void;
}) {
  const esSpotify = plataformaNombre.toLowerCase() === "spotify";
  const tipoCorreoInicial = tipoCorreoTarifaSpotify ?? "dominio_gl";
  const [estado, accionRenovar, pendiente] = useActionState<EstadoAccion, FormData>(
    renovarAction,
    null,
  );
  const [moneda, setMoneda] = useState<"ves" | "usd">(esSpotify ? "usd" : "ves");
  const [monto, setMonto] = useState(
    esSpotify ? (tarifaSpotify(tipoCorreoInicial, 1)?.toFixed(2) ?? "") : "",
  );
  const [meses, setMeses] = useState(1);
  const [tipoCorreo, setTipoCorreo] = useState<TipoCorreoTarifaSpotify>(tipoCorreoInicial);
  const [vendedorId, setVendedorId] = useState(vendedorActualId ?? "");
  const hoy = hoyCaracas();
  const fechaDefecto = renovacionActual ?? hoy;
  const vendedor = vendedores.find((item) => item.id === vendedorId) ?? null;
  const cobraEnParalela =
    vendedor?.tipo === "revendedor" && vendedor.cobraEnParalela;
  const tasaBase = cobraEnParalela ? paralela : bcv;
  const nombreBase = cobraEnParalela ? "paralela" : "BCV";

  function aplicarTarifa(cantidadMeses: number, tipo = tipoCorreo) {
    const tarifa = tarifaSpotify(tipo, cantidadMeses);
    if (tarifa !== null) {
      setMoneda("usd");
      setMonto(tarifa.toFixed(2));
    }
  }

  // Calculador de conversión orientativo mientras se escribe
  const numMonto = parsearMontoFormulario(monto);
  const esNumValido = Number.isFinite(numMonto) && numMonto > 0;
  const equivalencia =
    esNumValido && tasaBase
      ? moneda === "ves"
        ? `≈ $${(numMonto / tasaBase).toFixed(2)} USD (${nombreBase})`
        : `≈ ${(numMonto * tasaBase).toFixed(2)} Bs (${nombreBase})`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Renovar y Cobrar</h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {clienteNombre} · {productoNombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {estado?.error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {estado.error}
          </div>
        )}

        {estado?.ok ? (
          <div className="mt-4 space-y-4 text-center">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ {estado.ok}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              Listo
            </button>
          </div>
        ) : (
          <form action={accionRenovar} className="mt-4 space-y-4">
            <input type="hidden" name="suscripcion_id" value={suscripcionId} />
            <input
              type="hidden"
              name="actualizar_vendedor"
              value={vendedorId !== (vendedorActualId ?? "") ? "on" : "off"}
            />

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Renovación vendida por
              </label>
              <select
                name="vendedor_id"
                value={vendedorId}
                onChange={(e) => setVendedorId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">Venta directa · BCV</option>
                {vendedores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}{item.alias ? ` (${item.alias})` : ""} · {item.tipo} · {item.cobraEnParalela ? "paralela" : "BCV"}
                  </option>
                ))}
              </select>
              <div
                className={`mt-2 rounded-xl border px-3 py-2 text-xs ${
                  cobraEnParalela
                    ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                }`}
              >
                <strong>{vendedor?.nombre ?? "Venta directa"}</strong>
                {vendedor ? ` · ${vendedor.tipo}` : ""} · tasa <strong>{nombreBase}</strong>
                <p className="mt-1 opacity-80">
                  Puedes corregir el vendedor aquí; la renovación y el cambio se guardan juntos.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Inicio del nuevo período
              </label>
              <input
                type="date"
                name="inicio"
                defaultValue={fechaDefecto}
                required
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>

            <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Duración del paquete
                </label>
                <select
                  name="meses"
                  value={meses}
                  onChange={(e) => {
                    const cantidad = Number(e.target.value);
                    setMeses(cantidad);
                    aplicarTarifa(cantidad);
                  }}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {(esSpotify
                    ? [1, 3, 6, 12]
                    : Array.from({ length: 12 }, (_, i) => i + 1)
                  ).map((cantidad) => (
                    <option key={cantidad} value={cantidad}>
                      {cantidad} {cantidad === 1 ? "mes" : "meses"}
                    </option>
                  ))}
                </select>
              {esSpotify && (
                <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([
                    ["dominio_gl", "Correo de mi dominio"],
                    ["correo_cliente", "Correo del cliente"],
                  ] as const).map(([tipo, etiqueta]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setTipoCorreo(tipo);
                        aplicarTarifa(meses, tipo);
                      }}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                        tipoCorreo === tipo
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  El monto sugerido corresponde al paquete completo y puedes editarlo.
                </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Monto total cobrado
              </label>

              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  name="monto"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder={moneda === "ves" ? "Ej: 250,00" : "Ej: 5,00"}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                />
                <select
                  name="moneda"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value as "ves" | "usd")}
                  className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-800"
                >
                  <option value="ves">Bs (BCV)</option>
                  <option value="usd">$ USD</option>
                </select>
              </div>

              {equivalencia && (
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {equivalencia}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="tardia"
                name="tardia"
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="tardia" className="text-xs text-neutral-600 dark:text-neutral-400">
                Renovación tardía (arranca hoy aunque estuviera vencido)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pendiente}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {pendiente ? "Registrando…" : monto ? "Renovar y Cobrar" : "Renovar sin Cobro"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
