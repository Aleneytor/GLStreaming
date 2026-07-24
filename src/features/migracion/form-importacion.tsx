"use client";

import { useActionState, useMemo, useState } from "react";
import { analizarFilas } from "@/domain/importacion";
import { importarAction, type EstadoImportacion } from "./actions";

const CAMPO =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export type OpcionProducto = {
  id: string;
  codigo: string;
  etiqueta: string;
  capacidad: number;
  modalidades: { id: string; nombre: string }[];
};

// Ejemplo de cuenta completa CON la fila de títulos (así se reconocen las
// columnas por su nombre). El correo, la inversión, el proveedor y la
// renovación son de la cuenta: van solo en la primera fila.
const EJEMPLO = [
  "Correo\tContraseña\tPerfil\tPin\tIngresos\tInicio\tVence\tCliente\tCelular\tVendió\tInversión\tProveedor\tRenovar",
  "madre@correo.com\tgls3030\tMaurifred\t7449\t2.50\t24/7/2026\t23/8/2026\t\t+58 412-4067449\tGabriel Nadales\t3.50\t@CapyVentas\t9/8/2026",
  "\t\tNana\t3334\t5.00\t10/7/2026\t9/8/2026\tNana\t\t\t\t\t",
  "\t\tNorelys\t5555\t3.00\t27/6/2026\t27/7/2026\t\t+58 424-1991901\tEdgar Espinoza\t\t\t",
].join("\n");

