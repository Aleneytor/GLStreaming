"use client";

import { useEffect, useState, useTransition } from "react";
import {
  revelarCredencialesAction,
  revelarTarjetaProveedorAction,
} from "./actions";

const SEGUNDOS_VISIBLE = 90;

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el navegador puede bloquear el portapapeles sin HTTPS */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{etiqueta}</p>
        <p className="truncate font-mono text-sm">{valor || "—"}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs transition active:scale-95 dark:border-neutral-600"
      >
        {copiado ? "✓" : "Copiar"}
      </button>
    </div>
  );
}

/**
 * Revelado de credenciales: manual, temporal y auditado.
 * Los valores solo viven en el estado de este componente y se ocultan solos.
 */
export function BotonCredenciales({ cuentaId }: { cuentaId: string }) {
  const [datos, setDatos] = useState<{
    correo: string;
    contrasena: string;
    perfiles: { nombre: string; pin: string | null }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restante, setRestante] = useState(SEGUNDOS_VISIBLE);
  const [pendiente, iniciar] = useTransition();

  // Cuenta atrás y auto-ocultado.
  useEffect(() => {
    if (!datos) return;
    setRestante(SEGUNDOS_VISIBLE);
    const id = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          setDatos(null);
          return SEGUNDOS_VISIBLE;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [datos]);

  function revelar() {
    setError(null);
    iniciar(async () => {
      const r = await revelarCredencialesAction(cuentaId);
      if (r.ok)
        setDatos({ correo: r.correo, contrasena: r.contrasena, perfiles: r.perfiles });
      else setError(r.error);
    });
  }

  if (datos) {
    return (
      <div className="space-y-2">
        <Campo etiqueta="Correo" valor={datos.correo} />
        <Campo etiqueta="Contraseña" valor={datos.contrasena} />

        {datos.perfiles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Perfiles y PIN
            </p>
            {datos.perfiles.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm dark:bg-neutral-800"
              >
                <span className="truncate">{p.nombre}</span>
                <span className="shrink-0 font-mono">
                  {p.pin ?? <span className="text-neutral-400">sin PIN</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Se ocultan en {restante}s · acceso registrado
          </p>
          <button
            type="button"
            onClick={() => setDatos(null)}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs transition dark:border-neutral-600"
          >
            Ocultar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={revelar}
        disabled={pendiente}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-neutral-700"
      >
        {pendiente ? "Descifrando…" : "🔑 Ver credenciales"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Revelado admin-only del PAN/vencimiento, sin incluir ni almacenar CVV. */
export function BotonTarjetaProveedor({ proveedorId }: { proveedorId: string }) {
  const [datos, setDatos] = useState<{
    numero: string;
    vencimiento: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restante, setRestante] = useState(SEGUNDOS_VISIBLE);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    if (!datos) return;
    setRestante(SEGUNDOS_VISIBLE);
    const id = setInterval(() => {
      setRestante((segundos) => {
        if (segundos <= 1) {
          setDatos(null);
          return SEGUNDOS_VISIBLE;
        }
        return segundos - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [datos]);

  function revelar() {
    setError(null);
    iniciar(async () => {
      const resultado = await revelarTarjetaProveedorAction(proveedorId);
      if (resultado.ok) {
        setDatos({
          numero: resultado.numero,
          vencimiento: resultado.vencimiento,
        });
      } else {
        setError(resultado.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={revelar}
        disabled={pendiente}
        className="mt-1 block rounded-md border border-purple-300/70 px-2 py-1 text-[10px] font-sans font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/40"
      >
        {pendiente ? "Descifrando…" : "💳 Ver tarjeta"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-40 text-[10px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {datos && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Tarjeta del proveedor"
          onClick={() => setDatos(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-purple-800 bg-white p-5 text-left shadow-2xl dark:bg-neutral-950"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                  Medio de pago propio
                </p>
                <h3 className="mt-1 text-lg font-semibold text-neutral-950 dark:text-white">
                  Tarjeta del proveedor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDatos(null)}
                className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <Campo etiqueta="Número" valor={datos.numero} />
              <Campo etiqueta="Vencimiento" valor={datos.vencimiento ?? "No registrado"} />
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              El CVV no se almacena. Este acceso quedó registrado en la auditoría.
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Se oculta en {restante}s
              </span>
              <button
                type="button"
                onClick={() => setDatos(null)}
                className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-950"
              >
                Ocultar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
