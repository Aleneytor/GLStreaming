"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BotonAcceso } from "@/features/ventas/boton-acceso";
import { clasificarVentasRevendedor } from "./clasificacion";

/**
 * Panel del revendedor (cliente): dos vistas sobre SUS ventas.
 *   · «Operaciones»: resumen + clientes agrupados por vencimiento.
 *   · «Por plataforma»: los mismos clientes repartidos por plataforma.
 *
 * La plataforma se identifica por TEXTO (como en el Excel), no por un color de
 * fondo distinto para cada una — evita que compitan diez colores decorativos a
 * la vez. El único color que aparece siempre significa lo mismo: el estado de
 * vencimiento (al día / por vencer / vencido), en la franja de cada tarjeta y
 * en el borde lateral. Los datos llegan ya resueltos desde el servidor (solo
 * sus ventas, DEC-97); aquí solo se presentan y se filtran en memoria.
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
  nota_renovacion?: string | null;
};

type EstadoVencimiento = "ok" | "soon" | "late" | null;

/** Un solo eje de color: el estado de vencimiento, nunca la plataforma. */
function estadoDe(dias: number | null): EstadoVencimiento {
  if (dias === null) return null;
  if (dias <= 0) return "late";
  if (dias <= 5) return "soon";
  return "ok";
}

const BORDE_ESTADO: Record<Exclude<EstadoVencimiento, null>, string> = {
  ok: "border-l-emerald-500",
  soon: "border-l-amber-500",
  late: "border-l-red-500",
};

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

/**
 * Traduce nombres técnicos de modalidad a algo que el revendedor entiende.
 * "Perfil extra" es un producto independiente (cuenta propia), se distingue.
 * "Perfil individual", "Cupo por dispositivo", "Asiento" → "Perfil".
 * "Cuenta completa" y "Familiar" se conservan.
 */
/**
 * Color de texto sutil por plataforma para diferenciarlas al vuelo.
 * Solo el texto, nunca el fondo de la tarjeta (paleta calmada).
 */
const COLOR_PLATAFORMA: Record<string, string> = {
  netflix: "text-red-600 dark:text-red-400",
  "disney+": "text-blue-500 dark:text-blue-400",
  "hbo max": "text-purple-600 dark:text-purple-400",
  "prime video": "text-sky-500 dark:text-sky-400",
  crunchyroll: "text-orange-500 dark:text-orange-400",
  "paramount+": "text-blue-600 dark:text-blue-400",
  spotify: "text-green-500 dark:text-green-400",
  canva: "text-cyan-500 dark:text-cyan-400",
  flujotv: "text-rose-500 dark:text-rose-400",
  youtube: "text-red-500 dark:text-red-400",
  "gemini / google cloud": "text-amber-500 dark:text-amber-400",
};

function colorPlataforma(nombre: string): string {
  return COLOR_PLATAFORMA[nombre.toLowerCase()] ?? "";
}

function formatearProducto(
  _plataforma: string,
  _producto: string,
  modalidad: string,
): string {
  const m = modalidad.toLowerCase();
  if (m.includes("extra")) return "Perfil extra";
  if (m.includes("completa")) return "Cuenta completa";
  if (m.includes("familiar") || m.includes("miembro")) return "Familiar";
  // Perfil individual, cupo por dispositivo, asiento: todos son un perfil.
  return "Perfil";
}

function TarjetaCliente({
  v,
  whatsappNegocio,
}: {
  v: VentaRevendedor;
  whatsappNegocio: string | null;
}) {
  // Una pausa conserva el cupo para el cliente pero deja de ser una alarma de
  // renovación: se pinta neutra y sin botón de solicitud (misma regla que el
  // Centro de Operaciones del admin).
  const esPausa = v.estado === "pausada";
  const estado = esPausa ? null : estadoDe(v.dias);
  const borde = esPausa
    ? "border-l-neutral-400 dark:border-l-neutral-600"
    : estado
      ? BORDE_ESTADO[estado]
      : "border-l-neutral-300 dark:border-l-neutral-700";
  const franja = esPausa
    ? {
      texto: "En pausa · cupo reservado",
      clase:
        "border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
    }
    : franjaVencimiento(v.dias);
  const necesitaRenovar = !esPausa && v.dias !== null && v.dias <= 5;

  return (
    <div
      className={`rounded-xl border border-l-4 border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${borde}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${colorPlataforma(v.plataforma)}`}>
              <span className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
              {v.plataforma}
            </span>
          </div>

          <p className="mt-2 truncate text-base font-bold text-neutral-900 dark:text-white">
            {v.cliente}
          </p>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {v.plataforma?.toLowerCase().includes("spotify")
              ? "Spotify Premium"
              : formatearProducto(v.plataforma, v.producto, v.modalidad)}
          </p>
          {v.estado !== "activa" && v.estado !== "pausada" && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Estado: {v.estado}
            </p>
          )}
        </div>

        {v.fecha_renovacion && (
          <div className="shrink-0 text-right">
            <span className="block font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span aria-hidden>📅</span> {formatearFecha(v.fecha_renovacion)}
            </span>
          </div>
        )}
      </div>

      {v.nota_renovacion && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-neutral-50 px-2.5 py-1.5 text-[11px] leading-snug text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
          <span aria-hidden>📝</span> {v.nota_renovacion}
        </p>
      )}

      <div
        className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${franja.clase}`}
      >
        <span>
          <span aria-hidden>⏰</span> {franja.texto}
        </span>
        {!esPausa && v.dias !== null && v.dias <= 0 && (
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

  // Las métricas y los grupos de vencimiento solo cuentan ventas ACTIVAS; las
  // pausadas viven en su grupo neutro «En pausa · cupo reservado».
  const clasificacion = useMemo(() => clasificarVentasRevendedor(filtradas), [filtradas]);
  const { alDia, porVencer, vencidas, vencenHoy, urgentes } = clasificacion;

  const plataformas = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of ventas) m.set(v.plataforma, (m.get(v.plataforma) ?? 0) + 1);
    return [...m.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n);
  }, [ventas]);

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
    `flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-sm ${activo
      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md"
      : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-white"
    }`;

  return (
    <div className="space-y-6">
      {/* Cabecera de Bienvenida */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Portal revendedor
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-2xl">
              ¡Hola, {nombreUsuario || "Revendedor"}! 👋
            </h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
              Control de tus clientes y accesos, en un solo lugar.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Sesión activa
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
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-bold transition ${filtro === null
                ? "bg-neutral-900 text-white shadow dark:bg-white dark:text-neutral-900"
                : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
          >
            Todas ({ventas.length})
          </button>
          {plataformas.map((p) => {
            const activo = filtro === p.nombre;
            return (
              <button
                key={p.nombre}
                type="button"
                onClick={() => cambiarFiltro(activo ? null : p.nombre)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 font-bold transition ${activo
                    ? "bg-neutral-900 text-white shadow dark:bg-white dark:text-neutral-900"
                    : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
              >
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
        clasificacion.grupos
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
          return (
            <section key={grupo.nombre} className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 dark:border-neutral-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {grupo.nombre}
                </h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-mono font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {grupo.items.length}
                </span>
              </div>
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
