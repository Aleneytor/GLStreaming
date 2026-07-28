"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BotonAcceso } from "@/features/ventas/boton-acceso";

/**
 * Panel del revendedor (cliente): dos vistas sobre SUS ventas.
 *   · «Operaciones»: resumen + clientes agrupados por vencimiento.
 *   · «Por plataforma»: los mismos clientes repartidos por plataforma, a color.
 *
 * Cada cliente lleva un chip de plataforma a color y un borde lateral del mismo
 * color, para que se vea de un golpe QUÉ servicio tiene. Los datos llegan ya
 * resueltos desde el servidor (solo sus ventas, DEC-97); aquí solo se presentan
 * y se filtran en memoria.
 */

export type VentaRevendedor = {
  suscripcion_id: string;
  estado: string;
  cliente: string;
  plataforma: string;
  producto: string;
  modalidad: string;
  fecha_renovacion: string | null;
  dias: number | null;
};

type Paleta = { chip: string; borde: string; punto: string; barra: string };
const NEUTRAL: Paleta = {
  chip: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200",
  borde: "border-l-neutral-400",
  punto: "bg-neutral-400",
  barra: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};
const PALETAS: { claves: string[]; paleta: Paleta }[] = [
  {
    claves: ["netflix"],
    paleta: {
      chip: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900",
      borde: "border-l-red-500",
      punto: "bg-red-500",
      barra: "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200",
    },
  },
  {
    claves: ["spotify"],
    paleta: {
      chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900",
      borde: "border-l-emerald-500",
      punto: "bg-emerald-500",
      barra: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
    },
  },
  {
    claves: ["disney"],
    paleta: {
      chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-900",
      borde: "border-l-sky-500",
      punto: "bg-sky-500",
      barra: "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200",
    },
  },
  {
    claves: ["hbo", "max"],
    paleta: {
      chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-900",
      borde: "border-l-violet-500",
      punto: "bg-violet-500",
      barra: "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200",
    },
  },
  {
    claves: ["prime", "amazon"],
    paleta: {
      chip: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900",
      borde: "border-l-cyan-500",
      punto: "bg-cyan-500",
      barra: "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200",
    },
  },
  {
    claves: ["crunchyroll", "anime"],
    paleta: {
      chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-900",
      borde: "border-l-orange-500",
      punto: "bg-orange-500",
      barra: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200",
    },
  },
  {
    claves: ["canva"],
    paleta: {
      chip: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-900",
      borde: "border-l-fuchsia-500",
      punto: "bg-fuchsia-500",
      barra: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/60 dark:text-fuchsia-200",
    },
  },
  {
    claves: ["youtube"],
    paleta: {
      chip: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900",
      borde: "border-l-rose-500",
      punto: "bg-rose-500",
      barra: "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
    },
  },
  {
    claves: ["telelatino", "tele"],
    paleta: {
      chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900",
      borde: "border-l-indigo-500",
      punto: "bg-indigo-500",
      barra: "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200",
    },
  },
  {
    claves: ["gemini", "google"],
    paleta: {
      chip: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900",
      borde: "border-l-amber-500",
      punto: "bg-amber-500",
      barra: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
    },
  },
];

function paletaDe(plataforma: string): Paleta {
  const p = (plataforma ?? "").toLowerCase();
  return PALETAS.find((x) => x.claves.some((c) => p.includes(c)))?.paleta ?? NEUTRAL;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  const p = fecha.split("-");
  if (p.length !== 3) return fecha;
  return `${Number(p[2])}/${Number(p[1])}/${p[0]}`;
}

