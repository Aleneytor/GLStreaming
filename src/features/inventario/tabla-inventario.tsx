"use client";

import { useState, useTransition, useEffect, useActionState } from "react";
import type { BadgeVencimiento } from "@/domain/fechas";
import { PanelLateralCuenta } from "./panel-lateral-cuenta";
import {
  moverCuentaAction,
  reordenarListaCuentasAction,
  cancelarVentaConLimpiezaAction,
  eliminarCuentasAction,
} from "./actions";
import { ModalVentaRapida } from "./modal-venta-rapida";
import type { VendedorOp } from "./modal-venta-rapida";
import { ModalRenovarProveedorRapido } from "./modal-renovar-proveedor";
import { ModalRenovarProveedorLote } from "./modal-renovar-proveedor-lote";
import { ModalGestionVenta } from "./modal-gestion-venta";
import { BotonTarjetaProveedor } from "./credenciales";
import {
  trasladarServicioPorFallaAction,
  type DestinoTraslado,
} from "./acciones-traslado";

export type CupoFila = {
  slotNumber: number;
  clave: string;
  cupo: string;
  unidadId: string | null;
  nombreUnidad: string | null;
  clienteId: string | null;
  cliente: string | null;
  celular: string | null;
  vendio: string | null;
  vendedorId: string | null;
  vendedorTipo: "revendedor" | "intermediario" | null;
  vendedorCobraEnParalela: boolean;
  clienteLogin: string | null;
  clienteClave: string | null;
  clienteTipoCorreo: string | null;
  pin: string | null;
  ingreso: number | null;
  inicio: string | null;
  vence: string | null;
  dias: number | null;
  badge: BadgeVencimiento | null;
  suscEstado: string | null;
  suscripcionId?: string | null;
  periodoId?: string | null;
};

export type BloqueCuenta = {
  cuentaId: string;
  correo: string;
  contrasena: string;
  pagador?: string | null;
  pagadorOrigen?: string | null;
  alias: string | null;
  notas: string | null;
  cuentaEstado: string;
  proveedorId: string | null;
  proveedor: string | null;
  proveedorTieneTarjeta: boolean;
  costo: number | null;
  renovarProveedor: string | null;
  diasProveedor: number | null;
  esCuentaCompleta?: boolean;
  esSpotifyFamiliar?: boolean;
  admisionSpotifyBloqueada?: boolean;
  motivoBloqueoSpotify?: string | null;
  filas: CupoFila[];
};

type SeleccionTraslado = {
  suscripcionId: string;
  clienteNombre: string;
  destinos: DestinoTraslado[];
  seleccionado: DestinoTraslado | null;
};

