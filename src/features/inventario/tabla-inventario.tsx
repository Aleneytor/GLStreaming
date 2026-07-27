"use client";

import { useState, useTransition, useEffect } from "react";
import type { BadgeVencimiento } from "@/domain/fechas";
import { PanelLateralCuenta } from "./panel-lateral-cuenta";
import {
  moverCuentaAction,
  reordenarListaCuentasAction,
  cancelarVentaConLimpiezaAction,
} from "./actions";
import { ModalVentaRapida } from "./modal-venta-rapida";
import type { VendedorOp } from "./modal-venta-rapida";
import { ModalRenovarProveedorRapido } from "./modal-renovar-proveedor";
import { ModalGestionVenta } from "./modal-gestion-venta";

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
  pin: string | null;
  ingreso: number | null;
  inicio: string | null;
  vence: string | null;
  dias: number | null;
  badge: BadgeVencimiento | null;
  suscEstado: string | null;
  suscripcionId?: string | null;
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
  proveedor: string | null;
  costo: number | null;
  renovarProveedor: string | null;
  diasProveedor: number | null;
  esCuentaCompleta?: boolean;
  filas: CupoFila[];
};

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
  } | null>(null);

  const [gestionVentaTarget, setGestionVentaTarget] = useState<CupoFila | null>(null);

  const [renovarProvTarget, setRenovarProvTarget] = useState<{
    cuentaId: string;
    correoCuenta: string;
    costoActual: number | null;
  } | null>(null);

  const tienePagador = cuentasState.some((c) => Boolean(c.pagador)) || slug.includes("spotify");

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
      {/* VISTA MÓVIL (Tarjetas apiladas por cuenta) */}
      <div className="block space-y-4 md:hidden">
        {cuentasState.map((cta, index) => (
          <TarjetaCuentaMovil
            key={cta.cuentaId}
            cta={cta}
            numCuenta={index + 1}
            mostrarPagador={slug === "spotify"}
            onEditar={() => setCuentaEditando(cta)}
            onIniciarVenta={(unidadId, nombrePerfil) =>
              setVentaTarget({ cuentaId: cta.cuentaId, unidadId, nombrePerfil })
            }
            onGestionarVenta={(fila) => setGestionVentaTarget(fila)}
            onRenovarProveedor={() =>
              setRenovarProvTarget({
                cuentaId: cta.cuentaId,
                correoCuenta: cta.correo,
                costoActual: cta.costo,
              })
            }
          />
        ))}
      </div>

      {/* VISTA ESCRITORIO (Tabla Excel de 16 columnas) */}
      <div className="hidden overflow-x-auto border border-neutral-400 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900 md:block">
        <table className="w-full border-collapse text-left font-mono text-[11px] leading-tight">
          <thead>
            <tr className="text-[11px]">
              {tienePagador && (
                <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                  Pagador
                </th>
              )}
              <th className="border border-neutral-400 bg-[#1e3a8a] px-1.5 py-1 text-center font-bold text-white">
                N°
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                Correo
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                Contraseña
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                Perfil
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-1.5 py-1 text-center font-bold text-white">
                Pin
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 text-right font-bold text-white">
                Ingresos
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-1.5 py-1 text-center font-bold text-white">
                Inicio
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-1.5 py-1 text-center font-bold text-white">
                Días
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-1.5 py-1 text-center font-bold text-white">
                Vence
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 text-center font-bold text-white">
                Alerta
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                Cliente
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                N° Celular
              </th>
              <th className="border border-neutral-400 bg-[#1e3a8a] px-2 py-1 font-bold text-white">
                Vendió
              </th>
              <th className="border border-neutral-400 bg-[#581c87] px-2 py-1 text-right font-bold text-white">
                Inversión
              </th>
              <th className="border border-neutral-400 bg-[#581c87] px-2 py-1 font-bold text-white">
                Proveedor
              </th>
              <th className="border border-neutral-400 bg-[#581c87] px-1.5 py-1 text-center font-bold text-white">
                Renovar
              </th>
              <th className="border border-neutral-400 bg-[#581c87] px-2 py-1 text-center font-bold text-white">
                Aviso
              </th>
              <th className="border border-neutral-400 bg-[#581c87] px-1 py-1 text-center font-bold text-white">
                N° Ctas
              </th>
              <th className="border border-neutral-400 bg-neutral-900 px-1.5 py-1 text-center font-bold text-white">
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
                isTarget={targetIndex === index}
                onEditar={() => setCuentaEditando(cta)}
                onIniciarVenta={(unidadId, nombrePerfil) =>
                  setVentaTarget({ cuentaId: cta.cuentaId, unidadId, nombrePerfil })
                }
                onGestionarVenta={(fila) => setGestionVentaTarget(fila)}
                onRenovarProveedor={() =>
                  setRenovarProvTarget({
                    cuentaId: cta.cuentaId,
                    correoCuenta: cta.correo,
                    costoActual: cta.costo,
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
          slug={slug}
          vendedores={vendedores}
          onCerrar={() => setVentaTarget(null)}
        />
      )}

      {/* Modal de gestión de venta al hacer clic en un cliente */}
      {gestionVentaTarget && gestionVentaTarget.suscripcionId && (
        <ModalGestionVenta
          suscripcionId={gestionVentaTarget.suscripcionId}
          unidadId={gestionVentaTarget.unidadId}
          clienteId={gestionVentaTarget.clienteId}
          clienteNombre={gestionVentaTarget.cliente ?? "Cliente"}
          clienteCelular={gestionVentaTarget.celular}
          nombrePerfil={gestionVentaTarget.cupo}
          pinPerfil={gestionVentaTarget.pin}
          vence={gestionVentaTarget.vence}
          precioUsd={gestionVentaTarget.ingreso}
          vendedorActualId={gestionVentaTarget.vendedorId}
          vendedorActualTipo={gestionVentaTarget.vendedorTipo}
          vendedorActualCobraEnParalela={gestionVentaTarget.vendedorCobraEnParalela}
          slug={slug}
          vendedores={vendedores}
          onCerrar={() => setGestionVentaTarget(null)}
        />
      )}

      {/* Modal de renovación directa con proveedor */}
      {renovarProvTarget && (
        <ModalRenovarProveedorRapido
          cuentaId={renovarProvTarget.cuentaId}
          correoCuenta={renovarProvTarget.correoCuenta}
          costoActual={renovarProvTarget.costoActual}
          slug={slug}
          onCerrar={() => setRenovarProvTarget(null)}
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
  isTarget,
  onEditar,
  onIniciarVenta,
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
  isTarget: boolean;
  onEditar: () => void;
  onIniciarVenta: (unidadId: string | null, nombrePerfil: string) => void;
  onGestionarVenta: (fila: CupoFila) => void;
  onRenovarProveedor: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const filasARenderizar = cta.esCuentaCompleta ? cta.filas.slice(0, 1) : cta.filas;
  const totalFilas = filasARenderizar.length;

  return (
    <>
      {filasARenderizar.map((f, i) => {
        const esPrimera = i === 0;

        let claseAlerta = "bg-[#16a34a] text-white";
        let textoAlerta = "";
        const esLibre = !f.cliente;

        if (esLibre) {
          claseAlerta =
            "bg-[#1d4ed8] hover:bg-[#1e40af] text-white cursor-pointer transition active:scale-[0.98]";
          textoAlerta = "Vacío (+ Vender)";
        } else if (f.dias === null) {
          claseAlerta = "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300";
          textoAlerta = "Sin fecha";
        } else if (f.dias > 0) {
          claseAlerta = "bg-[#16a34a] text-white font-semibold cursor-pointer hover:bg-[#15803d]";
          textoAlerta = `Falta ${f.dias} días ⚙️`;
        } else if (f.dias === 0) {
          claseAlerta = "bg-[#dc2626] text-white font-bold cursor-pointer hover:bg-[#b91c1c]";
          textoAlerta = "Vence hoy ⚙️";
        } else {
          const transcurridos = Math.abs(f.dias);
          if (transcurridos <= 2) {
            claseAlerta = "bg-[#eab308] text-black font-bold cursor-pointer hover:bg-[#ca8a04]";
            textoAlerta = `Tienes ${transcurridos} ${transcurridos === 1 ? "día" : "días"} ⚙️`;
          } else {
            claseAlerta = "bg-[#991b1b] text-white font-bold cursor-pointer hover:bg-[#7f1d1d]";
            textoAlerta = `Vendido hace ${transcurridos} días ⚙️`;
          }
        }

        let claseAvisoProv = "bg-[#16a34a] text-white hover:bg-[#15803d] cursor-pointer";
        let textoAvisoProv = "";
        if (!cta.renovarProveedor) {
          claseAvisoProv =
            "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 cursor-pointer dark:bg-neutral-900";
          textoAvisoProv = "+ Pagar";
        } else if ((cta.diasProveedor ?? 0) >= 0) {
          claseAvisoProv =
            "bg-[#16a34a] text-white font-semibold hover:bg-[#15803d] cursor-pointer";
          textoAvisoProv = `Falta ${cta.diasProveedor} días 🔄`;
        } else {
          claseAvisoProv = "bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] cursor-pointer";
          textoAvisoProv = `Vencido hace ${Math.abs(cta.diasProveedor ?? 0)} días 🔄`;
        }

        return (
          <tr
            key={f.clave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`transition hover:bg-amber-50/50 dark:hover:bg-neutral-800/60 ${
              cta.esCuentaCompleta ? "h-[115px]" : ""
            } ${
              isTarget && esPrimera ? "ring-2 ring-blue-500" : ""
            } ${
              esPrimera
                ? "border-t-[4px] border-neutral-700 dark:border-neutral-500"
                : "border-t border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {/* Pagador */}
            {tienePagador && esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 bg-neutral-50 px-2 py-0.5 align-middle text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
              >
                <span className="block">{cta.pagador ? `(${cta.pagador})` : "—"}</span>
                {cta.pagadorOrigen && (
                  <span className="mt-0.5 block text-[9px] uppercase text-neutral-400">
                    {cta.pagadorOrigen.replaceAll("_", " ")}
                  </span>
                )}
              </td>
            )}

            {/* 1. N° */}
            <td className="border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-center font-bold text-neutral-700 align-middle dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {cta.esCuentaCompleta ? 1 : f.slotNumber}
            </td>

            {/* 2. Correo (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 bg-white px-2 py-0.5 align-middle font-semibold text-blue-700 underline dark:border-neutral-700 dark:bg-neutral-900 dark:text-blue-400"
              >
                {cta.correo}
                {cta.alias && <span className="ml-1 text-[10px] text-neutral-400">({cta.alias})</span>}
              </td>
            )}

            {/* 3. Contraseña (Fusionada) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 bg-white px-2 py-0.5 align-middle font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                {cta.contrasena}
              </td>
            )}

            {/* 4. Perfil */}
            <td className="border border-neutral-300 px-2 py-0.5 font-medium text-neutral-900 align-middle dark:border-neutral-700 dark:text-white">
              {cta.esCuentaCompleta ? "Cuenta Completa" : f.cupo}
            </td>

            {/* 5. Pin */}
            <td className="border border-neutral-300 px-1.5 py-0.5 text-center font-mono text-neutral-700 align-middle dark:border-neutral-700 dark:text-neutral-300">
              {f.pin ?? ""}
            </td>

            {/* Columnas de Venta (Fusionadas visualmente si es Cuenta Completa) */}
            {(!cta.esCuentaCompleta || esPrimera) && (
              <>
                {/* 6. Ingresos */}
                <td className="border border-neutral-300 px-2 py-0.5 text-right font-medium tabular-nums text-neutral-900 align-middle dark:border-neutral-700 dark:text-white">
                  {f.ingreso != null
                    ? `$ ${f.ingreso.toFixed(2)}`
                    : cta.esCuentaCompleta && cta.filas[0]?.ingreso != null
                    ? `$ ${cta.filas[0].ingreso.toFixed(2)}`
                    : ""}
                </td>

                {/* 7. Inicio */}
                <td className="border border-neutral-300 px-1.5 py-0.5 text-center align-middle text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                  {formatearFecha(f.inicio)}
                </td>

                {/* 8. Días */}
                <td className="border border-neutral-300 px-1.5 py-0.5 text-center align-middle text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                  {f.cliente ? 30 : ""}
                </td>

                {/* 9. Vence */}
                <td className="border border-neutral-300 px-1.5 py-0.5 text-center font-semibold text-neutral-900 align-middle dark:border-neutral-700 dark:text-white">
                  {formatearFecha(f.vence)}
                </td>

                {/* 10. Alerta */}
                <td
                  onClick={() => {
                    if (esLibre) {
                      onIniciarVenta(f.unidadId, f.cupo);
                    } else {
                      onGestionarVenta(f);
                    }
                  }}
                  className={`border border-neutral-300 px-2 py-0.5 text-center align-middle ${claseAlerta}`}
                  title={esLibre ? "Haz clic para vender este perfil" : "Haz clic para gestionar esta venta"}
                >
                  {textoAlerta}
                </td>

                {/* 11. Cliente */}
                <td
                  onClick={() => {
                    if (!esLibre) onGestionarVenta(f);
                  }}
                  className={`border border-neutral-300 px-2 py-0.5 font-medium text-neutral-900 align-middle dark:border-neutral-700 dark:text-white ${
                    !esLibre ? "cursor-pointer hover:bg-neutral-100 hover:underline dark:hover:bg-neutral-800" : ""
                  }`}
                  title={!esLibre ? "Haz clic para renovar, editar o eliminar esta venta" : ""}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{f.cliente ?? ""}</span>
                    {f.suscripcionId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGestionarVenta(f);
                        }}
                        title="Gestionar venta (renovar, editar o borrar)"
                        className="text-[10px] text-neutral-400 opacity-60 hover:opacity-100 hover:text-neutral-900 dark:hover:text-white"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>
                </td>

                {/* 12. N° Celular */}
                <td className="border border-neutral-300 px-2 py-0.5 font-mono text-neutral-800 align-middle dark:border-neutral-700 dark:text-neutral-200">
                  {f.celular ?? ""}
                </td>

                {/* 13. Vendió */}
                <td className="border border-neutral-300 px-2 py-0.5 text-neutral-700 align-middle dark:border-neutral-700 dark:text-neutral-300">
                  {f.vendio ?? ""}
                </td>
              </>
            )}

            {/* 14. Inversión (Fusionada) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 px-2 py-0.5 text-right font-medium tabular-nums text-neutral-900 dark:border-neutral-700 dark:text-white"
              >
                {cta.costo != null ? `$ ${cta.costo.toFixed(2)}` : ""}
              </td>
            )}

            {/* 15. Proveedor (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 px-2 py-0.5 font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
              >
                {cta.proveedor ?? ""}
              </td>
            )}

            {/* 16. Renovar Proveedor (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 px-1.5 py-0.5 text-center font-medium text-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
              >
                {formatearFecha(cta.renovarProveedor)}
              </td>
            )}

            {/* 17. Aviso Proveedor (Fusionado interactivo para Renovar Proveedor) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                onClick={onRenovarProveedor}
                className={`border border-neutral-300 px-2 py-0.5 text-center ${claseAvisoProv}`}
                title="Haz clic para extender 30 días con el proveedor"
              >
                {textoAvisoProv}
              </td>
            )}

            {/* 18. N° Ctas (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-center font-bold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {numCuenta}
              </td>
            )}

            {/* 19. Acciones (Fusionado) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 px-1.5 py-0.5 text-center"
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
  onEditar,
  onIniciarVenta,
  onGestionarVenta,
  onRenovarProveedor,
}: {
  cta: BloqueCuenta;
  numCuenta: number;
  mostrarPagador: boolean;
  onEditar: () => void;
  onIniciarVenta: (unidadId: string | null, nombrePerfil: string) => void;
  onGestionarVenta: (fila: CupoFila) => void;
  onRenovarProveedor: () => void;
}) {
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false);

  return (
    <div className="rounded-xl border border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Encabezado de la cuenta */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            #{numCuenta}
          </span>
          <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
            {cta.correo}
          </span>
        </div>
        <button
          type="button"
          onClick={onEditar}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ⚙️ Editar
        </button>
      </div>

      {/* Info proveedor y credenciales */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <div>
          <span>Proveedor: </span>
          <strong className="text-neutral-900 dark:text-white">{cta.proveedor ?? "Directo"}</strong>
          {cta.costo != null && (
            <span className="ml-2 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              ${cta.costo.toFixed(2)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMostrarCredenciales(!mostrarCredenciales)}
          className="font-mono text-[11px] text-blue-600 underline dark:text-blue-400"
        >
          {mostrarCredenciales ? "Ocultar clave" : "Ver clave"}
        </button>
      </div>

      {mostrarPagador && (
        <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-xs dark:border-violet-900 dark:bg-violet-950/30">
          <span className="text-violet-600 dark:text-violet-300">💳 Gmail pagador: </span>
          <strong className="break-all font-mono text-violet-950 dark:text-violet-100">
            {cta.pagador ?? "No registrado"}
          </strong>
          {cta.pagadorOrigen && (
            <span className="ml-1 text-[10px] uppercase text-violet-500 dark:text-violet-400">
              · {cta.pagadorOrigen.replaceAll("_", " ")}
            </span>
          )}
        </div>
      )}

      {mostrarCredenciales && (
        <div className="mt-2 rounded bg-neutral-100 p-2 font-mono text-xs text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
          🔑 Clave: {cta.contrasena}
        </div>
      )}

      {/* Lista de cupos/perfiles */}
      <div className="mt-3 space-y-2">
        {cta.filas.map((fila) => {
          const estaVendido = Boolean(fila.suscripcionId);
          const whatsappLimpio = fila.celular?.replace(/[^0-9+]/g, "");
          const alertaVencimiento = alertaVencimientoMovil(fila.dias);

          return (
            <div
              key={fila.clave}
              className={`flex flex-col gap-1.5 rounded-lg border p-2.5 transition ${
                estaVendido
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20"
                  : "border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                  <span>{fila.cupo}</span>
                  {fila.pin && (
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
                    onClick={() => onIniciarVenta(fila.unidadId, fila.cupo)}
                    className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white active:scale-95"
                  >
                    ⚡ Vender
                  </button>
                )}
              </div>

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
