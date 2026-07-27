"use client";

import { useState } from "react";
import { entregarAccesoAction } from "@/features/ventas/entrega";

export function BotonCopiarWhatsapp({
  suscripcionId,
}: {
  suscripcionId: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copiar = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await entregarAccesoAction(suscripcionId);
      if (!res.ok) {
        setError(res.error);
        setCargando(false);
        return;
      }

      let texto = `🍿 *DATOS DE ACCESO - GL STREAMING* 🍿\n`;
      texto += `👤 *Cliente:* ${res.cliente}\n`;
      texto += `📧 *Correo:* ${res.correo}\n`;
      texto += `🔑 *Contraseña:* ${res.contrasena}\n`;
      if (res.perfil) texto += `👤 *Perfil:* ${res.perfil}\n`;
      if (res.pin) texto += `📌 *PIN:* ${res.pin}\n`;
      if (res.renovacion) texto += `📅 *Vencimiento:* ${res.renovacion}\n`;

      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setError("Error al copiar.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={copiar}
        disabled={cargando}
        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
          copiado
            ? "bg-emerald-600 text-white"
            : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        }`}
        title="Copiar datos formateados"
      >
        <span>{copiado ? "✓ ¡Copiado!" : cargando ? "…" : "📋 Copiar Datos"}</span>
      </button>

      {error && <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
