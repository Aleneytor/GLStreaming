"use client";

import { useEffect, useState, useTransition } from "react";
import { entregarAccesoAction, type PaqueteAcceso } from "./entrega";

const SEGUNDOS_VISIBLE = 120;

type Paquete = Extract<PaqueteAcceso, { ok: true }>;

/** Arma el texto listo para pegarle al cliente por WhatsApp. */
function comoTexto(p: Paquete): string {
  return [
    `Correo: ${p.correo}`,
    `Contraseña: ${p.contrasena}`,
    p.perfil ? `Perfil: ${p.perfil}` : null,
    p.pin ? `PIN: ${p.pin}` : null,
    p.renovacion ? `Renueva: ${p.renovacion}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{etiqueta}</span>
      <span className="truncate font-mono">{valor}</span>
    </div>
  );
}

/** Entrega del paquete de acceso: temporal y auditada. */
export function BotonAcceso({ suscripcionId }: { suscripcionId: string }) {
  const [datos, setDatos] = useState<Paquete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(SEGUNDOS_VISIBLE);
  const [pendiente, iniciar] = useTransition();

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

  async function copiarTodo() {
    if (!datos) return;
    try {
      await navigator.clipboard.writeText(comoTexto(datos));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el navegador puede bloquear el portapapeles */
    }
  }

  if (datos) {
    return (
      <div className="space-y-2 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
        <Fila etiqueta="Correo" valor={datos.correo} />
        <Fila etiqueta="Contraseña" valor={datos.contrasena} />
        {datos.perfil && <Fila etiqueta="Perfil" valor={datos.perfil} />}
        {datos.pin && <Fila etiqueta="PIN" valor={datos.pin} />}
        {datos.renovacion && <Fila etiqueta="Renueva" valor={datos.renovacion} />}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={copiarTodo}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            {copiado ? "✓ Copiado" : "Copiar todo"}
          </button>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Se oculta en {restante}s
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          iniciar(async () => {
            const r = await entregarAccesoAction(suscripcionId);
            if (r.ok) setDatos(r);
            else setError(r.error);
          });
        }}
        disabled={pendiente}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[0.98] disabled:opacity-60 dark:border-neutral-700"
      >
        {pendiente ? "…" : "🔑 Datos de acceso"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
