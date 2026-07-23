"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { venderAction, type EstadoVenta } from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-300";

/**
 * Venta en un solo paso: el cliente se escribe aquí mismo (se crea si es nuevo)
 * y el perfil toma su nombre, igual que en la hoja de cálculo del negocio.
 */
export function FormVenta({
  cuentaId,
  unidadId,
  etiquetaRecurso,
  nombrePerfilActual,
  modalidades,
  clientes,
  vendedores,
  volverA,
  bcv,
}: {
  cuentaId: string;
  unidadId: string | null;
  etiquetaRecurso: string;
  nombrePerfilActual: string | null;
  modalidades: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string; whatsapp: string | null }[];
  vendedores: { id: string; nombre: string }[];
  volverA: string;
  /** BCV vigente: solo para mostrar el equivalente mientras se escribe. */
  bcv?: number | null;
}) {
  const [montoVes, setMontoVes] = useState("");
  const montoNumero = Number(montoVes.replace(/\./g, "").replace(",", "."));
  const usdAprox =
    bcv && bcv > 0 && Number.isFinite(montoNumero) && montoNumero > 0
      ? montoNumero / bcv
      : null;

  const [estado, action, pendiente] = useActionState<EstadoVenta, FormData>(
    venderAction,
    null,
  );
  const hoy = new Date().toISOString().slice(0, 10);

  const [cliente, setCliente] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfilTocado, setPerfilTocado] = useState(false);
  const [perfil, setPerfil] = useState(nombrePerfilActual ?? "");

  // Al escribir un cliente que ya existe, se autocompleta su teléfono.
  function onCliente(valor: string) {
    setCliente(valor);
    const existente = clientes.find(
      (c) => c.nombre.toLowerCase() === valor.trim().toLowerCase(),
    );
    if (existente?.whatsapp) setWhatsapp(existente.whatsapp);
    // El perfil sigue al cliente mientras no se edite a mano.
    if (!perfilTocado) setPerfil(valor);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="cuenta_id" value={cuentaId} />
      {unidadId && <input type="hidden" name="unidad_id" value={unidadId} />}
      <input type="hidden" name="volver_a" value={volverA} />

      <div className="rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-900">
        Vendiendo: <strong>{etiquetaRecurso}</strong>
      </div>

      {/* --- Cliente (se crea si es nuevo) --- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cliente_nombre" className="mb-1.5 block text-sm font-medium">
            Cliente
          </label>
          <input
            id="cliente_nombre"
            name="cliente_nombre"
            required
            list="lista-clientes"
            value={cliente}
            onChange={(e) => onCliente(e.target.value)}
            placeholder="Nombre y apellido"
            className={campo}
          />
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Si es nuevo se crea solo; si ya existe, se reutiliza.
          </p>
        </div>

        <div>
          <label htmlFor="cliente_whatsapp" className="mb-1.5 block text-sm font-medium">
            WhatsApp
          </label>
          <input
            id="cliente_whatsapp"
            name="cliente_whatsapp"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+58 412-0000000"
            className={campo}
          />
        </div>
      </div>

      {/* --- Nombre del perfil --- */}
      {unidadId && (
        <div>
          <label htmlFor="nombre_perfil" className="mb-1.5 block text-sm font-medium">
            Nombre del perfil
          </label>
          <input
            id="nombre_perfil"
            name="nombre_perfil"
            value={perfil}
            onChange={(e) => {
              setPerfilTocado(true);
              setPerfil(e.target.value);
            }}
            placeholder="(el del cliente)"
            className={campo}
          />
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            Se pone solo el nombre del cliente; cámbialo si en la plataforma usas otro.
          </p>
        </div>
      )}

      {/* --- Precio, meses, inicio --- */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="monto_ves" className="mb-1.5 block text-sm font-medium">
            Bs recibidos
          </label>
          <input
            id="monto_ves"
            name="monto_ves"
            inputMode="decimal"
            placeholder="2.500,00"
            value={montoVes}
            onChange={(e) => setMontoVes(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="cantidad_periodos" className="mb-1.5 block text-sm font-medium">
            Meses
          </label>
          <select id="cantidad_periodos" name="cantidad_periodos" defaultValue={1} className={campo}>
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="inicio" className="mb-1.5 block text-sm font-medium">
            Inicio
          </label>
          <input
            id="inicio"
            name="inicio"
            type="date"
            required
            defaultValue={hoy}
            className={campo}
          />
        </div>
      </div>

      {/* --- Modalidad y vendedor --- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="modalidad_id" className="mb-1.5 block text-sm font-medium">
            Modalidad
          </label>
          <select id="modalidad_id" name="modalidad_id" required className={campo}>
            {modalidades.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="vendedor_id" className="mb-1.5 block text-sm font-medium">
            Vendida por
          </label>
          <select id="vendedor_id" name="vendedor_id" className={campo}>
            <option value="">Yo (venta directa)</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        {usdAprox !== null && (
          <>
            ≈ {usdAprox.toFixed(2)} USD a {bcv?.toLocaleString("es-VE")} Bs/USD.{" "}
          </>
        )}
        Si dejas los bolívares en blanco, la venta queda registrada y el cobro
        pendiente en «Por cobrar». La fecha de renovación se calcula por mes
        calendario. Al confirmar se congelan la BCV y la paralela de este
        momento: ninguna publicación posterior las recalcula.
      </p>

      {estado?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {estado.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {pendiente ? "Registrando…" : "Registrar venta"}
        </button>
        <Link
          href={volverA}
          className="rounded-lg border border-neutral-300 px-4 py-3 text-base transition active:scale-[0.99] dark:border-neutral-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
