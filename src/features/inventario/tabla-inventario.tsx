"use client";

import { useState } from "react";
import type { BadgeVencimiento } from "@/domain/fechas";
import { PanelLateralCuenta } from "./panel-lateral-cuenta";
import { moverCuentaAction } from "./actions";

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
  clienteLogin: string | null;
  clienteClave: string | null;
  pin: string | null;
  ingreso: number | null;
  inicio: string | null;
  vence: string | null;
  dias: number | null;
  badge: BadgeVencimiento | null;
  suscEstado: string | null;
};

export type BloqueCuenta = {
  cuentaId: string;
  correo: string;
  contrasena: string;
  pagador?: string | null;
  alias: string | null;
  notas: string | null;
  cuentaEstado: string;
  proveedor: string | null;
  costo: number | null;
  renovarProveedor: string | null;
  diasProveedor: number | null;
  filas: CupoFila[];
};

function ControlesOrden({ cuentaId, slug }: { cuentaId: string; slug: string }) {
  const btn =
    "rounded px-0.5 py-0.2 text-[10px] text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white";
  return (
    <form action={moverCuentaAction} className="inline-flex items-center gap-0.5">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" name="accion" value="inicio" className={btn} title="Al inicio">
        ⤒
      </button>
      <button type="submit" name="accion" value="subir" className={btn} title="Subir">
        ▲
      </button>
      <button type="submit" name="accion" value="bajar" className={btn} title="Bajar">
        ▼
      </button>
      <button type="submit" name="accion" value="final" className={btn} title="Al final">
        ⤓
      </button>
    </form>
  );
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;
  return `${Number(partes[2])}/${Number(partes[1])}/${partes[0]}`;
}