function BarraSeleccionTraslado({
  seleccion,
  slug,
  onCancelar,
  onSeleccionar,
}: {
  seleccion: SeleccionTraslado;
  slug: string;
  onCancelar: () => void;
  onSeleccionar: (destino: DestinoTraslado) => void;
}) {
  const [estado, action, pendiente] = useActionState(trasladarServicioPorFallaAction, null);

  return (
    <div className="sticky top-2 z-40 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 shadow-xl dark:border-amber-700 dark:bg-amber-950">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="suscripcion_id" value={seleccion.suscripcionId} />
        <input type="hidden" name="slug" value={slug} />
        <input
          type="hidden"
          name="cuenta_destino_id"
          value={seleccion.seleccionado?.cuentaId ?? ""}
        />
        <input
          type="hidden"
          name="unidad_destino_id"
          value={seleccion.seleccionado?.unidadId ?? ""}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
            Mover a {seleccion.clienteNombre}: toca un cupo verde compatible
          </p>
          <p className="mt-0.5 truncate text-[11px] text-amber-800 dark:text-amber-200">
            {seleccion.seleccionado
              ? `Destino: ${seleccion.seleccionado.etiqueta}`
              : `${seleccion.destinos.length} destino(s) disponible(s)`}
          </p>
          {estado?.error && <p className="mt-1 text-[11px] font-semibold text-red-700">{estado.error}</p>}
          {estado?.ok && <p className="mt-1 text-[11px] font-semibold text-emerald-700">{estado.ok}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100"
          >
            {estado?.ok ? "Listo" : "Cancelar"}
          </button>
          {!estado?.ok && (
            <button
              type="submit"
              disabled={!seleccion.seleccionado || pendiente}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {pendiente ? "Moviendo…" : "Confirmar traslado"}
            </button>
          )}
        </div>
      </form>
      {!estado?.ok && (
        <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto border-t border-amber-300 pt-3 sm:grid-cols-2 lg:grid-cols-3 dark:border-amber-800">
          {seleccion.destinos.map((destino) => {
            const elegido =
              seleccion.seleccionado?.cuentaId === destino.cuentaId &&
              seleccion.seleccionado?.unidadId === destino.unidadId;
            return (
              <button
                key={`${destino.cuentaId}:${destino.unidadId ?? "cuenta"}`}
                type="button"
                onClick={() => onSeleccionar(destino)}
                className={`rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition ${
                  elegido
                    ? "border-amber-600 bg-amber-500 text-white"
                    : "border-emerald-300 bg-white text-emerald-900 hover:border-emerald-600 dark:border-emerald-800 dark:bg-neutral-900 dark:text-emerald-200"
                }`}
              >
                {elegido ? "✓ " : ""}{destino.etiqueta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ControlesOrden({
  cuentaId,
  slug,
  dragHandleProps,
}: {
  cuentaId: string;
  slug: string;
  dragHandleProps?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
  };
}) {
  const btn =
    "rounded px-0.5 py-0.2 text-[10px] text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white";
  return (
    <div className="inline-flex items-center gap-1">
      <span
        {...dragHandleProps}
        className="cursor-grab text-xs font-bold text-neutral-400 hover:text-neutral-900 active:cursor-grabbing dark:hover:text-white"
        title="Arrastra para reordenar esta cuenta"
      >
        ⠿
      </span>

      <form action={moverCuentaAction} className="inline-flex items-center gap-0.5">
        <input type="hidden" name="cuenta_id" value={cuentaId} />
        <input type="hidden" name="slug" value={slug} />
        <button type="submit" name="accion" value="subir" className={btn} title="Subir uno">
          ▲
        </button>
        <button type="submit" name="accion" value="bajar" className={btn} title="Bajar uno">
          ▼
        </button>
      </form>
    </div>
  );
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  return `${Number(partes[2])}/${Number(partes[1])}/${partes[0]}`;
}

function alertaVencimientoMovil(dias: number | null) {
  if (dias === null) {
    return {
      texto: "Sin fecha de vencimiento",
      clase:
        "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    };
  }
  if (dias > 5) {
    return {
      texto: `Vence en ${dias} días`,
      clase:
        "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    };
  }
  if (dias > 0) {
    return {
      texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`,
      clase:
        "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    };
  }
  if (dias === 0) {
    return {
      texto: "Vence hoy · renovar",
      clase:
        "border-red-500 bg-red-600 text-white dark:border-red-500 dark:bg-red-700",
    };
  }
  const vencidoHace = Math.abs(dias);
  return {
    texto: `Venció hace ${vencidoHace} ${vencidoHace === 1 ? "día" : "días"}`,
    clase:
      "border-red-400 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200",
  };
}

export function TablaInventario({
  cuentas,
  slug,
  vendedores = [],
}: {
  cuentas: BloqueCuenta[];
  slug: string;
  vendedores?: VendedorOp[];
}) {
  const [cuentasState, setCuentasState] = useState<BloqueCuenta[]>(cuentas);
  const [cuentaEditando, setCuentaEditando] = useState<BloqueCuenta | null>(null);
  const [arrastrandoIndex, setArrastrandoIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Sincronizar estado local inmediatamente al recibir nuevas cuentas del servidor
  useEffect(() => {
    setCuentasState(cuentas);
  }, [cuentas]);

  // Modals interactivos
  const [ventaTarget, setVentaTarget] = useState<{
    cuentaId: string;
    unidadId: string | null;
    nombrePerfil: string;
    clienteLogin: string | null;
    clienteClave: string | null;
    esSpotifyFamiliar: boolean;
  } | null>(null);

  const [gestionVentaTarget, setGestionVentaTarget] = useState<CupoFila | null>(null);
  const [seleccionTraslado, setSeleccionTraslado] = useState<SeleccionTraslado | null>(null);

  const [renovarProvTarget, setRenovarProvTarget] = useState<{
    cuentaId: string;
    correoCuenta: string;
    costoActual: number | null;
    renovarProveedor: string | null;
  } | null>(null);

  const [modoSeleccionPagos, setModoSeleccionPagos] = useState(false);
  const [cuentasPagoSeleccionadas, setCuentasPagoSeleccionadas] = useState<string[]>([]);
  const [mostrarPagoLote, setMostrarPagoLote] = useState(false);

  // Modo BORRAR: seleccionar varias cuentas y eliminarlas de una (corrección de
  // cargas masivas). Cualquiera es elegible; el borrado es optimista.
  const [modoBorrar, setModoBorrar] = useState(false);
  const [cuentasBorrarSel, setCuentasBorrarSel] = useState<string[]>([]);
  const [, startBorrar] = useTransition();

  const alternarBorrar = (id: string) =>
    setCuentasBorrarSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const salirModoBorrar = () => {
    setModoBorrar(false);
    setCuentasBorrarSel([]);
  };

  const confirmarBorrado = () => {
    const ids = [...cuentasBorrarSel];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `¿Borrar ${ids.length} cuenta(s) y TODO su historial (ventas, cobros, ciclos)? No se puede deshacer.`,
      )
    ) {
      return;
    }
    // Optimista: desaparecen al instante; el servidor confirma detrás.
    setCuentasState((cs) => cs.filter((c) => !ids.includes(c.cuentaId)));
    salirModoBorrar();
    startBorrar(async () => {
      await eliminarCuentasAction(ids, slug);
    });
  };

  const cuentasRenovables = cuentasState.filter(
    (cuenta) => Boolean(cuenta.proveedorId && cuenta.renovarProveedor),
  );
  const proveedoresRenovables = Array.from(
    cuentasRenovables.reduce((mapa, cuenta) => {
      if (!cuenta.proveedorId) return mapa;
      const actual = mapa.get(cuenta.proveedorId);
      mapa.set(cuenta.proveedorId, {
        id: cuenta.proveedorId,
        nombre: cuenta.proveedor ?? "Sin nombre",
        cantidad: (actual?.cantidad ?? 0) + 1,
      });
      return mapa;
    }, new Map<string, { id: string; nombre: string; cantidad: number }>()),
  ).map(([, proveedor]) => proveedor);
  const cuentasSeleccionadas = cuentasState.filter((cuenta) =>
    cuentasPagoSeleccionadas.includes(cuenta.cuentaId),
  );
  const proveedorSeleccionadoId = cuentasSeleccionadas[0]?.proveedorId ?? null;

  const puedeSeleccionarse = (cuenta: BloqueCuenta) =>
    Boolean(
      cuenta.proveedorId &&
        cuenta.renovarProveedor &&
        (!proveedorSeleccionadoId || cuenta.proveedorId === proveedorSeleccionadoId),
    );

  const alternarCuentaPago = (cuenta: BloqueCuenta) => {
    if (!puedeSeleccionarse(cuenta)) return;
    setCuentasPagoSeleccionadas((actuales) =>
      actuales.includes(cuenta.cuentaId)
        ? actuales.filter((id) => id !== cuenta.cuentaId)
        : [...actuales, cuenta.cuentaId],
    );
  };

  const seleccionarProveedorCompleto = (proveedorId: string) => {
    setCuentasPagoSeleccionadas(
      cuentasRenovables
        .filter((cuenta) => cuenta.proveedorId === proveedorId)
        .map((cuenta) => cuenta.cuentaId),
    );
  };

  const tienePagador = cuentasState.some((c) => Boolean(c.pagador)) || slug.includes("spotify");

  const buscarDestino = (cuentaId: string, unidadId: string | null) =>
    seleccionTraslado?.destinos.find(
      (destino) => destino.cuentaId === cuentaId && destino.unidadId === unidadId,
    ) ?? null;

  const manejarCupoLibre = (
    cuenta: BloqueCuenta,
    unidadId: string | null,
    nombrePerfil: string,
    clienteLogin: string | null,
    clienteClave: string | null,
  ) => {
    if (seleccionTraslado) {
      const destino = buscarDestino(cuenta.cuentaId, unidadId);
      if (destino) {
        setSeleccionTraslado({ ...seleccionTraslado, seleccionado: destino });
      }
      return;
    }
    setVentaTarget({
      cuentaId: cuenta.cuentaId,
      unidadId,
      nombrePerfil,
      clienteLogin,
      clienteClave,
      esSpotifyFamiliar: Boolean(cuenta.esSpotifyFamiliar),
    });
  };

  const handleDrop = (origenIdx: number, destinoIdx: number) => {
    if (origenIdx === destinoIdx) return;
    const nuevas = [...cuentasState];
    const [removido] = nuevas.splice(origenIdx, 1);
    nuevas.splice(destinoIdx, 0, removido);

    setCuentasState(nuevas);
    setArrastrandoIndex(null);
    setTargetIndex(null);

    startTransition(async () => {
      await reordenarListaCuentasAction(
        nuevas.map((c) => c.cuentaId),
        slug,
      );
    });
  };

  return (
    <div className="space-y-4">
      {seleccionTraslado && (
        <BarraSeleccionTraslado
          seleccion={seleccionTraslado}
          slug={slug}
          onCancelar={() => setSeleccionTraslado(null)}
          onSeleccionar={(destino) =>
            setSeleccionTraslado({ ...seleccionTraslado, seleccionado: destino })
          }
        />
      )}
      {/* Barra de acciones: borrar cuentas en lote */}
      <div className="flex items-center justify-end gap-2">
        {!modoBorrar ? (
          <button
            type="button"
            onClick={() => setModoBorrar(true)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            🗑 Borrar cuentas
          </button>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/40">
            <span className="text-xs font-semibold text-red-800 dark:text-red-200">
              {cuentasBorrarSel.length} seleccionada(s) para borrar
            </span>
            <button
              type="button"
              onClick={() => setCuentasBorrarSel(cuentasState.map((c) => c.cuentaId))}
              className="rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-700 dark:border-red-800 dark:text-red-300"
            >
              Seleccionar todas ({cuentasState.length})
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={salirModoBorrar}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] dark:border-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cuentasBorrarSel.length === 0}
                onClick={confirmarBorrado}
                className="rounded-md bg-red-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
              >
                Borrar {cuentasBorrarSel.length}
              </button>
            </div>
          </div>
        )}
      </div>

      {cuentasRenovables.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950/30">
          {!modoSeleccionPagos ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-purple-950 dark:text-purple-100">Pago a proveedor por lote</p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">Selecciona varias cuentas y registra una sola fecha de pago.</p>
              </div>
              <button
                type="button"
                onClick={() => setModoSeleccionPagos(true)}
                className="shrink-0 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Seleccionar cuentas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={proveedorSeleccionadoId ?? ""}
                  onChange={(event) => seleccionarProveedorCompleto(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs dark:border-purple-800 dark:bg-neutral-900"
                >
                  <option value="" disabled>Seleccionar todas por proveedor…</option>
                  {proveedoresRenovables.map((proveedor) => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre} ({proveedor.cantidad})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={cuentasSeleccionadas.length === 0}
                  onClick={() => setMostrarPagoLote(true)}
                  className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Continuar ({cuentasSeleccionadas.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoSeleccionPagos(false);
                    setCuentasPagoSeleccionadas([]);
                  }}
                  className="rounded-lg border border-purple-300 px-3 py-2 text-xs dark:border-purple-800"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Puedes desmarcar cuentas después de seleccionar el proveedor completo.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VISTA MÓVIL (Tarjetas apiladas por cuenta) */}
      <div className="block space-y-4 md:hidden">
        {cuentasState.map((cta, index) => (
          <TarjetaCuentaMovil
            key={cta.cuentaId}
            cta={cta}
            numCuenta={index + 1}
            mostrarPagador={slug === "spotify"}
            modoSeleccionPago={modoSeleccionPagos}
            seleccionada={cuentasPagoSeleccionadas.includes(cta.cuentaId)}
            seleccionHabilitada={puedeSeleccionarse(cta)}
            onSeleccionarPago={() => alternarCuentaPago(cta)}
            modoBorrar={modoBorrar}
            borrarMarcada={cuentasBorrarSel.includes(cta.cuentaId)}
            onToggleBorrar={() => alternarBorrar(cta.cuentaId)}
            onEditar={() => setCuentaEditando(cta)}
            onIniciarVenta={(unidadId, nombrePerfil, clienteLogin, clienteClave) =>
              manejarCupoLibre(cta, unidadId, nombrePerfil, clienteLogin, clienteClave)
            }
            destinosTraslado={seleccionTraslado?.destinos ?? null}
            destinoSeleccionado={seleccionTraslado?.seleccionado ?? null}
            onGestionarVenta={(fila) => setGestionVentaTarget(fila)}
            onRenovarProveedor={() =>
              setRenovarProvTarget({
                cuentaId: cta.cuentaId,
                correoCuenta: cta.correo,
                costoActual: cta.costo,
                renovarProveedor: cta.renovarProveedor,
              })
            }
          />
        ))}
      </div>

      {/* VISTA ESCRITORIO (Tabla Excel de 16 columnas pulida y respirable) */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-zinc-900 md:block">
        <table className="w-full border-collapse text-left text-xs leading-normal">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-xs font-bold uppercase tracking-wider text-slate-200 dark:bg-zinc-950 dark:text-zinc-200">
              {tienePagador && (
                <th className="border-r border-slate-800 px-3 py-2.5">
                  Pagador
                </th>
              )}
              <th className="border-r border-slate-800 px-2 py-2.5 text-center">
                N°
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                Correo
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                Contraseña
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                {cuentasState.some((cuenta) => cuenta.esSpotifyFamiliar)
                  ? "Correo cliente"
                  : "Perfil"}
              </th>
              <th className="border-r border-slate-800 px-2.5 py-2.5 text-center">
                {cuentasState.some((cuenta) => cuenta.esSpotifyFamiliar)
                  ? "Clave cliente"
                  : "Pin"}
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5 text-right">
                Ingresos
              </th>
              <th className="border-r border-slate-800 px-2.5 py-2.5 text-center">
                Inicio
              </th>
              <th className="border-r border-slate-800 px-2 py-2.5 text-center">
                Días
              </th>
              <th className="border-r border-slate-800 px-2.5 py-2.5 text-center">
                Vence
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5 text-center">
                Alerta
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                Cliente
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                N° Celular
              </th>
              <th className="border-r border-slate-800 px-3 py-2.5">
                Vendió
              </th>
              <th className="border-r border-slate-800 bg-slate-950 px-3 py-2.5 text-right text-indigo-300">
                Inversión
              </th>
              <th className="border-r border-slate-800 bg-slate-950 px-3 py-2.5 text-indigo-300">
                Proveedor
              </th>
              <th className="border-r border-slate-800 bg-slate-950 px-2.5 py-2.5 text-center text-indigo-300">
                Renovar
              </th>
              <th className="border-r border-slate-800 bg-slate-950 px-3 py-2.5 text-center text-indigo-300">
                Aviso
              </th>
              <th className="border-r border-slate-800 bg-slate-950 px-2 py-2.5 text-center text-indigo-300">
                N° Ctas
              </th>
              <th className="bg-slate-950 px-2.5 py-2.5 text-center text-slate-300">
                ⚙️
              </th>
            </tr>
          </thead>
          <tbody>
            {cuentasState.map((cta, index) => (
              <BloqueCuentaExcel
                key={cta.cuentaId}
                cta={cta}
                slug={slug}
                index={index}
                numCuenta={index + 1}
                tienePagador={tienePagador}
                modoSeleccionPago={modoSeleccionPagos}
                seleccionada={cuentasPagoSeleccionadas.includes(cta.cuentaId)}
                seleccionHabilitada={puedeSeleccionarse(cta)}
                onSeleccionarPago={() => alternarCuentaPago(cta)}
                modoBorrar={modoBorrar}
                borrarMarcada={cuentasBorrarSel.includes(cta.cuentaId)}
                onToggleBorrar={() => alternarBorrar(cta.cuentaId)}
                isTarget={targetIndex === index}
                onEditar={() => setCuentaEditando(cta)}
                onIniciarVenta={(unidadId, nombrePerfil, clienteLogin, clienteClave) =>
                  manejarCupoLibre(cta, unidadId, nombrePerfil, clienteLogin, clienteClave)
                }
                destinosTraslado={seleccionTraslado?.destinos ?? null}
                destinoSeleccionado={seleccionTraslado?.seleccionado ?? null}
                onGestionarVenta={(fila) => setGestionVentaTarget(fila)}
                onRenovarProveedor={() =>
                  setRenovarProvTarget({
                    cuentaId: cta.cuentaId,
                    correoCuenta: cta.correo,
                    costoActual: cta.costo,
                    renovarProveedor: cta.renovarProveedor,
                  })
                }
                onDragStart={() => setArrastrandoIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (targetIndex !== index) setTargetIndex(index);
                }}
                onDrop={() => {
                  if (arrastrandoIndex !== null) handleDrop(arrastrandoIndex, index);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal amplio de edición de cuenta */}
      {cuentaEditando && (
        <PanelLateralCuenta
          cuenta={cuentaEditando}
          slug={slug}
          onCerrar={() => setCuentaEditando(null)}
        />
      )}

      {/* Modal de venta directa en celda Vacío */}
      {ventaTarget && (
        <ModalVentaRapida
          cuentaId={ventaTarget.cuentaId}
          unidadId={ventaTarget.unidadId}
          nombrePerfil={ventaTarget.nombrePerfil}
          clienteLogin={ventaTarget.clienteLogin}
          clienteClave={ventaTarget.clienteClave}
          esSpotifyFamiliar={ventaTarget.esSpotifyFamiliar}
          slug={slug}
          vendedores={vendedores}
          onCerrar={() => setVentaTarget(null)}
        />
      )}

      {/* Modal de gestión de venta al hacer clic en un cliente */}
      {gestionVentaTarget && gestionVentaTarget.suscripcionId && (
        <ModalGestionVenta
          suscripcionId={gestionVentaTarget.suscripcionId}
          periodoId={gestionVentaTarget.periodoId ?? null}
          unidadId={gestionVentaTarget.unidadId}
          clienteId={gestionVentaTarget.clienteId}
          clienteNombre={gestionVentaTarget.cliente ?? "Cliente"}
          clienteCelular={gestionVentaTarget.celular}
          nombrePerfil={gestionVentaTarget.cupo}
          pinPerfil={gestionVentaTarget.pin}
          esSpotifyFamiliar={Boolean(
            cuentasState.find((cuenta) =>
              cuenta.filas.some((fila) => fila.clave === gestionVentaTarget.clave),
            )?.esSpotifyFamiliar,
          )}
          clienteLogin={gestionVentaTarget.clienteLogin}
          clienteClave={gestionVentaTarget.clienteClave}
          clienteTipoCorreo={gestionVentaTarget.clienteTipoCorreo}
          vence={gestionVentaTarget.vence}
          precioUsd={gestionVentaTarget.ingreso}
          vendedorActualId={gestionVentaTarget.vendedorId}
          vendedorActualTipo={gestionVentaTarget.vendedorTipo}
          vendedorActualCobraEnParalela={gestionVentaTarget.vendedorCobraEnParalela}
          slug={slug}
          vendedores={vendedores}
          onCerrar={() => setGestionVentaTarget(null)}
          onSeleccionarTraslado={(destinos) => {
            setSeleccionTraslado({
              suscripcionId: gestionVentaTarget.suscripcionId!,
              clienteNombre: gestionVentaTarget.cliente ?? "Cliente",
              destinos,
              seleccionado: null,
            });
            setGestionVentaTarget(null);
          }}
        />
      )}

      {/* Modal de renovación directa con proveedor */}
      {renovarProvTarget && (
        <ModalRenovarProveedorRapido
          cuentaId={renovarProvTarget.cuentaId}
          correoCuenta={renovarProvTarget.correoCuenta}
          costoActual={renovarProvTarget.costoActual}
          renovarProveedor={renovarProvTarget.renovarProveedor}
          slug={slug}
          onCerrar={() => setRenovarProvTarget(null)}
        />
      )}

      {mostrarPagoLote && cuentasSeleccionadas.length > 0 && (
        <ModalRenovarProveedorLote
          cuentas={cuentasSeleccionadas.map((cuenta) => ({
            cuentaId: cuenta.cuentaId,
            correo: cuenta.correo,
            proveedor: cuenta.proveedor,
            costo: cuenta.costo,
            renovarProveedor: cuenta.renovarProveedor!,
          }))}
          slug={slug}
          onCerrar={() => {
            setMostrarPagoLote(false);
            setModoSeleccionPagos(false);
            setCuentasPagoSeleccionadas([]);
          }}
        />
      )}
    </div>
  );
}

function BloqueCuentaExcel({
  cta,
  slug,
  index,
  numCuenta,
  tienePagador,
  modoSeleccionPago,
  seleccionada,
  seleccionHabilitada,
  onSeleccionarPago,
  modoBorrar,
  borrarMarcada,
  onToggleBorrar,
  isTarget,
  onEditar,
  onIniciarVenta,
  destinosTraslado,
  destinoSeleccionado,
  onGestionarVenta,
  onRenovarProveedor,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  cta: BloqueCuenta;
  slug: string;
  index: number;
  numCuenta: number;
  tienePagador: boolean;
  modoSeleccionPago: boolean;
  seleccionada: boolean;
  seleccionHabilitada: boolean;
  onSeleccionarPago: () => void;
  modoBorrar: boolean;
  borrarMarcada: boolean;
  onToggleBorrar: () => void;
  isTarget: boolean;
  onEditar: () => void;
  onIniciarVenta: (
    unidadId: string | null,
    nombrePerfil: string,
    clienteLogin: string | null,
    clienteClave: string | null,
  ) => void;
  destinosTraslado: DestinoTraslado[] | null;
  destinoSeleccionado: DestinoTraslado | null;
  onGestionarVenta: (fila: CupoFila) => void;
  onRenovarProveedor: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const filasARenderizar = cta.filas;
  const totalFilas = filasARenderizar.length;

  return (
    <>
      {filasARenderizar.map((f, i) => {
        const esPrimera = i === 0;

        let claseAlerta = "bg-[#16a34a] text-white";
        let textoAlerta = "";
        const esLibre = !f.cliente;
        const destinoCompatible = destinosTraslado?.find(
          (destino) =>
            destino.cuentaId === cta.cuentaId &&
            (destino.unidadId === f.unidadId || (destino.unidadId === null && i === 0)),
        );
        const esDestinoSeleccionado = Boolean(
          destinoCompatible &&
            destinoSeleccionado?.cuentaId === destinoCompatible.cuentaId &&
            destinoSeleccionado?.unidadId === destinoCompatible.unidadId,
        );

        if (esLibre) {
          if (destinosTraslado) {
            claseAlerta = destinoCompatible
              ? esDestinoSeleccionado
                ? "bg-amber-500 text-white cursor-pointer font-bold ring-2 ring-amber-300 rounded-md px-2.5 py-1 shadow-sm"
                : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold rounded-md px-2.5 py-1 shadow-sm"
              : "bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 rounded-md px-2 py-1";
            textoAlerta = destinoCompatible
              ? esDestinoSeleccionado
                ? "Destino elegido ✓"
                : "Elegir destino"
              : "No compatible";
          } else if (cta.admisionSpotifyBloqueada) {
            claseAlerta =
              "bg-amber-100 text-amber-950 border border-amber-300 font-bold dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50 rounded-md px-2.5 py-1";
            textoAlerta = "No se puede";
          } else {
            claseAlerta =
              "bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition active:scale-[0.98] rounded-md px-3 py-1 shadow-sm";
            textoAlerta = "Vacío (+ Vender)";
          }
        } else if (f.dias === null) {
          claseAlerta = "bg-slate-100 text-slate-700 font-medium dark:bg-zinc-800 dark:text-zinc-300 rounded-md px-2.5 py-1";
          textoAlerta = "Sin fecha";
        } else if (f.dias > 0) {
          claseAlerta = "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50 dark:hover:bg-emerald-500/30 rounded-md px-2.5 py-1 shadow-sm cursor-pointer";
          textoAlerta = `Falta ${f.dias} días ⚙️`;
        } else if (f.dias === 0) {
          claseAlerta = "bg-rose-600 text-white font-black hover:bg-rose-700 rounded-md px-2.5 py-1 animate-pulse shadow-md cursor-pointer";
          textoAlerta = "Vence hoy ⚙️";
        } else {
          const transcurridos = Math.abs(f.dias);
          claseAlerta = "bg-rose-100 text-rose-950 border border-rose-300 font-bold hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/50 dark:hover:bg-rose-500/30 rounded-md px-2.5 py-1 shadow-sm cursor-pointer";
          textoAlerta = `Venció hace ${transcurridos} ${transcurridos === 1 ? "día" : "días"} ⚙️`;
        }

        let claseAvisoProv = "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50 dark:hover:bg-emerald-500/30 rounded-md px-2.5 py-1 shadow-sm cursor-pointer";
        let textoAvisoProv = "";
        if (!cta.renovarProveedor) {
          claseAvisoProv =
            "bg-slate-100 text-slate-600 border border-dashed border-slate-300 hover:bg-slate-200 cursor-pointer rounded-md px-2.5 py-1 font-medium dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
          textoAvisoProv = "+ Pagar";
        } else if ((cta.diasProveedor ?? 0) >= 0) {
          claseAvisoProv =
            "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/50 dark:hover:bg-emerald-500/30 rounded-md px-2.5 py-1 shadow-sm cursor-pointer";
          textoAvisoProv = `Falta ${cta.diasProveedor} días 🔄`;
        } else {
          claseAvisoProv = "bg-rose-100 text-rose-950 border border-rose-300 font-bold hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/50 dark:hover:bg-rose-500/30 rounded-md px-2.5 py-1 shadow-sm cursor-pointer";
          textoAvisoProv = `Vencido hace ${Math.abs(cta.diasProveedor ?? 0)} días 🔄`;
        }

        return (
          <tr
            key={f.clave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`transition-colors hover:bg-indigo-50/40 dark:hover:bg-zinc-800/60 ${
              isTarget && esPrimera ? "ring-2 ring-indigo-500" : ""
            } ${
              esPrimera
                ? "border-t-[6px] border-slate-900 dark:border-black"
                : "border-t border-slate-200 dark:border-slate-800/80"
            }`}
          >
            {/* Pagador */}
            {tienePagador && esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 bg-slate-50/60 px-3 py-2 align-middle text-slate-600 dark:border-slate-800 dark:bg-zinc-950/60 dark:text-slate-400"
              >
                <span className="block font-semibold">{cta.pagador ? `(${cta.pagador})` : "—"}</span>
                {cta.pagadorOrigen && (
                  <span className="mt-0.5 block text-[10px] uppercase font-bold text-slate-400">
                    {cta.pagadorOrigen.replaceAll("_", " ")}
                  </span>
                )}
              </td>
            )}

            {/* 1. N° */}
            <td className="border border-slate-200 bg-slate-100/70 px-2.5 py-2.5 text-center font-mono font-bold text-slate-800 align-middle dark:border-slate-800 dark:bg-zinc-800/90 dark:text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                {modoBorrar && esPrimera && (
                  <input
                    type="checkbox"
                    checked={borrarMarcada}
                    onChange={onToggleBorrar}
                    aria-label={`Seleccionar para borrar ${cta.correo}`}
                    className="size-3.5 accent-red-600"
                  />
                )}
                {modoSeleccionPago && !modoBorrar && esPrimera && (
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    disabled={!seleccionHabilitada && !seleccionada}
                    onChange={onSeleccionarPago}
                    aria-label={`Seleccionar pago de ${cta.correo}`}
                    className="size-3.5 accent-purple-600"
                  />
                )}
                {totalFilas > 1 ? f.slotNumber : numCuenta}
              </span>
            </td>

            {/* 2. Correo (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 bg-white px-3 py-2 align-middle font-semibold text-indigo-600 underline dark:border-slate-800 dark:bg-zinc-900 dark:text-indigo-400"
              >
                {cta.correo}
                {cta.alias && <span className="ml-1 text-[11px] text-slate-400 font-normal">({cta.alias})</span>}
              </td>
            )}

            {/* 3. Contraseña (Fusionada) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 bg-white px-3 py-2 align-middle font-medium text-slate-800 dark:border-slate-800 dark:bg-zinc-900 dark:text-slate-200"
              >
                {cta.contrasena}
              </td>
            )}

            {/* 4. Perfil */}
            {(!cta.esCuentaCompleta || esPrimera) && (
              <td
                rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                className="border border-slate-200 px-3 py-2 font-semibold text-slate-900 align-middle dark:border-slate-800 dark:text-white"
              >
                {cta.esSpotifyFamiliar
                  ? f.clienteLogin ?? "Sin correo preparado"
                  : cta.esCuentaCompleta
                    ? "Cuenta Completa"
                    : f.cupo}
              </td>
            )}

            {/* 5. Pin */}
            {(!cta.esCuentaCompleta || esPrimera) && (
              <td
                rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                className="border border-slate-200 px-2.5 py-2 text-center font-mono font-medium text-slate-700 align-middle dark:border-slate-800 dark:text-slate-300"
              >
                {cta.esSpotifyFamiliar ? f.clienteClave ?? "" : f.pin ?? ""}
              </td>
            )}

            {/* Columnas de Venta (Fusionadas visualmente si es Cuenta Completa) */}
            {(!cta.esCuentaCompleta || esPrimera) && (
              <>
                {/* 6. Ingresos */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-slate-900 align-middle dark:border-slate-800 dark:text-white"
                >
                  {f.ingreso != null
                    ? `$ ${f.ingreso.toFixed(2)}`
                    : cta.esCuentaCompleta && cta.filas[0]?.ingreso != null
                    ? `$ ${cta.filas[0].ingreso.toFixed(2)}`
                    : ""}
                </td>

                {/* 7. Inicio */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-2.5 py-2 text-center align-middle font-mono text-slate-600 dark:border-slate-800 dark:text-slate-400"
                >
                  {formatearFecha(f.inicio)}
                </td>

                {/* 8. Días */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-2 py-2 text-center align-middle font-mono text-slate-600 dark:border-slate-800 dark:text-slate-400"
                >
                  {f.cliente ? 30 : ""}
                </td>

                {/* 9. Vence */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-2.5 py-2 text-center font-mono font-bold text-slate-900 align-middle dark:border-slate-800 dark:text-white"
                >
                  {formatearFecha(f.vence)}
                </td>

                {/* 10. Alerta */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  onClick={() => {
                    if (esLibre) {
                      if (cta.admisionSpotifyBloqueada && !destinosTraslado) return;
                      if (destinosTraslado && !destinoCompatible) return;
                      onIniciarVenta(
                        destinosTraslado ? destinoCompatible!.unidadId : f.unidadId,
                        f.cupo,
                        f.clienteLogin,
                        f.clienteClave,
                      );
                    } else {
                      onGestionarVenta(f);
                    }
                  }}
                  className={`border border-slate-200 px-3 py-2 text-center align-middle ${claseAlerta}`}
                  title={
                    esLibre
                      ? destinosTraslado
                        ? destinoCompatible
                          ? "Elegir este cupo como destino"
                          : "Este cupo no es compatible"
                        : "Haz clic para vender este cupo"
                      : "Haz clic para gestionar esta venta"
                  }
                >
                  {textoAlerta}
                </td>

                {/* 11. Cliente */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  onClick={() => {
                    if (!esLibre) onGestionarVenta(f);
                  }}
                  className={`border border-slate-200 px-3 py-2 font-bold text-slate-900 align-middle dark:border-slate-800 dark:text-white ${
                    !esLibre ? "cursor-pointer hover:bg-slate-100/70 hover:underline dark:hover:bg-zinc-800/80" : ""
                  }`}
                  title={!esLibre ? "Haz clic para renovar, editar o eliminar esta venta" : ""}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span>{f.cliente ?? ""}</span>
                    {f.suscripcionId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGestionarVenta(f);
                        }}
                        title="Gestionar venta (renovar, editar o borrar)"
                        className="text-xs text-slate-400 opacity-70 hover:opacity-100 hover:text-slate-900 dark:hover:text-white"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>
                </td>

                {/* 12. N° Celular */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-3 py-2 font-mono text-slate-800 align-middle dark:border-slate-800 dark:text-slate-200"
                >
                  {f.celular ?? ""}
                </td>

                {/* 13. Vendió */}
                <td
                  rowSpan={cta.esCuentaCompleta ? totalFilas : 1}
                  className="border border-slate-200 px-3 py-2 text-slate-700 align-middle dark:border-slate-800 dark:text-slate-300"
                >
                  {f.vendio ?? ""}
                </td>
              </>
            )}

            {/* 14. Inversión (Fusionada) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 px-3 py-2 text-right font-bold tabular-nums text-slate-900 align-middle dark:border-slate-800 dark:text-white"
              >
                {cta.costo != null ? `$ ${cta.costo.toFixed(2)}` : ""}
              </td>
            )}

            {/* 15. Proveedor (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 px-3 py-2 font-medium text-slate-800 align-middle dark:border-slate-800 dark:text-slate-200"
              >
                <span className="block font-semibold">{cta.proveedor ?? ""}</span>
                {cta.proveedorId && cta.proveedorTieneTarjeta && (
                  <BotonTarjetaProveedor proveedorId={cta.proveedorId} />
                )}
              </td>
            )}

            {/* 16. Renovar Proveedor (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 px-2.5 py-2 text-center font-mono font-semibold text-slate-800 align-middle dark:border-slate-800 dark:text-slate-200"
              >
                {formatearFecha(cta.renovarProveedor)}
              </td>
            )}

            {/* 17. Aviso Proveedor (Fusionado interactivo para Renovar Proveedor) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                onClick={onRenovarProveedor}
                className={`border border-slate-200 px-3 py-2 text-center align-middle ${claseAvisoProv}`}
                title="Haz clic para extender 30 días con el proveedor"
              >
                {textoAvisoProv}
              </td>
            )}

            {/* 18. N° Ctas (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 bg-slate-100/70 px-2 py-2 text-center font-bold text-slate-700 align-middle dark:border-slate-800 dark:bg-zinc-800/80 dark:text-slate-300"
              >
                {numCuenta}
              </td>
            )}

            {/* 19. Acciones (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-slate-200 px-2.5 py-2 text-center align-middle"
              >
                <div className="flex items-center justify-center gap-1">
                  <ControlesOrden
                    cuentaId={cta.cuentaId}
                    slug={slug}
                    dragHandleProps={{
                      draggable: true,
                      onDragStart: (e) => {
                        e.dataTransfer.setData("text/plain", String(index));
                        onDragStart();
                      },
                    }}
                  />
                  <button
                    type="button"
                    onClick={onEditar}
                    className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-white transition hover:bg-neutral-900"
                  >
                    ⚙️
                  </button>
                </div>
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}

function TarjetaCuentaMovil({
  cta,
  numCuenta,
  mostrarPagador,
  modoSeleccionPago,
  seleccionada,
  seleccionHabilitada,
  onSeleccionarPago,
  modoBorrar,
  borrarMarcada,
  onToggleBorrar,
  onEditar,
  onIniciarVenta,
  destinosTraslado,
  destinoSeleccionado,
  onGestionarVenta,
  onRenovarProveedor,
}: {
  cta: BloqueCuenta;
  numCuenta: number;
  mostrarPagador: boolean;
  modoSeleccionPago: boolean;
  seleccionada: boolean;
  seleccionHabilitada: boolean;
  onSeleccionarPago: () => void;
  modoBorrar: boolean;
  borrarMarcada: boolean;
  onToggleBorrar: () => void;
  onEditar: () => void;
  onIniciarVenta: (
    unidadId: string | null,
    nombrePerfil: string,
    clienteLogin: string | null,
    clienteClave: string | null,
  ) => void;
  destinosTraslado: DestinoTraslado[] | null;
  destinoSeleccionado: DestinoTraslado | null;
  onGestionarVenta: (fila: CupoFila) => void;
  onRenovarProveedor: () => void;
}) {
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false);
  // En escritorio se conservan las cinco líneas físicas del bloque Excel; en
  // móvil una cuenta completa es una sola venta y no debe repetirse cinco veces.
  const filasMovil = cta.esCuentaCompleta ? cta.filas.slice(0, 1) : cta.filas;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-900">
      {/* Encabezado de la cuenta */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {modoBorrar && (
            <input
              type="checkbox"
              checked={borrarMarcada}
              onChange={onToggleBorrar}
              aria-label={`Seleccionar para borrar ${cta.correo}`}
              className="size-4 accent-red-600"
            />
          )}
          {modoSeleccionPago && !modoBorrar && (
            <input
              type="checkbox"
              checked={seleccionada}
              disabled={!seleccionHabilitada && !seleccionada}
              onChange={onSeleccionarPago}
              aria-label={`Seleccionar pago de ${cta.correo}`}
              className="size-4 accent-purple-600"
            />
          )}
          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            #{numCuenta}
          </span>
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
            {cta.correo}
          </span>
        </div>
        <button
          type="button"
          onClick={onEditar}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-zinc-800"
        >
          ⚙️ Editar
        </button>
      </div>

      {/* Info proveedor y credenciales */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span>Proveedor: </span>
          <strong className="text-slate-900 dark:text-white">{cta.proveedor ?? "Directo"}</strong>
          {cta.costo != null && (
            <span className="ml-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ${cta.costo.toFixed(2)}
            </span>
          )}
          {cta.proveedorId && cta.proveedorTieneTarjeta && (
            <BotonTarjetaProveedor proveedorId={cta.proveedorId} />
          )}
        </div>
        <button
          type="button"
          onClick={() => setMostrarCredenciales(!mostrarCredenciales)}
          className="font-mono text-[11px] font-semibold text-indigo-600 underline dark:text-indigo-400"
        >
          {mostrarCredenciales ? "Ocultar clave" : "Ver clave"}
        </button>
      </div>

      {cta.renovarProveedor && (
        <button
          type="button"
          onClick={onRenovarProveedor}
          className="mt-2.5 flex min-h-10 w-full items-center justify-between rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-2 text-left text-xs font-semibold text-purple-900 transition hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-200"
        >
          <span>Pago al proveedor</span>
          <span className="font-mono">{formatearFecha(cta.renovarProveedor)}</span>
        </button>
      )}

      {mostrarPagador && (
        <div className="mt-2.5 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-xs dark:border-violet-900 dark:bg-violet-950/30">
          <span className="text-violet-700 dark:text-violet-300 font-semibold">💳 Gmail pagador: </span>
          <strong className="break-all font-mono text-violet-950 dark:text-violet-100">
            {cta.pagador ?? "No registrado"}
          </strong>
          {cta.pagadorOrigen && (
            <span className="ml-1 text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400">
              · {cta.pagadorOrigen.replaceAll("_", " ")}
            </span>
          )}
        </div>
      )}

      {cta.admisionSpotifyBloqueada && (
        <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
          ⛔ Spotify no permite incorporar miembros nuevos temporalmente.
          {cta.motivoBloqueoSpotify && (
            <span className="mt-0.5 block text-[10px] font-normal opacity-75">
              {cta.motivoBloqueoSpotify}
            </span>
          )}
        </div>
      )}

      {mostrarCredenciales && (
        <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-zinc-800 dark:text-slate-200">
          🔑 Clave: {cta.contrasena}
        </div>
      )}

      {/* Lista de cupos/perfiles */}
      <div className="mt-3.5 space-y-2.5">
        {filasMovil.map((fila, indiceFila) => {
          const estaVendido = Boolean(fila.suscripcionId);
          const destinoCompatible = destinosTraslado?.find(
            (destino) =>
              destino.cuentaId === cta.cuentaId &&
              (destino.unidadId === fila.unidadId ||
                (destino.unidadId === null && indiceFila === 0)),
          );
          const esDestinoSeleccionado = Boolean(
            destinoCompatible &&
              destinoSeleccionado?.cuentaId === destinoCompatible.cuentaId &&
              destinoSeleccionado?.unidadId === destinoCompatible.unidadId,
          );
          const whatsappLimpio = fila.celular?.replace(/[^0-9+]/g, "");
          const alertaVencimiento = alertaVencimientoMovil(fila.dias);

          return (
            <div
              key={fila.clave}
              className={`flex flex-col gap-2 rounded-xl border p-3 transition ${
                estaVendido
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20"
                  : destinosTraslado
                    ? destinoCompatible
                      ? esDestinoSeleccionado
                        ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300 dark:bg-amber-950/30"
                        : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-slate-200 bg-slate-100 opacity-45 dark:border-slate-800 dark:bg-zinc-900"
                    : "border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-800 dark:bg-zinc-950/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                  <span>{fila.cupo}</span>
                  {!cta.esSpotifyFamiliar && fila.pin && (
                    <span className="rounded bg-neutral-200 px-1 py-0.2 font-mono text-[10px] text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                      PIN: {fila.pin}
                    </span>
                  )}
                </div>

                {estaVendido ? (
                  <button
                    type="button"
                    onClick={() => onGestionarVenta(fila)}
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white active:scale-95"
                  >
                    ⚙️ Gestionar
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(
                      (destinosTraslado && !destinoCompatible) ||
                      (!destinosTraslado && cta.admisionSpotifyBloqueada),
                    )}
                    onClick={() =>
                      onIniciarVenta(
                        destinosTraslado ? destinoCompatible!.unidadId : fila.unidadId,
                        fila.cupo,
                        fila.clienteLogin,
                        fila.clienteClave,
                      )
                    }
                    className={`rounded px-2.5 py-1 text-xs font-semibold text-white active:scale-95 disabled:cursor-not-allowed ${
                      destinosTraslado
                        ? esDestinoSeleccionado
                          ? "bg-amber-500"
                          : destinoCompatible
                            ? "bg-emerald-600"
                            : "bg-neutral-400"
                        : cta.admisionSpotifyBloqueada
                          ? "bg-amber-500"
                          : "bg-blue-600"
                    }`}
                  >
                    {destinosTraslado
                      ? esDestinoSeleccionado
                        ? "✓ Elegido"
                        : destinoCompatible
                          ? "Elegir"
                          : "No compatible"
                      : cta.admisionSpotifyBloqueada
                        ? "No se puede"
                        : "⚡ Vender"}
                  </button>
                )}
              </div>

              {cta.esSpotifyFamiliar && (fila.clienteLogin || fila.clienteClave) && (
                <div className="grid gap-1 rounded-md bg-neutral-100 px-2 py-1.5 font-mono text-[11px] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 sm:grid-cols-2">
                  <span className="break-all">📧 {fila.clienteLogin ?? "Sin correo"}</span>
                  <span className="break-all">🔑 {fila.clienteClave ?? "Sin clave"}</span>
                </div>
              )}

              {estaVendido && (
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                      👤 {fila.cliente ?? "Cliente"}
                    </div>
                    {fila.vendio && (
                      <div className="text-[11px] text-neutral-500">
                        🏷️ Vendió: {fila.vendio}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-mono text-[11px]">
                    {fila.ingreso != null && (
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${fila.ingreso.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {estaVendido && (
                <button
                  type="button"
                  onClick={() => onGestionarVenta(fila)}
                  className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition active:scale-[0.99] ${alertaVencimiento.clase}`}
                  aria-label={`${alertaVencimiento.texto}. Gestionar renovación`}
                >
                  <span>⏰ {alertaVencimiento.texto}</span>
                  {fila.vence && (
                    <span className="shrink-0 font-mono text-[11px] opacity-80">
                      {formatearFecha(fila.vence)}
                    </span>
                  )}
                </button>
              )}

              {whatsappLimpio && (
                <a
                  href={`https://wa.me/${whatsappLimpio.replace("+", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  💬 WhatsApp ({fila.celular})
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