export function FormImportacion({
  productos,
  vendedoresExistentes,
  bcv,
}: {
  productos: OpcionProducto[];
  /** Nombres de vendedores ya registrados, para avisar cuáles se crearán. */
  vendedoresExistentes: string[];
  /** BCV vigente para previsualizar la conversión de dólares a bolívares. */
  bcv: number | null;
}) {
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [moneda, setMoneda] = useState<"usd" | "ves">("usd");
  const [texto, setTexto] = useState("");
  const [estado, action, pendiente] = useActionState<EstadoImportacion, FormData>(
    importarAction,
    null,
  );

  const producto = productos.find((p) => p.id === productoId) ?? productos[0];
  const capacidad = producto?.capacidad ?? 1;

  const vendedoresConocidos = useMemo(
    () => new Set(vendedoresExistentes.map((v) => v.trim().toLowerCase())),
    [vendedoresExistentes],
  );

  // La vista previa usa el MISMO analizador que la importación real, así que lo
  // que se ve aquí es literalmente lo que se va a guardar.
  const analisis = useMemo(
    () => (texto.trim() ? analizarFilas(texto, capacidad) : null),
    [texto, capacidad],
  );

  const nuevosVendedores = (analisis?.vendedores ?? []).filter(
    (v) => !vendedoresConocidos.has(v.trim().toLowerCase()),
  );

  const aBs = (monto: number | null) =>
    monto == null ? null : moneda === "usd" && bcv ? monto * bcv : monto;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="capacidad" value={capacidad} />
      <input type="hidden" name="moneda" value={moneda} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Producto</span>
          <select
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
            className={CAMPO}
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta} ({p.capacidad} {p.capacidad === 1 ? "perfil" : "perfiles"})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600 dark:text-neutral-400">Modalidad</span>
          <select name="modalidad_id" className={CAMPO} defaultValue="">
            {(producto?.modalidades ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Moneda de los montos: el Excel del negocio va en divisas. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
        <span className="text-neutral-600 dark:text-neutral-400">Los montos están en:</span>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="moneda-ui"
            checked={moneda === "usd"}
            onChange={() => setMoneda("usd")}
          />
          Dólares{" "}
          {bcv ? (
            <span className="text-xs text-neutral-500">
              (se convierten a {bcv.toLocaleString("es-VE")} Bs/USD)
            </span>
          ) : (
            <span className="text-xs text-amber-600">(falta BCV para convertir)</span>
          )}
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="moneda-ui"
            checked={moneda === "ves"}
            onChange={() => setMoneda("ves")}
          />
          Bolívares
        </label>
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="filas" className="text-sm font-medium">
            Pega aquí las filas del Excel
          </label>
          <button
            type="button"
            onClick={() => setTexto(EJEMPLO)}
            className="text-xs text-neutral-500 underline underline-offset-2 dark:text-neutral-400"
          >
            Ver un ejemplo
          </button>
        </div>
        <textarea
          id="filas"
          name="filas"
          rows={10}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          placeholder={"correo\tcontraseña\tperfil\tpin\tmonto\tinicio\tvence\tcliente\twhatsapp\tvendió"}
          className={`${CAMPO} font-mono text-xs`}
        />
        <div className="mt-1 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <p>
            <strong>Pega tu Excel con la fila de títulos.</strong> La app reconoce las
            columnas por su nombre —en cualquier orden— y descarta las que no usa (Días,
            Alerta, Aviso). No necesitas borrar ni reordenar nada.
          </p>
          <p>
            Reconoce: <strong>correo, contraseña, perfil, pin, ingresos/monto, inicio,
            vence, cliente, celular, vendió, inversión, proveedor, renovar</strong>.
          </p>
          <p>
            <strong>Cuenta completa</strong> (Netflix, Disney…): elige el producto «cuenta»
            y pega los perfiles; el <strong>correo, la contraseña, la inversión, el
            proveedor y la renovación van solo en la primera fila</strong> (son de la
            cuenta, no del perfil). <strong>Perfiles extra:</strong> elige «perfil extra».
          </p>
          <p>
            La <strong>inversión</strong> es lo que le pagas al proveedor y <strong>renovar</strong>
            es cuándo le toca pagarle; con ellas la app calcula tu margen y te avisa el pago.
            Déjalas vacías (o proveedor «yo») si la cuenta es tuya.
          </p>
          <p>
            Si el <strong>cliente</strong> está vacío pero hay monto o teléfono, se usa el
            nombre del perfil. Sin nada de eso, el perfil se carga <strong>libre</strong>.
          </p>
        </div>
      </div>

      {analisis && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <span>
              <strong className="tabular-nums">{analisis.filas.length}</strong> filas
            </span>
            <span>
              <strong className="tabular-nums">{analisis.cuentas}</strong> cuentas
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              <strong className="tabular-nums">{analisis.validas}</strong> listas
            </span>
            {analisis.conError > 0 && (
              <span className="text-red-600 dark:text-red-400">
                <strong className="tabular-nums">{analisis.conError}</strong> con error
              </span>
            )}
          </div>

          {nuevosVendedores.length > 0 && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
              Se crearán {nuevosVendedores.length} revendedores nuevos:{" "}
              <strong>{nuevosVendedores.join(", ")}</strong>.
            </p>
          )}

          <div className="max-h-96 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
                <tr>
                  {["#", "Cuenta", "Perfil", "Cliente", "Vence", "Monto", "Vendió", "Costo", "Estado"].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-1.5 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {analisis.filas.map((f) => {
                  const bs = aBs(f.datos.monto);
                  const vendedorNuevo =
                    f.datos.vendio &&
                    !vendedoresConocidos.has(f.datos.vendio.trim().toLowerCase());
                  return (
                    <tr
                      key={f.numero}
                      className={`border-t border-neutral-200 dark:border-neutral-800 ${
                        f.errores.length ? "bg-red-50 dark:bg-red-950/30" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 tabular-nums text-neutral-500">{f.numero}</td>
                      <td className="max-w-40 truncate px-2 py-1.5">
                        {f.heredaCuenta ? (
                          <span className="text-neutral-400">↳ {f.datos.correo}</span>
                        ) : (
                          f.datos.correo
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {f.slot || "—"}
                        {f.datos.perfil ? ` · ${f.datos.perfil}` : ""}
                      </td>
                      <td className="px-2 py-1.5">
                        {f.datos.cliente ?? <span className="text-neutral-400">libre</span>}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                        {f.datos.vence ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                        {f.datos.monto == null ? (
                          "—"
                        ) : (
                          <>
                            {moneda === "usd" ? `$${f.datos.monto}` : `${f.datos.monto} Bs`}
                            {moneda === "usd" && bs != null && (
                              <span className="text-neutral-400">
                                {" "}
                                ≈ {bs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5">
                        {f.datos.vendio ? (
                          <>
                            {f.datos.vendio}
                            {vendedorNuevo && (
                              <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                                nuevo
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-neutral-400">directa</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                        {f.datos.inversion != null || f.datos.proveedor || f.datos.renovarProveedor ? (
                          <>
                            {f.datos.inversion != null ? `$${f.datos.inversion}` : ""}
                            {f.datos.proveedor ? (
                              <span className="text-neutral-400"> · {f.datos.proveedor}</span>
                            ) : null}
                            {f.datos.renovarProveedor ? (
                              <span className="text-neutral-400"> · paga {f.datos.renovarProveedor}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {f.errores.length > 0 ? (
                          <span className="text-red-700 dark:text-red-400">
                            {f.errores.join(" ")}
                          </span>
                        ) : f.avisos.length > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400">
                            {f.avisos.join(" ")}
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">Lista</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pendiente || !analisis || analisis.validas === 0}
        className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {pendiente
          ? "Importando…"
          : analisis
            ? `Importar ${analisis.validas} filas`
            : "Importar"}
      </button>

      {estado?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {estado.error}
        </p>
      )}

      {estado?.resumen && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{estado.resumen}</p>
          <div className="max-h-64 overflow-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <ul className="divide-y divide-neutral-200 text-xs dark:divide-neutral-800">
              {estado.filas?.map((r) => (
                <li key={r.numero} className="flex gap-2 px-2 py-1.5">
                  <span className="tabular-nums text-neutral-500">{r.numero}</span>
                  <span aria-hidden>{r.ok ? "✅" : "❌"}</span>
                  <span className={r.ok ? "" : "text-red-700 dark:text-red-400"}>
                    {r.mensaje}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </form>
  );
}