function franjaVencimiento(dias: number | null) {
  if (dias === null)
    return {
      texto: "Sin fecha de vencimiento",
      clase:
        "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    };
  if (dias > 5)
    return {
      texto: `Vence en ${dias} días`,
      clase:
        "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    };
  if (dias > 0)
    return {
      texto: dias === 1 ? "Vence mañana" : `Vence en ${dias} días`,
      clase:
        "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    };
  if (dias === 0)
    return {
      texto: "Vence hoy",
      clase:
        "border-red-500 bg-red-600 text-white dark:border-red-500 dark:bg-red-700 font-bold motion-safe:animate-pulse",
    };
  const hace = Math.abs(dias);
  return {
    texto: `Venció hace ${hace} ${hace === 1 ? "día" : "días"}`,
    clase:
      "border-red-400 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200 font-semibold",
  };
}

/** Mensaje ya redactado para pedirle al admin (el negocio) la renovación. */
function mensajeSolicitud(v: VentaRevendedor): string {
  const cuando =
    v.dias === null
      ? ""
      : v.dias < 0
        ? ` (venció el ${formatearFecha(v.fecha_renovacion)})`
        : v.dias === 0
          ? " (vence hoy)"
          : ` (vence el ${formatearFecha(v.fecha_renovacion)})`;
  return `Hola, necesito renovar ${v.plataforma} de ${v.cliente}${cuando}.`;
}

/**
 * Botón para que el revendedor pida la renovación AL ADMIN (a mí), su único
 * canal (DEC-97: pide directo). Si hay número de negocio configurado abre
 * WhatsApp con el texto listo; si no, lo copia al portapapeles.
 */
function BotonSolicitud({
  v,
  whatsappNegocio,
}: {
  v: VentaRevendedor;
  whatsappNegocio: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const msg = mensajeSolicitud(v);

  if (whatsappNegocio) {
    const num = whatsappNegocio.replace(/[^\d]/g, "");
    return (
      <a
        href={`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98]"
      >
        <span aria-hidden>💬</span> Solicitar renovación al admin
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(msg);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          /* el navegador puede bloquear el portapapeles */
        }
      }}
      className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition active:scale-[0.98] dark:border-neutral-700 dark:text-neutral-200"
    >
      {copiado ? "✓ Copiado" : "📋 Copiar solicitud de renovación"}
    </button>
  );
}

function TarjetaCliente({
  v,
  whatsappNegocio,
}: {
  v: VentaRevendedor;
  whatsappNegocio: string | null;
}) {
  const pal = paletaDe(v.plataforma);
  const franja = franjaVencimiento(v.dias);
  const necesitaRenovar = v.dias !== null && v.dias <= 5;

  return (
    <div
      className={`rounded-xl border border-l-4 border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${pal.borde}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${pal.chip}`}
            >
              <span className={`size-2 rounded-full ${pal.punto}`} />
              {v.plataforma}
            </span>
            {v.modalidad && !v.plataforma?.toLowerCase().includes("spotify") && (
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {v.modalidad}
              </span>
            )}
          </div>

          <p className="mt-2 truncate text-base font-bold text-neutral-900 dark:text-white">
            {v.cliente}
          </p>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {v.plataforma?.toLowerCase().includes("spotify") ? "Spotify Premium" : v.producto}
            {v.estado !== "activa" ? ` · Status: ${v.estado}` : ""}
          </p>
        </div>

        {v.fecha_renovacion && (
          <div className="shrink-0 text-right">
            <span className="block font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span aria-hidden>📅</span> {formatearFecha(v.fecha_renovacion)}
            </span>
          </div>
        )}
      </div>

      <div
        className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${franja.clase}`}
      >
        <span>
          <span aria-hidden>⏰</span> {franja.texto}
        </span>
        {v.dias !== null && v.dias <= 0 && (
          <span className="rounded-full border border-current px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Revisar
          </span>
        )}
      </div>

      <div className="mt-3.5 space-y-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        {necesitaRenovar && <BotonSolicitud v={v} whatsappNegocio={whatsappNegocio} />}
        <BotonAcceso suscripcionId={v.suscripcion_id} />
      </div>
    </div>
  );
}

export function PanelRevendedor({
  ventas,
  initialQ,
  nombreUsuario,
  whatsappNegocio = null,
}: {
  ventas: VentaRevendedor[];
  initialQ?: string;
  nombreUsuario?: string;
  whatsappNegocio?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [vista, setVista] = useState<"operaciones" | "plataformas">(
    searchParams.get("vista") === "plataformas" ? "plataformas" : "operaciones",
  );
  const [q, setQ] = useState(initialQ ?? "");
  const [filtro, setFiltro] = useState<string | null>(searchParams.get("filtro"));

  // La vista y el filtro se reflejan en la URL para no perderlos al refrescar
  // ni al compartir el enlace. (La búsqueda queda local: cambia muy rápido.)
  const persistir = useCallback(
    (cambios: { vista?: string; filtro?: string | null }) => {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      if (cambios.vista) sp.set("vista", cambios.vista);
      if ("filtro" in cambios) {
        if (cambios.filtro) sp.set("filtro", cambios.filtro);
        else sp.delete("filtro");
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const cambiarVista = (x: "operaciones" | "plataformas") => {
    setVista(x);
    persistir({ vista: x });
  };
  const cambiarFiltro = (x: string | null) => {
    setFiltro(x);
    persistir({ filtro: x });
  };

  const busqueda = q.trim().toLowerCase();
  const filtradas = useMemo(
    () =>
      ventas.filter(
        (v) =>
          (!busqueda ||
            v.cliente?.toLowerCase().includes(busqueda) ||
            v.plataforma?.toLowerCase().includes(busqueda) ||
            v.producto?.toLowerCase().includes(busqueda) ||
            v.modalidad?.toLowerCase().includes(busqueda)) &&
          (!filtro || v.plataforma === filtro),
      ),
    [ventas, busqueda, filtro],
  );

  const alDia = filtradas.filter((v) => v.dias !== null && v.dias > 5).length;
  const porVencer = filtradas.filter((v) => v.dias !== null && v.dias >= 0 && v.dias <= 5).length;
  const vencidas = filtradas.filter((v) => v.dias !== null && v.dias < 0).length;
  const vencenHoy = filtradas.filter((v) => v.dias === 0).length;
  const urgentes = vencidas + vencenHoy;

  // Dentro de cada grupo, primero lo que vence antes.
  const ordenar = (arr: VentaRevendedor[]) =>
    [...arr].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));

  const plataformas = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of ventas) m.set(v.plataforma, (m.get(v.plataforma) ?? 0) + 1);
    return [...m.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n);
  }, [ventas]);

  const gruposVenc: { titulo: string; acento: string; items: VentaRevendedor[] }[] = [
    { titulo: "Vencidos (Atención inmediata)", acento: "text-red-600 dark:text-red-400 font-bold", items: ordenar(filtradas.filter((v) => v.dias !== null && v.dias < 0)) },
    { titulo: "Vencen hoy", acento: "text-red-600 dark:text-red-400 font-bold", items: filtradas.filter((v) => v.dias === 0) },
    { titulo: "Próximos 5 días", acento: "text-amber-600 dark:text-amber-400 font-semibold", items: ordenar(filtradas.filter((v) => v.dias !== null && v.dias > 0 && v.dias <= 5)) },
    { titulo: "Vigentes / Al día", acento: "text-emerald-600 dark:text-emerald-400 font-semibold", items: ordenar(filtradas.filter((v) => v.dias !== null && v.dias > 5)) },
    { titulo: "Sin fecha asignada", acento: "text-neutral-500 dark:text-neutral-400 font-semibold", items: filtradas.filter((v) => v.dias === null) },
  ];

  const porPlataforma = useMemo(() => {
    const m = new Map<string, VentaRevendedor[]>();
    for (const v of [...filtradas].sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))) {
      const arr = m.get(v.plataforma) ?? [];
      arr.push(v);
      m.set(v.plataforma, arr);
    }
    return [...m.entries()]
      .map(([nombre, items]) => ({ nombre, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filtradas]);

  const tabBtn = (activo: boolean) =>
    `flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-sm ${
      activo
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md"
        : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white"
    }`;

  return (
    <div className="space-y-6">
      {/* Cabecera de Bienvenida */}
      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-neutral-900 via-neutral-800 to-indigo-950 p-5 text-white shadow-lg dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              ¡Hola, {nombreUsuario || "Revendedor"}! 👋
            </h1>
            <p className="mt-1 text-xs text-neutral-300 sm:text-sm">
              Centro de Operaciones de Revendedor · Control de tus clientes y accesos en tiempo real
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            ● Portal Revendedor
          </span>
        </div>
      </div>

      {/* Aviso de acción del día */}
      {urgentes > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <span aria-hidden className="text-lg">🚨</span>
          <span>
            Tienes <strong>{urgentes}</strong>{" "}
            {urgentes === 1 ? "servicio que necesita" : "servicios que necesitan"} renovación
            {vencidas > 0 && vencenHoy > 0
              ? ` (${vencidas} vencido${vencidas === 1 ? "" : "s"} y ${vencenHoy} hoy)`
              : ""}
            . Contacta al admin para renovarlos.
          </span>
        </div>
      )}

      {/* Conmutador de vista */}
      <div className="flex gap-2">
        <button type="button" onClick={() => cambiarVista("operaciones")} className={tabBtn(vista === "operaciones")}>
          🗂 Operaciones y Vencimientos
        </button>
        <button type="button" onClick={() => cambiarVista("plataformas")} className={tabBtn(vista === "plataformas")}>
          🎨 Por Plataforma
        </button>
      </div>

      {/* Tarjetas de Métricas KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-neutral-900 dark:text-white">{filtradas.length}</span>
            <span className="text-lg">📦</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Al Día</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">{alDia}</span>
            <span className="text-lg">💚</span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm dark:border-amber-950 dark:bg-amber-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Por Vencer</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">{porVencer}</span>
            <span className="text-lg">⚠️</span>
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-sm dark:border-red-950 dark:bg-red-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">Vencidas</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black tabular-nums text-red-600 dark:text-red-400">{vencidas}</span>
            <span className="text-lg">🚨</span>
          </div>
        </div>
      </section>

      {/* Buscador de Clientes & Plataformas */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente, plataforma o modalidad…"
          className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-8 py-2.5 text-sm shadow-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* Chips-filtro por plataforma (Scroll Horizontal Táctil en Móvil) */}
      {plataformas.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => cambiarFiltro(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-bold transition ${
              filtro === null
                ? "bg-neutral-900 text-white shadow dark:bg-white dark:text-neutral-900"
                : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            Todas ({ventas.length})
          </button>
          {plataformas.map((p) => {
            const pal = paletaDe(p.nombre);
            const activo = filtro === p.nombre;
            return (
              <button
                key={p.nombre}
                type="button"
                onClick={() => cambiarFiltro(activo ? null : p.nombre)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-bold transition ${
                  activo
                    ? pal.chip + " ring-2 ring-neutral-800 dark:ring-white shadow"
                    : pal.chip
                }`}
              >
                <span className={`size-2 rounded-full ${pal.punto}`} />
                {p.nombre} ({p.n})
              </button>
            );
          })}
        </div>
      )}

      {filtradas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No se encontraron servicios que coincidan con la búsqueda.
        </p>
      ) : vista === "operaciones" ? (
        gruposVenc
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.titulo} className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
                <h2 className={`text-xs uppercase tracking-wider ${g.acento}`}>
                  {g.titulo}
                </h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-mono font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {g.items.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((v) => (
                  <TarjetaCliente key={v.suscripcion_id} v={v} whatsappNegocio={whatsappNegocio} />
                ))}
              </div>
            </section>
          ))
      ) : (
        porPlataforma.map((grupo) => {
          const pal = paletaDe(grupo.nombre);
          return (
            <section key={grupo.nombre} className="space-y-3">
              <h2
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-sm ${pal.barra}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${pal.punto}`} />
                  {grupo.nombre}
                </span>
                <span className="rounded-full bg-white/30 px-2.5 py-0.5 text-xs font-mono font-black dark:bg-black/30">
                  {grupo.items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.items.map((v) => (
                  <TarjetaCliente key={v.suscripcion_id} v={v} whatsappNegocio={whatsappNegocio} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