export function TablaInventario({ cuentas, slug }: { cuentas: BloqueCuenta[]; slug: string }) {
  const [cuentaEditando, setCuentaEditando] = useState<BloqueCuenta | null>(null);

  // Determinar si debemos mostrar la columna "Pagador" (GPay / Spotify)
  const tienePagador = cuentas.some((c) => Boolean(c.pagador)) || slug.includes("spotify");

  return (
    <div className="space-y-4">
      {/* Contenedor con scroll horizontal y estilo denso estilo Excel */}
      <div className="overflow-x-auto border border-neutral-400 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full border-collapse text-left font-mono text-[11px] leading-tight">
          <thead>
            {/* Cabecera idéntica a Excel con bloques azul y morado */}
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
            {cuentas.map((cta, index) => (
              <BloqueCuentaExcel
                key={cta.cuentaId}
                cta={cta}
                slug={slug}
                numCuenta={index + 1}
                tienePagador={tienePagador}
                onEditar={() => setCuentaEditando(cta)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {cuentaEditando && (
        <PanelLateralCuenta
          cuenta={cuentaEditando}
          slug={slug}
          onCerrar={() => setCuentaEditando(null)}
        />
      )}
    </div>
  );
}

function BloqueCuentaExcel({
  cta,
  slug,
  numCuenta,
  tienePagador,
  onEditar,
}: {
  cta: BloqueCuenta;
  slug: string;
  numCuenta: number;
  tienePagador: boolean;
  onEditar: () => void;
}) {
  const totalFilas = cta.filas.length;

  return (
    <>
      {cta.filas.map((f, i) => {
        const esPrimera = i === 0;

        // Estilos de alerta exactos al Excel del cliente
        let claseAlerta = "bg-[#16a34a] text-white"; // verde por defecto
        let textoAlerta = "";
        if (!f.cliente) {
          claseAlerta = "bg-[#1d4ed8] text-white"; // azul para libre/vacío
          textoAlerta = "Vacío";
        } else if (f.dias === null) {
          claseAlerta = "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300";
          textoAlerta = "Sin fecha";
        } else if (f.dias > 0) {
          claseAlerta = "bg-[#16a34a] text-white font-semibold";
          textoAlerta = `Falta ${f.dias} días`;
        } else if (f.dias === 0) {
          claseAlerta = "bg-[#dc2626] text-white font-bold";
          textoAlerta = "Vence hoy";
        } else {
          const transcurridos = Math.abs(f.dias);
          if (transcurridos <= 2) {
            claseAlerta = "bg-[#eab308] text-black font-bold";
            textoAlerta = `Tienes ${transcurridos} ${transcurridos === 1 ? "día" : "días"}`;
          } else {
            claseAlerta = "bg-[#991b1b] text-white font-bold";
            textoAlerta = `Vendido hace ${transcurridos} días`;
          }
        }

        // Estilos de aviso proveedor
        let claseAvisoProv = "bg-[#16a34a] text-white";
        let textoAvisoProv = "";
        if (!cta.renovarProveedor) {
          claseAvisoProv = "bg-neutral-100 text-neutral-400 dark:bg-neutral-900";
          textoAvisoProv = "—";
        } else if ((cta.diasProveedor ?? 0) >= 0) {
          claseAvisoProv = "bg-[#16a34a] text-white font-semibold";
          textoAvisoProv = `Falta ${cta.diasProveedor} días`;
        } else {
          claseAvisoProv = "bg-[#dc2626] text-white font-bold";
          textoAvisoProv = `Vendido hace ${Math.abs(cta.diasProveedor ?? 0)} días`;
        }

        return (
          <tr
            key={f.clave}
            className={`hover:bg-amber-50/50 dark:hover:bg-neutral-800/60 ${
              // Separación notoria y limpia entre cuentas madre
              esPrimera
                ? "border-t-[4px] border-neutral-700 dark:border-neutral-500"
                : "border-t border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {/* Pagador (Si aplica a la plataforma o existe en la cuenta) */}
            {tienePagador && esPrimera && (
              <td
                rowSpan={totalFilas}
                className="border border-neutral-300 bg-neutral-50 px-2 py-0.5 align-middle text-neutral-600 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400"
              >
                {cta.pagador ? `(${cta.pagador})` : "—"}
              </td>
            )}

            {/* 1. N° */}
            <td className="border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-center font-bold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {f.slotNumber}
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
            <td className="border border-neutral-300 px-2 py-0.5 font-medium text-neutral-900 dark:border-neutral-700 dark:text-white">
              {f.cupo}
            </td>

            {/* 5. Pin */}
            <td className="border border-neutral-300 px-1.5 py-0.5 text-center font-mono text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
              {f.pin ?? ""}
            </td>

            {/* 6. Ingresos */}
            <td className="border border-neutral-300 px-2 py-0.5 text-right font-medium tabular-nums text-neutral-900 dark:border-neutral-700 dark:text-white">
              {f.ingreso != null ? `$ ${f.ingreso.toFixed(2)}` : ""}
            </td>

            {/* 7. Inicio */}
            <td className="border border-neutral-300 px-1.5 py-0.5 text-center text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
              {formatearFecha(f.inicio)}
            </td>

            {/* 8. Días */}
            <td className="border border-neutral-300 px-1.5 py-0.5 text-center text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
              {f.cliente ? 30 : ""}
            </td>

            {/* 9. Vence */}
            <td className="border border-neutral-300 px-1.5 py-0.5 text-center font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white">
              {formatearFecha(f.vence)}
            </td>

            {/* 10. Alerta (Celda con color sólido de fondo) */}
            <td className={`border border-neutral-300 px-2 py-0.5 text-center ${claseAlerta}`}>
              {textoAlerta}
            </td>

            {/* 11. Cliente */}
            <td className="border border-neutral-300 px-2 py-0.5 font-medium text-neutral-900 dark:border-neutral-700 dark:text-white">
              {f.cliente ?? ""}
            </td>

            {/* 12. N° Celular */}
            <td className="border border-neutral-300 px-2 py-0.5 font-mono text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
              {f.celular ?? ""}
            </td>

            {/* 13. Vendió */}
            <td className="border border-neutral-300 px-2 py-0.5 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
              {f.vendio ?? ""}
            </td>

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

            {/* 17. Aviso Proveedor (Fusionado con color de fondo) */}
            {esPrimera && (
              <td
                rowSpan={totalFilas}
                className={`border border-neutral-300 px-2 py-0.5 text-center ${claseAvisoProv}`}
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
                  <ControlesOrden cuentaId={cta.cuentaId} slug={slug} />
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
